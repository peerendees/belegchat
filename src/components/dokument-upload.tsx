"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Originaldokument an einen Beleg nachreichen (BER-118). Genau eine Datei; nach dem
 * Upload hängt das Dokument mit Hash am Beleg und die „Dokument fehlt"-Kennzeichnung
 * entfällt.
 */
export function DokumentUpload({ belegId }: { belegId: string }) {
  const router = useRouter();
  const [datei, setDatei] = useState<File | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function hochladen() {
    if (!datei) return;
    setFehler(null);
    setLaeuft(true);
    try {
      const fd = new FormData();
      fd.append("datei", datei);
      const res = await fetch(`/api/belege/${belegId}/dokument`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Upload fehlgeschlagen");
      router.refresh();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
      <p className="text-sm font-medium text-amber-900">Originaldokument nachreichen</p>
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={(e) => setDatei(e.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      <p className="text-xs text-amber-800">
        JPEG, PNG oder PDF, max. 4 MB. Genau eine Datei (mehrseitig als PDF). Ein bereits
        hinterlegtes Dokument lässt sich nicht ersetzen (GoBD).
      </p>
      {fehler && <p className="text-sm text-red-600">{fehler}</p>}
      <Button onClick={hochladen} disabled={laeuft || !datei}>
        {laeuft ? "Lädt hoch …" : "Dokument hochladen"}
      </Button>
    </div>
  );
}
