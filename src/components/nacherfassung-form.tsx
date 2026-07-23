"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  belegNr: string;
  datum: string;
  betrag: string;
  zweck: string;
  sachkonto: string;
  vorsteuerRelevant: boolean;
  buVorschlag: string | null;
};

const WEGE = [
  { wert: "geschaeftskonto", kurz: "1 Geschäftskonto", taste: "1" },
  { wert: "alternativkonto", kurz: "2 Andere Karte", taste: "2" },
  { wert: "privat", kurz: "3 Privat", taste: "3" },
] as const;

/**
 * Batch-Nacherfassung (BER-119): Zahlungsweg (Pflicht, Tasten 1/2/3, Pfeile
 * navigieren) und Steuerschlüssel je Beleg lokal erfassen, in der Zusammenfassung
 * sichten, dann in EINEM Commit festschreiben. Ein Tippfehler wird vor dem Commit
 * korrigiert — die Felder sind danach unveränderlich.
 */
export function NacherfassungForm({
  rows,
  buOptionen,
  zahlungswegKonten,
}: {
  rows: Row[];
  buOptionen: { schluessel: string; bezeichnung: string }[];
  zahlungswegKonten: { geschaeftskonto: string; alternativkonto: string; privat: string };
}) {
  const router = useRouter();
  const [eingaben, setEingaben] = useState(() =>
    rows.map((r) => ({ zahlungsweg: "", buSchluessel: r.buVorschlag ?? "" })),
  );
  const [focused, setFocused] = useState(0);
  const [modus, setModus] = useState<"erfassen" | "pruefen">("erfassen");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const alleGesetzt = eingaben.every((e) => e.zahlungsweg !== "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (modus !== "erfassen") return;
      const ziel = e.target as HTMLElement | null;
      if (
        ziel &&
        (ziel.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(ziel.tagName))
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocused((f) => Math.min(f + 1, rows.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocused((f) => Math.max(f - 1, 0));
      } else if (e.key === "1" || e.key === "2" || e.key === "3") {
        e.preventDefault();
        const wert = WEGE[Number(e.key) - 1].wert;
        setEingaben((prev) => prev.map((x, i) => (i === focused ? { ...x, zahlungsweg: wert } : x)));
        setFocused((f) => Math.min(f + 1, rows.length - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modus, focused, rows.length]);

  function setZahlungsweg(i: number, wert: string) {
    setEingaben((prev) => prev.map((x, k) => (k === i ? { ...x, zahlungsweg: wert } : x)));
  }
  function setBuSchluessel(i: number, wert: string) {
    setEingaben((prev) => prev.map((x, k) => (k === i ? { ...x, buSchluessel: wert } : x)));
  }

  async function festschreiben() {
    setFehler(null);
    setLaeuft(true);
    try {
      const eintraege = rows.map((r, i) => ({
        beleg_id: r.id,
        zahlungsweg: eingaben[i].zahlungsweg,
        bu_schluessel:
          r.vorsteuerRelevant && eingaben[i].buSchluessel ? eingaben[i].buSchluessel : null,
      }));
      const res = await fetch("/api/nacherfassung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eintraege }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Nacherfassung fehlgeschlagen");
      router.refresh();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Nacherfassung fehlgeschlagen");
      setModus("erfassen");
    } finally {
      setLaeuft(false);
    }
  }

  const zaehlung = {
    geschaeftskonto: eingaben.filter((e) => e.zahlungsweg === "geschaeftskonto").length,
    alternativkonto: eingaben.filter((e) => e.zahlungsweg === "alternativkonto").length,
    privat: eingaben.filter((e) => e.zahlungsweg === "privat").length,
  };
  const mitSchluessel = rows.filter((r, i) => r.vorsteuerRelevant && eingaben[i].buSchluessel).length;

  if (modus === "pruefen") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-medium">Zusammenfassung ({rows.length} Belege)</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              Geschäftskonto ({zahlungswegKonten.geschaeftskonto}): {zaehlung.geschaeftskonto} ·
              Andere Karte ({zahlungswegKonten.alternativkonto}): {zaehlung.alternativkonto} ·
              Privat ({zahlungswegKonten.privat}): {zaehlung.privat}
            </li>
            <li>mit Steuerschlüssel: {mitSchluessel}</li>
          </ul>
          <p className="mt-2 text-xs text-amber-800">
            Nach dem Festschreiben sind Zahlungsweg und Steuerschlüssel unveränderlich.
            Bitte jetzt prüfen.
          </p>
        </div>
        {fehler && <p className="text-sm text-red-600">{fehler}</p>}
        <div className="flex gap-2">
          <Button onClick={festschreiben} disabled={laeuft}>
            {laeuft ? "Festschreiben läuft …" : "Nacherfassung festschreiben"}
          </Button>
          <button
            onClick={() => setModus("erfassen")}
            disabled={laeuft}
            className="text-sm text-muted-foreground hover:underline"
          >
            Zurück zur Erfassung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Tastatur: <b>1</b> Geschäftskonto · <b>2</b> Andere Karte · <b>3</b> Privat ·{" "}
        <b>↑/↓</b> Zeile wechseln. Steuerschlüssel per Auswahl (vorbelegt).
      </p>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Beleg</th>
              <th className="px-3 py-2">Betrag</th>
              <th className="px-3 py-2">Konto</th>
              <th className="px-3 py-2">Zahlungsweg</th>
              <th className="px-3 py-2">Steuerschlüssel</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                onMouseDown={() => setFocused(i)}
                className={`border-t ${i === focused ? "bg-amber-50" : ""}`}
              >
                <td className="px-3 py-2">
                  <div className="font-medium">{r.belegNr}</div>
                  <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                    {r.datum} · {r.zweck}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{r.betrag}</td>
                <td className="px-3 py-2">{r.sachkonto}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {WEGE.map((w) => (
                      <button
                        key={w.wert}
                        onClick={() => setZahlungsweg(i, w.wert)}
                        className={`rounded border px-2 py-1 text-xs ${
                          eingaben[i].zahlungsweg === w.wert
                            ? "border-amber-500 bg-amber-100 font-medium"
                            : "hover:bg-muted"
                        }`}
                        title={w.kurz}
                      >
                        {w.taste}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {r.vorsteuerRelevant ? (
                    <select
                      aria-label={`Steuerschlüssel ${r.belegNr}`}
                      className="rounded-md border bg-transparent px-2 py-1 text-xs"
                      value={eingaben[i].buSchluessel}
                      onChange={(e) => setBuSchluessel(i, e.target.value)}
                    >
                      <option value="">ohne Schlüssel</option>
                      {buOptionen.map((o) => (
                        <option key={o.schluessel} value={o.schluessel}>
                          {o.schluessel} — {o.bezeichnung}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground">— nicht vorsteuerrelevant</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fehler && <p className="text-sm text-red-600">{fehler}</p>}
      <Button onClick={() => setModus("pruefen")} disabled={!alleGesetzt}>
        {alleGesetzt
          ? "Zusammenfassung anzeigen"
          : `Noch ${eingaben.filter((e) => !e.zahlungsweg).length} ohne Zahlungsweg`}
      </Button>
    </div>
  );
}
