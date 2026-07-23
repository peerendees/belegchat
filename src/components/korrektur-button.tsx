"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Erzeugt eine Korrekturfassung eines Buchungsstapels (BER-121). Fragt den Grund
 * ab, lädt die neue Datei herunter und aktualisiert die Liste. Die bisherige
 * Fassung bleibt als eingefrorene, ersetzte Version abrufbar.
 */
export function KorrekturButton({
  exportId,
  vorschlagGrund,
}: {
  exportId: string;
  vorschlagGrund: string;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [grund, setGrund] = useState(vorschlagGrund);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function erzeugen() {
    setFehler(null);
    setLaeuft(true);
    try {
      const res = await fetch(`/api/datev/export/${exportId}/korrektur`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grund }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Korrektur fehlgeschlagen");
      }
      const blob = await res.blob();
      const name =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "EXTF_Korrektur.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setOffen(false);
      router.refresh();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Korrektur fehlgeschlagen");
    } finally {
      setLaeuft(false);
    }
  }

  if (!offen) {
    return (
      <button
        onClick={() => setOffen(true)}
        className="mt-1 block text-xs underline underline-offset-2 hover:no-underline"
      >
        Korrekturstapel erzeugen
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1">
      <input
        className="w-full rounded-md border bg-transparent px-2 py-1 text-xs"
        value={grund}
        onChange={(e) => setGrund(e.target.value)}
        placeholder="Korrekturgrund"
      />
      {fehler && <p className="text-xs text-red-600">{fehler}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={erzeugen}
          disabled={laeuft || !grund.trim()}
          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
        >
          {laeuft ? "Erzeuge …" : "Erzeugen + Download"}
        </button>
        <button
          onClick={() => setOffen(false)}
          className="text-xs text-muted-foreground hover:underline"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
