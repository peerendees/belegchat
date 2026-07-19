import postgres, { type TransactionSql } from "postgres";

/**
 * DB-Zugriff als Rolle `dashboard_service` (kein BYPASSRLS).
 * Beleg-Daten sind per RLS mandantenisoliert: Abfragen laufen in einer
 * Transaktion, die zuerst `app.mandant_id` setzt (siehe withMandant).
 * Verbindung: Supabase Session-Pooler (DASHBOARD_DB_URL in .env.local).
 */

declare global {
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

// Lazy: Client erst beim ersten Zugriff erzeugen, nicht beim Modul-Import.
// Der Next-Build ("Collecting page data") importiert jede Route und würde
// sonst schon zur Build-Zeit `DASHBOARD_DB_URL` verlangen — die Variable
// wird aber erst zur Laufzeit (erster Request) gebraucht. Memoisiert pro
// Modul (Prod-Singleton) und über globalThis (überlebt Dev-HMR).
let client: ReturnType<typeof postgres> | undefined;
function getClient(): ReturnType<typeof postgres> {
  if (client) return client;
  client = globalThis.__belegchatSql ?? createClient();
  if (process.env.NODE_ENV !== "production") globalThis.__belegchatSql = client;
  return client;
}

// Proxy erhält die volle `postgres`-API (Tagged Template `sql\`…\``,
// `sql.begin(…)` usw.), initialisiert den Client aber erst bei Benutzung.
export const sql = new Proxy(
  function () {} as unknown as ReturnType<typeof postgres>,
  {
    apply(_target, thisArg, args) {
      return Reflect.apply(
        getClient() as unknown as (...a: unknown[]) => unknown,
        thisArg,
        args,
      );
    },
    get(_target, prop) {
      const c = getClient();
      const value = Reflect.get(c as object, prop);
      return typeof value === "function"
        ? (value as (...a: unknown[]) => unknown).bind(c)
        : value;
    },
  },
);

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
