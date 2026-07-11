#!/usr/bin/env node
/**
 * BelegChat PDF-Batch-Import (BER-90)
 *
 * Sendet PDF-Belege an den n8n-Webhook `belegchat-import-pdf`.
 * Konfiguration über belegchat/.env.local:
 *   IMPORT_API_TOKEN    (Pflicht — muss identisch in der n8n-Instanz gesetzt sein)
 *   IMPORT_WEBHOOK_URL  (Default: https://n8n.srv1098810.hstgr.cloud/webhook/belegchat-import-pdf)
 *   IMPORT_THREEMA_ID   (Default: BUMFMZ39 — Test-Mandant Firma 01)
 *   IMPORT_WATCH_DIR    Eingangsordner für `watch` (Input)
 *   IMPORT_ARCHIVE_DIR  Ziel-Ablage; `{jahr}` wird durch das **Belegjahr** ersetzt
 *   IMPORT_ERROR_DIR    Ordner für Fehlschläge und Duplikate
 *
 * Verwendung:
 *   node scripts/beleg-import/beleg-import.mjs import <datei.pdf> [weitere.pdf ...]
 *   node scripts/beleg-import/beleg-import.mjs watch [input-ordner]
 *
 * Watch-Konzept (StB-Ablage):
 *   Input → Import → Erfolg: Datei wandert in die Jahres-Ablage
 *   (IMPORT_ARCHIVE_DIR, {jahr} = Belegjahr aus KI-Datum, Fallback Jahr aus
 *   Beleg-Nr bzw. aktuelles Jahr) · Fehler/Duplikat: Datei wandert in
 *   IMPORT_ERROR_DIR inkl. <name>.err.txt.
 *   iCloud: .icloud-Platzhalter werden per `brctl download` angestoßen;
 *   importiert wird erst, wenn die Dateigröße über zwei Scans stabil ist.
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, renameSync,
  readdirSync, statSync,
} from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

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

const TOKEN = process.env.IMPORT_API_TOKEN || "";
const URL = process.env.IMPORT_WEBHOOK_URL ||
  "https://n8n.srv1098810.hstgr.cloud/webhook/belegchat-import-pdf";
const THREEMA_ID = process.env.IMPORT_THREEMA_ID || "BUMFMZ39";
const WATCH_DIR = process.env.IMPORT_WATCH_DIR || "";
const ARCHIVE_DIR_TEMPLATE = process.env.IMPORT_ARCHIVE_DIR || "";
const ERROR_DIR = process.env.IMPORT_ERROR_DIR || "";
const MAX_BYTES = 15 * 1024 * 1024;

function fail(msg) {
  console.error(`FEHLER: ${msg}`);
  process.exit(1);
}

async function importPdf(filePath) {
  const abs = resolve(filePath);
  if (!existsSync(abs)) throw new Error(`Datei nicht gefunden: ${abs}`);
  const bytes = readFileSync(abs);
  if (bytes.length > MAX_BYTES) throw new Error(`PDF zu groß (${(bytes.length / 1e6).toFixed(1)} MB, max 15 MB)`);
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Keine PDF-Datei (Magic Bytes fehlen)");

  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      threemaId: THREEMA_ID,
      fileName: basename(abs),
      pdfBase64: bytes.toString("base64"),
    }),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 300) }; }

  if (res.status === 409) {
    return { duplicate: true, error: data.error };
  }
  if (!res.ok || !data.success) {
    throw new Error(`HTTP ${res.status}: ${data.error || text.slice(0, 300)}`);
  }
  return data; // { success, beleg_nr, beleg_id, beleg_datum, seiten }
}

async function cmdImport(files) {
  if (!files.length) fail("Keine Datei angegeben. Verwendung: import <datei.pdf> [...]");
  let errors = 0;
  for (const f of files) {
    try {
      const r = await importPdf(f);
      if (r.duplicate) console.log(`= ${basename(f)} → ${r.error}`);
      else console.log(`✓ ${basename(f)} → Beleg ${r.beleg_nr} (${r.seiten} Seiten, id ${r.beleg_id})`);
    } catch (e) {
      errors++;
      console.error(`✗ ${basename(f)} → ${e.message}`);
    }
  }
  process.exit(errors ? 1 : 0);
}

/** Belegjahr: KI-Datum → Beleg-Nr (01-JJJJ-nnnn) → aktuelles Jahr */
function belegJahr(result) {
  const d = String(result.beleg_datum || "");
  if (/^\d{4}-/.test(d)) return d.slice(0, 4);
  const m = String(result.beleg_nr || "").match(/-(\d{4})-/);
  if (m) return m[1];
  return String(new Date().getFullYear());
}

/** iCloud-Platzhalter (.<name>.pdf.icloud) → Download anstoßen */
function triggerIcloudDownloads(root) {
  for (const name of readdirSync(root)) {
    if (name.endsWith(".icloud")) {
      try { execFileSync("brctl", ["download", join(root, name)], { stdio: "ignore" }); } catch { /* best effort */ }
    }
  }
}

/** Ziel ohne Überschreiben: bei Namenskollision " (2)", " (3)", … anhängen */
function safeTarget(dir, name) {
  let target = join(dir, name);
  let i = 2;
  while (existsSync(target)) {
    target = join(dir, name.replace(/(\.pdf)$/i, ` (${i})$1`));
    i++;
  }
  return target;
}

async function cmdWatch(args) {
  const inputDir = resolve(args.find((a) => !a.startsWith("--")) || WATCH_DIR ||
    fail("Kein Input-Ordner: Argument fehlt und IMPORT_WATCH_DIR nicht gesetzt"));
  if (!existsSync(inputDir) || !statSync(inputDir).isDirectory()) fail(`Kein Ordner: ${inputDir}`);
  if (!ARCHIVE_DIR_TEMPLATE) fail("IMPORT_ARCHIVE_DIR nicht gesetzt (belegchat/.env.local)");
  if (!ERROR_DIR) fail("IMPORT_ERROR_DIR nicht gesetzt (belegchat/.env.local)");
  mkdirSync(ERROR_DIR, { recursive: true });

  console.log(`Input:  ${inputDir}`);
  console.log(`Ablage: ${ARCHIVE_DIR_TEMPLATE}  ({jahr} = Belegjahr)`);
  console.log(`Fehler: ${ERROR_DIR}`);
  console.log(`Mandant ${THREEMA_ID} — Ctrl+C zum Beenden`);

  const sizes = new Map();
  const busy = new Set();

  async function scan() {
    triggerIcloudDownloads(inputDir);
    for (const name of readdirSync(inputDir)) {
      if (!name.toLowerCase().endsWith(".pdf") || busy.has(name)) continue;
      const p = join(inputDir, name);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (!st.isFile()) continue;

      // Stabilitäts-Check: Größe muss über zwei Scans identisch sein (iCloud-Sync)
      const prev = sizes.get(name);
      sizes.set(name, st.size);
      if (prev !== st.size) continue;

      busy.add(name);
      try {
        const r = await importPdf(p);
        if (r.duplicate) {
          renameSync(p, safeTarget(ERROR_DIR, name));
          writeFileSync(join(ERROR_DIR, `${name}.err.txt`), `${new Date().toISOString()}\n${r.error}\n`);
          console.log(`= ${name} → ${r.error} (verschoben nach Fehler-Ordner)`);
        } else {
          const jahr = belegJahr(r);
          const archiveDir = ARCHIVE_DIR_TEMPLATE.replaceAll("{jahr}", jahr);
          mkdirSync(archiveDir, { recursive: true });
          renameSync(p, safeTarget(archiveDir, name));
          console.log(`✓ ${name} → Beleg ${r.beleg_nr} (${r.seiten} Seiten) → ${basename(archiveDir)}/`);
        }
      } catch (e) {
        renameSync(p, safeTarget(ERROR_DIR, name));
        writeFileSync(join(ERROR_DIR, `${name}.err.txt`), `${new Date().toISOString()}\n${e.message}\n`);
        console.error(`✗ ${name} → ${e.message} (verschoben nach Fehler-Ordner)`);
      } finally {
        sizes.delete(name);
        busy.delete(name);
      }
    }
  }

  await scan();
  setInterval(scan, 5000);
}

const [, , cmd, ...args] = process.argv;
if (!TOKEN) fail("IMPORT_API_TOKEN fehlt (belegchat/.env.local)");

if (cmd === "import") cmdImport(args);
else if (cmd === "watch") cmdWatch(args);
else fail("Unbekanntes Kommando. Verwendung: beleg-import.mjs import <datei.pdf> [...] | watch [input-ordner]");
