-- ============================================================================
-- EINMAL-KORREKTUR termin_ort an 01-2026-0035 (protokollarisches Abbild)
--
-- Ausgeführt EINMALIG am 01.08.2026 gegen Prod (xuqefeewzdvjhuquciut) per
-- Supabase-MCP `execute_sql` als eine Transaktion, auf ausdrückliche Weisung des
-- Betreibers. Anlass: beim Erfassen des ÖPNV-Tickets wurde als Termin-Ort die
-- Zielhaltestellen-/Zonennummer vom Ticket („5101") übernommen statt des Ortes
-- (Bad Homburg). Der Beleg stand bereits auf `geprueft` und war damit
-- festgeschrieben; `termin_ort` steht nicht auf der Whitelist.
--
-- Warum überhaupt korrigiert wurde: bis BER-126 wurde der Termin-Kontext im
-- DATEV-Buchungstext ohnehin abgeschnitten — der falsche Wert wäre nie beim
-- Steuerberater angekommen. Mit BER-126 zieht der Kontext in die
-- Zusatzinformation und geht vollständig mit in den Stapel. Damit wird aus einer
-- internen Unschönheit eine Angabe, die die betriebliche Veranlassung belegen
-- soll — deshalb die Berichtigung VOR dem ersten Export.
--
-- Der Verwendungszweck bleibt unangetastet: „…nach 5101 (Linie 2)" ist das, was
-- auf dem Ticket steht, und beschreibt weiterhin korrekt das Dokument.
--
-- Abgrenzung: eng begrenzt auf EIN Feld an EINEM nicht exportierten Beleg
-- (`datev_export_id IS NULL`), vollständig auditiert (1 Eintrag
-- `korrektur_vorabgabe`, alter → neuer Wert). Der Festschreibungs-Schutz war nur
-- innerhalb der Transaktion ausgesetzt; danach wurde er nachweislich wieder
-- aktiviert und mit einer verworfenen Probe-Änderung gegengeprüft (Abweisung mit
-- „Beleg 01-2026-0035 ist festgeschrieben … (termin_ort)").
--
-- Das Audit-Trigger `belege_audit` blieb bewusst AKTIV — er protokolliert nur
-- `status` und `sachkonto`, hätte hier also nichts erzeugt, was zu unterdrücken
-- gewesen wäre (Unterschied zur Korrektur vom 23.07., die Konten anfasste).
--
-- Verfahrensdoku: docs/verfahrensdoku/AENDERUNGEN-v1.1.md Abschnitt Ä-7.
-- Auf einer frischen DB ist dieses Skript ein No-op (Vorbedingung trifft nicht zu).
-- ============================================================================

BEGIN;

-- Vorbedingung hart: genau ein Beleg, geprüft, nicht exportiert, alter Wert wie erwartet.
-- Trifft das nicht zu, bricht die Transaktion ab, bevor irgendein Schutz fällt.
DO $$
DECLARE v_anzahl int;
BEGIN
  SELECT count(*) INTO v_anzahl FROM public.belege
   WHERE beleg_nr = '01-2026-0035' AND status = 'geprueft'
     AND datev_export_id IS NULL AND export_datum IS NULL
     AND termin_ort = '5101';
  IF v_anzahl <> 1 THEN
    RAISE EXCEPTION 'Vorbedingung verletzt: % Treffer statt 1 - nichts geaendert', v_anzahl;
  END IF;
END $$;

INSERT INTO public.audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
SELECT id, mandant_id, 'korrektur_vorabgabe',
       'termin_ort: 5101',
       'termin_ort -> Bad Homburg (5101 ist die Zielhaltestellen-/Zonennummer vom Ticket, nicht der Ort; Betreiber-Weisung 01.08.2026, vor jedem Export)'
  FROM public.belege WHERE beleg_nr = '01-2026-0035';

ALTER TABLE public.belege DISABLE TRIGGER trg_belege_festschreibung;

UPDATE public.belege SET termin_ort = 'Bad Homburg'
 WHERE beleg_nr = '01-2026-0035' AND status = 'geprueft' AND datev_export_id IS NULL;

ALTER TABLE public.belege ENABLE TRIGGER trg_belege_festschreibung;

COMMIT;

-- Nachweis nach dem Commit (ausgeführt, Ergebnis protokolliert):
--   termin_ort            = 'Bad Homburg'
--   status                = 'geprueft' (unverändert)
--   Trigger-Zustand       = belege_audit=O, belege_updated_at=O, trg_belege_festschreibung=O
--   Audit korrektur_vorabgabe für diesen Beleg = 1
--   Probe-Update auf termin_ort (verworfen) wurde abgewiesen:
--     „Beleg 01-2026-0035 ist festgeschrieben (Status geprueft):
--      GoBD-relevante Felder sind unveränderlich (termin_ort)"
