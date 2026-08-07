/**
 * Aufruf der Edge Function threema-decrypt für PDF-Aktionen (Deckblatt,
 * Original-Download). Kapselt Auth mit dem eng begrenzten DECKBLATT_TOKEN und
 * einen automatischen einmaligen Retry gegen transiente Edge-Fehler
 * (Cold-Start beim npm:pdf-lib-Import — einmaliger 500, danach fehlerfrei). BER-131.
 */
const EDGE_URL =
  (process.env.SUPABASE_URL || "https://xuqefeewzdvjhuquciut.supabase.co") +
  "/functions/v1/threema-decrypt";

type EdgePdfResult =
  | { ok: true; pdf: Buffer }
  | { ok: false; error: string; status: number };

/**
 * Ruft eine PDF-erzeugende Edge-Aktion auf und liefert das PDF als Buffer.
 * Wiederholt genau einmal bei transientem Fehler (5xx oder Netzwerkfehler);
 * fachliche 4xx-Fehler mit Meldung werden ohne Retry durchgereicht.
 */
export async function edgePdf(
  token: string,
  payload: Record<string, unknown>,
): Promise<EdgePdfResult> {
  let lastError = "Edge Function nicht erreichbar";
  let lastStatus = 502;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.pdfBase64) {
        return { ok: true, pdf: Buffer.from(data.pdfBase64 as string, "base64") };
      }
      lastError = (data.error as string) || "PDF-Erzeugung fehlgeschlagen";
      lastStatus = res.status >= 400 && res.status < 500 ? res.status : 502;
      // Fachlicher Client-Fehler (4xx mit Meldung): kein Retry, direkt zurück.
      if (res.status >= 400 && res.status < 500 && data.error) {
        return { ok: false, error: lastError, status: lastStatus };
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Edge Function nicht erreichbar";
      lastStatus = 502;
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 300));
  }

  return { ok: false, error: lastError, status: lastStatus };
}
