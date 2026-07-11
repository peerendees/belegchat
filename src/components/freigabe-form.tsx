"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Konto = { konto_nr: string; bezeichnung: string };

export function FreigabeForm({
  belegId,
  aktuellesSachkonto,
  konten,
}: {
  belegId: string;
  aktuellesSachkonto: string;
  konten: Konto[];
}) {
  const router = useRouter();
  const [sachkonto, setSachkonto] = useState(aktuellesSachkonto);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function freigeben() {
    setFehler(null);
    setLaeuft(true);
    try {
      const res = await fetch(`/api/belege/${belegId}/freigeben`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          sachkonto !== aktuellesSachkonto ? { sachkonto } : {},
        ),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Freigabe fehlgeschlagen");
      router.refresh();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Freigabe fehlgeschlagen");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="sachkonto">Sachkonto (SKR04)</Label>
        <select
          id="sachkonto"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          value={sachkonto}
          onChange={(e) => setSachkonto(e.target.value)}
        >
          {konten.map((k) => (
            <option key={k.konto_nr} value={k.konto_nr}>
              {k.konto_nr} — {k.bezeichnung}
            </option>
          ))}
        </select>
        {sachkonto !== aktuellesSachkonto && (
          <p className="text-xs text-muted-foreground">
            Änderung wird als konto_geaendert protokolliert.
          </p>
        )}
      </div>
      {fehler && <p className="text-sm text-red-600">{fehler}</p>}
      <Button onClick={freigeben} disabled={laeuft} className="w-full">
        {laeuft ? "Freigabe läuft …" : "Beleg freigeben (→ geprüft)"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Mit der Freigabe bestätigst du die Richtigkeit der Belegdaten. Der Beleg
        wird danach GoBD-festgeschrieben und ist nicht mehr änderbar.
      </p>
    </div>
  );
}
