import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function findClasses() {
  try {
    const res = await pool.query("SELECT id, class_name, teacher_name, teacher_ids, class_time, target_school, category, subject, teacher_id FROM timetables WHERE target_school = '가온고' OR class_name LIKE '%가온고%';");
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findClasses();
