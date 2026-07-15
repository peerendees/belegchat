import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";

/**
 * Löscht einen Beleg-Entwurf (Status neu/vorschlag/klaerungsbedarf).
 * Festgeschriebene Belege (geprueft/exportiert) sind durch RLS-Policy und
 * Phase-1-Trigger doppelt geschützt. Der Datei-Hash wird frei — dieselbe PDF
 * kann danach neu erfasst werden (Duplikatschutz bleibt für alles Übrige aktiv).
 * Storage-Original bleibt als Waise bestehen (unkritisch: Entwurf, neuer
 * Import erzeugt ohnehin einen neuen Pfad).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Ungültige Beleg-ID" }, { status: 400 });
  }

  try {
    const result = await withMandant(session.mandantId, async (tx) => {
      const belege = await tx`SELECT beleg_nr, status FROM belege WHERE id = ${id} LIMIT 1`;
      if (belege.length === 0) return { status: 404 as const };
      if (!["neu", "vorschlag", "klaerungsbedarf"].includes(belege[0].status as string)) {
        return { status: 409 as const, fehler: `Beleg ist ${belege[0].status} und kann nicht gelöscht werden` };
      }
      // Seiten zuerst (Beleg existiert noch → RLS-Policy greift), dann Beleg
      await tx`DELETE FROM beleg_seiten WHERE beleg_id = ${id}`;
      await tx`DELETE FROM belege WHERE id = ${id}`;
      return { status: 200 as const, beleg_nr: belege[0].beleg_nr as string };
    });

    if (result.status === 200) {
      return NextResponse.json({ ok: true, beleg_nr: result.beleg_nr });
    }
    return NextResponse.json(
      { error: result.fehler ?? "Beleg nicht gefunden" },
      { status: result.status },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
