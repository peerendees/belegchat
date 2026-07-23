import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withMandant } from "@/lib/db";

const EDGE_URL =
  (process.env.SUPABASE_URL || "https://xuqefeewzdvjhuquciut.supabase.co") +
  "/functions/v1/threema-decrypt";
const ERLAUBTE_MIME = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Originaldokument nachreichen (BER-118) — auch nach Freigabe/Export. Genau EINE
 * Datei; ist bereits eine Seite vorhanden, wird abgelehnt (kein Ersetzen). Hash
 * und Storage laufen über die bestehende Edge-Action; der Beleg-Trigger erlaubt
 * `gobd_hash`/`bild_storage_path` einmalig NULL → Wert.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Ungültige Beleg-ID" }, { status: 400 });
  }
  const token = process.env.DECRYPT_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "DECRYPT_API_TOKEN nicht konfiguriert" }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  const datei = form?.get("datei");
  if (!(datei instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 422 });
  }
  const mime = datei.type;
  if (!ERLAUBTE_MIME.includes(mime)) {
    return NextResponse.json({ error: "Nur JPEG, PNG oder PDF" }, { status: 422 });
  }
  if (datei.size > MAX_BYTES) {
    return NextResponse.json({ error: "Datei größer als 4 MB" }, { status: 413 });
  }

  const beleg = await withMandant(session.mandantId, async (tx) => {
    const rows = await tx`SELECT beleg_nr FROM belege WHERE id = ${id} LIMIT 1`;
    if (rows.length === 0) return null;
    const seiten = await tx`SELECT count(*)::int AS n FROM beleg_seiten WHERE beleg_id = ${id}`;
    return { belegNr: rows[0].beleg_nr as string, hatSeite: (seiten[0].n as number) > 0 };
  });
  if (!beleg) return NextResponse.json({ error: "Beleg nicht gefunden" }, { status: 404 });
  if (beleg.hatSeite) {
    return NextResponse.json(
      { error: "Beleg hat bereits ein Dokument — Ersetzen ist nicht zulässig (GoBD)" },
      { status: 409 },
    );
  }

  const bytes = Buffer.from(await datei.arrayBuffer());
  const base64 = bytes.toString("base64");
  const istPdf = mime === "application/pdf";
  const edgeRes = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(
      istPdf
        ? {
            action: "archive-beleg-pdf",
            mandantId: session.mandantId,
            pdfBase64: base64,
            fileName: datei.name || "nachreichung.pdf",
          }
        : {
            action: "archive-beleg-seite",
            mandantId: session.mandantId,
            imageBase64: base64,
            seiteNr: 1,
            mimeType: mime,
          },
    ),
  });
  const edge = (await edgeRes.json().catch(() => ({}))) as {
    gobdHash?: string;
    storagePath?: string;
    archivedAt?: string;
    duplicate?: boolean;
    error?: string;
  };
  if (edgeRes.status === 409 && edge.duplicate) {
    return NextResponse.json({ error: edge.error || "Duplikat" }, { status: 409 });
  }
  if (!edgeRes.ok || !edge.gobdHash || !edge.storagePath) {
    return NextResponse.json(
      { error: edge.error || "Archivierung fehlgeschlagen" },
      { status: 502 },
    );
  }
  const gobdHash = edge.gobdHash;
  const storagePath = edge.storagePath;
  const archivedAt = edge.archivedAt ?? new Date().toISOString();

  try {
    const result = await withMandant(session.mandantId, async (tx) => {
      const dup = await tx`
        SELECT beleg_nr FROM belege WHERE gobd_hash = ${gobdHash} LIMIT 1`;
      if (dup.length > 0) {
        return {
          status: 409 as const,
          fehler: `Duplikat: Dokument bereits archiviert als ${dup[0].beleg_nr}`,
        };
      }
      await tx`
        INSERT INTO beleg_seiten (beleg_id, seite_nr, storage_path, gobd_hash, mime_type, archived_at)
        VALUES (${id}, 1, ${storagePath}, ${gobdHash}, ${mime}, ${archivedAt})`;
      await tx`
        UPDATE belege
           SET gobd_hash = ${gobdHash}, bild_storage_path = ${storagePath},
               dokument_fehlt = false
         WHERE id = ${id}`;
      await tx`
        INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
        VALUES (${id}, ${session.mandantId}, 'dokument_nachgereicht', null,
                ${`sha256:${gobdHash} (${mime}, archiviert ${archivedAt})`})`;
      return { status: 200 as const, hash: gobdHash };
    });
    if (result.status !== 200) {
      return NextResponse.json({ error: result.fehler }, { status: result.status });
    }
    return NextResponse.json({ ok: true, gobd_hash: result.hash, seiten: 1 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nachreichen fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
