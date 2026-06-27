import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres.xkenexufqpyaemrfryce:%40965233Koo_@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});
async function run() {
  try {
    const res = await pool.query("SELECT content FROM summer_guidelines WHERE id = 266");
    console.log(res.rows[0].content.substring(0, 200));
  } finally {
    pool.end();
  }
}
run();
