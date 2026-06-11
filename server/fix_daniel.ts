import { pool } from './db.ts';

async function fix() {
  try {
    const { rows } = await pool.query("SELECT id, title, content, division FROM summer_guidelines WHERE title = $1", ["[고등] 영어 - 대니얼T [화성고1]"]);
    if (rows.length === 0) {
      console.log("No row found");
      process.exit(0);
    }
    
    const row = rows[0];
    const parts = row.content.split("\n\n[[고등] 영어 - 대니얼T [화성고1]]\n\n");
    
    if (parts.length === 2) {
      await pool.query("UPDATE summer_guidelines SET content = $1 WHERE id = $2", [parts[0].trim(), row.id]);
      
      const title2 = "[고등] 영어 - 대니얼T [화성고1] (토)";
      const existing = await pool.query("SELECT id FROM summer_guidelines WHERE title = $1", [title2]);
      if (existing.rows.length === 0) {
        await pool.query(
          "INSERT INTO summer_guidelines (title, content, division, category) VALUES ($1, $2, $3, $4)",
          [title2, parts[1].trim(), row.division, "curriculum"]
        );
        console.log("Split and created:", title2);
      } else {
        await pool.query("UPDATE summer_guidelines SET content = $1 WHERE title = $2", [parts[1].trim(), title2]);
        console.log("Updated existing:", title2);
      }
    } else {
      console.log("Could not split properly, parts count:", parts.length);
    }
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
fix();
