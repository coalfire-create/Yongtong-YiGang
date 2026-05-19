import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import fs from "fs";
import path from "path";

// Proactively load .env variables in local sandbox environment if not populated
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach(line => {
        const parts = line.trim().split("=");
        if (parts.length >= 2 && !line.startsWith("#")) {
          const key = parts[0].trim();
          const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
          process.env[key] = val;
        }
      });
    }
  } catch (e) {
    console.error("Failed to load .env manually:", e);
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create standard pool for mock fallback
let fallbackPool: pg.Pool | null = null;
function getPool() {
  if (!fallbackPool && process.env.DATABASE_URL) {
    fallbackPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
  return fallbackPool;
}

class SupabaseQueryBuilder {
  private table: string;
  private selects: string = "*";
  private filters: { type: "eq" | "in"; col: string; val: any }[] = [];
  private orders: { col: string; ascending: boolean }[] = [];
  private limitNum: number | null = null;
  private isSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = "*") {
    this.selects = fields;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ type: "eq", col, val });
    return this;
  }

  in(col: string, vals: any[]) {
    this.filters.push({ type: "in", col, val: vals });
    return this;
  }

  order(col: string, opts?: any) {
    this.orders.push({ col, ascending: opts?.ascending !== false });
    return this;
  }

  limit(num: number) {
    this.limitNum = num;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async execute() {
    const pool = getPool();
    if (!pool) {
      return { data: this.isSingle ? null : [], error: new Error("No database pool") };
    }
    try {
      let queryStr = `SELECT * FROM ${this.table}`;
      const params: any[] = [];

      if (this.filters.length > 0) {
        const filterClauses: string[] = [];
        for (const f of this.filters) {
          if (f.type === "eq") {
            params.push(f.val);
            filterClauses.push(`${f.col} = $${params.length}`);
          } else if (f.type === "in") {
            const vals = f.val as any[];
            const placeholders = vals.map((v) => {
              params.push(v);
              return `$${params.length}`;
            }).join(",");
            filterClauses.push(`${f.col} IN (${placeholders})`);
          }
        }
        queryStr += ` WHERE ` + filterClauses.join(" AND ");
      }

      if (this.orders.length > 0) {
        const orderClauses = this.orders.map(o => `${o.col} ${o.ascending ? "ASC" : "DESC"}`).join(", ");
        queryStr += ` ORDER BY ` + orderClauses;
      }

      if (this.isSingle) {
        queryStr += ` LIMIT 1`;
      } else if (this.limitNum !== null) {
        queryStr += ` LIMIT ${this.limitNum}`;
      }

      const { rows } = await pool.query(queryStr, params);
      if (this.isSingle) {
        return { data: rows[0] || null, error: null };
      }
      return { data: rows, error: null };
    } catch (e: any) {
      return { data: this.isSingle ? null : [], error: e };
    }
  }

  then(onfulfilled?: any, onrejected?: any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const supabase = (supabaseUrl && supabaseServiceKey && supabaseUrl !== "placeholder" && supabaseServiceKey !== "placeholder" && !supabaseServiceKey.startsWith("mock"))
  ? createClient(supabaseUrl, supabaseServiceKey)
  : {
      from: (table: string) => {
        return {
          select: (fields: string = "*") => {
            return new SupabaseQueryBuilder(table).select(fields);
          },
          insert: (values: any) => {
            const queryObjInsert = {
              select: () => ({
                single: async () => {
                  const pool = getPool();
                  if (!pool) return { data: null, error: new Error("No database pool") };
                  try {
                    const keys = Object.keys(values);
                    const cols = keys.join(",");
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
                    const vals = keys.map(k => values[k]);
                    const { rows } = await pool.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`, vals);
                    return { data: rows[0] || null, error: null };
                  } catch (e: any) {
                    return { data: null, error: e };
                  }
                }
              }),
              single: async () => {
                const pool = getPool();
                if (!pool) return { data: null, error: new Error("No database pool") };
                try {
                  const keys = Object.keys(values);
                  const cols = keys.join(",");
                  const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
                  const vals = keys.map(k => values[k]);
                  const { rows } = await pool.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`, vals);
                  return { data: rows[0] || null, error: null };
                } catch (e: any) {
                  return { data: null, error: e };
                }
              },
              then: async (onfulfilled?: any) => {
                const pool = getPool();
                if (!pool) return { data: null, error: new Error("No database pool") };
                try {
                  const keys = Object.keys(values);
                  const cols = keys.join(",");
                  const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
                  const vals = keys.map(k => values[k]);
                  const { rows } = await pool.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`, vals);
                  const res = { data: rows[0] || null, error: null };
                  if (onfulfilled) return onfulfilled(res);
                  return res;
                } catch (e: any) {
                  const res = { data: null, error: e };
                  if (onfulfilled) return onfulfilled(res);
                  return res;
                }
              }
            };
            return queryObjInsert;
          },
          update: (values: any) => {
            const queryObjUpdate = {
              eq: (col: string, val: any) => {
                const queryObjUpdateEq = {
                  select: () => ({
                    single: async () => {
                      const pool = getPool();
                      if (!pool) return { data: null, error: new Error("No database pool") };
                      try {
                        const keys = Object.keys(values);
                        const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(",");
                        const vals = keys.map(k => values[k]);
                        vals.push(val);
                        const { rows } = await pool.query(`UPDATE ${table} SET ${sets} WHERE ${col} = $${vals.length} RETURNING *`, vals);
                        return { data: rows[0] || null, error: null };
                      } catch (e: any) {
                        return { data: null, error: e };
                      }
                    }
                  }),
                  then: async (onfulfilled?: any) => {
                    const pool = getPool();
                    if (!pool) return { data: null, error: new Error("No database pool") };
                    try {
                      const keys = Object.keys(values);
                      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(",");
                      const vals = keys.map(k => values[k]);
                      vals.push(val);
                      await pool.query(`UPDATE ${table} SET ${sets} WHERE ${col} = $${vals.length}`, vals);
                      const res = { data: null, error: null };
                      if (onfulfilled) return onfulfilled(res);
                      return res;
                    } catch (e: any) {
                      const res = { data: null, error: e };
                      if (onfulfilled) return onfulfilled(res);
                      return res;
                    }
                  }
                };
                return queryObjUpdateEq;
              }
            };
            return queryObjUpdate;
          },
          delete: () => {
            const queryObjDelete = {
              eq: (col: string, val: any) => {
                return {
                  then: async (onfulfilled?: any) => {
                    const pool = getPool();
                    if (!pool) return { data: null, error: new Error("No database pool") };
                    try {
                      await pool.query(`DELETE FROM ${table} WHERE ${col} = $1`, [val]);
                      const res = { data: null, error: null };
                      if (onfulfilled) return onfulfilled(res);
                      return res;
                    } catch (e: any) {
                      const res = { data: null, error: e };
                      if (onfulfilled) return onfulfilled(res);
                      return res;
                    }
                  }
                };
              }
            };
            return queryObjDelete;
          }
        };
      },
      storage: {
        from: (bucket: string) => ({
          upload: (pathName: string, buffer: any, options?: any) => {
            return Promise.resolve({ data: { path: pathName }, error: null });
          },
          remove: (paths: string[]) => {
            return Promise.resolve({ data: [], error: null });
          },
          getPublicUrl: (pathName: string) => {
            return { data: { publicUrl: `/uploads/${pathName}` } };
          }
        })
      }
    } as any;
