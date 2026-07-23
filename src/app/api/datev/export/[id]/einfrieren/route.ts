import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";
import { friereExportEin } from "@/lib/datev-versionen";

/**
 * Erstfassung eines Exports einfrieren (BER-121): Inhalt + SHA-256 festhalten,
 * bevor eine Nacherfassung die Belege verändert. Idempotent (no-op, wenn bereits
 * eingefroren). Wird auch vom Nacherfassungs-Commit (BER-119) automatisch gerufen;
 * diese Route erlaubt den manuellen Anstoß über die Export-Liste.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Ungültige Export-ID" }, { status: 400 });
  }

  try {
    await withMandant(session.mandantId, (tx) => friereExportEin(tx, id, session.mandantId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Einfrieren fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
