import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql, withMandant } from "@/lib/db";
import { generateExtf, extfDateiname, type DatevBeleg } from "@/lib/datev";

/**
 * Erzeugt einen DATEV-Buchungsstapel (EXTF-CSV) über alle freigegebenen
 * Belege (status = geprueft) des Zeitraums, legt datev_exporte an und
 * überführt die Belege nach 'exportiert' (+ datev_export_id, export_datum).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const jahr = Number(body.jahr);
  const monat = body.monat ? Number(body.monat) : null;
  const quartal = body.quartal ? Number(body.quartal) : null;
  if (!Number.isInteger(jahr) || jahr < 2020 || jahr > 2100 ||
      (monat !== null && (monat < 1 || monat > 12)) ||
      (quartal !== null && (quartal < 1 || quartal > 4)) ||
      (monat !== null && quartal !== null)) {
    return NextResponse.json({ error: "Ungültiger Zeitraum" }, { status: 400 });
  }

  const vonMonat = monat ?? (quartal ? (quartal - 1) * 3 + 1 : 1);
  const bisMonat = monat ?? (quartal ? quartal * 3 : 12);
  const von = `${jahr}-${String(vonMonat).padStart(2, "0")}-01`;
  const bisDate = new Date(Date.UTC(jahr, bisMonat, 0));
  const bis = bisDate.toISOString().slice(0, 10);
  const zeitraumTyp = monat ? "monat" : quartal ? "quartal" : "jahr";
  const zeitraumLabel = monat ? `M${String(monat).padStart(2, "0")}` : quartal ? `Q${quartal}` : "Jahr";

  const firma = await sql`
    SELECT f.datev_berater_nr, f.datev_mandant_nr, f.datev_gegenkonto, f.firma_name
      FROM mandanten m JOIN firmen f ON f.firma_nr = m.firma_nr
     WHERE m.id = ${session.mandantId}`;
  if (firma.length === 0) {
    return NextResponse.json({ error: "Firma nicht gefunden" }, { status: 404 });
  }

  try {
    const result = await withMandant(session.mandantId, async (tx) => {
      const belege = await tx`
        SELECT id, beleg_nr, beleg_datum, beleg_typ, betrag_brutto, sachkonto, verwendungszweck,
               trinkgeld, termin_grund, termin_ort, termin_kunde, gebucht_brutto, stb_vermerk
          FROM belege
         WHERE status = 'geprueft'
           AND beleg_datum BETWEEN ${von} AND ${bis}
         ORDER BY beleg_datum, beleg_nr
         FOR UPDATE`;
      if (belege.length === 0) return null;

      // Summen mit dem gebuchten (Teil-)Betrag, sonst dem Dokumentbetrag (BER-108).
      const summen = await tx`
        SELECT COALESCE(sum(COALESCE(gebucht_brutto, betrag_brutto)),0) AS brutto,
               COALESCE(sum(COALESCE(gebucht_netto, betrag_netto)),0) AS netto,
               COALESCE(sum(COALESCE(gebucht_mwst, mwst_betrag)),0) AS mwst
          FROM belege
         WHERE status = 'geprueft' AND beleg_datum BETWEEN ${von} AND ${bis}`;

      const dateiName = extfDateiname(jahr, zeitraumLabel);
      const exporte = await tx`
        INSERT INTO datev_exporte
          (buchungsjahr, monat, quartal, zeitraum_von, zeitraum_bis, zeitraum_typ,
           anzahl_belege, gesamtbetrag_brutto, gesamtbetrag_netto, gesamtbetrag_mwst,
           datei_pfad, status, mandant_id)
        VALUES (${jahr}, ${monat}, ${quartal}, ${von}, ${bis}, ${zeitraumTyp},
                ${belege.length}, ${summen[0].brutto}, ${summen[0].netto}, ${summen[0].mwst},
                ${dateiName}, 'erstellt', ${session.mandantId})
        RETURNING id`;
      const exportId = exporte[0].id as string;

      const ids = belege.map((b) => b.id as string);
      await tx`
        UPDATE belege
           SET status = 'exportiert', datev_export_id = ${exportId}, export_datum = now()
         WHERE id = ANY(${ids})`;
      await tx`
        INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
        SELECT b.id, ${session.mandantId}, 'export', 'geprueft', ${dateiName}
          FROM belege b WHERE b.id = ANY(${ids})`;

      return { exportId, dateiName, belege };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Keine freigegebenen Belege im Zeitraum" }, { status: 404 });
    }

    const csv = generateExtf(result.belege as unknown as DatevBeleg[], {
      beraterNr: firma[0].datev_berater_nr as number | null,
      mandantNr: firma[0].datev_mandant_nr as number | null,
      gegenkonto: firma[0].datev_gegenkonto as string,
      wjBeginn: `${jahr}0101`,
      von: von.replaceAll("-", ""),
      bis: bis.replaceAll("-", ""),
      bezeichnung: `BelegChat ${jahr} ${zeitraumLabel}`,
      erzeugtAm: new Date(),
      exporterName: session.threemaId,
    });

    return new NextResponse(new Uint8Array(csv), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=windows-1252",
        "Content-Disposition": `attachment; filename="${result.dateiName}"`,
        "X-Export-Id": result.exportId,
        "X-Anzahl-Belege": String(result.belege.length),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Export fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
