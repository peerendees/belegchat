# INTENTRON-Framework — Rückmeldung aus BelegChat

> Sammelstelle für Rückmeldungen ans INTENTRON-Team. Jeder Punkt braucht einen Beleg aus
> einer tatsächlichen Session — kein „wäre schön", keine Meinung über ungenutzte Teile.
> Projektinterne Befunde gehören in Issues und die Daily Note, nicht hierher.

---

## 01.08.2026 — Session BER-124 (Threema-Befehl „Belegimport")

Genutzt wurden in dieser Session keine Framework-Skills; gearbeitet wurde direkt entlang
`CLAUDE.md` → `docs/UEBERGABE.md` → Spec. Die folgenden Punkte betreffen die Gates und
Konventionen, die dabei tatsächlich gegriffen haben.

### Was getragen hat

**Pre-Commit-Gate (Layer 2) lief bei beiden Commits grün, ohne Umgehung.**
Beleg: `=== Pre-Commit Gate: PASS ===` (ESLint → Typecheck → Semgrep) vor `82d9f5e` und
`1a15917`. Kein einziges `--no-verify` nötig. Die Gate-Hygiene vom 31.07. (PR #48) hält
damit über eine Session hinweg, in der neuer Code (zwei Skripte) und geänderter Bestandscode
dazukamen — das Gate ist also nicht nur nominell grün, weil nichts angefasst wurde.

### Was gehakt hat

**Die Registry-Pflicht ist auf Quelldateien nicht anwendbar, formuliert ist sie aber absolut.**
`CLAUDE.md` §Governance sagt: „**Neue Datei?** MUSS sofort in `ARCHITECTURE_DESIGN.md §9` UND
`INDEX.md` eingetragen werden — vor dem git commit." In dieser Session entstanden drei neue
Dateien: ein Dokument-Update, aber auch `scripts/beleg-import/import-poller.mjs` und
`scripts/beleg-import/de.berent.belegchat.poller.plist`.

Beide Register führen ausschließlich **Dokumente** — die bestehenden Skripte
`scripts/beleg-import/beleg-import.mjs` und `mail-scan.mjs` stehen in keinem von beiden.
Wer die Regel wörtlich befolgt, trägt Quelldateien in eine Doku-Landkarte ein und macht sie
unbrauchbar; wer sie ignoriert, verletzt eine als MUSS formulierte Konvention. Ich habe der
gelebten Praxis den Vorzug gegeben und die Skripte nicht eingetragen — das ist eine
Auslegung, keine Regelbefolgung.

**Vorschlag:** Die Regel auf ihren tatsächlichen Geltungsbereich einschränken, etwa „Neues
**Dokument**? MUSS in … eingetragen werden", und für Quelldateien entweder nichts fordern
oder eine eigene Sektion (Skripte/Jobs) in `INDEX.md` vorsehen. So bleibt die Regel prüfbar,
statt bei jedem Bau neu ausgelegt zu werden.
