-- ============================================================================
-- BER-122 Nachtrag: Trigger-Funktionen aus der REST-API nehmen
--
-- Befund des Supabase-Security-Advisors direkt nach dem Anwenden von
-- 20260808190814_beleg_steuerzeilen.sql: beide neuen SECURITY-DEFINER-
-- Funktionen sind ueber /rest/v1/rpc/<name> fuer anon und authenticated
-- aufrufbar (Lints 0028 anon_security_definer_function_executable und
-- 0029 authenticated_security_definer_function_executable).
--
-- Praktisches Risiko ist gering — PL/pgSQL-Triggerfunktionen brechen bei
-- direktem Aufruf mit "trigger functions can only be called as triggers" ab.
-- Trotzdem gehoeren sie nicht auf die oeffentliche API-Oberflaeche, und der
-- Security-Validation-Punkt der Story fordert ausdruecklich keinen Zugriff
-- fuer anon/authenticated.
--
-- REVOKE ist gefahrlos: Trigger laufen im Kontext des Tabellen-Eigentuemers
-- und brauchen kein EXECUTE-Recht der aufrufenden Rolle. Nach dem Anwenden
-- per Signal-Test verifiziert (08.08.2026): beide Trigger feuern unveraendert
-- (Konsistenz: 'genau eine Steuerzeile ist nicht zulaessig';
--  Festschreibung: 'Steuerzeilen sind unveraenderlich').
--
-- Gleiche Baustelle bei den Alt-Funktionen fn_beleg_seiten_insert_guard,
-- log_beleg_aenderungen und naechste_beleg_nr — die sind vorbestehend und
-- gehoeren in eine eigene Story, nicht in diesen Nachtrag.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.fn_beleg_steuerzeilen_konsistenz()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_beleg_steuerzeilen_unveraenderbar()
  FROM PUBLIC, anon, authenticated;
