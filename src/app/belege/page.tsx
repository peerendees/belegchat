import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { euro, datum, STATUS_LABELS, ZAHLUNGSWEG_LABELS } from "@/lib/format";
import { LogoutButton } from "@/components/logout-button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function BelegePage({
  searchParams,
}: {
  searchParams: Promise<{ dokument?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const nurFehlt = (await searchParams).dokument === "fehlt";

  const daten = await withMandant(session.mandantId, async (tx) => {
    const belege = await tx`
      SELECT b.id, b.beleg_nr, b.beleg_datum, b.beleg_typ, b.betrag_brutto,
             b.sachkonto, b.status, b.eingangskanal, b.verwendungszweck, b.zahlungsweg,
             b.dokument_fehlt,
             (SELECT count(*)::int FROM beleg_seiten s WHERE s.beleg_id = b.id) AS seiten
        FROM belege b
       ${nurFehlt ? tx`WHERE b.dokument_fehlt` : tx``}
       ORDER BY b.created_at DESC, b.id DESC`;
    const fehlt = await tx`SELECT count(*)::int AS n FROM belege WHERE dokument_fehlt`;
    return { belege, fehltCount: fehlt[0].n as number };
  });
  const belege = daten.belege;

  const offen = belege.filter((b) =>
    ["vorschlag", "klaerungsbedarf"].includes(b.status as string)).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Belege</h1>
          <p className="text-sm text-muted-foreground">
            {session.firmaName || session.threemaId} · {belege.length} Belege ·{" "}
            {offen} zur Freigabe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/belege/neu"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Neuer Beleg
          </Link>
          <Link
            href="/export"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            DATEV-Export
          </Link>
          <LogoutButton />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {nurFehlt ? "Belege ohne Dokument" : "Alle Belege"}
              </CardTitle>
              <CardDescription>Klick auf eine Zeile öffnet die Detailansicht</CardDescription>
            </div>
            {daten.fehltCount > 0 &&
              (nurFehlt ? (
                <Link href="/belege" className="text-sm underline underline-offset-2">
                  Alle anzeigen
                </Link>
              ) : (
                <Link
                  href="/belege?dokument=fehlt"
                  className="text-sm text-amber-800 underline underline-offset-2"
                >
                  Dokument fehlt ({daten.fehltCount})
                </Link>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beleg-Nr</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Verwendungszweck</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead>Konto</TableHead>
                <TableHead>Zahlung</TableHead>
                <TableHead>Kanal</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {belege.map((b) => (
                <TableRow key={b.id as string}>
                  <TableCell>
                    <Link href={`/belege/${b.id}`} className="font-medium underline-offset-2 hover:underline">
                      {b.beleg_nr as string}
                    </Link>
                  </TableCell>
                  <TableCell>{datum(b.beleg_datum)}</TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {(b.verwendungszweck as string) || "—"}
                  </TableCell>
                  <TableCell className="text-right">{euro(b.betrag_brutto)}</TableCell>
                  <TableCell>{(b.sachkonto as string) || "—"}</TableCell>
                  <TableCell>
                    {b.zahlungsweg ? (
                      <span title={ZAHLUNGSWEG_LABELS[b.zahlungsweg as string]?.lang ?? (b.zahlungsweg as string)}>
                        {ZAHLUNGSWEG_LABELS[b.zahlungsweg as string]?.kurz ?? "?"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{b.eingangskanal as string}</TableCell>
                  <TableCell>
                    <span
                      className={
                        b.status === "geprueft" || b.status === "exportiert"
                          ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
                          : "rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                      }
                    >
                      {STATUS_LABELS[b.status as string] ?? (b.status as string)}
                    </span>
                    {b.dokument_fehlt ? (
                      <span
                        className="ml-1 rounded bg-red-100 px-2 py-0.5 text-xs text-red-800"
                        title="Beleg ohne Originaldokument — Nachreichung offen"
                      >
                        ⚠ Beleg fehlt
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {belege.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Noch keine Belege vorhanden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
