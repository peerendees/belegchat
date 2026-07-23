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
  istAuswaerts = false,
  anlassInitial = "",
  teilnehmerInitial = "",
  trinkgeldInitial = "",
  grundInitial = "",
  ortInitial = "",
  kundeInitial = "",
  erlaubtTeilbetrag = false,
  betragBrutto = 0,
  mwstSatz = 0,
  teilbetragBasisInitial = "",
  teilbetragWertInitial = "",
  teilbetragGrundInitial = "",
  stbVermerkInitial = "",
  zahlungswegKonten,
  buVorschlag = null,
  buOptionen = [],
}: {
  belegId: string;
  aktuellesSachkonto: string;
  konten: Konto[];
  istBewirtung?: boolean;
  istAuswaerts?: boolean;
  anlassInitial?: string;
  teilnehmerInitial?: string;
  trinkgeldInitial?: string;
  grundInitial?: string;
  ortInitial?: string;
  kundeInitial?: string;
  erlaubtTeilbetrag?: boolean;
  betragBrutto?: number;
  mwstSatz?: number;
  teilbetragBasisInitial?: string;
  teilbetragWertInitial?: string;
  teilbetragGrundInitial?: string;
  stbVermerkInitial?: string;
  zahlungswegKonten: { geschaeftskonto: string; alternativkonto: string; privat: string };
  buVorschlag?: string | null;
  buOptionen?: { schluessel: string; bezeichnung: string }[];
}) {
  const router = useRouter();
  const [sachkonto, setSachkonto] = useState(aktuellesSachkonto);
  const [anlass, setAnlass] = useState(anlassInitial);
  const [teilnehmer, setTeilnehmer] = useState(teilnehmerInitial);
  const [trinkgeld, setTrinkgeld] = useState(trinkgeldInitial);
  const [grund, setGrund] = useState(grundInitial);
  const [ort, setOrt] = useState(ortInitial);
  const [kunde, setKunde] = useState(kundeInitial);
  const [teilbetragAktiv, setTeilbetragAktiv] = useState(!!teilbetragWertInitial);
  const [teilbetragBasis, setTeilbetragBasis] = useState(teilbetragBasisInitial || "brutto");
  const [teilbetragWert, setTeilbetragWert] = useState(teilbetragWertInitial);
  const [teilbetragGrund, setTeilbetragGrund] = useState(teilbetragGrundInitial);
  const [stbVermerk, setStbVermerk] = useState(stbVermerkInitial);
  // Zahlungsweg (BER-116): bewusst ohne Vorauswahl — Freigabe erst nach Wahl.
  const [zahlungsweg, setZahlungsweg] = useState("");
  // Steuerschlüssel (BER-117): aus dem MwSt-Satz vorbelegt, änderbar.
  const [buSchluessel, setBuSchluessel] = useState(buVorschlag ?? "");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  // Live-Vorschau des gebuchten Splits aus Eingabe + MwSt-Satz (BER-108).
  function teilbetragVorschau(): string {
    const roh = Number(teilbetragWert.replace(",", "."));
    if (!teilbetragWert.trim() || Number.isNaN(roh) || roh <= 0) return "Betrag eingeben …";
    const faktor = 1 + (mwstSatz || 0) / 100;
    const runde = (n: number) => Math.round(n * 100) / 100;
    let b: number;
    let n: number;
    if (teilbetragBasis === "brutto") {
      b = roh;
      n = faktor > 0 ? roh / faktor : roh;
    } else {
      n = roh;
      b = roh * faktor;
    }
    b = runde(b);
    n = runde(n);
    const m = runde(b - n);
    const warn =
      betragBrutto > 0 && b > betragBrutto + 0.005
        ? ` — ⚠ übersteigt Rechnungsbetrag ${betragBrutto.toFixed(2)} €`
        : "";
    return `Gebucht: brutto ${b.toFixed(2)} € · netto ${n.toFixed(2)} € · MwSt ${m.toFixed(2)} € (${mwstSatz || 0} %)${warn}`;
  }

  async function freigeben() {
    setFehler(null);
    setLaeuft(true);
    try {
      const payload: Record<string, string> = {};
      if (sachkonto !== aktuellesSachkonto) payload.sachkonto = sachkonto;
      if (istBewirtung) {
        payload.bewirtung_anlass = anlass;
        payload.bewirtung_teilnehmer = teilnehmer;
      }
      if (istAuswaerts) {
        payload.termin_grund = grund;
        payload.termin_ort = ort;
        payload.termin_kunde = kunde;
      }
      if ((istBewirtung || istAuswaerts) && trinkgeld.trim()) {
        payload.trinkgeld = trinkgeld;
      }
      if (stbVermerk !== stbVermerkInitial) payload.stb_vermerk = stbVermerk;
      payload.zahlungsweg = zahlungsweg;
      payload.bu_schluessel = buSchluessel;
      if (erlaubtTeilbetrag && teilbetragAktiv && teilbetragWert.trim()) {
        payload.teilbetrag_basis = teilbetragBasis;
        payload.teilbetrag_wert = teilbetragWert;
        payload.teilbetrag_grund = teilbetragGrund;
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
          <p className="text-xs text-amber-800">
            Ohne beide Angaben ist die Bewirtung steuerlich nicht abziehbar — bitte
            jetzt ausfüllen, solange die Erinnerung frisch ist.
          </p>
        </div>
      )}

      {istAuswaerts && (
        <div className="space-y-3 rounded-md bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            Auswärtstermin — Kontext erfassen (Nachweis der betrieblichen Veranlassung)
          </p>
          <div className="space-y-1">
            <Label htmlFor="grund">Grund des Termins</Label>
            <input
              id="grund"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={grund}
              onChange={(e) => setGrund(e.target.value)}
              placeholder="z. B. Kundentermin, Baustellenbesichtigung, Messe"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ort">Ort (empfohlen)</Label>
            <input
              id="ort"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              placeholder="z. B. Berlin, Kunde vor Ort"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kunde">Kunde / Geschäftspartner (optional)</Label>
            <input
              id="kunde"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={kunde}
              onChange={(e) => setKunde(e.target.value)}
              placeholder="z. B. Firma Y"
            />
          </div>
          <p className="text-xs text-amber-800">
            Der Grund ist Pflicht — ohne ihn bleibt der Beleg in Klärung. Ort und
            Kunde machen die Fahrt später nachvollziehbar.
          </p>
        </div>
      )}

      {(istBewirtung || istAuswaerts) && (
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
      )}

      {erlaubtTeilbetrag && (
        <div className="space-y-2 rounded-md border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={teilbetragAktiv}
              onChange={(e) => setTeilbetragAktiv(e.target.checked)}
            />
            Nur einen Teilbetrag buchen
          </label>
          {teilbetragAktiv && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  aria-label="Teilbetrag-Basis"
                  className="rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={teilbetragBasis}
                  onChange={(e) => setTeilbetragBasis(e.target.value)}
                >
                  <option value="brutto">Brutto (inkl. MwSt)</option>
                  <option value="netto">Netto</option>
                </select>
                <input
                  aria-label="Teilbetrag in Euro"
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={teilbetragWert}
                  onChange={(e) => setTeilbetragWert(e.target.value)}
                  placeholder="Betrag in €"
                  inputMode="decimal"
                />
              </div>
              <p className="text-xs text-muted-foreground">{teilbetragVorschau()}</p>
              <input
                aria-label="Grund der Teilbuchung"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={teilbetragGrund}
                onChange={(e) => setTeilbetragGrund(e.target.value)}
                placeholder="Grund (welche Positionen ausgeschlossen) — optional"
              />
              <p className="text-xs text-muted-foreground">
                Das Originaldokument bleibt vollständig archiviert; nur der Teilbetrag
                wird gebucht und exportiert.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">
          Zahlungsweg <span className="text-red-600">*</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Pflichtangabe — bestimmt das Gegenkonto im Buchungsstapel. Ohne Auswahl ist
          keine Freigabe möglich (Abgleich mit dem Kontoauszug).
        </p>
        <div className="space-y-1">
          {(
            [
              ["geschaeftskonto", `Geschäftskonto (${zahlungswegKonten.geschaeftskonto})`],
              ["alternativkonto", `Andere Karte/Konto (${zahlungswegKonten.alternativkonto})`],
              ["privat", `Privat verauslagt (${zahlungswegKonten.privat})`],
            ] as const
          ).map(([wert, label]) => (
            <label key={wert} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="zahlungsweg"
                value={wert}
                checked={zahlungsweg === wert}
                onChange={(e) => setZahlungsweg(e.target.value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="stbVermerk">Vermerk für den Steuerberater (optional)</Label>
        <input
          id="stbVermerk"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          value={stbVermerk}
          onChange={(e) => setStbVermerk(e.target.value)}
          placeholder="z. B. Verdacht Anlagevermögen — AfA prüfen"
        />
        <p className="text-xs text-muted-foreground">
          Erscheint im DATEV-Export als Zusatzinformation beim Steuerberater.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="buSchluessel">Steuerschlüssel (Vorsteuer)</Label>
        <select
          id="buSchluessel"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          value={buSchluessel}
          onChange={(e) => setBuSchluessel(e.target.value)}
        >
          <option value="">ohne Schlüssel</option>
          {buOptionen.map((o) => (
            <option key={o.schluessel} value={o.schluessel}>
              {o.schluessel} — {o.bezeichnung}
            </option>
          ))}
        </select>
        {sachkonto !== aktuellesSachkonto && (
          <p className="text-xs text-muted-foreground">
            Schlüssel passt zum Sachkonto? Bei Kontowechsel prüfen.
          </p>
        )}
      </div>

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
      <Button onClick={freigeben} disabled={laeuft || !zahlungsweg} className="w-full">
        {laeuft
          ? "Freigabe läuft …"
          : !zahlungsweg
            ? "Zahlungsweg wählen, um freizugeben"
            : "Beleg freigeben (→ geprüft)"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Mit der Freigabe bestätigst du die Richtigkeit der Belegdaten. Der Beleg
        wird danach GoBD-festgeschrieben und ist nicht mehr änderbar.
      </p>
    </div>
  );
}
