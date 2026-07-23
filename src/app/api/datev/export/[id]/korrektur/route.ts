import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { erzeugeKorrektur, KorrekturUnvollstaendig } from "@/lib/datev-versionen";

/**
 * Korrekturfassung eines Buchungsstapels erzeugen (BER-121). Friert die bisherige
 * Fassung ein (falls nötig), legt eine neue Fassung mit Versionsbezug an und
 * markiert die alte als `ersetzt`. Kein stilles Überschreiben.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Ungültige Export-ID" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const grund = body.grund != null ? String(body.grund).trim() : "";
  if (!grund) {
    return NextResponse.json({ error: "Korrekturgrund ist Pflicht" }, { status: 422 });
  }

  try {
    const result = await withMandant(session.mandantId, (tx) =>
      erzeugeKorrektur(tx, id, session.mandantId, grund),
    );
    return new NextResponse(new Uint8Array(result.csv), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=windows-1252",
        "Content-Disposition": `attachment; filename="${result.dateiName}"`,
        "X-Export-Id": result.exportId,
        "X-Version": String(result.version),
      },
    });
  } catch (e) {
    if (e instanceof KorrekturUnvollstaendig) {
      return NextResponse.json({ error: e.message, beleg_nr: e.belegNr }, { status: 409 });
    }
    const msg = e instanceof Error ? e.message : "Korrektur fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
