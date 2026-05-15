
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const teachers = await pool.query("SELECT id, name FROM teachers WHERE name IN ('정승준', '권소영')");
    console.log("Teachers:", teachers.rows);
    
    const timetables = await pool.query("SELECT id, class_name, teacher_name, teacher_id FROM timetables WHERE class_name LIKE '%가온고2 수학 내신반%'");
    console.log("Timetables:", timetables.rows);
    
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
