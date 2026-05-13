import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function debug() {
  try {
    const { rows } = await pool.query("SELECT id, class_name, subject, teacher_name FROM timetables LIMIT 10;");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
debug();
