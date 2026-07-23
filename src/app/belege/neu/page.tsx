import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { sql } from "@/lib/db";
import { BelegNeuForm } from "@/components/beleg-neu-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function BelegNeuPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const konten = await sql`
    SELECT konto_nr, bezeichnung FROM skr04_konten
     WHERE ist_aktiv IS NOT false ORDER BY konto_nr`;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <Link href="/belege" className="text-sm text-muted-foreground hover:underline">
          ← Zurück zur Belegliste
        </Link>
        <h1 className="text-2xl font-semibold">Neuer Beleg</h1>
        <p className="text-sm text-muted-foreground">
          Buchungsbeleg ohne Originaldokument erfassen — das Dokument wird später nachgereicht.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Belegdaten</CardTitle>
          <CardDescription>
            Der Beleg ist danach freigebbar; im DATEV-Stapel als „Beleg fehlt bei Übergabe“
            gekennzeichnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BelegNeuForm
            konten={konten.map((k) => ({
              konto_nr: k.konto_nr as string,
              bezeichnung: k.bezeichnung as string,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
