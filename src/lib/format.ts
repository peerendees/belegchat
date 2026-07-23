export function euro(betrag: unknown): string {
  if (betrag === null || betrag === undefined) return "—";
  const n = Number(betrag);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/**
 * Zeitzone für alle Datums-/Zeitanzeigen.
 *
 * Wichtig: Die Detailansicht ist eine Server Component und wird auf Vercel
 * gerendert — dort läuft die Runtime in UTC. `getHours()`/`getDate()` würden
 * daher UTC liefern (im Sommer 2 Stunden hinter MESZ), mit zwei Folgen:
 * falsche Uhrzeiten im GoBD-Audit-Log und ein um einen Tag zurückspringendes
 * Datum bei Zeitstempeln zwischen 00:00 und 02:00 MESZ. Deshalb wird überall
 * explizit formatiert statt implizit über die Laufzeit-Zeitzone.
 */
const ZEITZONE = "Europe/Berlin";

function teile(x: Date, optionen: Intl.DateTimeFormatOptions) {
  const gefunden = new Intl.DateTimeFormat("de-DE", {
    timeZone: ZEITZONE,
    ...optionen,
  }).formatToParts(x);
  return (typ: Intl.DateTimeFormatPartTypes) =>
    gefunden.find((t) => t.type === typ)?.value ?? "";
}

// Format: Tag ohne führende Null, Monat zweistellig, Jahr vierstellig — z. B. 7.03.2026
export function datum(d: unknown): string {
  if (!d) return "—";
  const x = new Date(String(d));
  if (Number.isNaN(x.getTime())) return "—";
  const t = teile(x, { day: "numeric", month: "2-digit", year: "numeric" });
  return `${t("day")}.${t("month")}.${t("year")}`;
}

export function datumZeit(d: unknown): string {
  if (!d) return "—";
  const x = new Date(String(d));
  if (Number.isNaN(x.getTime())) return "—";
  const t = teile(x, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${datum(d)} ${t("hour")}:${t("minute")}`;
}

export const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  in_verarbeitung: "In Verarbeitung",
  vorschlag: "Vorschlag",
  klaerungsbedarf: "Klärungsbedarf",
  geprueft: "Geprüft",
  exportiert: "Exportiert",
};

// Zahlungsweg → Gegenkonto (BER-116). Kurzform für die Belegliste, Langform für
// die Detailansicht. Die konkreten Konten stehen an der Firma (1800/1810/2100),
// hier nur die fachliche Bezeichnung.
export const ZAHLUNGSWEG_LABELS: Record<string, { kurz: string; lang: string }> = {
  geschaeftskonto: { kurz: "GK", lang: "Geschäftskonto" },
  alternativkonto: { kurz: "AK", lang: "Andere Karte/Konto" },
  privat: { kurz: "PR", lang: "Privat verauslagt" },
};
