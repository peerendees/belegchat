import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { withMandant, sql } from "@/lib/db";
import { euro, datum, datumZeit, STATUS_LABELS } from "@/lib/format";
import { FreigabeForm } from "@/components/freigabe-form";
import { LoeschenButton } from "@/components/loeschen-button";
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
    return { beleg: belege[0], seiten, audit };
  });
  if (!daten) notFound();
  const { beleg, seiten, audit } = daten;

  const konten = await sql`
    SELECT konto_nr, bezeichnung FROM skr04_konten
     WHERE ist_aktiv IS NOT false ORDER BY konto_nr`;

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
              {beleg.beleg_typ === "bewirtung" ? (
                <>
                  <dt className="text-muted-foreground">Bewirtung – Anlass</dt>
                  <dd>{(beleg.bewirtung_anlass as string) || "—"}</dd>
                  <dt className="text-muted-foreground">Bewirtung – Teilnehmer</dt>
                  <dd>{(beleg.bewirtung_teilnehmer as string) || "—"}</dd>
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
                anlassInitial={(beleg.bewirtung_anlass as string) ?? ""}
                teilnehmerInitial={(beleg.bewirtung_teilnehmer as string) ?? ""}
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
