export function euro(betrag: unknown): string {
  if (betrag === null || betrag === undefined) return "—";
  const n = Number(betrag);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

// Format: Tag ohne führende Null, Monat zweistellig, Jahr vierstellig — z. B. 7.03.2026
export function datum(d: unknown): string {
  if (!d) return "—";
  const x = new Date(String(d));
  if (Number.isNaN(x.getTime())) return "—";
  return `${x.getDate()}.${String(x.getMonth() + 1).padStart(2, "0")}.${x.getFullYear()}`;
}

export function datumZeit(d: unknown): string {
  if (!d) return "—";
  const x = new Date(String(d));
  if (Number.isNaN(x.getTime())) return "—";
  const zeit = `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
  return `${datum(d)} ${zeit}`;
}

export const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  in_verarbeitung: "In Verarbeitung",
  vorschlag: "Vorschlag",
  klaerungsbedarf: "Klärungsbedarf",
  geprueft: "Geprüft",
  exportiert: "Exportiert",
};
