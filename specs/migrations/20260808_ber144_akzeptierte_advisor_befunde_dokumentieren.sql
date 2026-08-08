-- ============================================================================
-- BER-144 Block D: Zwei Advisor-Befunde als bewusst akzeptiert dokumentieren
--
-- Diese Migration aendert KEIN Verhalten und KEINE Rechte. Sie schreibt die
-- Begruendung als Datenbank-Kommentar dorthin, wo die naechste Person sie
-- findet — naemlich am Objekt selbst, nicht nur in einer Markdown-Datei.
-- Beide Befunde bleiben im Advisor stehen; das ist gewollt und ab jetzt
-- belegt, statt als unerklaerter Altbestand mitzulaufen.
--
-- ----------------------------------------------------------------------------
-- 1) extension_in_public (Lint 0014, WARN): pg_trgm liegt in public
--
-- NICHT verschieben. Ein Umzug nach extensions kann bestehende GIN/GiST-
-- Indizes und Operatorklassen brechen, die auf den Operatoren der Extension
-- aufsetzen. Der Nutzen (Kosmetik im Schema-Layout) steht in keinem
-- Verhaeltnis zum Risiko an einer produktiven GoBD-Datenbank.
--
-- Der bestehende Extension-Kommentar ("text similarity measurement and index
-- searching based on trigrams") stammt von der Extension selbst und wird hier
-- bewusst NICHT ueberschrieben — COMMENT ON EXTENSION wuerde ihn ersetzen.
-- Die Begruendung steht stattdessen in docs/SCHEMA.md und in BER-144.
--
-- ----------------------------------------------------------------------------
-- 2) rls_enabled_no_policy (Lint 0008, INFO): pending_belege ohne Policies
--
-- Bewusst so. 20260711075401_post_alpha_gobd_hardening.sql haelt es woertlich
-- fest: "Keine Policies — Zugriff ausschliesslich via Service Role (n8n, Edge)."
--
-- Am 08.08.2026 nachgeprueft und weiterhin zutreffend:
--   - als anon abgefragt: 0 Zeilen, RLS blockt vollstaendig
--   - Zugriff laeuft ueber die RPC append_pending_seite mit Service-Key
--     (n8n-Workflow "BelegChat mit Threema Beleg-Eingang", Edge Function)
--   - service_role hat BYPASSRLS und braucht keine Policy
-- Eine Policy zu ergaenzen wuerde Zugriff eroeffnen, den heute niemand braucht.
-- Das ist die konservativere Lage, nicht die laxere.
--
-- ROLLBACK: COMMENT ON TABLE public.pending_belege IS
--             'Threema Mehrseiten-Zwischenstand bis Ziffer 1/2';
-- ============================================================================

COMMENT ON TABLE public.pending_belege IS
  'Threema Mehrseiten-Zwischenstand bis Ziffer 1/2. '
  'RLS ist aktiv und traegt bewusst KEINE Policies (Advisor-Lint 0008 '
  'rls_enabled_no_policy = akzeptiert, BER-144): Zugriff ausschliesslich via '
  'Service Role (n8n, Edge) ueber die RPC append_pending_seite. '
  'Eine Policy zu ergaenzen wuerde Zugriff eroeffnen, den niemand braucht.';
