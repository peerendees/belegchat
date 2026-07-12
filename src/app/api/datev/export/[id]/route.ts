import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql, withMandant } from "@/lib/db";
import { generateExtf, type DatevBeleg } from "@/lib/datev";

/**
 * Re-Download eines bestehenden Exports: deterministisch aus der DB
 * regeneriert (Belege sind über datev_export_id verknüpft und
 * festgeschrieben — der Inhalt ist reproduzierbar).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Ungültige Export-ID" }, { status: 400 });
  }

  const daten = await withMandant(session.mandantId, async (tx) => {
    const exporte = await tx`
      SELECT * FROM datev_exporte WHERE id = ${id} LIMIT 1`;
    if (exporte.length === 0) return null;
    const belege = await tx`
      SELECT beleg_nr, beleg_datum, beleg_typ, betrag_brutto, sachkonto, verwendungszweck
        FROM belege WHERE datev_export_id = ${id}
       ORDER BY beleg_datum, beleg_nr`;
    return { exp: exporte[0], belege };
  });
  if (!daten) return NextResponse.json({ error: "Export nicht gefunden" }, { status: 404 });

  const firma = await sql`
    SELECT f.datev_berater_nr, f.datev_mandant_nr, f.datev_gegenkonto
      FROM mandanten m JOIN firmen f ON f.firma_nr = m.firma_nr
     WHERE m.id = ${session.mandantId}`;

  const jahr = Number(daten.exp.buchungsjahr);
  const label = daten.exp.monat
    ? `M${String(daten.exp.monat).padStart(2, "0")}`
    : daten.exp.quartal ? `Q${daten.exp.quartal}` : "Jahr";

  const csv = generateExtf(daten.belege as unknown as DatevBeleg[], {
    beraterNr: firma[0].datev_berater_nr as number | null,
    mandantNr: firma[0].datev_mandant_nr as number | null,
    gegenkonto: firma[0].datev_gegenkonto as string,
    wjBeginn: `${jahr}0101`,
    von: String(daten.exp.zeitraum_von).slice(0, 10).replaceAll("-", ""),
    bis: String(daten.exp.zeitraum_bis).slice(0, 10).replaceAll("-", ""),
    bezeichnung: `BelegChat ${jahr} ${label}`,
    erzeugtAm: new Date(String(daten.exp.created_at)),
    exporterName: session.threemaId,
  });

  return new NextResponse(new Uint8Array(csv), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=windows-1252",
      "Content-Disposition": `attachment; filename="${daten.exp.datei_pfad as string}"`,
    },
  });
}
