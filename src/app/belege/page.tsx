import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { euro, datum, STATUS_LABELS } from "@/lib/format";
import { LogoutButton } from "@/components/logout-button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function BelegePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const belege = await withMandant(session.mandantId, (tx) => tx`
    SELECT b.id, b.beleg_nr, b.beleg_datum, b.beleg_typ, b.betrag_brutto,
           b.sachkonto, b.status, b.eingangskanal, b.verwendungszweck,
           (SELECT count(*)::int FROM beleg_seiten s WHERE s.beleg_id = b.id) AS seiten
      FROM belege b
     ORDER BY b.created_at DESC`);

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
        <LogoutButton />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alle Belege</CardTitle>
          <CardDescription>Klick auf eine Zeile öffnet die Detailansicht</CardDescription>
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
                  </TableCell>
                </TableRow>
              ))}
              {belege.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
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
