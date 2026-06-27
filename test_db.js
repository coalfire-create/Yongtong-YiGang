import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres.xkenexufqpyaemrfryce:%40965233Koo_@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});
async function run() {
  try {
    const res = await pool.query("SELECT id, title, division, category, display_order FROM summer_guidelines WHERE title LIKE '%강현%'");
    console.log(res.rows);
  } finally {
    pool.end();
  }
}
run();
