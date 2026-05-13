import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const { rows } = await pool.query("SELECT count(*) FROM timetables;");
    console.log("Total timetables:", rows[0].count);
    const { rows: data } = await pool.query("SELECT id, class_name, subject, teacher_name FROM timetables LIMIT 5;");
    console.log("Sample data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await pool.end();
  }
}
check();
