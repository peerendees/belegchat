import { createHash } from "crypto";
import { generateExtf, type DatevBeleg, type DatevMeta } from "@/lib/datev";
import type { Tx } from "@/lib/db";

/**
 * Export-Fassungen und Inhalts-Absicherung (BER-121).
 *
 * `friereExportEin` hält den ausgelieferten Dateiinhalt samt SHA-256 fest, bevor
 * eine Nacherfassung (BER-119) die zugrunde liegenden Belege verändert — danach
 * ist die Erstfassung nicht mehr rekonstruierbar. `erzeugeKorrektur` legt eine
 * neue, als solche erkennbare Fassung an (kein stilles Ersetzen) und markiert die
 * bisherige als `ersetzt`. Beide laufen in der Transaktion des Aufrufers.
 */

/** Wird geworfen, wenn die Nacherfassung noch nicht vollständig ist. */
export class KorrekturUnvollstaendig extends Error {
  constructor(public readonly belegNr: string) {
    super(`Nacherfassung unvollständig: ${belegNr} ohne Zahlungsweg`);
    this.name = "KorrekturUnvollstaendig";
  }
}

type Row = Record<string, unknown>;

async function firmaUndSender(tx: Tx, mandantId: string): Promise<Row> {
  const firma = await tx`
    SELECT f.datev_berater_nr, f.datev_mandant_nr, f.datev_gegenkonto, f.updated_at,
           m.threema_id
      FROM mandanten m JOIN firmen f ON f.firma_nr = m.firma_nr
     WHERE m.id = ${mandantId}`;
  if (firma.length === 0) throw new Error("Firma nicht gefunden");
  return firma[0];
}

function zeitraumLabel(exp: Row): string {
  return exp.monat
    ? `M${String(exp.monat).padStart(2, "0")}`
    : exp.quartal
      ? `Q${exp.quartal}`
      : "Jahr";
}

function metaFuer(exp: Row, firma: Row, erzeugtAm: Date, bezeichnung: string): DatevMeta {
  const jahr = Number(exp.buchungsjahr);
  return {
    beraterNr: firma.datev_berater_nr as number | null,
    mandantNr: firma.datev_mandant_nr as number | null,
    gegenkonto: firma.datev_gegenkonto as string,
    wjBeginn: `${jahr}0101`,
    von: String(exp.zeitraum_von).slice(0, 10).replaceAll("-", ""),
    bis: String(exp.zeitraum_bis).slice(0, 10).replaceAll("-", ""),
    bezeichnung,
    erzeugtAm,
    exporterName: String(firma.threema_id ?? ""),
  };
}

/** Belege einer Export-Wurzel in Exportreihenfolge, inkl. Gegenkonto/Schlüssel. */
async function belegeFuerExport(tx: Tx, wurzelId: string) {
  return tx`
    SELECT beleg_nr, beleg_datum, beleg_typ, betrag_brutto, sachkonto, verwendungszweck,
           trinkgeld, termin_grund, termin_ort, termin_kunde, gebucht_brutto, stb_vermerk,
           gegenkonto, bu_schluessel, dokument_fehlt
      FROM belege WHERE datev_export_id = ${wurzelId}
     ORDER BY beleg_datum, beleg_nr`;
}

/**
 * Erstfassung einfrieren: Datei deterministisch regenerieren, Inhalt + SHA-256
 * festhalten. No-op, wenn bereits eingefroren. Bricht ab, wenn die
 * Firmenkonfiguration nach dem Export geändert wurde (dann ist die Erstfassung
 * nicht sicher rekonstruierbar).
 */
export async function friereExportEin(tx: Tx, exportId: string, mandantId: string): Promise<void> {
  const rows = await tx`SELECT * FROM datev_exporte WHERE id = ${exportId} FOR UPDATE`;
  if (rows.length === 0) throw new Error("Export nicht gefunden");
  const exp = rows[0];
  if (exp.eingefroren_am) return;

  const firma = await firmaUndSender(tx, mandantId);
  if (new Date(String(firma.updated_at)) >= new Date(String(exp.created_at))) {
    throw new Error(
      `Firmenkonfiguration wurde nach dem Export geändert (${String(firma.updated_at)}) — ` +
        "Erstfassung nicht sicher rekonstruierbar. Manuell klären.",
    );
  }

  const jahr = Number(exp.buchungsjahr);
  const belege = await belegeFuerExport(tx, exportId);
  const csv = generateExtf(
    belege as unknown as DatevBeleg[],
    metaFuer(exp, firma, new Date(String(exp.created_at)), `BelegChat ${jahr} ${zeitraumLabel(exp)}`),
  );
  const hash = createHash("sha256").update(csv).digest("hex");

  await tx`
    UPDATE datev_exporte
       SET datei_inhalt = ${csv}, inhalts_hash = ${hash}, eingefroren_am = now(),
           datei_groesse_bytes = ${csv.length}
     WHERE id = ${exportId}`;
  await tx`
    INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
    VALUES (null, ${mandantId}, 'export_eingefroren', null,
            ${`${String(exp.datei_pfad)} sha256:${hash} — Erstfassung vor Nacherfassung eingefroren`})`;
}

/**
 * Korrekturfassung erzeugen: neue Zeile (version+1) mit Referenz auf die ersetzte
 * Fassung; die bisherige neueste Fassung wird `ersetzt`. Friert die bisherige
 * Fassung vorher ein, falls nötig. Wirft KorrekturUnvollstaendig, wenn noch ein
 * Beleg ohne Zahlungsweg ist.
 */
export async function erzeugeKorrektur(
  tx: Tx,
  id: string,
  mandantId: string,
  grund: string,
): Promise<{ csv: Buffer; dateiName: string; exportId: string; version: number }> {
  const start = await tx`
    SELECT COALESCE(wurzel_export_id, id) AS wurzel FROM datev_exporte WHERE id = ${id} LIMIT 1`;
  if (start.length === 0) throw new Error("Export nicht gefunden");
  const wurzelId = start[0].wurzel as string;

  const neueste = await tx`
    SELECT * FROM datev_exporte
     WHERE id = ${wurzelId} OR wurzel_export_id = ${wurzelId}
     ORDER BY version DESC LIMIT 1
     FOR UPDATE`;
  const alt = neueste[0];

  if (!alt.eingefroren_am) {
    await friereExportEin(tx, alt.id as string, mandantId);
    const neu = await tx`SELECT inhalts_hash FROM datev_exporte WHERE id = ${alt.id}`;
    alt.inhalts_hash = neu[0].inhalts_hash;
  }

  const offen = await tx`
    SELECT beleg_nr FROM belege
     WHERE datev_export_id = ${wurzelId} AND zahlungsweg IS NULL
     ORDER BY beleg_nr LIMIT 1`;
  if (offen.length > 0) {
    throw new KorrekturUnvollstaendig(offen[0].beleg_nr as string);
  }

  const firma = await firmaUndSender(tx, mandantId);
  const belege = await belegeFuerExport(tx, wurzelId);
  const summen = await tx`
    SELECT COALESCE(sum(COALESCE(gebucht_brutto, betrag_brutto)),0) AS brutto,
           COALESCE(sum(COALESCE(gebucht_netto, betrag_netto)),0) AS netto,
           COALESCE(sum(COALESCE(gebucht_mwst, mwst_betrag)),0) AS mwst
      FROM belege WHERE datev_export_id = ${wurzelId}`;

  const jahr = Number(alt.buchungsjahr);
  const label = zeitraumLabel(alt);
  const neueVersion = Number(alt.version) + 1;
  const dateiName = `EXTF_Buchungsstapel_${jahr}_${label}_K${neueVersion}.csv`;
  const erzeugt = new Date();
  const csv = generateExtf(
    belege as unknown as DatevBeleg[],
    metaFuer(alt, firma, erzeugt, `BelegChat ${jahr} ${label} K${neueVersion}`),
  );
  const hash = createHash("sha256").update(csv).digest("hex");

  const neu = await tx`
    INSERT INTO datev_exporte
      (buchungsjahr, monat, quartal, zeitraum_von, zeitraum_bis, zeitraum_typ,
       anzahl_belege, gesamtbetrag_brutto, gesamtbetrag_netto, gesamtbetrag_mwst,
       datei_pfad, status, mandant_id, version, wurzel_export_id, ersetzt_export_id,
       korrektur_grund, datei_inhalt, inhalts_hash, eingefroren_am, datei_groesse_bytes, created_at)
    VALUES (${jahr}, ${alt.monat}, ${alt.quartal}, ${alt.zeitraum_von}, ${alt.zeitraum_bis},
            ${alt.zeitraum_typ}, ${belege.length}, ${summen[0].brutto}, ${summen[0].netto},
            ${summen[0].mwst}, ${dateiName}, 'erstellt', ${mandantId}, ${neueVersion}, ${wurzelId},
            ${alt.id}, ${grund}, ${csv}, ${hash}, ${erzeugt}, ${csv.length}, ${erzeugt})
    RETURNING id, version`;

  await tx`UPDATE datev_exporte SET status = 'ersetzt' WHERE id = ${alt.id}`;
  await tx`
    INSERT INTO audit_log (beleg_id, mandant_id, aktion, alter_wert, neuer_wert)
    VALUES (null, ${mandantId}, 'export_ersetzt',
            ${`${String(alt.datei_pfad)} v${String(alt.version)} sha256:${String(alt.inhalts_hash)}`},
            ${`${dateiName} v${neueVersion} sha256:${hash} — Grund: ${grund}`})`;

  return {
    csv,
    dateiName,
    exportId: neu[0].id as string,
    version: neu[0].version as number,
  };
}
