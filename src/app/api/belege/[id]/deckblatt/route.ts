import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { euro, datum } from "@/lib/format";

const EDGE_URL =
  (process.env.SUPABASE_URL || "https://xuqefeewzdvjhuquciut.supabase.co") +
  "/functions/v1/threema-decrypt";

/**
 * Bewirtungs-Deckblatt als PDF: Kopfseite mit den Pflichtangaben
 * (§ 4 Abs. 5 Nr. 2 EStG) + Original-Belegseiten. Gerendert von der
 * Edge Function (dort liegt der Storage-Zugriff); die App liefert nur
 * RLS-geprüfte Metadaten und authentifiziert sich mit dem eng
 * begrenzten DECKBLATT_TOKEN.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Ungültige Beleg-ID" }, { status: 400 });
  }
  const token = process.env.DECKBLATT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "DECKBLATT_TOKEN nicht konfiguriert" }, { status: 500 });
  }

  const daten = await withMandant(session.mandantId, async (tx) => {
    const belege = await tx`
      SELECT beleg_nr, beleg_typ, beleg_datum, betrag_brutto, mwst_betrag, mwst_satz,
             sachkonto, verwendungszweck, bewirtung_anlass, bewirtung_teilnehmer, bewirtung_trinkgeld
        FROM belege WHERE id = ${id} LIMIT 1`;
    if (belege.length === 0) return null;
    const seiten = await tx`
      SELECT storage_path, mime_type FROM beleg_seiten
       WHERE beleg_id = ${id} ORDER BY seite_nr`;
    return { beleg: belege[0], seiten };
  });
  if (!daten) return NextResponse.json({ error: "Beleg nicht gefunden" }, { status: 404 });

  const { beleg, seiten } = daten;
  if (beleg.beleg_typ !== "bewirtung") {
    return NextResponse.json({ error: "Kein Bewirtungsbeleg" }, { status: 422 });
  }
  if (!beleg.bewirtung_anlass || !beleg.bewirtung_teilnehmer) {
    return NextResponse.json(
      { error: "Anlass und Teilnehmer zuerst erfassen (Freigabe-Formular)" },
      { status: 422 },
    );
  }

  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: "bewirtung-deckblatt",
      angaben: {
        beleg_nr: beleg.beleg_nr,
        beleg_datum: datum(beleg.beleg_datum),
        lieferant: beleg.verwendungszweck || "—",
        betrag_brutto: euro(beleg.betrag_brutto),
        mwst: `${euro(beleg.mwst_betrag)}${beleg.mwst_satz ? ` (${beleg.mwst_satz} %)` : ""}`,
        anlass: beleg.bewirtung_anlass,
        teilnehmer: beleg.bewirtung_teilnehmer,
        trinkgeld: beleg.bewirtung_trinkgeld != null ? euro(beleg.bewirtung_trinkgeld) : "—",
        gesamt: euro(Number(beleg.betrag_brutto ?? 0) + Number(beleg.bewirtung_trinkgeld ?? 0)),
        sachkonto: beleg.sachkonto,
        erstellt: datum(new Date().toISOString()),
      },
      seiten: seiten.map((s) => ({
        storage_path: s.storage_path as string,
        mime_type: s.mime_type as string,
      })),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.pdfBase64) {
    return NextResponse.json(
      { error: data.error || "Deckblatt-Erzeugung fehlgeschlagen" },
      { status: 502 },
    );
  }

  const pdf = Buffer.from(data.pdfBase64 as string, "base64");
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Bewirtung_${beleg.beleg_nr as string}.pdf"`,
    },
  });
}
