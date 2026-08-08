-- ============================================================================
-- BER-144 Block C: search_path festnageln (+ RPC-Exposure von
--                  naechste_beleg_nr in einem Zug)
--
-- BEFUND (Advisor-Lint 0011 function_search_path_mutable, Level WARN)
-- Sieben Funktionen haben keinen festen search_path (proconfig IS NULL). Ohne
-- festen search_path entscheidet die Sitzung des Aufrufers, in welchem Schema
-- unqualifizierte Objektnamen aufgeloest werden.
--
-- Praktisches Risiko hier gering: anon und authenticated haben auf public nur
-- USAGE, kein CREATE — sie koennen also keine gleichnamigen Objekte
-- unterschieben. Der Lint bleibt trotzdem berechtigt: die Absicherung darf
-- nicht von den Schema-Rechten abhaengen, sondern gehoert an die Funktion.
--
-- GEWAEHLTER WERT: search_path = public, pg_temp
--   - public zuerst: alle sieben Funktionen referenzieren ihre Tabellen ohnehin
--     vollqualifiziert (public.belege, public.mandanten) oder gar nicht — vor
--     dem Setzen einzeln im Funktionskoerper geprueft, nichts bricht.
--   - pg_temp explizit ans ENDE: steht pg_temp nicht im search_path, durchsucht
--     Postgres es implizit ZUERST. Explizit hinten genannt, wird es zuletzt
--     durchsucht — das schliesst Temp-Table-Hijacking aus.
--   - pg_catalog braucht keine Nennung, es wird immer zuerst durchsucht.
--
-- Der Bestand aus BER-122 (fn_beleg_steuerzeilen_*, fn_beleg_seiten_insert_guard,
-- log_beleg_aenderungen) traegt das aeltere, etwas laschere search_path=public.
-- Angleichen waere sinnvoll, ist aber nicht Teil dieser Story.
--
-- ----------------------------------------------------------------------------
-- ZWEITER TEIL: naechste_beleg_nr
--
-- Diese Funktion taucht zusaetzlich in Block B auf (Lints 0028/0029: per
-- /rest/v1/rpc fuer anon und authenticated aufrufbar). Sie wird hier bewusst
-- in EINER Migration vollstaendig behandelt, damit sie nicht zweimal
-- angefasst wird.
--
-- Anders als die Trigger-Funktionen ist sie eine ECHTE, real aufgerufene
-- Funktion (SECURITY DEFINER, Rueckgabe json). Vor dem REVOKE wurden die
-- tatsaechlichen Aufrufer belegt, nicht vermutet:
--   dashboard_service -> belegchat/src/app/api/belege/route.ts:71,
--                        SELECT naechste_beleg_nr(...) via withMandant
--   service_role      -> POST /rest/v1/rpc/naechste_beleg_nr aus beiden
--                        n8n-Workflows ("BelegChat PDF-Import" Node
--                        "Beleg-Nr generieren (Batch)" und "BelegChat mit
--                        Threema Beleg-Eingang" Node "Beleg-Nr generieren").
--                        Beide Nodes senden den Service-Key; in den API-Logs
--                        vom 08.08.2026 als POST .../rpc/naechste_beleg_nr | n8n
--                        mit Status 200 bestaetigt.
-- Fuer anon und authenticated liess sich KEIN Aufrufer finden.
--
-- Deshalb: EXECUTE fuer PUBLIC/anon/authenticated entziehen, service_role und
-- dashboard_service behalten es. Das explizite GRANT am Ende ist Absicherung
-- gegen den Fall, dass dashboard_service sein Recht nur ueber PUBLIC hatte.
--
-- ROLLBACK: ALTER FUNCTION ... RESET search_path;
--           GRANT EXECUTE ON FUNCTION public.naechste_beleg_nr(uuid, date) TO PUBLIC;
-- ============================================================================

-- 1) search_path festnageln (7 Funktionen)

ALTER FUNCTION public.update_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.zeitraum_grenzen(text, smallint, smallint)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_beleg_seiten_unveraenderbar()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_audit_log_append_only()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_belege_festschreibung()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_datev_exporte_schutz()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.naechste_beleg_nr(uuid, date)
  SET search_path = public, pg_temp;

-- 2) naechste_beleg_nr aus der oeffentlichen REST-API nehmen

REVOKE EXECUTE ON FUNCTION public.naechste_beleg_nr(uuid, date)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.naechste_beleg_nr(uuid, date)
  TO service_role, dashboard_service;
