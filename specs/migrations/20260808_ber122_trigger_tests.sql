-- ============================================================================
-- VERHALTENS-TESTS zu BER-122 Stufe 1 (beleg_steuerzeilen)
--
-- Ausführung: NACH apply_migration von
-- threema-decrypt/supabase/migrations/20260808110034_beleg_steuerzeilen.sql,
-- per Supabase-MCP execute_sql als EIN Aufruf. Läuft in einer Transaktion und
-- endet mit ROLLBACK — hinterlässt keinerlei Daten. Arbeitet ausschließlich mit
-- synthetischen Zeilen am Test-Mandanten (Threema-ID VDUZ9S7E, Firma 99);
-- Echtbestand wird zu keinem Zeitpunkt verändert.
--
-- Muster wie 20260723_trigger_tests.sql: erwartete Trigger-Fehler werden
-- gefangen; bleibt ein erwarteter Fehler AUS, wirft der Test
-- 'T<n> FEHLGESCHLAGEN …' und die gesamte Transaktion bricht ab. Läuft alles
-- durch, ist die letzte Meldung 'ALLE BER-122-TRIGGER-TESTS BESTANDEN'.
--
-- Besonderheit gegenüber den bisherigen Tests: der Konsistenz-Trigger ist ein
-- CONSTRAINT TRIGGER mit DEFERRABLE INITIALLY DEFERRED — er feuert regulär erst
-- beim COMMIT. In einer Rollback-Transaktion gibt es kein COMMIT, deshalb wird
-- die Prüfung je Testfall mit `SET CONSTRAINTS … IMMEDIATE` gezielt ausgelöst
-- und danach wieder auf DEFERRED zurückgestellt.
--
-- Rechenbeispiel des Mehrsatz-Belegs (Restaurant, 7 % + 19 %):
--   Zeile 1: netto 10.00 · 19 % · MwSt 1.90 → brutto 11.90
--   Zeile 2: netto  9.00 ·  7 % · MwSt 0.63 → brutto  9.63
--   Summe:   netto 19.00 ·        MwSt 2.53 → brutto 21.53
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Setup: drei synthetische Belege am Test-Mandanten
-- ---------------------------------------------------------------------------
DO $setup$
DECLARE
  m_id uuid;
BEGIN
  SELECT id INTO m_id FROM public.mandanten
   WHERE threema_id = 'VDUZ9S7E' AND firma_nr = '99';
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'SETUP FEHLGESCHLAGEN: Test-Mandant VDUZ9S7E/99 nicht gefunden';
  END IF;

  -- B1: offener Mehrsatz-Kandidat (mwst_satz/bu_schluessel bewusst NULL)
  INSERT INTO public.belege
    (beleg_nr, mandant_id, eingangskanal, status, beleg_datum, betrag_brutto,
     betrag_netto, mwst_satz, mwst_betrag, beleg_typ, verwendungszweck, sachkonto)
  VALUES
    ('99-2098-9801', m_id, 'batch', 'vorschlag', DATE '2098-01-15', 21.53,
     19.00, NULL, 2.53, 'sonstiges', 'BER-122 MEHRSATZ OFFEN', '6890');

  -- B2: offener Ein-Satz-Beleg (Regelfall, muss unberührt funktionieren)
  INSERT INTO public.belege
    (beleg_nr, mandant_id, eingangskanal, status, beleg_datum, betrag_brutto,
     betrag_netto, mwst_satz, mwst_betrag, beleg_typ, verwendungszweck, sachkonto)
  VALUES
    ('99-2098-9802', m_id, 'batch', 'vorschlag', DATE '2098-02-15', 11.90,
     10.00, 19.00, 1.90, 'sonstiges', 'BER-122 EIN-SATZ', '6890');

  -- B3: Mehrsatz-Beleg, wird nach dem Anlegen der Zeilen festgeschrieben
  INSERT INTO public.belege
    (beleg_nr, mandant_id, eingangskanal, status, beleg_datum, betrag_brutto,
     betrag_netto, mwst_satz, mwst_betrag, beleg_typ, verwendungszweck, sachkonto)
  VALUES
    ('99-2098-9803', m_id, 'batch', 'vorschlag', DATE '2098-03-15', 21.53,
     19.00, NULL, 2.53, 'sonstiges', 'BER-122 MEHRSATZ FESTGESCHRIEBEN', '6890');
END
$setup$;

-- ---------------------------------------------------------------------------
-- T1–T5: Konsistenz-Trigger (deferred)
-- ---------------------------------------------------------------------------
DO $tests_konsistenz$
DECLARE
  b1 uuid; b2 uuid;
BEGIN
  SELECT id INTO b1 FROM public.belege WHERE beleg_nr = '99-2098-9801';
  SELECT id INTO b2 FROM public.belege WHERE beleg_nr = '99-2098-9802';

  -- T1: genau EINE Steuerzeile ist verboten
  BEGIN
    INSERT INTO public.beleg_steuerzeilen (beleg_id, pos, mwst_satz, betrag_netto, mwst_betrag)
      VALUES (b1, 1, 19.00, 10.00, 1.90);
    SET CONSTRAINTS public.trg_beleg_steuerzeilen_konsistenz IMMEDIATE;
    RAISE EXCEPTION 'T1 FEHLGESCHLAGEN: eine einzelne Steuerzeile war erlaubt';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;
  SET CONSTRAINTS ALL DEFERRED;

  -- T2: zwei Zeilen, deren Summen NICHT auf den Belegbetrag laufen
  BEGIN
    INSERT INTO public.beleg_steuerzeilen (beleg_id, pos, mwst_satz, betrag_netto, mwst_betrag)
      VALUES (b1, 1, 19.00, 10.00, 1.90),
             (b1, 2,  7.00,  8.00, 0.56);   -- netto 18.00 statt 19.00
    SET CONSTRAINTS public.trg_beleg_steuerzeilen_konsistenz IMMEDIATE;
    RAISE EXCEPTION 'T2 FEHLGESCHLAGEN: Steuerzeilen mit falscher Summe waren erlaubt';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;
  SET CONSTRAINTS ALL DEFERRED;

  -- T3: korrekte Zeilen, aber belege.mwst_satz ist gesetzt (Ausschlussregel)
  BEGIN
    INSERT INTO public.beleg_steuerzeilen (beleg_id, pos, mwst_satz, betrag_netto, mwst_betrag)
      VALUES (b2, 1, 19.00, 5.00, 0.95),
             (b2, 2, 19.00, 5.00, 0.95);   -- Summen passen zu B2, aber B2 hat mwst_satz 19.00
    SET CONSTRAINTS public.trg_beleg_steuerzeilen_konsistenz IMMEDIATE;
    RAISE EXCEPTION 'T3 FEHLGESCHLAGEN: Steuerzeilen neben gesetztem belege.mwst_satz waren erlaubt';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;
  SET CONSTRAINTS ALL DEFERRED;

  -- T4: korrekter Mehrsatz-Beleg (zwei Zeilen, Summen centgleich, Einzelsatz NULL)
  INSERT INTO public.beleg_steuerzeilen (beleg_id, pos, mwst_satz, betrag_netto, mwst_betrag, bu_schluessel)
    VALUES (b1, 1, 19.00, 10.00, 1.90, '90'),
           (b1, 2,  7.00,  9.00, 0.63, '80');
  SET CONSTRAINTS public.trg_beleg_steuerzeilen_konsistenz IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;

  -- T4b: generierte Spalte betrag_brutto stimmt je Zeile
  IF (SELECT sum(betrag_brutto) FROM public.beleg_steuerzeilen WHERE beleg_id = b1) <> 21.53 THEN
    RAISE EXCEPTION 'T4b FEHLGESCHLAGEN: betrag_brutto der Zeilen summiert nicht auf 21.53';
  END IF;

  -- T5: Gegenrichtung — belege.mwst_satz nachträglich setzen, während Zeilen existieren
  BEGIN
    UPDATE public.belege SET mwst_satz = 19.00 WHERE id = b1;
    SET CONSTRAINTS public.trg_belege_steuerzeilen_konsistenz IMMEDIATE;
    RAISE EXCEPTION 'T5 FEHLGESCHLAGEN: belege.mwst_satz war neben Steuerzeilen setzbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;
  SET CONSTRAINTS ALL DEFERRED;

  -- T6: Ein-Satz-Beleg bleibt unberührt — kein Zwang zu Zeilen, Update läuft
  UPDATE public.belege SET verwendungszweck = 'BER-122 EIN-SATZ GEAENDERT' WHERE id = b2;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END
$tests_konsistenz$;

-- ---------------------------------------------------------------------------
-- T7–T9: Festschreibungs-Trigger (INSERT/UPDATE/DELETE-Trio)
-- ---------------------------------------------------------------------------
DO $tests_festschreibung$
DECLARE
  b3 uuid;
BEGIN
  SELECT id INTO b3 FROM public.belege WHERE beleg_nr = '99-2098-9803';

  -- Zeilen im offenen Zustand anlegen, dann Beleg festschreiben
  INSERT INTO public.beleg_steuerzeilen (beleg_id, pos, mwst_satz, betrag_netto, mwst_betrag, bu_schluessel)
    VALUES (b3, 1, 19.00, 10.00, 1.90, '90'),
           (b3, 2,  7.00,  9.00, 0.63, '80');
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;

  UPDATE public.belege SET status = 'geprueft', geprueft_am = now() WHERE id = b3;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;

  -- T7: INSERT einer weiteren Zeile → blockiert
  BEGIN
    INSERT INTO public.beleg_steuerzeilen (beleg_id, pos, mwst_satz, betrag_netto, mwst_betrag)
      VALUES (b3, 3, 19.00, 1.00, 0.19);
    RAISE EXCEPTION 'T7 FEHLGESCHLAGEN: Steuerzeile bei festgeschriebenem Beleg einfügbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T8: UPDATE einer Zeile → blockiert
  BEGIN
    UPDATE public.beleg_steuerzeilen SET betrag_netto = 11.00 WHERE beleg_id = b3 AND pos = 1;
    RAISE EXCEPTION 'T8 FEHLGESCHLAGEN: Steuerzeile bei festgeschriebenem Beleg änderbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T9: DELETE einer Zeile → blockiert
  BEGIN
    DELETE FROM public.beleg_steuerzeilen WHERE beleg_id = b3 AND pos = 2;
    RAISE EXCEPTION 'T9 FEHLGESCHLAGEN: Steuerzeile bei festgeschriebenem Beleg löschbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;
END
$tests_festschreibung$;

-- ---------------------------------------------------------------------------
-- T10: Kaskade beim Löschen eines OFFENEN Belegs bleibt möglich
-- ---------------------------------------------------------------------------
DO $tests_kaskade$
DECLARE
  m_id uuid; b4 uuid; n integer;
BEGIN
  SELECT id INTO m_id FROM public.mandanten
   WHERE threema_id = 'VDUZ9S7E' AND firma_nr = '99';

  INSERT INTO public.belege
    (beleg_nr, mandant_id, eingangskanal, status, beleg_datum, betrag_brutto,
     betrag_netto, mwst_satz, mwst_betrag, beleg_typ, verwendungszweck, sachkonto)
  VALUES
    ('99-2098-9804', m_id, 'batch', 'vorschlag', DATE '2098-04-15', 21.53,
     19.00, NULL, 2.53, 'sonstiges', 'BER-122 KASKADE', '6890')
  RETURNING id INTO b4;

  INSERT INTO public.beleg_steuerzeilen (beleg_id, pos, mwst_satz, betrag_netto, mwst_betrag)
    VALUES (b4, 1, 19.00, 10.00, 1.90),
           (b4, 2,  7.00,  9.00, 0.63);
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;

  DELETE FROM public.belege WHERE id = b4;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;

  SELECT count(*) INTO n FROM public.beleg_steuerzeilen WHERE beleg_id = b4;
  IF n <> 0 THEN
    RAISE EXCEPTION 'T10 FEHLGESCHLAGEN: Steuerzeilen nach Kaskade noch vorhanden (%)', n;
  END IF;
END
$tests_kaskade$;

-- ---------------------------------------------------------------------------
-- T11: RLS — Mandantenisolation über den Join auf belege
--
--      T11a–c sind STRUKTURELL und laufen immer: RLS aktiv, vier Policies,
--      kein Selbstbezug auf die eigene Tabelle (42P17-Regressionsschutz).
--      T11d ist der VERHALTENS-Test als Rolle dashboard_service. Er braucht
--      eine Verbindung, die SET ROLE auf dashboard_service darf — der
--      Supabase-MCP-Zugang darf das NICHT (42501). In dem Fall überspringt der
--      Test mit NOTICE, statt den ganzen Lauf abzubrechen; der Nachweis ist
--      dann über eine DASHBOARD_DB_URL-Verbindung nachzuholen.
-- ---------------------------------------------------------------------------
DO $tests_rls$
DECLARE
  m_id          uuid;
  fremd_id      uuid := '00000000-0000-0000-0000-0000000000ff';
  sichtbar      integer;
  rls_an        boolean;
  n_policies    integer;
  n_selbstbezug integer;
BEGIN
  -- T11a: RLS ist aktiviert
  SELECT relrowsecurity INTO rls_an
    FROM pg_class WHERE oid = 'public.beleg_steuerzeilen'::regclass;
  IF NOT rls_an THEN
    RAISE EXCEPTION 'T11a FEHLGESCHLAGEN: RLS ist auf beleg_steuerzeilen nicht aktiviert';
  END IF;

  -- T11b: vier Policies (SELECT/INSERT/UPDATE/DELETE)
  SELECT count(*) INTO n_policies
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'beleg_steuerzeilen';
  IF n_policies <> 4 THEN
    RAISE EXCEPTION 'T11b FEHLGESCHLAGEN: % Policies statt 4 auf beleg_steuerzeilen', n_policies;
  END IF;

  -- T11c: keine Policy referenziert die eigene Tabelle in einer Subquery (42P17)
  SELECT count(*) INTO n_selbstbezug
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'beleg_steuerzeilen'
     AND (COALESCE(qual, '')       ~* 'from\s+(public\.)?beleg_steuerzeilen'
       OR COALESCE(with_check, '') ~* 'from\s+(public\.)?beleg_steuerzeilen');
  IF n_selbstbezug > 0 THEN
    RAISE EXCEPTION 'T11c FEHLGESCHLAGEN: % Policy(s) mit Selbstbezug auf beleg_steuerzeilen — 42P17-Rekursionsgefahr', n_selbstbezug;
  END IF;

  -- T11d: Verhaltens-Test, nur wenn die Verbindung SET ROLE darf
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dashboard_service') THEN
    RAISE NOTICE 'T11d UEBERSPRUNGEN: Rolle dashboard_service nicht vorhanden';
    RETURN;
  END IF;

  SELECT id INTO m_id FROM public.mandanten
   WHERE threema_id = 'VDUZ9S7E' AND firma_nr = '99';

  BEGIN
    -- negativ: fremder Mandant sieht nichts
    SET LOCAL ROLE dashboard_service;
    PERFORM set_config('app.mandant_id', fremd_id::text, true);
    SELECT count(*) INTO sichtbar FROM public.beleg_steuerzeilen;
    RESET ROLE;

    IF sichtbar <> 0 THEN
      RAISE EXCEPTION 'T11d FEHLGESCHLAGEN: fremder Mandant sieht % Steuerzeilen', sichtbar;
    END IF;

    -- positiv: eigener Mandant sieht die Testzeilen
    SET LOCAL ROLE dashboard_service;
    PERFORM set_config('app.mandant_id', m_id::text, true);
    SELECT count(*) INTO sichtbar FROM public.beleg_steuerzeilen;
    RESET ROLE;

    IF sichtbar = 0 THEN
      RAISE EXCEPTION 'T11e FEHLGESCHLAGEN: eigener Mandant sieht keine Steuerzeilen (Policy zu streng)';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'T11d/e UEBERSPRUNGEN: Verbindungsrolle darf kein SET ROLE dashboard_service (%). Verhaltens-Nachweis ueber DASHBOARD_DB_URL nachholen.', SQLERRM;
  END;
END
$tests_rls$;

-- ---------------------------------------------------------------------------
-- T12: Regression — bestehender Ein-Satz-Bestand ist von der Migration
--      unberührt (kein Beleg hat Steuerzeilen, keine Zeile ohne Beleg)
-- ---------------------------------------------------------------------------
DO $tests_bestand$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.beleg_steuerzeilen z
    JOIN public.belege b ON b.id = z.beleg_id
   WHERE b.beleg_nr NOT LIKE '99-2098-%';
  IF n <> 0 THEN
    RAISE EXCEPTION 'T12 FEHLGESCHLAGEN: % Steuerzeilen an Nicht-Testbelegen gefunden', n;
  END IF;

  RAISE NOTICE 'ALLE BER-122-TRIGGER-TESTS BESTANDEN';
END
$tests_bestand$;

ROLLBACK;
