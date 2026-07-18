import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";

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
  const trinkgeldRoh = body.bewirtung_trinkgeld != null ? String(body.bewirtung_trinkgeld).replace(",", ".").trim() : null;
  const trinkgeld = trinkgeldRoh && !Number.isNaN(Number(trinkgeldRoh)) ? Number(trinkgeldRoh) : null;

  try {
    const result = await withMandant(session.mandantId, async (tx) => {
      const belege = await tx`
        SELECT id, beleg_nr, status, sachkonto, beleg_typ FROM belege WHERE id = ${id} LIMIT 1`;
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
                   bewirtung_trinkgeld = COALESCE(${trinkgeld}, bewirtung_trinkgeld)
             WHERE id = ${id}`;
        }
        const geprueft = await tx`
          SELECT bewirtung_anlass, bewirtung_teilnehmer FROM belege WHERE id = ${id}`;
        if (!geprueft[0].bewirtung_anlass || !geprueft[0].bewirtung_teilnehmer) {
          return { status: 422 as const, fehler: "Bewirtung: Anlass und Teilnehmer sind Pflichtangaben" };
        }
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
