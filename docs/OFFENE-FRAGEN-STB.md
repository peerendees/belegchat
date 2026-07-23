# Offene Fragen an die Steuerkanzlei — Stand 23.07.2026

> Anlass: Rückmeldung der Kanzlei vom 22.07.2026 · Fassung 2 — die Fragen 1, 2, 3,
> 7, 8, 9 der Erstfassung sind beantwortet bzw. intern verlagert (Log unten).
> Versand durch den Betreiber zusammen mit dem Korrekturstapel (Runbook M5/M6).
>
> provenance: classification internal · status final · source claude

---

## Versandteil (Anschreiben zum Korrekturstapel)

Sehr geehrte Damen und Herren,

vielen Dank für die Durchsicht des Buchungsstapels 2024. Alle drei Punkte Ihrer
Rückmeldung sind umgesetzt:

- **Gegenkonto je Buchungssatz:** Jeder Satz trägt jetzt 1800 (Geschäftskonto),
  1810 (andere Karte/Konto) oder 2100 (privat verauslagt) in Spalte „Gegenkonto".
- **Vorsteuerschlüssel:** je Satz im Feld „BU-Schlüssel", wie besprochen `90`
  (19 %) bzw. `80` (7 %); Sätze ohne Vorsteuerbezug bleiben ohne Schlüssel.
- **Buchungen ohne Beleg** sind künftig erfassbar und im Stapel in den
  Zusatzinformations-Feldern gekennzeichnet („Beleg: fehlt bei Übergabe"); die
  Originale verbleiben archiviert bei uns.

Beigefügt: **`EXTF_Buchungsstapel_2024_Jahr_K2.csv`** (Korrekturfassung, 60 Sätze).

**1 · Bitte nur die Korrekturfassung importieren.** Die Erstfassung
(`EXTF_Buchungsstapel_2024_Jahr.csv`, übergeben am 20.07.2026) bitte verwerfen —
eine kurze Bestätigung genügt uns für die Ablage. Beide Fassungen halten wir mit
SHA-256-Prüfsumme revisionssicher vor.

**2 · Sechs Sätze bitte umkontieren.** Die automatische Kontierung hat sechs
Belege fälschlich auf 6520 gelegt (als Freiberufler fällt hier keine
Gewerbesteuer an; die Kontierung ist bei uns revisionssicher festgeschrieben,
daher die Bitte um Umbuchung bei Ihnen — die Vorsteuer konnte systemseitig nicht
vorbelegt werden):

| Belegfeld 1 | Datum | Brutto | Inhalt | Vorschlag Zielkonto |
|---|---|---|---|---|
| 01-2026-0017 | 13.05.2024 | 712,39 € | Honorar steuerliche Dienstleistungen | 6830 |
| 01-2026-0018 | 13.05.2024 | 473,95 € | Honorar Steuerberatung (ESt 2021) | 6830 |
| 01-2026-0019 | 13.05.2024 | 2.284,80 € | Honorar steuerliche Beratung/Prüfung | 6830 |
| 01-2026-0025 | 03.07.2024 | 589,05 € | Design & Werbeunterlagen | 6880 |
| 01-2026-0030 | 20.11.2024 | 712,39 € | Honorar steuerliche Dienstleistungen | 6830 |
| 01-2026-0033 | 20.11.2024 | 473,95 € | Honorar Steuerberatung (ESt-Erklärung) | 6830 |

Alle sechs weisen 19 % Vorsteuer aus (Belege liegen archiviert vor).

**3 · Prüfpunkt beim Import (Automatikkonten):** Sollte Ihr Kontenplan eines der
bebuchten Konten als Automatikkonto führen und den mitgelieferten BU-Schlüssel
beanstanden, geben Sie uns bitte das betroffene Konto durch — wir unterdrücken
den Schlüssel dann dort (reine Konfiguration).

Mit freundlichen Grüßen
BERENT | Beratung + Entwicklung

---

## Beantwortet / verlagert (internes Log)

| # (Erstfassung) | Frage | Ergebnis |
|---|---|---|
| 1 | Schlüssel 9/8 oder 90/80? | **Antwort StB via Betreiber (23.07.2026): `90`/`80`.** Seeds entsprechend, `bestaetigt=true`. Fallback-Hinweis (DATEV-Standard 9/8) bleibt für den Testimport dokumentiert |
| 2 | Bedeutung 1810? | **Betreiber (23.07.2026):** Gegenkonto für Geschäftszahlungen über andere Karten/Konten — Abgrenzung zum Geschäftskonto 1800. UI-Label „Andere Karte/Konto" |
| 3 | 2100 vs. 2180? | **Betreiber (23.07.2026):** 2100 = Privatkonto (StB-Vorgabe) bleibt. 2180 (Privateinlagen) als strengere Alternative im Spalten-Kommentar dokumentiert |
| 4 | GewSt-Konto 6520/7610? | **Gegenstandslos — Freiberufler, keine GewSt.** Die 6 Belege sind Fehlkontierungen (5× StB-Honorar, 1× Werbung) → Umbuchungsliste im Versandteil. 7610-Seed bleibt in BER-120 für gewerbliche Betatest-Kunden (`docs/FEATURE-WUENSCHE.md` F-03) |
| 5 | Automatikkonten | Entschärft: StB erfasst Schlüssel auf 6805 → dort keine Automatik. Bleibt als Prüfpunkt A im Versandteil (Punkt 3) |
| 6 | Erstfassung verworfen? | Bleibt: Bestätigungsbitte im Versandteil (Punkt 1). Erstfassung = Datei vom 20.07., K2 = Korrekturfassung nach Nacherfassung |
| 7 | Liste offener Nachreichungen? | **Betreiber (23.07.2026): intern** — Belege werden vorgehalten, nicht übermittelt; Tracking über Dashboard-Filter „Dokument fehlt" |
| 8 | Kassenbuch? | **Betreiber (23.07.2026):** Barzahlungen laufen als gescannte Belege; Kassenbuch-Modul → `docs/FEATURE-WUENSCHE.md` F-02 |
| 9 | Lohnkonto 6300? | **Betreiber (23.07.2026):** aktuell keine Löhne → `docs/FEATURE-WUENSCHE.md` F-04 (mit BER-120-Bereinigung) |

*Pflege: Antworten der Kanzlei zum Versandteil hier unter dem jeweiligen Punkt
dokumentieren („Antwort StB (Datum): …") und Konfiguration nachziehen — Punkt 1:
Ablagevermerk · Punkt 2: keine Systemänderung (Kanzlei bucht um) · Punkt 3:
betroffene Konten ggf. je Konto vom Schlüssel ausnehmen (Folge-Konfiguration).*
