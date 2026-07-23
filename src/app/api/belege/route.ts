import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";

const MWST_SAETZE = [0, 5, 7, 16, 19];
const BELEG_TYPEN = [
  "eingangsrechnung",
  "ausgangsrechnung",
  "quittung",
  "gutschrift",
  "sonstiges",
  "bewirtung",
  "auswaerts",
];

/**
 * Manuell erfasster Beleg ohne Originaldokument (BER-118). Nummernvergabe wie beim
 * automatischen Eingang; Status `vorschlag`, `dokument_fehlt = true`. Das Dokument
 * wird später über `POST /api/belege/[id]/dokument` nachgereicht.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const belegDatum = typeof body.beleg_datum === "string" ? body.beleg_datum.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(belegDatum) || Number.isNaN(new Date(belegDatum).getTime())) {
    return NextResponse.json({ error: "Belegdatum ist Pflicht (JJJJ-MM-TT)" }, { status: 422 });
  }
  const bruttoRoh =
    body.betrag_brutto != null ? String(body.betrag_brutto).replace(",", ".").trim() : "";
  const brutto = Number(bruttoRoh);
  if (!bruttoRoh || Number.isNaN(brutto) || brutto <= 0) {
    return NextResponse.json({ error: "Betrag (brutto) ist Pflicht" }, { status: 422 });
  }
  const mwstSatz = body.mwst_satz != null ? Number(body.mwst_satz) : 19;
  if (!MWST_SAETZE.includes(mwstSatz)) {
    return NextResponse.json({ error: "MwSt-Satz muss 0, 5, 7, 16 oder 19 sein" }, { status: 422 });
  }
  const verwendungszweck =
    typeof body.verwendungszweck === "string" ? body.verwendungszweck.trim() : "";
  if (!verwendungszweck) {
    return NextResponse.json({ error: "Verwendungszweck ist Pflicht" }, { status: 422 });
  }
  const sachkonto = typeof body.sachkonto === "string" ? body.sachkonto.trim() : "";
  const belegTyp =
    body.beleg_typ == null || body.beleg_typ === ""
      ? "sonstiges"
      : typeof body.beleg_typ === "string" && BELEG_TYPEN.includes(body.beleg_typ)
        ? body.beleg_typ
        : null;
  if (belegTyp === null) {
    return NextResponse.json({ error: "Ungültiger Beleg-Typ" }, { status: 422 });
  }
  const nutzerVermerk = typeof body.stb_vermerk === "string" ? body.stb_vermerk.trim() : "";

  const runde = (n: number) => Math.round(n * 100) / 100;
  const netto = runde(brutto / (1 + mwstSatz / 100));
  const mwstBetrag = runde(brutto - netto);
  const vermerk =
    "Beleg folgt — ohne Originaldokument erfasst." + (nutzerVermerk ? ` ${nutzerVermerk}` : "");

  try {
    const result = await withMandant(session.mandantId, async (tx) => {
      const konto = await tx`
        SELECT 1 FROM skr04_konten WHERE konto_nr = ${sachkonto} AND ist_aktiv IS NOT false LIMIT 1`;
      if (konto.length === 0) return { status: 422 as const, fehler: "Unbekanntes Sachkonto" };

      const nr = await tx`SELECT naechste_beleg_nr(${session.mandantId}) AS r`;
      const belegNr = (nr[0].r as { beleg_nr: string }).beleg_nr;

      const ins = await tx`
        INSERT INTO belege
          (beleg_nr, mandant_id, eingangskanal, status, beleg_datum, betrag_brutto, betrag_netto,
           mwst_satz, mwst_betrag, beleg_typ, verwendungszweck, sachkonto,
           sachkonto_manuell_geaendert, stb_vermerk, dokument_fehlt)
        VALUES
          (${belegNr}, ${session.mandantId}, 'frontend_upload', 'vorschlag', ${belegDatum},
           ${brutto}, ${netto}, ${mwstSatz}, ${mwstBetrag}, ${belegTyp}, ${verwendungszweck},
           ${sachkonto}, true, ${vermerk}, true)
        RETURNING id`;
      const id = ins[0].id as string;
      await tx`
        INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
        VALUES (${id}, ${session.mandantId}, 'erstellt', null, 'manuell erfasst ohne Dokument')`;
      return { status: 201 as const, id, belegNr };
    });

    if (result.status !== 201) {
      return NextResponse.json({ error: result.fehler }, { status: result.status });
    }
    return NextResponse.json(
      { ok: true, id: result.id, beleg_nr: result.belegNr },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Anlage fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
