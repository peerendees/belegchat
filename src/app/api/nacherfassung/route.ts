import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { friereExportEin } from "@/lib/datev-versionen";

const ZAHLUNGSWEGE = ["geschaeftskonto", "alternativkonto", "privat"] as const;

/**
 * Nacherfassung des Altbestands (BER-119): setzt bei festgeschriebenen Belegen
 * einmalig Zahlungsweg (+ aufgelöstes Gegenkonto) und Steuerschlüssel. Ein
 * transaktionaler Batch; vor der ersten Änderung wird die Erstfassung des
 * betroffenen Exports eingefroren (BER-121). Kein Statuswechsel.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const eintraege: Array<{ beleg_id?: unknown; zahlungsweg?: unknown; bu_schluessel?: unknown }> =
    Array.isArray(body.eintraege) ? body.eintraege : [];
  if (eintraege.length === 0) {
    return NextResponse.json({ error: "Keine Einträge" }, { status: 422 });
  }

  try {
    const result = await withMandant(session.mandantId, async (tx) => {
      const firma = await tx`
        SELECT f.firma_nr, f.datev_gegenkonto, f.datev_gegenkonto_alternativ, f.datev_gegenkonto_privat
          FROM mandanten m JOIN firmen f ON f.firma_nr = m.firma_nr
         WHERE m.id = ${session.mandantId}`;
      if (firma.length === 0) {
        return { fehler: "Firma nicht gefunden", status: 404 as const };
      }
      const konten: Record<string, string> = {
        geschaeftskonto: firma[0].datev_gegenkonto as string,
        alternativkonto: firma[0].datev_gegenkonto_alternativ as string,
        privat: firma[0].datev_gegenkonto_privat as string,
      };
      const schluesselRows = await tx`
        SELECT bu_schluessel FROM steuerschluessel
         WHERE firma_nr = ${firma[0].firma_nr} AND typ = 'vorsteuer' AND aktiv`;
      const gueltig = new Set(schluesselRows.map((r) => r.bu_schluessel as string));

      // 1) Validierung — erste Verletzung rollt die Transaktion zurück.
      const gepruefte: Array<{ belegId: string; zahlungsweg: string; buSchluessel: string | null }> =
        [];
      for (const e of eintraege) {
        const belegId = String(e?.beleg_id ?? "");
        if (!/^[0-9a-f-]{36}$/.test(belegId)) {
          return { fehler: "Ungültige Beleg-ID", status: 422 as const };
        }
        const zahlungsweg = String(e?.zahlungsweg ?? "");
        if (!(ZAHLUNGSWEGE as readonly string[]).includes(zahlungsweg)) {
          return { fehler: "Ungültiger Zahlungsweg", status: 422 as const };
        }
        const rows = await tx`
          SELECT b.status, b.zahlungsweg, b.beleg_nr, k.vorsteuer_relevant
            FROM belege b JOIN skr04_konten k ON k.konto_nr = b.sachkonto
           WHERE b.id = ${belegId}`;
        if (rows.length === 0) {
          return { fehler: "Beleg nicht gefunden", status: 422 as const };
        }
        const b = rows[0];
        const belegNr = b.beleg_nr as string;
        if (b.status !== "exportiert") {
          return { fehler: `${belegNr}: nicht exportiert`, status: 422 as const, belegNr };
        }
        if (b.zahlungsweg !== null) {
          return { fehler: `${belegNr}: bereits nacherfasst`, status: 422 as const, belegNr };
        }
        const bu =
          e?.bu_schluessel != null && String(e.bu_schluessel).trim() !== ""
            ? String(e.bu_schluessel).trim()
            : null;
        if (bu !== null) {
          if (b.vorsteuer_relevant !== true) {
            return {
              fehler: `${belegNr}: Steuerschlüssel nur bei vorsteuerrelevantem Konto`,
              status: 422 as const,
              belegNr,
            };
          }
          if (!gueltig.has(bu)) {
            return { fehler: `${belegNr}: unbekannter Steuerschlüssel`, status: 422 as const, belegNr };
          }
        }
        gepruefte.push({ belegId, zahlungsweg, buSchluessel: bu });
      }

      // 2) Einfrier-Guard: betroffene Exporte VOR der ersten Belegänderung einfrieren
      //    (regeneriert die Erstfassung aus den noch unveränderten Belegen).
      const belegIds = gepruefte.map((g) => g.belegId);
      const exporte = await tx`
        SELECT DISTINCT datev_export_id FROM belege
         WHERE id = ANY(${belegIds}) AND datev_export_id IS NOT NULL`;
      for (const ex of exporte) {
        await friereExportEin(tx, ex.datev_export_id as string, session.mandantId);
      }

      // 3) Anwenden + Audit (Anlass fest im neuer_wert).
      for (const g of gepruefte) {
        const gegenkonto = konten[g.zahlungsweg];
        await tx`
          UPDATE belege SET zahlungsweg = ${g.zahlungsweg}, gegenkonto = ${gegenkonto},
                            bu_schluessel = ${g.buSchluessel}
           WHERE id = ${g.belegId}`;
        await tx`
          INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
          VALUES (${g.belegId}, ${session.mandantId}, 'nacherfassung_zahlungsweg', null,
                  ${`${g.zahlungsweg} → ${gegenkonto} — Anlass: StB-Rückmeldung 22.07.2026`})`;
        if (g.buSchluessel !== null) {
          await tx`
            INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
            VALUES (${g.belegId}, ${session.mandantId}, 'nacherfassung_steuerschluessel', null,
                    ${`${g.buSchluessel} — Anlass: StB-Rückmeldung 22.07.2026`})`;
        }
      }

      return {
        ok: true as const,
        belege: gepruefte.length,
        eingefroren: exporte.map((e) => e.datev_export_id as string),
      };
    });

    if ("fehler" in result) {
      return NextResponse.json(
        { error: result.fehler, beleg_nr: "belegNr" in result ? result.belegNr : undefined },
        { status: result.status },
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nacherfassung fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
