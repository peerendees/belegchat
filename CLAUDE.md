# CLAUDE.md — [PROJEKTNAME]

> Lies diese Datei zu Beginn jeder Session. Sie ist dein Kontext.
> Lies danach HANDOFF.md falls vorhanden.

---

## Projekt

| | |
|---|---|
| **Name** | [PROJEKTNAME] |
| **Linear** | [LINEAR-PROJEKT-URL] |
| **GitHub** | https://github.com/peerendees/[REPO-NAME] |
| **Live** | [URL oder „noch nicht deployed"] |
| **Stack** | [z.B. Next.js · Supabase · Vercel · n8n] |

---

## Worum geht es

[2–3 Sätze: Was ist dieses Projekt, für wen, welches Problem löst es.]

---

## Arbeitsregeln

- Sprache im Code: Englisch (Variablen, Funktionen, Kommentare)
- Sprache in Dokumentation / Commits: Deutsch
- Commit-Format: `BER-[Issue-Nr]: [Was wurde gemacht]`
- Kein direkter Push auf `main` — immer Branch → PR → Merge
- DSGVO: keine personenbezogenen Daten in Logs oder Commits
- BERENT CI gilt für alle visuellen Outputs (siehe `.cursor/rules/berent-ci.md`)

---

## Projektstruktur

```
[Hier die wichtigsten Verzeichnisse kurz beschreiben]
/src
/public
...
```

---

## Umgebung & Secrets

- `.env.local` liegt lokal, nie committen
- Variablen-Übersicht: [z.B. Notion-Seite oder kurze Liste hier]

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
...
```

---

## Offene Entscheidungen / bekannte Baustellen

- [ ] [Beispiel: Auth-Strategie noch nicht final entschieden]
- [ ] [Beispiel: Mobile Breakpoints fehlen noch]

---

## Nächste Schritte (grob)

1. [Schritt 1]
2. [Schritt 2]
3. [Schritt 3]

---

## Session-Übergabe

Am Ende jeder Arbeitseinheit:
1. `HANDOFF.md` aktualisieren
2. Committen: `BER-[Nr]: Session-Übergabe [Datum]`
3. Pushen

---

*BERENT.AI · Beratung + Entwicklung · berent.ai*
