"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Konto = { konto_nr: string; bezeichnung: string };

/**
 * Manuelle Belegerfassung ohne Dokument (BER-118). Nach dem Anlegen landet der
 * Beleg als Vorschlag mit Kennzeichnung „Dokument fehlt"; das Original wird in der
 * Detailansicht nachgereicht.
 */
export function BelegNeuForm({ konten }: { konten: Konto[] }) {
  const router = useRouter();
  const [belegDatum, setBelegDatum] = useState("");
  const [betrag, setBetrag] = useState("");
  const [mwst, setMwst] = useState("19");
  const [zweck, setZweck] = useState("");
  const [sachkonto, setSachkonto] = useState(konten[0]?.konto_nr ?? "");
  const [typ, setTyp] = useState("sonstiges");
  const [vermerk, setVermerk] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const feld = "w-full rounded-md border bg-transparent px-3 py-2 text-sm";

  async function anlegen() {
    setFehler(null);
    setLaeuft(true);
    try {
      const res = await fetch("/api/belege", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beleg_datum: belegDatum,
          betrag_brutto: betrag,
          mwst_satz: Number(mwst),
          verwendungszweck: zweck,
          sachkonto,
          beleg_typ: typ,
          stb_vermerk: vermerk,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Anlage fehlgeschlagen");
      router.push(`/belege/${d.id}`);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Anlage fehlgeschlagen");
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="datum">Belegdatum</Label>
          <input
            id="datum"
            type="date"
            className={feld}
            value={belegDatum}
            onChange={(e) => setBelegDatum(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="betrag">Betrag brutto (€)</Label>
          <input
            id="betrag"
            className={feld}
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            placeholder="z. B. 119,00"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mwst">MwSt-Satz</Label>
          <select id="mwst" className={feld} value={mwst} onChange={(e) => setMwst(e.target.value)}>
            {["19", "7", "16", "5", "0"].map((s) => (
              <option key={s} value={s}>
                {s} %
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="typ">Beleg-Typ</Label>
          <select id="typ" className={feld} value={typ} onChange={(e) => setTyp(e.target.value)}>
            {["sonstiges", "eingangsrechnung", "ausgangsrechnung", "quittung", "gutschrift"].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ),
            )}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="zweck">Verwendungszweck</Label>
        <input
          id="zweck"
          className={feld}
          value={zweck}
          onChange={(e) => setZweck(e.target.value)}
          placeholder="z. B. Bahnticket Kundentermin Berlin"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sachkonto">Sachkonto (SKR04)</Label>
        <select
          id="sachkonto"
          className={feld}
          value={sachkonto}
          onChange={(e) => setSachkonto(e.target.value)}
        >
          {konten.map((k) => (
            <option key={k.konto_nr} value={k.konto_nr}>
              {k.konto_nr} — {k.bezeichnung}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="vermerk">Vermerk für den Steuerberater (optional)</Label>
        <input
          id="vermerk"
          className={feld}
          value={vermerk}
          onChange={(e) => setVermerk(e.target.value)}
          placeholder="Ergänzung zum automatischen Eigenbeleg-Hinweis"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Der Beleg wird mit „Beleg folgt — ohne Originaldokument erfasst“ gekennzeichnet.
        Netto und MwSt werden aus Brutto und Satz berechnet. Das Original reichst du in der
        Detailansicht nach.
      </p>
      {fehler && <p className="text-sm text-red-600">{fehler}</p>}
      <Button onClick={anlegen} disabled={laeuft} className="w-full">
        {laeuft ? "Wird angelegt …" : "Beleg anlegen (ohne Dokument)"}
      </Button>
    </div>
  );
}
