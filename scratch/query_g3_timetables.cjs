const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const categories = await pool.query(
      "SELECT category, COUNT(*) as count FROM timetables GROUP BY category ORDER BY count DESC"
    );
    console.log("=== CATEGORIES ===");
    console.log(categories.rows);

    const { rows } = await pool.query(
      "SELECT id, teacher_name, class_name, start_date, subject, category, target_school, class_time, is_visible FROM timetables WHERE category LIKE '%고3%' ORDER BY id ASC"
    );
    console.log("=== G3 TIMETABLES ===");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
