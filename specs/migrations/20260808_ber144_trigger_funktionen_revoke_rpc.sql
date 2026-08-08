-- ============================================================================
-- BER-144 Block B: Alt-Trigger-Funktionen aus der REST-API nehmen
--
-- BEFUND (Advisor-Lints 0028 anon_security_definer_function_executable und
--         0029 authenticated_security_definer_function_executable, Level WARN)
-- Beide Funktionen sind SECURITY DEFINER und ueber /rest/v1/rpc/<name> fuer
-- anon und authenticated aufrufbar.
--
-- Das ist exakt dieselbe Baustelle, die der BER-122-Nachtrag
-- 20260808191128_beleg_steuerzeilen_revoke_rpc.sql fuer die beiden neuen
-- Steuerzeilen-Trigger geschlossen hat. Diese beiden hier sind vorbestehend
-- und wurden dort ausdruecklich einer eigenen Story ueberlassen.
--
-- Praktisches Risiko gering — PL/pgSQL-Triggerfunktionen brechen bei direktem
-- Aufruf mit "trigger functions can only be called as triggers" ab. Sie
-- gehoeren trotzdem nicht auf die oeffentliche API-Oberflaeche.
--
-- REVOKE ist gefahrlos: Trigger laufen im Kontext des Tabellen-Eigentuemers
-- und brauchen kein EXECUTE-Recht der aufrufenden Rolle. Belegt durch den
-- Signal-Test nach dem BER-122-Nachtrag am 08.08.2026 — beide dortigen
-- Trigger feuerten nach dem REVOKE unveraendert.
--
-- Die dritte Funktion aus diesem Lint-Paar, naechste_beleg_nr, ist KEINE
-- Trigger-Funktion und wird real aufgerufen. Sie ist bewusst nicht hier,
-- sondern zusammen mit ihrem search_path-Fix in
-- 20260808221500_funktionen_search_path_und_beleg_nr_revoke.sql behandelt —
-- eine Funktion, eine Migration.
--
-- search_path ist bei beiden bereits gesetzt (search_path=public); sie stehen
-- deshalb nicht in der Block-C-Liste.
--
-- ROLLBACK: GRANT EXECUTE ON FUNCTION <name>() TO PUBLIC;
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.fn_beleg_seiten_insert_guard()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.log_beleg_aenderungen()
  FROM PUBLIC, anon, authenticated;
