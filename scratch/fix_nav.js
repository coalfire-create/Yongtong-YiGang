import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixNav() {
  try {
    // 1. Fix navigation_menus
    await pool.query("UPDATE navigation_menus SET path = '/math-school' WHERE label = '수학스쿨' OR label = '수학 스쿨';");
    
    // 2. Fix banners
    await pool.query("UPDATE banners SET link_url = '/math-school' WHERE title LIKE '%수학스쿨%' OR subtitle LIKE '%수학스쿨%';");
    
    console.log("Navigation and Banners fixed.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixNav();
