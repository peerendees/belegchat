#!/usr/bin/env node
/**
 * BelegChat PDF-Batch-Import (BER-90)
 *
 * Sendet PDF-Belege an den n8n-Webhook `belegchat-import-pdf`.
 * Konfiguration über belegchat/.env.local:
 *   IMPORT_API_TOKEN    (Pflicht — muss identisch in der n8n-Instanz gesetzt sein)
 *   IMPORT_WEBHOOK_URL  (Default: https://n8n.srv1098810.hstgr.cloud/webhook/belegchat-import-pdf)
 *   IMPORT_THREEMA_ID   (Default: BUMFMZ39 — Test-Mandant Firma 01)
 *
 * Verwendung:
 *   node scripts/beleg-import/beleg-import.mjs import <datei.pdf> [weitere.pdf ...]
 *   node scripts/beleg-import/beleg-import.mjs watch <ordner>
 *
 * Watch-Modus (Hot-Folder): prüft alle 5 s auf neue PDFs; erfolgreich
 * importierte Dateien wandern nach <ordner>/importiert/, fehlgeschlagene
 * nach <ordner>/fehler/ (inkl. <name>.err.txt mit der Fehlermeldung).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, statSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
      console.log(`✓ ${basename(f)} → Beleg ${r.beleg_nr} (${r.seiten} Seiten, id ${r.beleg_id})`);
    } catch (e) {
      errors++;
      console.error(`✗ ${basename(f)} → ${e.message}`);
    }
  }
  process.exit(errors ? 1 : 0);
}

async function cmdWatch(dir) {
  if (!dir) fail("Kein Ordner angegeben. Verwendung: watch <ordner>");
  const root = resolve(dir);
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`Kein Ordner: ${root}`);
  const doneDir = join(root, "importiert");
  const failDir = join(root, "fehler");
  mkdirSync(doneDir, { recursive: true });
  mkdirSync(failDir, { recursive: true });

  console.log(`Hot-Folder aktiv: ${root} (Mandant ${THREEMA_ID}) — Ctrl+C zum Beenden`);
  const busy = new Set();

  async function scan() {
    for (const name of readdirSync(root)) {
      if (!name.toLowerCase().endsWith(".pdf") || busy.has(name)) continue;
      const p = join(root, name);
      if (!statSync(p).isFile()) continue;
      busy.add(name);
      try {
        const r = await importPdf(p);
        renameSync(p, join(doneDir, name));
        console.log(`✓ ${name} → Beleg ${r.beleg_nr} (${r.seiten} Seiten)`);
      } catch (e) {
        renameSync(p, join(failDir, name));
        writeFileSync(join(failDir, `${name}.err.txt`), `${new Date().toISOString()}\n${e.message}\n`);
        console.error(`✗ ${name} → ${e.message} (verschoben nach fehler/)`);
      } finally {
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
else if (cmd === "watch") cmdWatch(args[0]);
else fail("Unbekanntes Kommando. Verwendung: beleg-import.mjs import <datei.pdf> [...] | watch <ordner>");
