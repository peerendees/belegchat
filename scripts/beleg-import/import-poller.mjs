#!/usr/bin/env node
/**
 * BelegChat Import-Poller (BER-124)
 *
 * Gegenstück zum Threema-Befehl „Belegimport": n8n legt bei erkanntem Befehl nur
 * einen Auftrag in `import_kommandos` ab — die Belege liegen lokal in iCloud, die
 * Cloud kommt nicht heran. Dieser Poller läuft als LaunchAgent auf dem Mac, holt
 * offene Aufträge ab, startet den Import und meldet das Ergebnis zurück.
 *
 *   offen  ──▶ in_arbeit ──▶ erledigt ──▶ gemeldet
 *              (watch --once --json)   (n8n-Webhook sendet die Threema-Nachricht)
 *
 * Die Threema-Gateway-Zugangsdaten bleiben bewusst auf dem n8n-Server; der Mac
 * kennt nur den Webhook und den Import-Token.
 *
 * Konfiguration (belegchat/.env.local):
 *   DASHBOARD_DB_URL             Rolle dashboard_service via Pooler (ADR-05)
 *   IMPORT_THREEMA_ID            Mandant, für den dieser Mac importiert
 *   IMPORT_API_TOKEN             Bearer-Token für den n8n-Webhook
 *   IMPORT_ERGEBNIS_WEBHOOK_URL  Default: …/webhook/belegchat-import-ergebnis
 *
 * Verwendung:
 *   node scripts/beleg-import/import-poller.mjs [--einmal] [--intervall 20]
 *     --einmal     eine Runde abarbeiten und beenden (Test/Diagnose)
 *     --intervall  Sekunden zwischen den Runden (Default 20)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import postgres from "postgres";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadEnvLocal() {
  const p = join(REPO_ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
loadEnvLocal();

const args = process.argv.slice(2);
const EINMAL = args.includes("--einmal");
const INTERVALL_MS = (() => {
  const i = args.indexOf("--intervall");
  return Math.max(5, Number(i >= 0 ? args[i + 1] : 20) || 20) * 1000;
})();

const DB_URL = process.env.DASHBOARD_DB_URL || "";
const THREEMA_ID = process.env.IMPORT_THREEMA_ID || "BUMFMZ39";
const TOKEN = process.env.IMPORT_API_TOKEN || "";
const ERGEBNIS_URL = process.env.IMPORT_ERGEBNIS_WEBHOOK_URL ||
  "https://n8n.srv1098810.hstgr.cloud/webhook/belegchat-import-ergebnis";
const IMPORT_SKRIPT = join(REPO_ROOT, "scripts", "beleg-import", "beleg-import.mjs");
const LAUF_TIMEOUT_MS = 45 * 60 * 1000;

function fail(msg) {
  console.error(`FEHLER: ${msg}`);
  process.exit(1);
}
if (!DB_URL) fail("DASHBOARD_DB_URL fehlt (belegchat/.env.local)");
if (!TOKEN) fail("IMPORT_API_TOKEN fehlt (belegchat/.env.local)");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const zeit = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const log = (...a) => console.log(`[${zeit()}]`, ...a);

const sql = postgres(DB_URL, { ssl: "require", max: 2, idle_timeout: 30, prepare: false });

/** Alle Zugriffe auf import_kommandos laufen im Mandanten-Kontext (RLS, ADR-05). */
function imMandanten(mandantId, fn) {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.mandant_id', ${mandantId}, true)`;
    return fn(tx);
  });
}

// ---- Ergebnistext ----------------------------------------------------------

/** „0033…0044" bei lückenloser Folge, sonst Aufzählung (gekappt). */
function nummernKurz(nummern) {
  if (!nummern.length) return "";
  const sortiert = [...nummern].sort();
  const teile = sortiert.map((n) => n.match(/^(\d{2}-\d{4})-(\d{4})$/));
  const einheitlich = teile.every((t) => t && t[1] === teile[0][1]);
  if (einheitlich && sortiert.length > 1) {
    const zahlen = teile.map((t) => Number(t[2]));
    const lueckenlos = zahlen.every((z, i) => i === 0 || z === zahlen[i - 1] + 1);
    if (lueckenlos) return `${sortiert[0]}…${teile.at(-1)[2]}`;
  }
  if (sortiert.length <= 8) return sortiert.join(", ");
  return `${sortiert.slice(0, 8).join(", ")} … (+${sortiert.length - 8} weitere)`;
}

/** Volle Ergebnismeldung — Betreiber-Festlegung 01.08.2026: Zahlen, Nummern, Fehlerdateien. */
function meldungsText(b) {
  if (b?.abgebrochen) {
    return "⚠️ Belegimport: der letzte Lauf wurde nicht zu Ende geführt " +
      "(Poller neu gestartet). Bitte „Belegimport“ noch einmal senden.";
  }
  if (b?.gesperrt) {
    return "⏳ Es läuft gerade schon ein Import. Bitte in ein paar Minuten noch einmal senden.";
  }
  const importiert = b?.importiert ?? 0;
  const fehler = b?.fehler ?? 0;
  const duplikate = b?.duplikate ?? 0;

  if (!importiert && !fehler && !duplikate) {
    return "ℹ️ Belegimport: keine neuen Dateien im Eingang.";
  }

  const teile = [`${importiert} importiert`];
  if (fehler) teile.push(`${fehler} Fehler`);
  if (duplikate) teile.push(`${duplikate} ${duplikate === 1 ? "Duplikat" : "Duplikate"}`);

  const zeilen = [`${fehler ? "⚠️" : "✅"} Belegimport fertig: ${teile.join(", ")}.`];
  if (b.belegnummern?.length) zeilen.push(`Nummern ${nummernKurz(b.belegnummern)}`);
  for (const f of (b.fehlerdateien ?? []).slice(0, 5)) {
    zeilen.push(`Fehler: ${f.datei} — ${String(f.grund).slice(0, 120)}`);
  }
  if ((b.fehlerdateien?.length ?? 0) > 5) {
    zeilen.push(`… und ${b.fehlerdateien.length - 5} weitere Fehler`);
  }
  if (b.duplikatdateien?.length) {
    zeilen.push(`Duplikate: ${b.duplikatdateien.slice(0, 5).join(", ")}` +
      (b.duplikatdateien.length > 5 ? ` … (+${b.duplikatdateien.length - 5})` : ""));
  }
  return zeilen.join("\n").slice(0, 3000); // Threema-Textnachricht bleibt handlich
}

// ---- Import-Lauf -----------------------------------------------------------

/** Startet `beleg-import.mjs watch --once --json` und liefert die Bilanz. */
function importLaufen() {
  return new Promise((fertig) => {
    execFile(
      process.execPath,
      [IMPORT_SKRIPT, "watch", "--once", "--json"],
      { cwd: REPO_ROOT, timeout: LAUF_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (stderr.trim()) for (const z of stderr.trimEnd().split("\n")) log("  ", z);
        const letzte = stdout.trim().split("\n").filter(Boolean).at(-1);
        try {
          if (!letzte) throw new Error(err?.message || "keine Ausgabe");
          fertig(JSON.parse(letzte));
        } catch (e) {
          // Kein verwertbares JSON: der Lauf ist gescheitert, bevor er bilanzieren konnte.
          fertig({
            importiert: 0, duplikate: 0, fehler: 1, belegnummern: [], duplikatdateien: [],
            fehlerdateien: [{ datei: "(Import-Lauf)", grund: err?.message || e.message }],
          });
        }
      },
    );
  });
}

// ---- Schritte --------------------------------------------------------------

/** Fertige Läufe per n8n-Webhook nach Threema melden. */
async function erledigteMelden(mandantId) {
  const offen = await imMandanten(mandantId, (tx) => tx`
    SELECT id, ergebnis FROM import_kommandos
     WHERE status = 'erledigt' ORDER BY angefordert_am`);

  for (const zeile of offen) {
    const text = meldungsText(zeile.ergebnis);
    let ok = false;
    try {
      const res = await fetch(ERGEBNIS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({
          threemaId: THREEMA_ID,
          kommandoId: zeile.id,
          text,
          ergebnis: zeile.ergebnis,
        }),
      });
      ok = res.ok;
      if (!ok) log(`Ergebnis-Webhook HTTP ${res.status} — wird erneut versucht`);
    } catch (e) {
      log(`Ergebnis-Webhook nicht erreichbar (${e.message}) — wird erneut versucht`);
    }
    if (ok) {
      await imMandanten(mandantId, (tx) => tx`
        UPDATE import_kommandos SET status = 'gemeldet' WHERE id = ${zeile.id}`);
      log(`Ergebnis gemeldet (${zeile.id})`);
    }
  }
}

/** Einen offenen Auftrag abarbeiten. Liefert true, wenn es einen gab. */
async function auftragAbarbeiten(mandantId) {
  const [auftrag] = await imMandanten(mandantId, (tx) => tx`
    UPDATE import_kommandos SET status = 'in_arbeit'
     WHERE id = (SELECT id FROM import_kommandos
                  WHERE mandant_id = ${mandantId} AND status = 'offen'
                  ORDER BY angefordert_am LIMIT 1
                  FOR UPDATE SKIP LOCKED)
     RETURNING id`);
  if (!auftrag) return false;

  log(`Auftrag ${auftrag.id} — Import startet`);
  const bilanz = await importLaufen();
  await imMandanten(mandantId, (tx) => tx`
    UPDATE import_kommandos
       SET status = 'erledigt', erledigt_am = now(), ergebnis = ${sql.json(bilanz)}
     WHERE id = ${auftrag.id}`);
  log(`Auftrag ${auftrag.id} — ${bilanz.importiert} importiert, ${bilanz.fehler} Fehler`);
  return true;
}

/**
 * Beim Start hängengebliebene Aufträge aufräumen: dieser Poller ist der einzige
 * Bearbeiter, also kann `in_arbeit` beim Start nur von einem abgebrochenen Lauf
 * stammen (Absturz, Neustart, Abmeldung). Sie werden als abgebrochen gemeldet,
 * statt still liegen zu bleiben.
 */
async function haengengebliebeneAufraeumen(mandantId) {
  const zeilen = await imMandanten(mandantId, (tx) => tx`
    UPDATE import_kommandos
       SET status = 'erledigt', erledigt_am = now(),
           ergebnis = ${sql.json({ abgebrochen: true })}
     WHERE status = 'in_arbeit'
     RETURNING id`);
  for (const z of zeilen) log(`Abgebrochenen Auftrag ${z.id} aufgeräumt`);
}

// ---- Hauptschleife ---------------------------------------------------------

async function main() {
  const [mandant] = await sql`
    SELECT id FROM mandanten WHERE threema_id = ${THREEMA_ID} AND aktiv LIMIT 1`;
  if (!mandant) fail(`Kein aktiver Mandant für Threema-ID ${THREEMA_ID}`);
  const mandantId = mandant.id;
  log(`Poller bereit — Mandant ${THREEMA_ID}, Takt ${INTERVALL_MS / 1000}s${EINMAL ? " (Einmal-Lauf)" : ""}`);

  await haengengebliebeneAufraeumen(mandantId);

  for (;;) {
    try {
      await erledigteMelden(mandantId);
      if (await auftragAbarbeiten(mandantId)) await erledigteMelden(mandantId);
    } catch (e) {
      // Netz-/DB-Aussetzer dürfen den Poller nicht beenden — launchd würde ihn
      // zwar neu starten, aber jeder Neustart kostet eine Verbindungsrunde.
      log(`Runde fehlgeschlagen: ${e.message}`);
    }
    if (EINMAL) break;
    await sleep(INTERVALL_MS);
  }
  await sql.end();
}

main().catch((e) => fail(e.message));
