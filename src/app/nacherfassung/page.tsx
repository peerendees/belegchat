import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { euro, datum } from "@/lib/format";
import { NacherfassungForm } from "@/components/nacherfassung-form";

export const dynamic = "force-dynamic";

/**
 * Nacherfassung des Altbestands (BER-119): exportierte Belege, denen Zahlungsweg
 * (BER-116) oder Steuerschlüssel (BER-117) fehlen. Die Felder dürfen bei
 * festgeschriebenen Belegen einmalig NULL → Wert gesetzt werden; der Commit läuft
 * als ein transaktionaler Batch (kein Statuswechsel).
 */
export default async function NacherfassungPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const daten = await withMandant(session.mandantId, async (tx) => {
    const belege = await tx`
      SELECT b.id, b.beleg_nr, b.beleg_datum, b.betrag_brutto, b.verwendungszweck,
             b.sachkonto, b.mwst_satz, b.zahlungsweg, b.bu_schluessel,
             k.vorsteuer_relevant
        FROM belege b
        JOIN skr04_konten k ON k.konto_nr = b.sachkonto
       WHERE b.status = 'exportiert'
         AND (b.zahlungsweg IS NULL OR (b.bu_schluessel IS NULL AND k.vorsteuer_relevant))
       ORDER BY b.beleg_datum, b.beleg_nr`;
    const steuerschluessel = await tx`
      SELECT s.bu_schluessel, s.bezeichnung, s.mwst_satz
        FROM steuerschluessel s
        JOIN mandanten m ON m.firma_nr = s.firma_nr
       WHERE m.id = ${session.mandantId} AND s.typ = 'vorsteuer' AND s.aktiv
       ORDER BY s.mwst_satz DESC`;
    const firma = await tx`
      SELECT f.datev_gegenkonto, f.datev_gegenkonto_alternativ, f.datev_gegenkonto_privat
        FROM mandanten m JOIN firmen f ON f.firma_nr = m.firma_nr
       WHERE m.id = ${session.mandantId}`;
    return { belege, steuerschluessel, firma: firma[0] };
  });

  const buOptionen = daten.steuerschluessel.map((s) => ({
    schluessel: s.bu_schluessel as string,
    bezeichnung: s.bezeichnung as string,
  }));
  const schluesselFuerSatz = (satz: unknown) =>
    (daten.steuerschluessel.find((s) => Number(s.mwst_satz) === Number(satz))
      ?.bu_schluessel as string) ?? null;

  const rows = daten.belege.map((b) => {
    const vorsteuerRelevant = b.vorsteuer_relevant === true;
    return {
      id: b.id as string,
      belegNr: b.beleg_nr as string,
      datum: datum(b.beleg_datum),
      betrag: euro(b.betrag_brutto),
      zweck: (b.verwendungszweck as string) || "—",
      sachkonto: b.sachkonto as string,
      vorsteuerRelevant,
      buVorschlag: vorsteuerRelevant ? schluesselFuerSatz(b.mwst_satz) : null,
    };
  });

  const mitSchluessel = rows.filter((r) => r.vorsteuerRelevant).length;
  const zahlungswegKonten = {
    geschaeftskonto: (daten.firma?.datev_gegenkonto as string) ?? "1800",
    alternativkonto: (daten.firma?.datev_gegenkonto_alternativ as string) ?? "1810",
    privat: (daten.firma?.datev_gegenkonto_privat as string) ?? "2100",
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link href="/export" className="text-sm text-muted-foreground hover:underline">
          ← Zurück zum Export
        </Link>
        <h1 className="text-2xl font-semibold">Nacherfassung Altbestand</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} offen · {mitSchluessel} mit Schlüssel-Vorschlag · Anlass:
          StB-Rückmeldung 22.07.2026
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          Kein Beleg offen — alle exportierten Belege tragen Zahlungsweg und (sofern
          vorsteuerrelevant) Steuerschlüssel.
        </p>
      ) : (
        <NacherfassungForm
          rows={rows}
          buOptionen={buOptionen}
          zahlungswegKonten={zahlungswegKonten}
        />
      )}
    </main>
  );
}
