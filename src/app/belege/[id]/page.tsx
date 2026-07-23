import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { withMandant, sql } from "@/lib/db";
import { euro, datum, datumZeit, STATUS_LABELS, ZAHLUNGSWEG_LABELS } from "@/lib/format";
import { FreigabeForm } from "@/components/freigabe-form";
import { LoeschenButton } from "@/components/loeschen-button";
import { BelegNavigation } from "@/components/beleg-navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function BelegDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const daten = await withMandant(session.mandantId, async (tx) => {
    const belege = await tx`
      SELECT * FROM belege WHERE id = ${id} LIMIT 1`;
    if (belege.length === 0) return null;
    const seiten = await tx`
      SELECT seite_nr, storage_path, gobd_hash, mime_type, archived_at
        FROM beleg_seiten WHERE beleg_id = ${id} ORDER BY seite_nr`;
    const audit = await tx`
      SELECT aktion, alter_wert, neuer_wert, created_at
        FROM audit_log WHERE beleg_id = ${id} ORDER BY created_at, id`;
    // Nachbarn in Listenreihenfolge (created_at DESC, id DESC) — BER-112.
    // Zusammengesetzter Schlüssel, damit die Navigation auch bei gleichem
    // created_at (Batch-Import) eindeutig bleibt.
    //
    // Der Vergleichswert wird bewusst NICHT über JavaScript gereicht:
    // created_at hat in Postgres Mikrosekunden, ein JS-Date nur Millisekunden.
    // Der gekürzte Wert erfüllte die '>'-Bedingung des eigenen Datensatzes —
    // "vorheriger Beleg" zeigte dadurch auf den Beleg selbst.
    const vorher = await tx`
      SELECT id FROM belege
       WHERE (created_at, id) > (SELECT created_at, id FROM belege WHERE id = ${id})
       ORDER BY created_at ASC, id ASC LIMIT 1`;
    const naechster = await tx`
      SELECT id FROM belege
       WHERE (created_at, id) < (SELECT created_at, id FROM belege WHERE id = ${id})
       ORDER BY created_at DESC, id DESC LIMIT 1`;
    return {
      beleg: belege[0],
      seiten,
      audit,
      vorherId: (vorher[0]?.id as string) ?? null,
      naechsterId: (naechster[0]?.id as string) ?? null,
    };
  });
  if (!daten) notFound();
  const { beleg, seiten, audit, vorherId, naechsterId } = daten;

  const konten = await sql`
    SELECT konto_nr, bezeichnung FROM skr04_konten
     WHERE ist_aktiv IS NOT false ORDER BY konto_nr`;

  // Firmen-Gegenkonten für die Zahlungsweg-Auswahl (BER-116).
  const firmaKonten = await sql`
    SELECT f.datev_gegenkonto, f.datev_gegenkonto_alternativ, f.datev_gegenkonto_privat
      FROM mandanten m JOIN firmen f ON f.firma_nr = m.firma_nr
     WHERE m.id = ${session.mandantId}`;
  const zahlungswegKonten = {
    geschaeftskonto: (firmaKonten[0]?.datev_gegenkonto as string) ?? "1800",
    alternativkonto: (firmaKonten[0]?.datev_gegenkonto_alternativ as string) ?? "1810",
    privat: (firmaKonten[0]?.datev_gegenkonto_privat as string) ?? "2100",
  };

  const offen = ["vorschlag", "klaerungsbedarf"].includes(beleg.status as string);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/belege" className="text-sm text-muted-foreground hover:underline">
            ← Zurück zur Liste
          </Link>
          <h1 className="text-2xl font-semibold">{beleg.beleg_nr as string}</h1>
        </div>
        <div className="flex items-center gap-3">
          <BelegNavigation vorherId={vorherId} naechsterId={naechsterId} />
          <span
            className={
              offen
                ? "rounded bg-amber-100 px-3 py-1 text-sm text-amber-800"
                : "rounded bg-green-100 px-3 py-1 text-sm text-green-800"
            }
          >
            {STATUS_LABELS[beleg.status as string] ?? (beleg.status as string)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Belegdaten</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Belegdatum</dt>
              <dd>{datum(beleg.beleg_datum)}</dd>
              <dt className="text-muted-foreground">Typ</dt>
              <dd>{(beleg.beleg_typ as string) || "—"}</dd>
              <dt className="text-muted-foreground">Brutto</dt>
              <dd>{euro(beleg.betrag_brutto)}</dd>
              <dt className="text-muted-foreground">Netto</dt>
              <dd>{euro(beleg.betrag_netto)}</dd>
              <dt className="text-muted-foreground">MwSt</dt>
              <dd>
                {euro(beleg.mwst_betrag)}
                {beleg.mwst_satz ? ` (${beleg.mwst_satz} %)` : ""}
              </dd>
              <dt className="text-muted-foreground">Verwendungszweck</dt>
              <dd>{(beleg.verwendungszweck as string) || "—"}</dd>
              <dt className="text-muted-foreground">Sachkonto</dt>
              <dd>
                {beleg.sachkonto as string}
                {beleg.sachkonto_manuell_geaendert ? " (manuell)" : " (KI)"}
              </dd>
              <dt className="text-muted-foreground">Eingangskanal</dt>
              <dd>{beleg.eingangskanal as string}</dd>
              <dt className="text-muted-foreground">Zahlungsweg</dt>
              <dd>
                {beleg.zahlungsweg
                  ? `${ZAHLUNGSWEG_LABELS[beleg.zahlungsweg as string]?.lang ?? (beleg.zahlungsweg as string)} (${(beleg.gegenkonto as string) ?? "—"})`
                  : "—"}
              </dd>
              {beleg.stb_vermerk ? (
                <>
                  <dt className="text-muted-foreground">StB-Vermerk</dt>
                  <dd className="text-amber-800">{beleg.stb_vermerk as string}</dd>
                </>
              ) : null}
              {beleg.gebucht_brutto != null ? (
                <>
                  <dt className="text-muted-foreground">Gebucht (Teilbetrag)</dt>
                  <dd>
                    {euro(beleg.gebucht_brutto)} brutto · {euro(beleg.gebucht_netto)} netto
                    {beleg.teilbetrag_grund ? ` — ${beleg.teilbetrag_grund as string}` : ""}
                  </dd>
                </>
              ) : null}
              {beleg.beleg_typ === "bewirtung" ? (
                <>
                  <dt className="text-muted-foreground">Bewirtung – Anlass</dt>
                  <dd>{(beleg.bewirtung_anlass as string) || "—"}</dd>
                  <dt className="text-muted-foreground">Bewirtung – Teilnehmer</dt>
                  <dd>{(beleg.bewirtung_teilnehmer as string) || "—"}</dd>
                  <dt className="text-muted-foreground">Trinkgeld</dt>
                  <dd>{beleg.trinkgeld != null ? euro(beleg.trinkgeld) : "—"}</dd>
                  {beleg.bewirtung_anlass && beleg.bewirtung_teilnehmer ? (
                    <>
                      <dt className="text-muted-foreground">Deckblatt</dt>
                      <dd>
                        <a
                          href={`/api/belege/${id}/deckblatt`}
                          className="underline underline-offset-2"
                        >
                          Bewirtungsbeleg als PDF (Deckblatt + Original)
                        </a>
                      </dd>
                    </>
                  ) : null}
                </>
              ) : null}
              {beleg.beleg_typ === "auswaerts" ? (
                <>
                  <dt className="text-muted-foreground">Termin – Grund</dt>
                  <dd>{(beleg.termin_grund as string) || "—"}</dd>
                  <dt className="text-muted-foreground">Termin – Ort</dt>
                  <dd>{(beleg.termin_ort as string) || "—"}</dd>
                  <dt className="text-muted-foreground">Termin – Kunde</dt>
                  <dd>{(beleg.termin_kunde as string) || "—"}</dd>
                  <dt className="text-muted-foreground">Trinkgeld</dt>
                  <dd>{beleg.trinkgeld != null ? euro(beleg.trinkgeld) : "—"}</dd>
                  {beleg.termin_grund ? (
                    <>
                      <dt className="text-muted-foreground">Deckblatt</dt>
                      <dd>
                        <a
                          href={`/api/belege/${id}/deckblatt`}
                          className="underline underline-offset-2"
                        >
                          Termin-Deckblatt als PDF (Deckblatt + Original)
                        </a>
                      </dd>
                    </>
                  ) : null}
                </>
              ) : null}
              <dt className="text-muted-foreground">GoBD-Hash</dt>
              <dd className="truncate font-mono text-xs">{(beleg.gobd_hash as string) || "—"}</dd>
              {beleg.geprueft_am ? (
                <>
                  <dt className="text-muted-foreground">Geprüft am</dt>
                  <dd>{datumZeit(beleg.geprueft_am)}</dd>
                </>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {offen ? (
            <div className="space-y-3">
              <FreigabeForm
                belegId={id}
                aktuellesSachkonto={beleg.sachkonto as string}
                konten={konten.map((k) => ({
                  konto_nr: k.konto_nr as string,
                  bezeichnung: k.bezeichnung as string,
                }))}
                istBewirtung={beleg.beleg_typ === "bewirtung"}
                istAuswaerts={beleg.beleg_typ === "auswaerts"}
                anlassInitial={(beleg.bewirtung_anlass as string) ?? ""}
                teilnehmerInitial={(beleg.bewirtung_teilnehmer as string) ?? ""}
                trinkgeldInitial={beleg.trinkgeld != null ? String(beleg.trinkgeld) : ""}
                grundInitial={(beleg.termin_grund as string) ?? ""}
                ortInitial={(beleg.termin_ort as string) ?? ""}
                kundeInitial={(beleg.termin_kunde as string) ?? ""}
                erlaubtTeilbetrag={!["bewirtung", "auswaerts"].includes(beleg.beleg_typ as string)}
                betragBrutto={Number(beleg.betrag_brutto ?? 0)}
                mwstSatz={Number(beleg.mwst_satz ?? 0)}
                teilbetragBasisInitial={(beleg.teilbetrag_basis as string) ?? ""}
                teilbetragWertInitial={
                  beleg.gebucht_brutto != null
                    ? String(beleg.teilbetrag_basis === "netto" ? beleg.gebucht_netto : beleg.gebucht_brutto)
                    : ""
                }
                teilbetragGrundInitial={(beleg.teilbetrag_grund as string) ?? ""}
                stbVermerkInitial={(beleg.stb_vermerk as string) ?? ""}
                zahlungswegKonten={zahlungswegKonten}
              />
              <div className="flex justify-end">
                <LoeschenButton belegId={id} belegNr={beleg.beleg_nr as string} />
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Dieser Beleg ist festgeschrieben (GoBD) und kann nicht mehr
                geändert werden.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Seiten ({seiten.length})</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {seiten.map((s) => (
                <div key={s.seite_nr as number} className="border-b py-2 last:border-0">
                  <div className="flex justify-between">
                    <span>Seite {s.seite_nr as number} · {s.mime_type as string}</span>
                    <span className="text-muted-foreground">{datumZeit(s.archived_at)}</span>
                  </div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    sha256:{s.gobd_hash as string}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Audit-Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeitpunkt</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Alt</TableHead>
                <TableHead>Neu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{datumZeit(a.created_at)}</TableCell>
                  <TableCell>{a.aktion as string}</TableCell>
                  <TableCell className="max-w-[160px] truncate">{(a.alter_wert as string) || "—"}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{(a.neuer_wert as string) || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
