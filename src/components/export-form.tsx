"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ExportForm() {
  const router = useRouter();
  const jetzt = new Date();
  const [jahr, setJahr] = useState(jetzt.getFullYear());
  const [typ, setTyp] = useState<"monat" | "quartal" | "jahr">("monat");
  const [monat, setMonat] = useState(jetzt.getMonth() + 1);
  const [quartal, setQuartal] = useState(Math.ceil((jetzt.getMonth() + 1) / 3));
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function exportieren() {
    setFehler(null);
    setLaeuft(true);
    try {
      const res = await fetch("/api/datev/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jahr,
          monat: typ === "monat" ? monat : undefined,
          quartal: typ === "quartal" ? quartal : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Export fehlgeschlagen");
      }
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
        ?? "EXTF_Buchungsstapel.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      router.refresh();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Export fehlgeschlagen");
    } finally {
      setLaeuft(false);
    }
  }

  const selectCls = "w-full rounded-md border bg-transparent px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Jahr</Label>
          <select className={selectCls} value={jahr} onChange={(e) => setJahr(Number(e.target.value))}>
            {[jetzt.getFullYear() - 1, jetzt.getFullYear(), jetzt.getFullYear() + 1].map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Zeitraum</Label>
          <select className={selectCls} value={typ} onChange={(e) => setTyp(e.target.value as typeof typ)}>
            <option value="monat">Monat</option>
            <option value="quartal">Quartal</option>
            <option value="jahr">Ganzes Jahr</option>
          </select>
        </div>
        <div className="space-y-2">
          {typ === "monat" && (
            <>
              <Label>Monat</Label>
              <select className={selectCls} value={monat} onChange={(e) => setMonat(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
            </>
          )}
          {typ === "quartal" && (
            <>
              <Label>Quartal</Label>
              <select className={selectCls} value={quartal} onChange={(e) => setQuartal(Number(e.target.value))}>
                {[1, 2, 3, 4].map((qq) => <option key={qq} value={qq}>Q{qq}</option>)}
              </select>
            </>
          )}
        </div>
      </div>
      {fehler && <p className="text-sm text-red-600">{fehler}</p>}
      <Button onClick={exportieren} disabled={laeuft} className="w-full">
        {laeuft ? "Export läuft …" : "DATEV-Buchungsstapel erzeugen (CSV)"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Exportiert alle freigegebenen Belege (Status „Geprüft“) des Zeitraums und
        setzt sie auf „Exportiert“. Die Datei ist ein EXTF-Buchungsstapel für den
        DATEV-ASCII-Import beim Steuerberater.
      </p>
    </div>
  );
}
