import { Pool } from 'pg';
const pool = new Pool({
  connectionString: 'postgresql://postgres.xkenexufqpyaemrfryce:%40965233Koo_@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});
async function run() {
  try {
    const res = await pool.query("SELECT * FROM summer_images WHERE title LIKE '%강현%' OR image_url LIKE '%강현%'");
    console.log("Images:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
