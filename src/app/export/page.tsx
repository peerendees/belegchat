import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { euro, datumZeit } from "@/lib/format";
import { ExportForm } from "@/components/export-form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const daten = await withMandant(session.mandantId, async (tx) => {
    const offen = await tx`
      SELECT count(*)::int AS n, COALESCE(sum(betrag_brutto),0) AS summe
        FROM belege WHERE status = 'geprueft'`;
    // Auswaehlbare Jahre aus den tatsaechlich vorhandenen Belegen ableiten —
    // eine feste Spanne um das aktuelle Jahr schliesst aeltere Bestaende aus (BER-115).
    const jahre = await tx`
      SELECT DISTINCT extract(year from beleg_datum)::int AS jahr
        FROM belege WHERE beleg_datum IS NOT NULL ORDER BY jahr DESC`;
    const exporte = await tx`
      SELECT id, buchungsjahr, monat, quartal, zeitraum_typ, anzahl_belege,
             gesamtbetrag_brutto, datei_pfad, created_at
        FROM datev_exporte ORDER BY created_at DESC LIMIT 25`;
    return { offen: offen[0], exporte, jahre: jahre.map((r) => r.jahr as number) };
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Link href="/belege" className="text-sm text-muted-foreground hover:underline">
          ← Zurück zur Belegliste
        </Link>
        <h1 className="text-2xl font-semibold">DATEV-Export</h1>
        <p className="text-sm text-muted-foreground">
          {daten.offen.n as number} freigegebene Belege bereit ({euro(daten.offen.summe)})
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Neuen Buchungsstapel erzeugen</CardTitle>
          <CardDescription>EXTF-Format (SKR04) für den ASCII-Import in DATEV Re:wesen</CardDescription>
        </CardHeader>
        <CardContent>
          <ExportForm jahre={daten.jahre} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bisherige Exporte</CardTitle>
          <CardDescription>Erneuter Download regeneriert die Datei aus den festgeschriebenen Belegen</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Erstellt</TableHead>
                <TableHead>Zeitraum</TableHead>
                <TableHead className="text-right">Belege</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead>Datei</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daten.exporte.map((e) => (
                <TableRow key={e.id as string}>
                  <TableCell className="whitespace-nowrap">{datumZeit(e.created_at)}</TableCell>
                  <TableCell>
                    {e.buchungsjahr as number}{" "}
                    {e.monat ? `M${String(e.monat).padStart(2, "0")}` : e.quartal ? `Q${e.quartal}` : "Jahr"}
                  </TableCell>
                  <TableCell className="text-right">{e.anzahl_belege as number}</TableCell>
                  <TableCell className="text-right">{euro(e.gesamtbetrag_brutto)}</TableCell>
                  <TableCell>
                    <a href={`/api/datev/export/${e.id}`} className="underline underline-offset-2">
                      {e.datei_pfad as string}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
              {daten.exporte.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Noch keine Exporte
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
