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
  istBewirtung = false,
  anlassInitial = "",
  teilnehmerInitial = "",
  trinkgeldInitial = "",
}: {
  belegId: string;
  aktuellesSachkonto: string;
  konten: Konto[];
  istBewirtung?: boolean;
  anlassInitial?: string;
  teilnehmerInitial?: string;
  trinkgeldInitial?: string;
}) {
  const router = useRouter();
  const [sachkonto, setSachkonto] = useState(aktuellesSachkonto);
  const [anlass, setAnlass] = useState(anlassInitial);
  const [teilnehmer, setTeilnehmer] = useState(teilnehmerInitial);
  const [trinkgeld, setTrinkgeld] = useState(trinkgeldInitial);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function freigeben() {
    setFehler(null);
    setLaeuft(true);
    try {
      const payload: Record<string, string> = {};
      if (sachkonto !== aktuellesSachkonto) payload.sachkonto = sachkonto;
      if (istBewirtung) {
        payload.bewirtung_anlass = anlass;
        payload.bewirtung_teilnehmer = teilnehmer;
        if (trinkgeld.trim()) payload.bewirtung_trinkgeld = trinkgeld;
      }
      const res = await fetch(`/api/belege/${belegId}/freigeben`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      {istBewirtung && (
        <div className="space-y-3 rounded-md bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            Bewirtungsbeleg — Pflichtangaben (§ 4 Abs. 5 Nr. 2 EStG)
          </p>
          <div className="space-y-1">
            <Label htmlFor="anlass">Geschäftlicher Anlass</Label>
            <input
              id="anlass"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={anlass}
              onChange={(e) => setAnlass(e.target.value)}
              placeholder="z. B. Projektbesprechung Kunde X"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="teilnehmer">Bewirtete Personen</Label>
            <input
              id="teilnehmer"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={teilnehmer}
              onChange={(e) => setTeilnehmer(e.target.value)}
              placeholder="Namen, kommagetrennt (inkl. eigener Person)"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="trinkgeld">Trinkgeld in € (optional)</Label>
            <input
              id="trinkgeld"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={trinkgeld}
              onChange={(e) => setTrinkgeld(e.target.value)}
              placeholder="z. B. 5,10 — falls nicht auf der Rechnung"
              inputMode="decimal"
            />
          </div>
          <p className="text-xs text-amber-800">
            Ohne beide Angaben ist die Bewirtung steuerlich nicht abziehbar — bitte
            jetzt ausfüllen, solange die Erinnerung frisch ist.
          </p>
        </div>
      )}
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
