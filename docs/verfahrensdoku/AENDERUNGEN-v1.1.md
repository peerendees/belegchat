# Verfahrensdokumentation — Ergänzungen v1.1

> Stand: 23.07.2026 · Vorlage für die Übernahme in die formale
> BMF-Verfahrensdokumentation (`docs/Verfahrensdokumentation_BelegChat_v1.0.docx` → v1.1).
> Anlass: Rückmeldung der Steuerkanzlei vom 22.07.2026 und die daraus gebauten Stories
> BER-116..121. Der Betreiber übernimmt diese Abschnitte redaktionell in die Word-Fassung.
>
> provenance: classification internal · status final · source claude

## Ä-1 · Export-Fassungen und Nachweis des ausgelieferten Inhalts (BER-121)

Jeder DATEV-Buchungsstapel wird beim Erzeugen mit seinem vollständigen Dateiinhalt und einer
SHA-256-Prüfsumme gespeichert und sofort „eingefroren". Ein erneuter Download liefert exakt die
ausgelieferten Bytes; die Prüfsumme lässt sich jederzeit gegen den gespeicherten Inhalt
verifizieren. Eine eingefrorene Fassung ist technisch unveränderlich (Datenbank-Trigger).

Wird ein Stapel korrigiert (siehe Ä-2), entsteht eine **neue Fassung** mit eigener
Versionsnummer, Verweis auf die ersetzte Fassung und einem Pflicht-Korrekturgrund. Die
bisherige Fassung bleibt als „ersetzt" erhalten und abrufbar — es gibt kein stilles
Überschreiben. Einfrieren und Ersetzen werden im unveränderlichen Audit-Protokoll festgehalten.

## Ä-2 · Nacherfassung neuer Buchungssatz-Felder bei festgeschriebenen Belegen (BER-119)

Die Kanzlei-Rückmeldung erforderte an bereits festgeschriebenen Belegen des Stapels 2024 die
Ergänzung von Angaben, die es im System zum Zeitpunkt der Festschreibung nicht gab: Zahlungsweg
mit aufgelöstem Gegenkonto (BER-116) und Vorsteuerschlüssel (BER-117). Diese Felder dürfen bei
festgeschriebenen Belegen **einmalig** von „leer" auf einen Wert gesetzt werden; die Buchung
selbst (Beträge, Datum, Sachkonto, Belegnummer) bleibt unverändert. Jede Ergänzung ist im
Audit-Protokoll mit Anlass („StB-Rückmeldung 22.07.2026") festgehalten und technisch auf ein
einziges Mal begrenzt. Vor der ersten Nacherfassung wird die Erstfassung des betroffenen Stapels
eingefroren (Ä-1), damit nachweisbar bleibt, was ursprünglich ausgeliefert wurde.

## Ä-3 · Whitelist-Festschreibung (BER-116..121)

Die Unveränderbarkeit festgeschriebener Belege wird ab 23.07.2026 über eine Positivliste
(„Whitelist") erzwungen: Alle Felder sind nach der Festschreibung gesperrt, außer einer klar
benannten, kleinen Ausnahmeliste (Statuswechsel zur Exportkennzeichnung, die genannten
einmaligen Ergänzungen). Damit ist auch jedes künftig hinzukommende Feld automatisch geschützt.

## Ä-4 · Buchungsbeleg ohne Originaldokument erfassen und nachreichen (BER-118)

Ein Buchungsbeleg kann ohne vorliegendes Originaldokument erfasst und freigegeben werden, damit
ein Stapel übergeben werden kann, in dem noch auf einzelne Belege gewartet wird. Solche Belege
sind als „Dokument fehlt" gekennzeichnet — im Dashboard sichtbar/filterbar und im DATEV-Stapel in
den Zusatzinformations-Feldern als „Beleg: fehlt bei Übergabe".

Das Originaldokument wird später nachgereicht: genau **eine** Datei (mehrseitig als PDF), die über
denselben revisionssicheren Weg wie der automatische Eingang archiviert wird (SHA-256, Storage,
Duplikatprüfung). Das Nachreichen ist auch nach Freigabe/Export möglich (der Beleg-Trigger erlaubt
`gobd_hash`/`bild_storage_path` einmalig von „leer" auf einen Wert); ein bereits hinterlegtes
Dokument lässt sich nicht ersetzen. Jede Nachreichung steht im unveränderlichen Audit-Protokoll
(`dokument_nachgereicht`). Der Steuerberater-Vermerk am Beleg bleibt nach der Festschreibung
unverändert — die Nachreichung wird nicht in den Vermerk fortgeschrieben, sondern über Kennzeichen
und Protokoll dokumentiert.
