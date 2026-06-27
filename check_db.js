import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres.xkenexufqpyaemrfryce:%40965233Koo_@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    const res = await pool.query("SELECT id, title, category FROM summer_guidelines WHERE category = 'curriculum'");
    console.log("Guidelines (Text):", res.rows);
    
    const resImg = await pool.query("SELECT id, teacher_name, category FROM summer_images WHERE category = 'curriculum'");
    console.log("Images:", resImg.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
