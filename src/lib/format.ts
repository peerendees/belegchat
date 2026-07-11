export function euro(betrag: unknown): string {
  if (betrag === null || betrag === undefined) return "—";
  const n = Number(betrag);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export function datum(d: unknown): string {
  if (!d) return "—";
  return new Date(String(d)).toLocaleDateString("de-DE");
}

export function datumZeit(d: unknown): string {
  if (!d) return "—";
  return new Date(String(d)).toLocaleString("de-DE");
}

export const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  in_verarbeitung: "In Verarbeitung",
  vorschlag: "Vorschlag",
  klaerungsbedarf: "Klärungsbedarf",
  geprueft: "Geprüft",
  exportiert: "Exportiert",
};
