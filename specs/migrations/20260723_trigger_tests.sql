-- ============================================================================
-- VERHALTENS-TESTS zur konsolidierten Migration (BER-116/117/118/119/121)
--
-- Ausführung: Baulauf-Schritt S1, NACH apply_migration, per Supabase-MCP
-- execute_sql als EIN Aufruf. Läuft in einer Transaktion und endet mit
-- ROLLBACK — hinterlässt keinerlei Daten. Arbeitet ausschließlich mit
-- synthetischen Zeilen am Test-Mandanten (Threema-ID VDUZ9S7E, Firma 99);
-- Echtbestand wird zu keinem Zeitpunkt verändert.
--
-- Muster: erwartete Trigger-Fehler werden gefangen; bleibt ein erwarteter
-- Fehler AUS, wirft der Test 'T<n> FEHLGESCHLAGEN …' und die gesamte
-- Transaktion bricht ab → der Baulauf wertet jede Exception des Aufrufs als
-- Abbruchbedingung. Läuft alles durch, ist die letzte Meldung
-- 'ALLE TRIGGER-TESTS BESTANDEN' (RAISE NOTICE) und der ROLLBACK greift.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Setup: zwei synthetische, festgeschriebene Belege am Test-Mandanten
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

  -- Beleg 1: normaler Beleg (Whitelist-/Nacherfassungs-Tests)
  INSERT INTO public.belege
    (beleg_nr, mandant_id, eingangskanal, status, beleg_datum, betrag_brutto,
     betrag_netto, mwst_satz, mwst_betrag, beleg_typ, verwendungszweck,
     sachkonto, trinkgeld, stb_vermerk)
  VALUES
    ('99-2099-9901', m_id, 'batch', 'vorschlag', DATE '2099-01-15', 11.90,
     10.00, 19.00, 1.90, 'sonstiges', 'TRIGGERTEST BER-116..121',
     '6890', NULL, 'Testvermerk');

  -- Beleg 2: ohne Dokument erfasst (BER-118-Tests)
  INSERT INTO public.belege
    (beleg_nr, mandant_id, eingangskanal, status, beleg_datum, betrag_brutto,
     betrag_netto, mwst_satz, mwst_betrag, beleg_typ, verwendungszweck,
     sachkonto, dokument_fehlt)
  VALUES
    ('99-2099-9902', m_id, 'frontend_upload', 'vorschlag', DATE '2099-02-20',
     23.80, 20.00, 19.00, 3.80, 'sonstiges', 'TRIGGERTEST OHNE DOKUMENT',
     '6890', true);

  -- beide festschreiben (Statuswechsel im offenen Zustand ist frei)
  UPDATE public.belege SET status = 'geprueft', geprueft_am = now()
   WHERE beleg_nr IN ('99-2099-9901', '99-2099-9902');
END
$setup$;

-- ---------------------------------------------------------------------------
-- T1–T9: fn_belege_festschreibung (Whitelist + Ausnahmen)
-- ---------------------------------------------------------------------------
DO $tests$
DECLARE
  b1 uuid; b2 uuid;
BEGIN
  SELECT id INTO b1 FROM public.belege WHERE beleg_nr = '99-2099-9901';
  SELECT id INTO b2 FROM public.belege WHERE beleg_nr = '99-2099-9902';

  -- T1: Alt-Spalte der bisherigen Sperrliste bleibt gesperrt
  BEGIN
    UPDATE public.belege SET verwendungszweck = 'geaendert' WHERE id = b1;
    RAISE EXCEPTION 'T1 FEHLGESCHLAGEN: verwendungszweck war änderbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T2: bisher UNGESCHÜTZTE Spalte ist jetzt gesperrt (die 6 nachgezogenen)
  BEGIN
    UPDATE public.belege SET trinkgeld = 5.00 WHERE id = b1;
    RAISE EXCEPTION 'T2 FEHLGESCHLAGEN: trinkgeld war änderbar (Whitelist-Lücke)';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T5 (vor T3): gegenkonto OHNE zahlungsweg → Kopplungsfehler
  BEGIN
    UPDATE public.belege SET gegenkonto = '1800' WHERE id = b1;
    RAISE EXCEPTION 'T5 FEHLGESCHLAGEN: gegenkonto allein war setzbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T3: zahlungsweg + gegenkonto gemeinsam NULL → Wert = erlaubt (BER-119)
  UPDATE public.belege
     SET zahlungsweg = 'geschaeftskonto', gegenkonto = '1800'
   WHERE id = b1;

  -- T4: zweiter Versuch (Wert → Wert) → gesperrt
  BEGIN
    UPDATE public.belege
       SET zahlungsweg = 'privat', gegenkonto = '2100'
     WHERE id = b1;
    RAISE EXCEPTION 'T4 FEHLGESCHLAGEN: zahlungsweg war ein zweites Mal änderbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T6a: bu_schluessel NULL → Wert = erlaubt (Wert wie Seed '90')
  UPDATE public.belege SET bu_schluessel = '90' WHERE id = b1;

  -- T6b: bu_schluessel Wert → Wert → gesperrt
  BEGIN
    UPDATE public.belege SET bu_schluessel = '80' WHERE id = b1;
    RAISE EXCEPTION 'T6 FEHLGESCHLAGEN: bu_schluessel war ein zweites Mal änderbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T7a: dokument_fehlt → false OHNE gobd_hash → gesperrt
  BEGIN
    UPDATE public.belege SET dokument_fehlt = false WHERE id = b2;
    RAISE EXCEPTION 'T7a FEHLGESCHLAGEN: dokument_fehlt ohne Nachreichung änderbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T7b: gobd_hash allein (ohne bild_storage_path) → Kopplungsfehler
  BEGIN
    UPDATE public.belege
       SET gobd_hash = repeat('a', 64)
     WHERE id = b2;
    RAISE EXCEPTION 'T7b FEHLGESCHLAGEN: gobd_hash ohne bild_storage_path setzbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T8: stb_vermerk bleibt eingefroren (BER-118: keine Fortschreibung)
  BEGIN
    UPDATE public.belege SET stb_vermerk = 'nachgereicht am …' WHERE id = b1;
    RAISE EXCEPTION 'T8 FEHLGESCHLAGEN: stb_vermerk war änderbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T9: DELETE festgeschriebener Beleg → gesperrt
  BEGIN
    DELETE FROM public.belege WHERE id = b1;
    RAISE EXCEPTION 'T9 FEHLGESCHLAGEN: festgeschriebener Beleg war löschbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'T1–T9 bestanden';
END
$tests$;

-- ---------------------------------------------------------------------------
-- T10: RLS dash_seiten_insert + BER-118-Nachreichung als dashboard_service
-- ---------------------------------------------------------------------------
DO $prep_role$ BEGIN PERFORM set_config('app.mandant_id',
  (SELECT id::text FROM public.mandanten WHERE threema_id = 'VDUZ9S7E'), true);
END $prep_role$;

-- Mitgliedschaft nur für diese Transaktion (Rollback nimmt sie zurück) —
-- ohne sie kann die ausführende Rolle je nach PG-Version kein SET ROLE.
GRANT dashboard_service TO postgres;
SET LOCAL ROLE dashboard_service;

DO $t10$
DECLARE
  b2 uuid;
BEGIN
  SELECT id INTO b2 FROM public.belege WHERE beleg_nr = '99-2099-9902';
  IF b2 IS NULL THEN
    RAISE EXCEPTION 'T10 FEHLGESCHLAGEN: RLS-Sicht liefert Testbeleg nicht (app.mandant_id?)';
  END IF;

  -- T10a: Seite an festgeschriebenen Beleg OHNE Seiten → von der neuen Policy erlaubt
  INSERT INTO public.beleg_seiten (beleg_id, seite_nr, storage_path, gobd_hash, mime_type, archived_at)
  VALUES (b2, 1, 'triggertest/99-2099-9902.pdf', repeat('b', 64), 'application/pdf', now());

  -- T10b: Beleg-Hash + Pfad + dokument_fehlt in EINEM Update (App-Pfad BER-118) → erlaubt
  UPDATE public.belege
     SET gobd_hash = repeat('b', 64),
         bild_storage_path = 'triggertest/99-2099-9902.pdf',
         dokument_fehlt = false
   WHERE id = b2;

  -- T10c: ZWEITE Seite am selben festgeschriebenen Beleg → RLS-Verstoß (42501)
  BEGIN
    INSERT INTO public.beleg_seiten (beleg_id, seite_nr, storage_path, gobd_hash, mime_type, archived_at)
    VALUES (b2, 2, 'triggertest/zweite-datei.pdf', repeat('c', 64), 'application/pdf', now());
    RAISE EXCEPTION 'T10c FEHLGESCHLAGEN: zweite Seite an festgeschriebenem Beleg einfügbar';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL; -- erwartet: new row violates RLS
    WHEN raise_exception THEN
      IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T10d: gobd_hash ersetzen nach Nachreichung → gesperrt (Trigger)
  BEGIN
    UPDATE public.belege
       SET gobd_hash = repeat('d', 64), bild_storage_path = 'triggertest/ersatz.pdf'
     WHERE id = b2;
    RAISE EXCEPTION 'T10d FEHLGESCHLAGEN: nachgereichtes Dokument war ersetzbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'T10 bestanden';
END
$t10$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- T11: audit_log bleibt append-only
-- ---------------------------------------------------------------------------
DO $t11$
BEGIN
  BEGIN
    UPDATE public.audit_log SET neuer_wert = 'manipuliert'
     WHERE id IN (SELECT id FROM public.audit_log LIMIT 1);
    RAISE EXCEPTION 'T11 FEHLGESCHLAGEN: audit_log war änderbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'T11 bestanden';
END
$t11$;

-- ---------------------------------------------------------------------------
-- T12: datev_exporte — Einfrieren, Unveränderlichkeit, Fassungen
-- ---------------------------------------------------------------------------
DO $t12$
DECLARE
  m_id uuid;
  v1 uuid;
BEGIN
  SELECT id INTO m_id FROM public.mandanten WHERE threema_id = 'VDUZ9S7E';

  -- T12a: eingefrorener Export mit korrektem Hash → INSERT erlaubt
  INSERT INTO public.datev_exporte
    (buchungsjahr, zeitraum_von, zeitraum_bis, zeitraum_typ, anzahl_belege,
     datei_pfad, status, mandant_id, datei_inhalt, inhalts_hash, eingefroren_am)
  VALUES
    (2099, DATE '2099-01-01', DATE '2099-12-31', 'jahr', 2,
     'EXTF_TRIGGERTEST_2099.csv', 'erstellt', m_id,
     'TESTINHALT'::bytea, encode(sha256('TESTINHALT'::bytea), 'hex'), now())
  RETURNING id INTO v1;

  -- T12b: falscher Hash → INSERT gesperrt
  BEGIN
    INSERT INTO public.datev_exporte
      (buchungsjahr, zeitraum_von, zeitraum_bis, zeitraum_typ, anzahl_belege,
       datei_pfad, status, mandant_id, datei_inhalt, inhalts_hash, eingefroren_am)
    VALUES
      (2099, DATE '2099-01-01', DATE '2099-12-31', 'jahr', 0,
       'EXTF_TRIGGERTEST_FALSCH.csv', 'erstellt', m_id,
       'TESTINHALT'::bytea, repeat('e', 64), now());
    RAISE EXCEPTION 'T12b FEHLGESCHLAGEN: falscher inhalts_hash wurde akzeptiert';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T12c: Metadaten nach Einfrieren unveränderlich
  BEGIN
    UPDATE public.datev_exporte SET datei_pfad = 'umbenannt.csv' WHERE id = v1;
    RAISE EXCEPTION 'T12c FEHLGESCHLAGEN: datei_pfad nach Einfrieren änderbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T12d: DELETE immer gesperrt
  BEGIN
    DELETE FROM public.datev_exporte WHERE id = v1;
    RAISE EXCEPTION 'T12d FEHLGESCHLAGEN: datev_exporte-Zeile war löschbar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%FEHLGESCHLAGEN%' THEN RAISE; END IF;
  END;

  -- T12e: Status-Lebenszyklus erstellt → ersetzt erlaubt
  UPDATE public.datev_exporte SET status = 'ersetzt' WHERE id = v1;

  -- T12f: Korrekturfassung ohne Grund → CHECK-Verstoß
  BEGIN
    INSERT INTO public.datev_exporte
      (buchungsjahr, zeitraum_von, zeitraum_bis, zeitraum_typ, anzahl_belege,
       datei_pfad, status, mandant_id, version, wurzel_export_id,
       ersetzt_export_id, datei_inhalt, inhalts_hash, eingefroren_am)
    VALUES
      (2099, DATE '2099-01-01', DATE '2099-12-31', 'jahr', 2,
       'EXTF_TRIGGERTEST_2099_K2.csv', 'erstellt', m_id, 2, v1, v1,
       'KORREKTUR'::bytea, encode(sha256('KORREKTUR'::bytea), 'hex'), now());
    RAISE EXCEPTION 'T12f FEHLGESCHLAGEN: Korrektur ohne korrektur_grund einfügbar';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- T12g: Korrekturfassung vollständig → erlaubt
  INSERT INTO public.datev_exporte
    (buchungsjahr, zeitraum_von, zeitraum_bis, zeitraum_typ, anzahl_belege,
     datei_pfad, status, mandant_id, version, wurzel_export_id,
     ersetzt_export_id, korrektur_grund, datei_inhalt, inhalts_hash, eingefroren_am)
  VALUES
    (2099, DATE '2099-01-01', DATE '2099-12-31', 'jahr', 2,
     'EXTF_TRIGGERTEST_2099_K2.csv', 'erstellt', m_id, 2, v1, v1,
     'Triggertest', 'KORREKTUR'::bytea,
     encode(sha256('KORREKTUR'::bytea), 'hex'), now());

  -- T12h: ZWEITE Korrektur derselben Fassung → unique_violation
  BEGIN
    INSERT INTO public.datev_exporte
      (buchungsjahr, zeitraum_von, zeitraum_bis, zeitraum_typ, anzahl_belege,
       datei_pfad, status, mandant_id, version, wurzel_export_id,
       ersetzt_export_id, korrektur_grund, datei_inhalt, inhalts_hash, eingefroren_am)
    VALUES
      (2099, DATE '2099-01-01', DATE '2099-12-31', 'jahr', 2,
       'EXTF_TRIGGERTEST_2099_K2b.csv', 'erstellt', m_id, 2, v1, v1,
       'Triggertest doppelt', 'KORREKTUR2'::bytea,
       encode(sha256('KORREKTUR2'::bytea), 'hex'), now());
    RAISE EXCEPTION 'T12h FEHLGESCHLAGEN: zweite Korrektur derselben Fassung einfügbar';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  RAISE NOTICE 'T12 bestanden';
END
$t12$;

-- ---------------------------------------------------------------------------
-- T13: höchstens ein produktiver Mandant je Threema-ID
-- ---------------------------------------------------------------------------
DO $t13$
BEGIN
  BEGIN
    INSERT INTO public.mandanten (threema_id, firma_nr, modus, bezeichnung)
    VALUES ('BUMFMZ39', '99', 'produktiv', 'TRIGGERTEST Duplikat produktiv');
    RAISE EXCEPTION 'T13 FEHLGESCHLAGEN: zweiter produktiver Mandant mit derselben Threema-ID einfügbar';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  RAISE NOTICE 'T13 bestanden';
END
$t13$;

-- ---------------------------------------------------------------------------
-- T14: steuerschluessel-Seeds vorhanden
-- ---------------------------------------------------------------------------
DO $t14$
BEGIN
  IF (SELECT count(*) FROM public.steuerschluessel
       WHERE typ = 'vorsteuer' AND bestaetigt = true
         AND bu_schluessel IN ('90', '80')) <> 4 THEN
    RAISE EXCEPTION 'T14 FEHLGESCHLAGEN: erwartet 4 bestätigte Vorsteuer-Seeds (90/80), gefunden %',
      (SELECT count(*) FROM public.steuerschluessel);
  END IF;
  RAISE NOTICE 'T14 bestanden';
END
$t14$;

DO $fin$ BEGIN RAISE NOTICE 'ALLE TRIGGER-TESTS BESTANDEN — ROLLBACK folgt'; END $fin$;

ROLLBACK;
