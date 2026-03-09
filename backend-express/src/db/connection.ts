import { Pool } from "pg";

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.SUPABASE_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    _pool.on("error", (err) => {
      console.error("Unexpected DB pool error:", err);
    });
  }
  return _pool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const p = getPool();
    const val = (p as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === "function") {
      return val.bind(p);
    }
    return val;
  },
});
