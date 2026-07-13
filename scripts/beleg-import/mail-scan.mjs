#!/usr/bin/env node
/**
 * BelegChat Proton-Mail-Scan (BER-97)
 *
 * Zieht PDF-Anhänge aus Proton Mail (via lokal laufender Proton Bridge, IMAP)
 * in den Sichtungsordner `Belege/Input Mail-Scan/`. Von dort schiebst du
 * echte Belege nach kurzer Sichtung in `Belege/Input/` (Watch übernimmt).
 *
 * Konfiguration (belegchat/.env.local):
 *   PROTON_IMAP_HOST / PORT / USER / PASSWORD   (Bridge, Standard 127.0.0.1:1143)
 *   IMPORT_WATCH_DIR                            (…/Belege/Input — Sichtungsordner
 *                                                wird daneben angelegt)
 *
 * Verwendung:
 *   node scripts/beleg-import/mail-scan.mjs [--seit 2024-01-01] [--ordner INBOX]
 *        [--dry] [--ziel /pfad] [--direkt]
 *
 *   --dry     nur auflisten, nichts speichern
 *   --ziel    abweichender Zielordner
 *   --direkt  direkt nach Belege/Input (ohne Sichtung) — bewusst opt-in
 *
 * Bereits verarbeitete Mail-UIDs stehen in `.mail-scan-state.json` im Zielordner-
 * Elternverzeichnis; erneute Läufe ziehen nur Neues. Duplikate sind zusätzlich
 * durch den Hash-Schutz der Pipeline abgesichert.
 */

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { ImapFlow } = require("imapflow");

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

// ---- Argumente --------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const SEIT = new Date(opt("--seit", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)));
const ORDNER = opt("--ordner", "INBOX");
const DRY = flag("--dry");
const WATCH_DIR = process.env.IMPORT_WATCH_DIR || "";
const DEFAULT_ZIEL = flag("--direkt")
  ? WATCH_DIR
  : WATCH_DIR ? join(dirname(WATCH_DIR), "Input Mail-Scan") : "";
const ZIEL = resolve(opt("--ziel", DEFAULT_ZIEL) || fail("Kein Zielordner (IMPORT_WATCH_DIR fehlt und --ziel nicht gesetzt)"));

function fail(msg) {
  console.error(`FEHLER: ${msg}`);
  process.exit(1);
}
for (const v of ["PROTON_IMAP_USER", "PROTON_IMAP_PASSWORD"]) {
  if (!process.env[v]) fail(`${v} fehlt (belegchat/.env.local) — Proton Bridge Zugangsdaten`);
}

// ---- State (verarbeitete UIDs je Ordner) -------------------------------------
const stateFile = join(dirname(ZIEL), ".mail-scan-state.json");
let state = { mailboxes: {} };
if (existsSync(stateFile)) {
  try { state = JSON.parse(readFileSync(stateFile, "utf8")); } catch { /* neu beginnen */ }
}
state.mailboxes[ORDNER] ??= { uids: [] };
const gesehen = new Set(state.mailboxes[ORDNER].uids);

// ---- Helfer -------------------------------------------------------------------
function sauber(s, max = 60) {
  return String(s || "")
    .replace(/[\/\\:*?"<>|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function pdfParts(node, found = []) {
  if (!node) return found;
  const typ = `${node.type || ""}`.toLowerCase();
  const name = sauber(node.dispositionParameters?.filename || node.parameters?.name || "");
  if (typ === "application/pdf" || (name.toLowerCase().endsWith(".pdf") && typ !== "multipart")) {
    found.push({ part: node.part || "1", name: name || "anhang.pdf" });
  }
  for (const child of node.childNodes || []) pdfParts(child, found);
  return found;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

function zielName(datum, absender, dateiname, lfd) {
  const d = datum instanceof Date && !isNaN(datum) ? datum : new Date();
  const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const basis = `${tag} ${sauber(absender, 30)} ${sauber(dateiname.replace(/\.pdf$/i, ""), 40)}${lfd > 1 ? ` (${lfd})` : ""}.pdf`;
  return basis.replace(/\s+/g, " ");
}

// ---- Hauptlauf ----------------------------------------------------------------
const client = new ImapFlow({
  host: process.env.PROTON_IMAP_HOST || "127.0.0.1",
  port: Number(process.env.PROTON_IMAP_PORT || 1143),
  secure: false, // Bridge: STARTTLS auf localhost
  tls: { rejectUnauthorized: false }, // Bridge nutzt ein lokales, selbstsigniertes Zertifikat
  auth: { user: process.env.PROTON_IMAP_USER, pass: process.env.PROTON_IMAP_PASSWORD },
  logger: false,
});

try {
  await client.connect();
  const lock = await client.getMailboxLock(ORDNER);
  let mails = 0, pdfs = 0, neu = 0;
  try {
    if (!DRY) mkdirSync(ZIEL, { recursive: true });
    console.log(`Scanne „${ORDNER}" seit ${SEIT.toISOString().slice(0, 10)} → ${DRY ? "(dry-run)" : ZIEL}`);

    // Wichtig: erst alle Treffer einsammeln — download() während der
    // laufenden fetch()-Iteration blockiert die IMAP-Verbindung (Deadlock).
    const treffer = [];
    for await (const msg of client.fetch(
      { since: SEIT },
      { uid: true, envelope: true, bodyStructure: true },
    )) {
      mails++;
      if (gesehen.has(msg.uid)) continue;
      const parts = pdfParts(msg.bodyStructure);
      if (parts.length === 0) { gesehen.add(msg.uid); continue; }
      treffer.push({
        uid: msg.uid,
        parts,
        absender: msg.envelope?.from?.[0]?.name || msg.envelope?.from?.[0]?.address || "unbekannt",
        datum: msg.envelope?.date,
      });
    }

    for (const t of treffer) {
      let lfd = 0;
      for (const p of t.parts) {
        pdfs++;
        lfd++;
        const name = zielName(t.datum, t.absender, p.name, lfd);
        if (DRY) {
          console.log(`  [dry] ${name}  (UID ${t.uid})`);
          continue;
        }
        const dl = await client.download(String(t.uid), p.part, { uid: true });
        const buf = await streamToBuffer(dl.content);
        if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
          console.log(`  übersprungen (kein PDF-Inhalt): ${name}`);
          continue;
        }
        let ziel = join(ZIEL, name);
        let i = 2;
        while (existsSync(ziel)) ziel = join(ZIEL, name.replace(/\.pdf$/i, ` (${i++}).pdf`));
        writeFileSync(ziel, buf);
        neu++;
        console.log(`  ✓ ${name} (${(buf.length / 1024).toFixed(0)} kB)`);
      }
      gesehen.add(t.uid);
    }
  } finally {
    lock.release();
  }

  if (!DRY) {
    state.mailboxes[ORDNER].uids = [...gesehen];
    writeFileSync(stateFile, JSON.stringify(state));
  }
  console.log(`\nFertig: ${mails} Mails geprüft, ${pdfs} PDF-Anhänge gefunden, ${neu} neu gespeichert.`);
  if (!DRY && neu > 0 && !flag("--direkt")) {
    console.log(`Nächster Schritt: „${ZIEL}" sichten und echte Belege nach „${WATCH_DIR}" verschieben.`);
  }
  await client.logout();
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
