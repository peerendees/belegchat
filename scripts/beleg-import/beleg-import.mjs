#!/usr/bin/env node
/**
 * BelegChat PDF-Batch-Import (BER-90)
 *
 * Sendet PDF-Belege an den n8n-Webhook `belegchat-import-pdf`.
 * Konfiguration über belegchat/.env.local:
 *   IMPORT_API_TOKEN    (Pflicht — muss identisch in der n8n-Instanz gesetzt sein)
 *   IMPORT_WEBHOOK_URL  (Default: https://n8n.srv1098810.hstgr.cloud/webhook/belegchat-import-pdf)
 *   IMPORT_THREEMA_ID   (Default: BUMFMZ39 — Test-Mandant Firma 01)
 *   IMPORT_WATCH_DIR    (Default-Ordner für `watch`; `{jahr}` wird durch das aktuelle Jahr ersetzt)
 *
 * Verwendung:
 *   node scripts/beleg-import/beleg-import.mjs import <datei.pdf> [weitere.pdf ...]
 *   node scripts/beleg-import/beleg-import.mjs watch [ordner] [--move] [--baseline]
 *
 * Watch-Modus:
 *   Standard (Keep): Dateien bleiben unangetastet liegen (geeignet für die
 *   StB-Ablage in iCloud). Der Fortschritt steht in .beleg-import-state.json
 *   im überwachten Ordner; bereits verarbeitete Dateien werden übersprungen.
 *   Eine Datei gilt erst als bereit, wenn ihre Größe über zwei Scans stabil
 *   ist (iCloud-Sync); .icloud-Platzhalter werden per `brctl download`
 *   angestoßen.
 *
 *   --move:     klassischer Hot-Folder — Erfolg → importiert/, Fehler → fehler/
 *   --baseline: vorhandene PDFs nur als „gesehen" markieren, NICHT importieren
 *               (danach werden nur neu hinzukommende Dateien importiert)
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, renameSync,
  readdirSync, statSync,
} from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_FILE = ".beleg-import-state.json";

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
const WATCH_DIR_TEMPLATE = process.env.IMPORT_WATCH_DIR || "";
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
  return data; // { success, beleg_nr, beleg_id, seiten }
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

function resolveWatchDir(arg) {
  const raw = arg || WATCH_DIR_TEMPLATE;
  if (!raw) fail("Kein Ordner angegeben und IMPORT_WATCH_DIR nicht gesetzt (belegchat/.env.local)");
  return resolve(raw.replaceAll("{jahr}", String(new Date().getFullYear())));
}

function loadState(root) {
  const p = join(root, STATE_FILE);
  if (!existsSync(p)) return { files: {} };
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return { files: {} }; }
}

function saveState(root, state) {
  writeFileSync(join(root, STATE_FILE), JSON.stringify(state, null, 1));
}

/** iCloud-Platzhalter (.<name>.pdf.icloud) → Download anstoßen */
function triggerIcloudDownloads(root) {
  for (const name of readdirSync(root)) {
    if (name.endsWith(".icloud")) {
      try { execFileSync("brctl", ["download", join(root, name)], { stdio: "ignore" }); } catch { /* best effort */ }
    }
  }
}

async function cmdWatch(args) {
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const dirArg = args.find((a) => !a.startsWith("--"));
  const moveMode = flags.has("--move");
  const root = resolveWatchDir(dirArg);
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`Kein Ordner: ${root}`);

  const state = loadState(root);
  const sizes = new Map();

  if (flags.has("--baseline")) {
    let n = 0;
    for (const name of readdirSync(root)) {
      if (!name.toLowerCase().endsWith(".pdf")) continue;
      const st = statSync(join(root, name));
      if (!st.isFile() || state.files[name]) continue;
      state.files[name] = { status: "baseline", size: st.size, at: new Date().toISOString() };
      n++;
    }
    saveState(root, state);
    console.log(`Baseline gesetzt: ${n} vorhandene PDF(s) markiert — nur neue Dateien werden importiert.`);
    return;
  }

  let doneDir, failDir;
  if (moveMode) {
    doneDir = join(root, "importiert");
    failDir = join(root, "fehler");
    mkdirSync(doneDir, { recursive: true });
    mkdirSync(failDir, { recursive: true });
  }

  console.log(`Hot-Folder aktiv (${moveMode ? "Move" : "Keep"}-Modus): ${root}`);
  console.log(`Mandant ${THREEMA_ID} — Ctrl+C zum Beenden`);
  const busy = new Set();

  async function scan() {
    triggerIcloudDownloads(root);
    for (const name of readdirSync(root)) {
      if (!name.toLowerCase().endsWith(".pdf") || busy.has(name)) continue;
      const p = join(root, name);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (!st.isFile()) continue;

      const known = state.files[name];
      if (known && known.size === st.size &&
        ["importiert", "duplikat", "baseline"].includes(known.status)) continue;
      if (known && known.status === "fehler" && known.size === st.size) continue; // erst bei Dateiänderung erneut

      // Stabilitäts-Check: Größe muss über zwei Scans identisch sein (iCloud-Sync)
      const prev = sizes.get(name);
      sizes.set(name, st.size);
      if (prev !== st.size) continue;

      busy.add(name);
      try {
        const r = await importPdf(p);
        if (r.duplicate) {
          state.files[name] = { status: "duplikat", size: st.size, at: new Date().toISOString(), info: r.error };
          console.log(`= ${name} → ${r.error}`);
        } else {
          state.files[name] = { status: "importiert", size: st.size, at: new Date().toISOString(), beleg_nr: r.beleg_nr };
          console.log(`✓ ${name} → Beleg ${r.beleg_nr} (${r.seiten} Seiten)`);
        }
        if (moveMode) renameSync(p, join(doneDir, name));
      } catch (e) {
        state.files[name] = { status: "fehler", size: st.size, at: new Date().toISOString(), error: e.message };
        console.error(`✗ ${name} → ${e.message}`);
        if (moveMode) {
          renameSync(p, join(failDir, name));
          writeFileSync(join(failDir, `${name}.err.txt`), `${new Date().toISOString()}\n${e.message}\n`);
        }
      } finally {
        saveState(root, state);
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
else fail("Unbekanntes Kommando. Verwendung: beleg-import.mjs import <datei.pdf> [...] | watch [ordner] [--move] [--baseline]");
