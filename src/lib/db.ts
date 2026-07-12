import postgres, { type TransactionSql } from "postgres";

/**
 * DB-Zugriff als Rolle `dashboard_service` (kein BYPASSRLS).
 * Beleg-Daten sind per RLS mandantenisoliert: Abfragen laufen in einer
 * Transaktion, die zuerst `app.mandant_id` setzt (siehe withMandant).
 * Verbindung: Supabase Session-Pooler (DASHBOARD_DB_URL in .env.local).
 */

declare global {
  // eslint-disable-next-line no-var
  var __belegchatSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const url = process.env.DASHBOARD_DB_URL;
  if (!url) throw new Error("DASHBOARD_DB_URL fehlt (.env.local)");
  return postgres(url, {
    ssl: "require",
    max: 4,
    idle_timeout: 30,
    prepare: false,
  });
}

export const sql = globalThis.__belegchatSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis.__belegchatSql = sql;

export type Tx = TransactionSql;

/** Führt fn in einer Transaktion mit gesetztem Mandanten-Kontext aus (RLS). */
export async function withMandant<T>(
  mandantId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return (await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.mandant_id', ${mandantId}, true)`;
    return await fn(tx);
  })) as T;
}
