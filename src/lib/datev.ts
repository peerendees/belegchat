/**
 * DATEV-Format (EXTF) — Buchungsstapel, Version 700 / Formatversion 9.
 * Struktur verifiziert gegen die produktiv genutzte ERPNext-DATEV-Implementierung
 * (alyf-de/erpnext_datev): 120 Spalten, Semikolon, Latin-1, Beträge mit Komma,
 * Umsatz immer positiv + Soll/Haben-Kennzeichen.
 */

export type DatevBeleg = {
  beleg_nr: string;
  beleg_datum: string; // ISO date
  beleg_typ: string | null;
  betrag_brutto: string | number;
  sachkonto: string;
  verwendungszweck: string | null;
  trinkgeld?: string | number | null;
  gebucht_brutto?: string | number | null;
  stb_vermerk?: string | null;
  termin_grund?: string | null;
  termin_ort?: string | null;
  termin_kunde?: string | null;
  // Am Beleg festgeschriebenes Gegenkonto (BER-116); Fallback auf die
  // Firmenkonstante nur für Altbestand ohne Wert.
  gegenkonto?: string | null;
  // DATEV-BU-/Steuerschlüssel (BER-117), Spalte 9; NULL = ohne Schlüssel.
  bu_schluessel?: string | null;
  // Beleg ohne Originaldokument erfasst (BER-118) → Kennzeichnung im Stapel.
  dokument_fehlt?: boolean | null;
};

export type DatevMeta = {
  beraterNr: number | null;
  mandantNr: number | null;
  gegenkonto: string;
  wjBeginn: string; // YYYYMMDD
  von: string; // YYYYMMDD
  bis: string; // YYYYMMDD
  bezeichnung: string; // max 30
  erzeugtAm: Date;
  exporterName: string;
};

/** Formatversion 9 — alle 120 Spalten müssen vorhanden sein. */
export const TRANSACTION_COLUMNS = [
  "Umsatz (ohne Soll/Haben-Kz)", "Soll/Haben-Kennzeichen", "WKZ Umsatz", "Kurs",
  "Basis-Umsatz", "WKZ Basis-Umsatz", "Konto", "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel", "Belegdatum", "Belegfeld 1", "Belegfeld 2", "Skonto",
  "Buchungstext", "Postensperre", "Diverse Adressnummer", "Geschäftspartnerbank",
  "Sachverhalt", "Zinssperre", "Beleglink",
  "Beleginfo - Art 1", "Beleginfo - Inhalt 1", "Beleginfo - Art 2", "Beleginfo - Inhalt 2",
  "Beleginfo - Art 3", "Beleginfo - Inhalt 3", "Beleginfo - Art 4", "Beleginfo - Inhalt 4",
  "Beleginfo - Art 5", "Beleginfo - Inhalt 5", "Beleginfo - Art 6", "Beleginfo - Inhalt 6",
  "Beleginfo - Art 7", "Beleginfo - Inhalt 7", "Beleginfo - Art 8", "Beleginfo - Inhalt 8",
  "KOST1 - Kostenstelle", "KOST2 - Kostenstelle", "KOST-Menge",
  "EU-Mitgliedstaat u. USt-IdNr.", "EU-Steuersatz", "Abw. Versteuerungsart",
  "Sachverhalt L+L", "Funktionsergänzung L+L", "BU 49 Hauptfunktionstyp",
  "BU 49 Hauptfunktionsnummer", "BU 49 Funktionsergänzung",
  "Zusatzinformation - Art 1", "Zusatzinformation - Inhalt 1",
  "Zusatzinformation - Art 2", "Zusatzinformation - Inhalt 2",
  "Zusatzinformation - Art 3", "Zusatzinformation - Inhalt 3",
  "Zusatzinformation - Art 4", "Zusatzinformation - Inhalt 4",
  "Zusatzinformation - Art 5", "Zusatzinformation - Inhalt 5",
  "Zusatzinformation - Art 6", "Zusatzinformation - Inhalt 6",
  "Zusatzinformation - Art 7", "Zusatzinformation - Inhalt 7",
  "Zusatzinformation - Art 8", "Zusatzinformation - Inhalt 8",
  "Zusatzinformation - Art 9", "Zusatzinformation - Inhalt 9",
  "Zusatzinformation - Art 10", "Zusatzinformation - Inhalt 10",
  "Zusatzinformation - Art 11", "Zusatzinformation - Inhalt 11",
  "Zusatzinformation - Art 12", "Zusatzinformation - Inhalt 12",
  "Zusatzinformation - Art 13", "Zusatzinformation - Inhalt 13",
  "Zusatzinformation - Art 14", "Zusatzinformation - Inhalt 14",
  "Zusatzinformation - Art 15", "Zusatzinformation - Inhalt 15",
  "Zusatzinformation - Art 16", "Zusatzinformation - Inhalt 16",
  "Zusatzinformation - Art 17", "Zusatzinformation - Inhalt 17",
  "Zusatzinformation - Art 18", "Zusatzinformation - Inhalt 18",
  "Zusatzinformation - Art 19", "Zusatzinformation - Inhalt 19",
  "Zusatzinformation - Art 20", "Zusatzinformation - Inhalt 20",
  "Stück", "Gewicht", "Zahlweise", "Forderungsart", "Veranlagungsjahr",
  "Zugeordnete Fälligkeit", "Skontotyp", "Auftragsnummer", "Buchungstyp",
  "USt-Schlüssel (Anzahlungen)", "EU-Mitgliedstaat (Anzahlungen)",
  "Sachverhalt L+L (Anzahlungen)", "EU-Steuersatz (Anzahlungen)",
  "Erlöskonto (Anzahlungen)", "Herkunft-Kz", "Leerfeld", "KOST-Datum",
  "SEPA-Mandatsreferenz", "Skontosperre", "Gesellschaftername",
  "Beteiligtennummer", "Identifikationsnummer", "Zeichnernummer",
  "Postensperre bis", "Bezeichnung SoBil-Sachverhalt", "Kennzeichen SoBil-Buchung",
  "Festschreibung", "Leistungsdatum", "Datum Zuord. Steuerperiode", "Fälligkeit",
  "Generalumkehr (GU)", "Steuersatz", "Land",
] as const;

/**
 * Zeichen, die Latin-1 (ISO-8859-1) nicht kennt. Ohne Ersetzung schneidet
 * Buffer.from(…, "latin1") beim Schreiben das High-Byte ab und erzeugt Müll —
 * aus „–" (U+2013) wird z. B. das Steuerzeichen 0x13, aus „€" ein „¬".
 * Betrifft auch frei eingegebene Texte (Verwendungszweck, Termin-/Teilbetrag-Grund).
 */
const LATIN1_ERSATZ: Record<string, string> = {
  "–": "-", "—": "-", "‐": "-", "‑": "-", // – — ‐ ‑
  "„": '"', "“": '"', "”": '"',                 // „ " "
  "‚": "'", "‘": "'", "’": "'",                 // ‚ ' '
  "…": "...", "€": "EUR", "•": "-", "→": "->", // … € • →
  " ": " ",                                                // geschütztes Leerzeichen
};

function latin1Sicher(s: string): string {
  return [...s]
    .map((c) => LATIN1_ERSATZ[c] ?? ((c.codePointAt(0) ?? 0) <= 0xff ? c : "?"))
    .join("");
}

function q(s: string): string {
  // Erst auf Latin-1 reduzieren (Dateikodierung), dann DATEV-Escaping:
  // doppelte Anführungszeichen verdoppeln, Feldtrenner/Zeilenumbrüche entschärfen.
  const sicher = latin1Sicher(s).replace(/"/g, '""').replace(/[;\r\n]/g, " ");
  return '"' + sicher + '"';
}

function betrag(v: string | number): string {
  const n = Math.abs(Number(v));
  return n.toFixed(2).replace(".", ",");
}

function ttmm(isoDate: string): string {
  // Explizite Zeitzone statt getDate()/getMonth(): Letztere richten sich nach der
  // Laufzeit-Zeitzone. Ein reines DATE kommt als UTC-Mitternacht an — bei negativem
  // UTC-Offset läge das Belegdatum im DATEV-Stapel dann einen Tag zurück.
  const d = new Date(isoDate);
  const t = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(d);
  const teil = (typ: Intl.DateTimeFormatPartTypes) =>
    t.find((x) => x.type === typ)?.value ?? "";
  return teil("day") + teil("month");
}

/** Header-Zeile 1 (31 Felder) — Aufbau wie ERPNext-DATEV. */
function headerLine(meta: DatevMeta): string {
  const ts = meta.erzeugtAm;
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  const erzeugt =
    `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}` +
    `${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}000`;

  const fields = [
    '"EXTF"', "700", "21", '"Buchungsstapel"', "9",
    erzeugt,
    "",            // Importiert am
    '"BC"',        // Herkunft (2 Zeichen, wird beim Import durch SV ersetzt)
    q(meta.exporterName.slice(0, 25)), // Exportiert von
    "",            // Importiert von
    String(meta.beraterNr ?? 0),
    String(meta.mandantNr ?? 0),
    meta.wjBeginn,
    "4",           // Sachkontenlänge
    meta.von,
    meta.bis,
    q(meta.bezeichnung.slice(0, 30)),
    "",            // Diktatkürzel
    "1",           // Buchungstyp: Finanzbuchführung
    "0",           // Rechnungslegungszweck: unabhängig
    "0",           // Festschreibung (StB schreibt beim Import fest)
    '"EUR"',
    "",            // reserviert
    "",            // Derivatskennzeichen
    "", "",        // reserviert
    '"04"',        // SKR
    "",            // Branchen-Lösungs-ID
    "", "",        // reserviert
    "",            // Anwendungsinformation
  ];
  return fields.join(";");
}

function belegRow(b: DatevBeleg, meta: DatevMeta): string {
  const habenTypen = ["gutschrift", "ausgangsrechnung"];
  const sh = habenTypen.includes(b.beleg_typ ?? "") ? "H" : "S";
  const row: string[] = new Array(TRANSACTION_COLUMNS.length).fill("");
  // Gebuchter Betrag = Teilbetrag falls gesetzt, sonst voller Dokumentbetrag (BER-108).
  row[0] = betrag(b.gebucht_brutto ?? b.betrag_brutto); // Umsatz (immer positiv)
  row[1] = q(sh);                          // Soll/Haben
  row[2] = q("EUR");                       // WKZ
  row[6] = b.sachkonto;                    // Konto
  // Gegenkonto (ohne BU): am Beleg festgeschriebenes Konto (BER-116),
  // Fallback auf die Firmenkonstante nur für Altbestand ohne Wert.
  row[7] = b.gegenkonto ?? meta.gegenkonto;
  // BU-Schlüssel (Spalte 9, Index 8): Vorsteuerschlüssel je Beleg (BER-117);
  // leer bei Belegen ohne Vorsteuer. Numerisches Feld — unquoted wie Konto.
  row[8] = b.bu_schluessel ?? "";
  row[9] = ttmm(b.beleg_datum);            // Belegdatum TTMM
  row[10] = q(b.beleg_nr.slice(0, 36));    // Belegfeld 1
  let text = b.verwendungszweck || b.beleg_nr;
  // Auswärts-Beleg: Termin-Kontext in den Buchungstext (betriebliche Veranlassung).
  if (b.beleg_typ === "auswaerts") {
    const kontext = [b.termin_grund, b.termin_ort, b.termin_kunde]
      .map((v) => (v ?? "").trim())
      .filter(Boolean)
      .join(" · ");
    if (kontext) text += ` - ${kontext}`;
  }
  if (b.trinkgeld != null && Number(b.trinkgeld) > 0) {
    text += ` zzgl. Trinkgeld ${betrag(b.trinkgeld)}`;
  }
  if (b.gebucht_brutto != null) {
    text += " (Teilbetrag)";
  }
  row[13] = q(text.slice(0, 60)); // Buchungstext (DATEV: max. 60 Zeichen)

  // Vermerk für den Steuerberater in die dafür vorgesehenen Zusatzinformations-
  // Felder — nicht in den Buchungstext, der ist mit 60 Zeichen schon knapp (BER-109).
  if (b.stb_vermerk) {
    const artIdx = (TRANSACTION_COLUMNS as readonly string[]).indexOf(
      "Zusatzinformation - Art 1",
    );
    if (artIdx >= 0) {
      row[artIdx] = q("Hinweis");
      row[artIdx + 1] = q(b.stb_vermerk.slice(0, 210)); // DATEV: max. 210 Zeichen
    }
  }

  // Beleg ohne Originaldokument (BER-118): eigenes Zusatzinformations-Feld, damit
  // der Steuerberater die noch offene Nachreichung im Stapel erkennt.
  if (b.dokument_fehlt) {
    const artIdx = (TRANSACTION_COLUMNS as readonly string[]).indexOf(
      "Zusatzinformation - Art 2",
    );
    if (artIdx >= 0) {
      row[artIdx] = q("Beleg");
      row[artIdx + 1] = q("fehlt bei Übergabe");
    }
  }

  return row.join(";");
}

/** Erzeugt den vollständigen EXTF-Inhalt als Latin-1-Buffer. */
export function generateExtf(belege: DatevBeleg[], meta: DatevMeta): Buffer {
  const lines = [
    headerLine(meta),
    TRANSACTION_COLUMNS.map((c) => q(c)).join(";"),
    ...belege.map((b) => belegRow(b, meta)),
  ];
  return Buffer.from(lines.join("\r\n") + "\r\n", "latin1");
}

export function extfDateiname(jahr: number, zeitraumLabel: string): string {
  return `EXTF_Buchungsstapel_${jahr}_${zeitraumLabel}.csv`;
}
