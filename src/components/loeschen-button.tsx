"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LoeschenButton({ belegId, belegNr }: { belegId: string; belegNr: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function loeschen() {
    setFehler(null);
    setLaeuft(true);
    try {
      const res = await fetch(`/api/belege/${belegId}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Löschen fehlgeschlagen");
      router.push("/belege");
      router.refresh();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
      setLaeuft(false);
    }
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-sm text-red-600 underline-offset-2 hover:underline"
      >
        Entwurf löschen
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{belegNr} wirklich löschen?</span>
      <Button variant="outline" size="sm" onClick={loeschen} disabled={laeuft}>
        {laeuft ? "…" : "Ja, löschen"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={laeuft}>
        Abbrechen
      </Button>
      {fehler && <span className="text-sm text-red-600">{fehler}</span>}
    </div>
  );
}
