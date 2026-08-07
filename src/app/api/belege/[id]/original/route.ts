import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { edgePdf } from "@/lib/edge";

/**
 * BER-131: Original-Beleg als Gesamt-PDF. Bündelt alle Original-Belegseiten
 * (RLS-geprüft über den Mandanten) in einem PDF — ohne Deckblatt. Der
 * Storage-Zugriff liegt in der Edge Function; die App liefert nur die
 * Metadaten und authentifiziert sich mit dem eng begrenzten DECKBLATT_TOKEN.
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
      SELECT beleg_nr FROM belege WHERE id = ${id} LIMIT 1`;
    if (belege.length === 0) return null;
    const seiten = await tx`
      SELECT storage_path, mime_type FROM beleg_seiten
       WHERE beleg_id = ${id} ORDER BY seite_nr`;
    return { belegNr: belege[0].beleg_nr as string, seiten };
  });
  if (!daten) return NextResponse.json({ error: "Beleg nicht gefunden" }, { status: 404 });
  if (daten.seiten.length === 0) {
    return NextResponse.json(
      { error: "Für diesen Beleg ist noch kein Originaldokument hinterlegt" },
      { status: 422 },
    );
  }

  const result = await edgePdf(token, {
    action: "beleg-original",
    seiten: daten.seiten.map((s) => ({
      storage_path: s.storage_path as string,
      mime_type: s.mime_type as string,
    })),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(new Uint8Array(result.pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Original_${daten.belegNr}.pdf"`,
    },
  });
}
