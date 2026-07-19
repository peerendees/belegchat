import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { euro, datum } from "@/lib/format";

const EDGE_URL =
  (process.env.SUPABASE_URL || "https://xuqefeewzdvjhuquciut.supabase.co") +
  "/functions/v1/threema-decrypt";

/**
 * Deckblatt als PDF: Kopfseite mit den Pflicht-/Kontext-Angaben + Original-
 * Belegseiten. Gerendert von der Edge Function (dort liegt der Storage-Zugriff);
 * die App liefert nur RLS-geprüfte Metadaten (Titel + Feldliste) und
 * authentifiziert sich mit dem eng begrenzten DECKBLATT_TOKEN.
 *
 * Zwei Ausprägungen (BER-99 Bewirtung, BER-107 Auswärtstermin) teilen denselben
 * Renderer; hier wird nur die Feldliste je Beleg-Typ zusammengestellt.
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
             sachkonto, verwendungszweck, bewirtung_anlass, bewirtung_teilnehmer,
             termin_grund, termin_ort, termin_kunde, trinkgeld
        FROM belege WHERE id = ${id} LIMIT 1`;
    if (belege.length === 0) return null;
    const seiten = await tx`
      SELECT storage_path, mime_type FROM beleg_seiten
       WHERE beleg_id = ${id} ORDER BY seite_nr`;
    return { beleg: belege[0], seiten };
  });
  if (!daten) return NextResponse.json({ error: "Beleg nicht gefunden" }, { status: 404 });

  const { beleg, seiten } = daten;
  const brutto = Number(beleg.betrag_brutto ?? 0);
  const trinkgeld = Number(beleg.trinkgeld ?? 0);
  const mwst = `${euro(beleg.mwst_betrag)}${beleg.mwst_satz ? ` (${beleg.mwst_satz} %)` : ""}`;

  let action: "bewirtung-deckblatt" | "termin-deckblatt";
  let titel: string;
  let untertitel: string;
  let fusszeile: string;
  let felder: Array<[string, string]>;
  let dateiPrefix: string;

  if (beleg.beleg_typ === "bewirtung") {
    if (!beleg.bewirtung_anlass || !beleg.bewirtung_teilnehmer) {
      return NextResponse.json(
        { error: "Anlass und Teilnehmer zuerst erfassen (Freigabe-Formular)" },
        { status: 422 },
      );
    }
    action = "bewirtung-deckblatt";
    titel = "Bewirtungsbeleg";
    untertitel = "Angaben nach § 4 Abs. 5 Nr. 2 EStG";
    fusszeile = "Die 70/30-Aufteilung der abziehbaren Bewirtungskosten erfolgt in der Buchhaltung.";
    dateiPrefix = "Bewirtung";
    felder = [
      ["Beleg-Nr.", String(beleg.beleg_nr)],
      ["Datum der Bewirtung", datum(beleg.beleg_datum)],
      ["Gaststätte / Ort", (beleg.verwendungszweck as string) || "—"],
      ["Rechnungsbetrag (brutto)", euro(brutto)],
      ["davon MwSt", mwst],
      ["Trinkgeld", beleg.trinkgeld != null ? euro(trinkgeld) : "—"],
      ["Gesamtaufwand", euro(brutto + trinkgeld)],
      ["Anlass der Bewirtung", beleg.bewirtung_anlass as string],
      ["Bewirtete Personen", beleg.bewirtung_teilnehmer as string],
      ["SKR04-Konto", beleg.sachkonto as string],
    ];
  } else if (beleg.beleg_typ === "auswaerts") {
    if (!beleg.termin_grund) {
      return NextResponse.json(
        { error: "Grund des Termins zuerst erfassen (Freigabe-Formular)" },
        { status: 422 },
      );
    }
    action = "termin-deckblatt";
    titel = "Auswärtstermin";
    untertitel = "Reisekosten — Nachweis der betrieblichen Veranlassung";
    fusszeile = "Grund, Ort und Kunde belegen die betriebliche Veranlassung der Fahrt.";
    dateiPrefix = "Termin";
    felder = [
      ["Beleg-Nr.", String(beleg.beleg_nr)],
      ["Belegdatum", datum(beleg.beleg_datum)],
      ["Beschreibung", (beleg.verwendungszweck as string) || "—"],
      ["Betrag (brutto)", euro(brutto)],
      ["davon MwSt", mwst],
      ["Trinkgeld", beleg.trinkgeld != null ? euro(trinkgeld) : "—"],
      ["Gesamtaufwand", euro(brutto + trinkgeld)],
      ["Grund des Termins", beleg.termin_grund as string],
      ["Ort", (beleg.termin_ort as string) || "—"],
      ["Kunde / Geschäftspartner", (beleg.termin_kunde as string) || "—"],
      ["SKR04-Konto", beleg.sachkonto as string],
    ];
  } else {
    return NextResponse.json({ error: "Für diesen Beleg-Typ gibt es kein Deckblatt" }, { status: 422 });
  }

  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action,
      angaben: {
        titel,
        untertitel,
        felder,
        fusszeile,
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
      "Content-Disposition": `attachment; filename="${dateiPrefix}_${beleg.beleg_nr as string}.pdf"`,
    },
  });
}
