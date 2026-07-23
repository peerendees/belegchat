import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql, withMandant } from "@/lib/db";

const ZAHLUNGSWEGE = ["geschaeftskonto", "alternativkonto", "privat"] as const;

/**
 * Freigabe eines Belegs: vorschlag/klaerungsbedarf → geprueft.
 * Optional mit Sachkonto-Korrektur (audit: konto_geaendert).
 * Audit: beleg_freigegeben + dokumentation_bestaetigt.
 * Ab geprueft übernimmt der Phase-1-Trigger die Festschreibung.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Ungültige Beleg-ID" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const neuesSachkonto = body.sachkonto ? String(body.sachkonto).trim() : null;
  const anlass = body.bewirtung_anlass != null ? String(body.bewirtung_anlass).trim() : null;
  const teilnehmer = body.bewirtung_teilnehmer != null ? String(body.bewirtung_teilnehmer).trim() : null;
  const trinkgeldRoh = body.trinkgeld != null ? String(body.trinkgeld).replace(",", ".").trim() : null;
  const trinkgeld = trinkgeldRoh && !Number.isNaN(Number(trinkgeldRoh)) ? Number(trinkgeldRoh) : null;
  // Termin-Kontext für Auswärts-Belege (Taxi/Bahn/ÖPNV) — BER-107
  const terminGrund = body.termin_grund != null ? String(body.termin_grund).trim() : null;
  const terminOrt = body.termin_ort != null ? String(body.termin_ort).trim() : null;
  const terminKunde = body.termin_kunde != null ? String(body.termin_kunde).trim() : null;
  // Teilbetrag: nur einen Teil der Rechnung buchen (brutto oder netto) — BER-108
  const teilbetragBasis =
    body.teilbetrag_basis === "brutto" || body.teilbetrag_basis === "netto"
      ? (body.teilbetrag_basis as "brutto" | "netto")
      : null;
  const teilbetragRoh =
    body.teilbetrag_wert != null ? String(body.teilbetrag_wert).replace(",", ".").trim() : null;
  const teilbetragWert =
    teilbetragRoh && !Number.isNaN(Number(teilbetragRoh)) ? Number(teilbetragRoh) : null;
  const teilbetragGrund = body.teilbetrag_grund != null ? String(body.teilbetrag_grund).trim() : null;
  // Vermerk für den Steuerberater (BER-109) — bei Freigabe bestätig-/änderbar.
  const stbVermerk = body.stb_vermerk != null ? String(body.stb_vermerk).trim() : null;

  // Zahlungsweg (BER-116): Pflichtauswahl ohne Vorbelegung. Ein vergessenes
  // Häkchen erzeugt genau den vom StB gemeldeten Abgleichsfehler — deshalb 422
  // statt eines stillen Defaults.
  const zahlungsweg =
    typeof body.zahlungsweg === "string" &&
    (ZAHLUNGSWEGE as readonly string[]).includes(body.zahlungsweg)
      ? (body.zahlungsweg as (typeof ZAHLUNGSWEGE)[number])
      : null;
  if (!zahlungsweg) {
    return NextResponse.json(
      { error: "Zahlungsweg ist Pflicht: Geschäftskonto, anderes Konto oder privat verauslagt" },
      { status: 422 },
    );
  }
  const firma = await sql`
    SELECT f.datev_gegenkonto, f.datev_gegenkonto_alternativ, f.datev_gegenkonto_privat
      FROM mandanten m JOIN firmen f ON f.firma_nr = m.firma_nr
     WHERE m.id = ${session.mandantId}`;
  if (firma.length === 0) {
    return NextResponse.json({ error: "Firma nicht gefunden" }, { status: 404 });
  }
  const gegenkonto =
    zahlungsweg === "geschaeftskonto"
      ? (firma[0].datev_gegenkonto as string)
      : zahlungsweg === "alternativkonto"
        ? (firma[0].datev_gegenkonto_alternativ as string)
        : (firma[0].datev_gegenkonto_privat as string);

  try {
    const result = await withMandant(session.mandantId, async (tx) => {
      const belege = await tx`
        SELECT id, beleg_nr, status, sachkonto, beleg_typ, betrag_brutto, mwst_satz
          FROM belege WHERE id = ${id} LIMIT 1`;
      if (belege.length === 0) return { status: 404 as const };
      const beleg = belege[0];
      if (!["vorschlag", "klaerungsbedarf"].includes(beleg.status as string)) {
        return { status: 409 as const, fehler: `Beleg ist bereits ${beleg.status}` };
      }

      // Bewirtung: Anlass + Teilnehmer sind Pflicht (§ 4 Abs. 5 Nr. 2 EStG)
      if (beleg.beleg_typ === "bewirtung") {
        if (anlass !== null || teilnehmer !== null || trinkgeld !== null) {
          await tx`
            UPDATE belege
               SET bewirtung_anlass = COALESCE(${anlass}, bewirtung_anlass),
                   bewirtung_teilnehmer = COALESCE(${teilnehmer}, bewirtung_teilnehmer),
                   trinkgeld = COALESCE(${trinkgeld}, trinkgeld)
             WHERE id = ${id}`;
        }
        const geprueft = await tx`
          SELECT bewirtung_anlass, bewirtung_teilnehmer FROM belege WHERE id = ${id}`;
        if (!geprueft[0].bewirtung_anlass || !geprueft[0].bewirtung_teilnehmer) {
          return { status: 422 as const, fehler: "Bewirtung: Anlass und Teilnehmer sind Pflichtangaben" };
        }
      }

      // Auswärts-Beleg (Taxi/Bahn/ÖPNV): Grund ist Pflicht (betriebliche
      // Veranlassung), Ort/Kunde optional. Trinkgeld auch hier möglich. — BER-107
      if (beleg.beleg_typ === "auswaerts") {
        if (terminGrund !== null || terminOrt !== null || terminKunde !== null || trinkgeld !== null) {
          await tx`
            UPDATE belege
               SET termin_grund = COALESCE(${terminGrund}, termin_grund),
                   termin_ort   = COALESCE(${terminOrt}, termin_ort),
                   termin_kunde = COALESCE(${terminKunde}, termin_kunde),
                   trinkgeld    = COALESCE(${trinkgeld}, trinkgeld)
             WHERE id = ${id}`;
        }
        const geprueft = await tx`
          SELECT termin_grund FROM belege WHERE id = ${id}`;
        if (!geprueft[0].termin_grund) {
          return { status: 422 as const, fehler: "Auswärts-Beleg: Grund des Termins ist Pflichtangabe" };
        }
      }

      // Teilbetrag buchen (BER-108): nur ein Teil der Rechnung, brutto oder netto
      // eingegeben; Split aus mwst_satz abgeleitet. betrag_* bleibt Dokumentbetrag,
      // gebucht_* trägt den gebuchten Teil. Läuft vor der Festschreibung (Status noch offen).
      if (teilbetragBasis && teilbetragWert !== null && teilbetragWert > 0) {
        const satz = Number(beleg.mwst_satz ?? 0);
        const faktor = 1 + satz / 100;
        const runde = (n: number) => Math.round(n * 100) / 100;
        let gBrutto: number;
        let gNetto: number;
        if (teilbetragBasis === "brutto") {
          gBrutto = teilbetragWert;
          gNetto = faktor > 0 ? gBrutto / faktor : gBrutto;
        } else {
          gNetto = teilbetragWert;
          gBrutto = gNetto * faktor;
        }
        gBrutto = runde(gBrutto);
        gNetto = runde(gNetto);
        const gMwst = runde(gBrutto - gNetto);
        const dokBrutto = Number(beleg.betrag_brutto ?? 0);
        if (dokBrutto > 0 && gBrutto > dokBrutto + 0.005) {
          return {
            status: 422 as const,
            fehler: `Teilbetrag (${gBrutto.toFixed(2)} €) darf den Rechnungsbetrag (${dokBrutto.toFixed(2)} €) nicht übersteigen`,
          };
        }
        await tx`
          UPDATE belege
             SET gebucht_brutto = ${gBrutto}, gebucht_netto = ${gNetto}, gebucht_mwst = ${gMwst},
                 teilbetrag_basis = ${teilbetragBasis}, teilbetrag_grund = ${teilbetragGrund}
           WHERE id = ${id}`;
        await tx`
          INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
          VALUES (${id}, ${session.mandantId}, 'teilbetrag_gebucht',
                  ${dokBrutto.toFixed(2)}, ${`${gBrutto.toFixed(2)} brutto (${teilbetragBasis})`})`;
      }

      // StB-Vermerk übernehmen, solange der Beleg noch offen ist (BER-109).
      if (stbVermerk !== null) {
        await tx`
          UPDATE belege SET stb_vermerk = NULLIF(${stbVermerk}, '') WHERE id = ${id}`;
      }

      if (neuesSachkonto && neuesSachkonto !== beleg.sachkonto) {
        const konto = await tx`
          SELECT konto_nr FROM skr04_konten WHERE konto_nr = ${neuesSachkonto} LIMIT 1`;
        if (konto.length === 0) {
          return { status: 422 as const, fehler: "Unbekanntes Sachkonto" };
        }
        // konto_geaendert + updated_at protokolliert der DB-Trigger belege_audit
        await tx`
          UPDATE belege
             SET sachkonto = ${neuesSachkonto}, sachkonto_manuell_geaendert = true
           WHERE id = ${id}`;
      }

      // Zahlungsweg + aufgelöstes Gegenkonto festschreiben (BER-116), solange der
      // Beleg noch offen ist; der Export nimmt das Gegenkonto danach vom Beleg.
      await tx`
        UPDATE belege SET zahlungsweg = ${zahlungsweg}, gegenkonto = ${gegenkonto}
         WHERE id = ${id}`;
      await tx`
        INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
        VALUES (${id}, ${session.mandantId}, 'zahlungsweg_gesetzt', null,
                ${`${zahlungsweg} → ${gegenkonto}`})`;

      await tx`
        UPDATE belege
           SET status = 'geprueft', geprueft_am = now()
         WHERE id = ${id}`;
      await tx`
        INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
        VALUES
          (${id}, ${session.mandantId}, 'beleg_freigegeben',
           ${beleg.status as string}, 'geprueft'),
          (${id}, ${session.mandantId}, 'dokumentation_bestaetigt',
           null, ${"Freigabe durch " + session.threemaId})`;

      return { status: 200 as const, beleg_nr: beleg.beleg_nr as string };
    });

    if (result.status === 200) {
      return NextResponse.json({ ok: true, beleg_nr: result.beleg_nr });
    }
    return NextResponse.json(
      { error: result.fehler ?? "Beleg nicht gefunden" },
      { status: result.status },
    );
  } catch (e) {
    // z. B. Phase-1-Trigger (Festschreibung) — Meldung durchreichen, keine Details loggen
    const msg = e instanceof Error ? e.message : "Fehler bei der Freigabe";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
