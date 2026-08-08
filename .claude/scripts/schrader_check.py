#!/usr/bin/env python3
"""Schrader-Bestandteile-Gate — deterministische Pruefung eines Story-Prompts.

Der /implement-Skill (Schritt 1b) verlangt, dass ein Issue vier Bestandteile
traegt, bevor gebaut wird. Bis 08.08.2026 gab es das Skript im Projekt nicht;
die Pruefung lief per Hand — also genau so zuverlaessig wie die Aufmerksamkeit
des Pruefenden. Dieses Skript ist die Referenz: kein LLM, kein Ermessen.

Aufruf:
    python3 .claude/scripts/schrader_check.py <issue.md>
    python3 .claude/scripts/schrader_check.py --self-test

Exit 0 = vollstaendig, Exit 1 = STOPP mit Checkliste, Exit 2 = Aufrufsfehler.

Bewusste Grenzen:
  - Geprueft wird STRUKTUR und Mindestsubstanz, nicht Qualitaet. Vier gefuellte
    Abschnitte koennen trotzdem unbrauchbar sein.
  - Ueberschriften werden umlaut-normalisiert verglichen: "Gewuenschtes" und
    "Gewünschtes" gelten gleich. Ein tadelloses deutsches Issue faellt nicht
    durch, nur weil es echte Umlaute benutzt.
"""

from __future__ import annotations

import re
import sys
import unicodedata

MIN_INHALT = 20

# (Anzeigename, akzeptierte Ueberschriften normalisiert)
BESTANDTEILE = [
    ("Insight (Perceive)", {"insight (perceive)", "insight"}),
    ("Constraints", {"constraints", "randbedingungen"}),
    ("Erfolgskriterien", {"erfolgskriterien", "success criteria"}),
    ("Gewuenschtes Ergebnis", {"gewuenschtes ergebnis", "desired outcome"}),
]

SEKTION_TITEL = {"schrader-prompt-bestandteile", "schrader prompt components"}

# Text, der zwar dasteht, aber nichts sagt.
PLATZHALTER = re.compile(
    r"^\s*(\[.*\]|tbd|tba|todo|n/?a|\.\.\.|-+|xxx+)\s*$",
    re.IGNORECASE,
)


def normalisiere(text: str) -> str:
    """Kleinschreibung + Umlaute/Diakritika auf ASCII (BOO-499)."""
    text = text.strip().lower()
    text = text.replace("ß", "ss")
    for umlaut, ersatz in (("ä", "ae"), ("ö", "oe"), ("ü", "ue")):
        text = text.replace(umlaut, ersatz)
    zerlegt = unicodedata.normalize("NFKD", text)
    return "".join(c for c in zerlegt if not unicodedata.combining(c))


def ueberschrift(zeile: str) -> tuple[int, str] | None:
    """(Ebene, normalisierter Titel) fuer eine Markdown-Ueberschrift."""
    treffer = re.match(r"^(#{1,6})\s+(.*?)\s*#*\s*$", zeile)
    if not treffer:
        return None
    return len(treffer.group(1)), normalisiere(treffer.group(2))


def substanz(zeilen: list[str]) -> int:
    """Zeichen echten Inhalts — ohne Platzhalter, Code-Zaeune, leere Zeilen."""
    gesamt = 0
    in_zaun = False
    for zeile in zeilen:
        if zeile.lstrip().startswith("```"):
            in_zaun = not in_zaun
            continue
        if in_zaun:
            gesamt += len(zeile.strip())
            continue
        blank = zeile.strip()
        if not blank or PLATZHALTER.match(blank):
            continue
        # Listenmarker und Checkboxen zaehlen nicht als Inhalt
        blank = re.sub(r"^[-*+]\s+(\[[ xX]\]\s*)?", "", blank)
        gesamt += len(blank.strip())
    return gesamt


def pruefe(text: str) -> tuple[bool, list[tuple[str, bool, str]], bool]:
    """(vollstaendig, [(Name, ok, Grund)], sektion_gefunden)"""
    zeilen = text.splitlines()

    # 1) Sektion finden
    start = None
    sektion_ebene = 2
    for i, zeile in enumerate(zeilen):
        kopf = ueberschrift(zeile)
        if kopf and kopf[1] in SEKTION_TITEL:
            start, sektion_ebene = i, kopf[0]
            break
    if start is None:
        return False, [(name, False, "Sektion fehlt") for name, _ in BESTANDTEILE], False

    # 2) Sektion bis zur naechsten gleich- oder hoeherrangigen Ueberschrift
    ende = len(zeilen)
    for i in range(start + 1, len(zeilen)):
        kopf = ueberschrift(zeilen[i])
        if kopf and kopf[0] <= sektion_ebene:
            ende = i
            break
    block = zeilen[start + 1 : ende]

    # 3) Unterabschnitte einsammeln
    gefunden: dict[str, list[str]] = {}
    aktuell: str | None = None
    for zeile in block:
        kopf = ueberschrift(zeile)
        if kopf and kopf[0] > sektion_ebene:
            aktuell = kopf[1]
            gefunden.setdefault(aktuell, [])
            continue
        if aktuell is not None:
            gefunden[aktuell].append(zeile)

    ergebnisse = []
    for name, aliase in BESTANDTEILE:
        passend = next((k for k in gefunden if k in aliase), None)
        if passend is None:
            ergebnisse.append((name, False, "Ueberschrift fehlt"))
            continue
        laenge = substanz(gefunden[passend])
        if laenge < MIN_INHALT:
            ergebnisse.append(
                (name, False, f"nur {laenge} Zeichen Inhalt (mind. {MIN_INHALT})")
            )
        else:
            ergebnisse.append((name, True, f"{laenge} Zeichen"))

    return all(ok for _, ok, _ in ergebnisse), ergebnisse, True


def bericht(pfad: str, ergebnisse, sektion_da: bool, ok: bool) -> None:
    if ok:
        print(f"[OK] {pfad} — Schrader-Bestandteile vollstaendig")
        for name, _, info in ergebnisse:
            print(f"  - [x] {name}: {info}")
        return

    print(f"[STOP] {pfad} ist kein vollstaendiger Prompt.")
    if not sektion_da:
        print("       Sektion '## Schrader-Prompt-Bestandteile' fehlt komplett.")
    for name, treffer, grund in ergebnisse:
        print(f"  - [{'x' if treffer else ' '}] {name}: {grund}")
    print()
    print("Zurueck zu /ideation und die fehlenden Bestandteile ergaenzen,")
    print("bevor /implement startet.")


SELBSTTEST_GUT = """# BER-999: Beispiel

## Schrader-Prompt-Bestandteile

### Insight (Perceive)
Der Bestand traegt genau einen Wert pro Datensatz, gemischte Faelle sind nicht abbildbar.

### Constraints
Additiv, kein festgeschriebener Datensatz wird angefasst, Bestand bleibt gueltig.

### Erfolgskriterien
Zwei Zeilen erzeugen zwei Buchungssaetze mit identischem Belegfeld 1.

### Gewünschtes Ergebnis
Gemischte Belege sind buchbar, ohne dass ein bestehender Beleg veraendert wird.
"""

SELBSTTEST_SCHLECHT = """# BER-998: Beispiel

## Schrader-Prompt-Bestandteile

### Insight (Perceive)
Ausreichend langer Insight-Text, der die Lage beschreibt und Substanz hat.

### Constraints
TBD

### Erfolgskriterien
Auch hier steht genug Text, damit die Mindestlaenge erreicht wird.
"""


def selbsttest() -> int:
    fehler = 0

    ok, _, sektion = pruefe(SELBSTTEST_GUT)
    if not (ok and sektion):
        print("SELBSTTEST FEHLGESCHLAGEN: vollstaendiges Beispiel wurde abgelehnt")
        fehler += 1

    ok, erg, _ = pruefe(SELBSTTEST_SCHLECHT)
    if ok:
        print("SELBSTTEST FEHLGESCHLAGEN: unvollstaendiges Beispiel kam durch")
        fehler += 1
    else:
        namen = {n for n, treffer, _ in erg if not treffer}
        if "Constraints" not in namen or "Gewuenschtes Ergebnis" not in namen:
            print(f"SELBSTTEST FEHLGESCHLAGEN: falsche Bemaengelung ({namen})")
            fehler += 1

    ok, _, sektion = pruefe("# Ohne Sektion\n\nNur Text.\n")
    if ok or sektion:
        print("SELBSTTEST FEHLGESCHLAGEN: fehlende Sektion nicht erkannt")
        fehler += 1

    # Umlaut-Normalisierung: ASCII-Variante muss ebenso zaehlen
    if not pruefe(SELBSTTEST_GUT.replace("Gewünschtes", "Gewuenschtes"))[0]:
        print("SELBSTTEST FEHLGESCHLAGEN: ASCII-Transliteration abgelehnt")
        fehler += 1

    print("SELBSTTEST BESTANDEN" if not fehler else f"{fehler} Selbsttest-Fehler")
    return 1 if fehler else 0


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    if argv[1] == "--self-test":
        return selbsttest()

    pfad = argv[1]
    try:
        with open(pfad, encoding="utf-8") as datei:
            text = datei.read()
    except OSError as fehler:
        print(f"[FEHLER] {pfad} nicht lesbar: {fehler}")
        return 2

    ok, ergebnisse, sektion = pruefe(text)
    bericht(pfad, ergebnisse, sektion, ok)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
