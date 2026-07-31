#!/bin/zsh
# BelegChat — PDF-Batch-Import per Doppelklick (kein Terminal-Tippen).
#
# Verarbeitet EINMALIG alle PDFs im Input-Ordner (IMPORT_WATCH_DIR aus
# belegchat/.env.local): schickt sie an den n8n-Import-Webhook (OCR + KI-Kontierung),
# verschiebt Erfolge ins Jahres-Archiv (IMPORT_ARCHIVE_DIR/StB Belege <Jahr>) und
# Fehler/Duplikate in den Fehler-Ordner (IMPORT_ERROR_DIR) — dann beendet es sich.
#
# Neue laufende Belege gehen weiterhin per Threema ein; dieser Launcher ist für den
# lokalen PDF-Ordner gedacht. Doppelklick genügt.

cd "/Users/Shared/Projekte/Entwicklung/Projekte/belegchat" || {
  print "FEHLER: Projektordner nicht gefunden."
  print "Fenster schließen oder Taste drücken …"; read -t 30 -k 1; exit 1
}

/opt/homebrew/bin/node scripts/beleg-import/beleg-import.mjs watch --once
status=$?

print ""
if [ $status -eq 0 ]; then
  print "— Fertig. Dieses Fenster kannst du schließen. —"
else
  print "— Mit Fehler beendet (Code $status). Meldung oben lesen. —"
fi
read -t 60 -k 1 2>/dev/null || true
