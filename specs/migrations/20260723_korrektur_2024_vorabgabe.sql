-- ============================================================================
-- EINMAL-KORREKTUR 2024-Altbestand vor Erstabgabe (protokollarisches Abbild)
--
-- Ausgeführt EINMALIG am 23.07.2026 gegen Prod (xuqefeewzdvjhuquciut) per
-- Supabase-MCP `execute_sql` als eine Transaktion, auf ausdrückliche Weisung des
-- Betreibers. Anlass: der 2024-Stapel (am 20.07.2026 an die Kanzlei übergeben)
-- wurde von der Kanzlei beanstandet und NICHT importiert; vor der korrigierten
-- Neuabgabe werden zwei Dinge am festgeschriebenen Bestand berichtigt:
--
--   1. Sechs durch die Auto-Kontierung fälschlich auf 6520 (Gewerbesteuer)
--      gelegte Belege → 6830 (5× StB-Honorar) bzw. 6880 (1× Werbung). Als
--      Freiberufler fällt keine GewSt an; 6830/6880 sind vorsteuerrelevant, die
--      Sätze tragen damit im Korrekturstapel korrekt den 90er-Vorsteuerschlüssel.
--   2. Belegnummern-Präfix `01-2026-` → `01-2024-` (Erfassungsjahr → Belegjahr);
--      rein die Nummerndarstellung, die Buchung lief ohnehin über das Belegdatum.
--
-- Dies ist eine bewusste, eng begrenzte Abweichung von der GoBD-Unveränderbarkeit
-- (der Stapel war nicht abgegeben/importiert). Vollständig auditiert: 66
-- `korrektur_vorabgabe`-Einträge im append-only audit_log (6 Konto + 60 Nummer,
-- jeweils alter → neuer Wert). Verfahrensdoku: docs/verfahrensdoku/AENDERUNGEN-v1.1.md
-- Abschnitt Ä-5. Der Schutz-Trigger wurde nur innerhalb dieser Transaktion
-- ausgesetzt und nachweislich reaktiviert (beide Trigger danach `aktiv` geprüft).
--
-- Auf einer frischen DB ist dieses Skript ein No-op (keine 01-2026-Belege); die
-- CHECK-Erweiterung ist idempotent und wird für die Schema-Historie zusätzlich als
-- eigene threema-decrypt-Migration geführt.
-- ============================================================================

BEGIN;

ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_aktion_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_aktion_check
  CHECK (aktion = ANY (ARRAY[
    'status_change','konto_geaendert','export','erstellt','abgelehnt','seite_archiviert',
    'beleg_freigegeben','dokumentation_bestaetigt','teilbetrag_gebucht',
    'zahlungsweg_gesetzt','steuerschluessel_gesetzt','dokument_nachgereicht',
    'nacherfassung_zahlungsweg','nacherfassung_steuerschluessel',
    'export_eingefroren','export_ersetzt','korrektur_vorabgabe'
  ]::text[]));

ALTER TABLE public.belege DISABLE TRIGGER trg_belege_festschreibung;
ALTER TABLE public.belege DISABLE TRIGGER belege_audit;

INSERT INTO public.audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
SELECT id, mandant_id, 'korrektur_vorabgabe', 'Sachkonto 6520 (Fehlkontierung)',
  CASE WHEN beleg_nr = '01-2026-0025'
       THEN 'Sachkonto -> 6880 Werbekosten (Freiberufler: keine GewSt; StB-Rueckmeldung 22.07.2026)'
       ELSE 'Sachkonto -> 6830 Buchfuehrungs-/Beratungskosten (Freiberufler: keine GewSt; StB-Rueckmeldung 22.07.2026)'
  END
FROM public.belege WHERE sachkonto = '6520';

INSERT INTO public.audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
SELECT id, mandant_id, 'korrektur_vorabgabe', beleg_nr,
  replace(beleg_nr, '01-2026-', '01-2024-') || ' (Belegnummer-Praefix auf Belegjahr 2024, vor Erstabgabe)'
FROM public.belege WHERE beleg_nr LIKE '01-2026-%';

UPDATE public.belege SET sachkonto = '6880', sachkonto_manuell_geaendert = true
 WHERE beleg_nr = '01-2026-0025';
UPDATE public.belege SET sachkonto = '6830', sachkonto_manuell_geaendert = true
 WHERE beleg_nr IN ('01-2026-0017','01-2026-0018','01-2026-0019','01-2026-0030','01-2026-0033');

UPDATE public.belege SET beleg_nr = replace(beleg_nr, '01-2026-', '01-2024-')
 WHERE beleg_nr LIKE '01-2026-%';

ALTER TABLE public.belege ENABLE TRIGGER trg_belege_festschreibung;
ALTER TABLE public.belege ENABLE TRIGGER belege_audit;

COMMIT;
