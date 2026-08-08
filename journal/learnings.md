# Learnings — BelegChat (L1)

> Learning-Loop Level 1: Bullet-Points. Wird von /sprint-review befuellt.

---

<!-- Format: Datum | Was funktioniert hat | Was nicht | Naechstes Experiment -->

- **2026-08-08 (BER-122 Stufe 1)** — Mehrzeilen-Invarianten (0-oder-≥2 Zeilen, Summen
  centgleich) lassen sich **nicht** als gewöhnlicher Row-Trigger formulieren: beim
  Einfügen von zwei Zeilen existiert nach der ersten Zeile genau 1 Zeile und die Summe
  stimmt noch nicht — jeder legale Fall würde blockiert. Richtig ist
  `CREATE CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED`. Folgeeffekt für Tests:
  in einer Rollback-Transaktion gibt es kein COMMIT, die Prüfung muss je Testfall mit
  `SET CONSTRAINTS … IMMEDIATE` gezielt ausgelöst und danach wieder auf DEFERRED
  gestellt werden. **Vorbeugung:** bei jeder neuen Satellitentabelle mit
  Summen-/Kardinalitätsregel zuerst fragen, ob die Regel je Zeile überhaupt wahr sein
  kann.
- **2026-08-08 (BER-122 Stufe 1)** — Eine Invariante über zwei Tabellen braucht Trigger
  auf **beiden** Seiten. Der Schutz nur auf der Satellitentabelle wäre über die
  Elterntabelle umgehbar gewesen (`belege.mwst_satz` nachträglich setzen). **Vorbeugung:**
  bei „A und B schließen sich aus" immer beide Schreibpfade absichern.
- **2026-08-08 (BER-122 Stufe 1)** — Der 42P17-Rekursionsbefund aus Baulauf S1
  (`dash_seiten_insert`) hat sich als wiederverwendbare Regel bewährt: Policies dürfen
  ihre eigene Tabelle nicht in einer Subquery referenzieren; die fachliche Regel gehört
  in einen `SECURITY DEFINER`-Trigger. Wurde bei `beleg_steuerzeilen` von Anfang an so
  gebaut statt erneut hineinzulaufen. **Vorbeugung:** vor jeder neuen RLS-Policy die
  Fix-Migration vom 23.07. als Muster lesen.
- **2026-08-08 (Verifikation)** — Ein **Supabase-Branch taugt in diesem Projekt nicht**
  zum Testen von Migrationen: er spielt nur die Migrationshistorie ein, und `belege`
  wird von keiner Migration angelegt (die Tabelle ist älter als die Historie ab
  12.03.2026). Dazu kommen keine Daten mit, also fehlt der Test-Mandant. Der tragfähige
  Weg ist der **Rollback-Dry-Run gegen Produktion** (Migration + Tests als ein
  `execute_sql`-Aufruf zwischen `BEGIN` und `ROLLBACK`) — echtes Schema, echte
  Testdaten, kostenlos, nichts bleibt zurück. **Vorbeugung:** vor jedem Branch-Vorschlag
  prüfen, ob die Baseline überhaupt in der Migrationshistorie steckt.
- **2026-08-08 (Verifikation)** — Der Supabase-MCP-Zugang darf **kein
  `SET ROLE dashboard_service`** (42501). RLS-Verhaltenstests über diesen Kanal brechen
  daran ab und reißen den ganzen Lauf mit. **Vorbeugung:** RLS zweistufig testen —
  strukturell (RLS aktiv, Policy-Anzahl, kein Selbstbezug in `pg_policies`) läuft immer;
  den Verhaltensteil in `EXCEPTION WHEN insufficient_privilege` kapseln und über
  `DASHBOARD_DB_URL` nachholen.
- **2026-08-08 (Prozess)** — `/implement` lief zunächst gegen einen veralteten
  Issue-Stand: der Backlog-Record wurde parallel zur Session bearbeitet, der erste
  `get_issue`-Lesevorgang lieferte Status und Description von vorher. Ein blindes
  Append hat dadurch eine bereits vorhandene Sektion dupliziert. **Vorbeugung:** vor
  schreibenden Backlog-Operationen den Record frisch lesen, nicht auf den Stand vom
  Sessionbeginn verlassen.
