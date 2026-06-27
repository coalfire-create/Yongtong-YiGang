import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { supabase } from "./supabase";
import { appendReservationRow, appendSmsRow, appendLevelTestRow } from "./sheets-sync";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ===== Supabase 영구 보관(아카이브) DB =====
// 문자수신/수강예약/수학레벨테스트 접수를 운영 DB와 별개의 Supabase DB에 한 번 더 저장한다.
// 운영 DB가 비워져도 접수 데이터가 남도록 하는 안전장치. 관리자 삭제 버튼은 이 아카이브를 건드리지 않는다.
// ARCHIVE_DATABASE_URL(Supabase Postgres 연결문자열)이 설정돼 있을 때만 동작하며,
// 실패해도 사용자 접수 처리에는 영향을 주지 않는다(fire-and-forget).
const archivePool = process.env.ARCHIVE_DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.ARCHIVE_DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;
let archiveReady = false;
async function ensureArchiveTables() {
  if (!archivePool || archiveReady) return;
  await archivePool.query(`CREATE TABLE IF NOT EXISTS level_test_registrations (id BIGSERIAL PRIMARY KEY, name TEXT, phone TEXT, school TEXT DEFAULT '', grade TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await archivePool.query(`CREATE TABLE IF NOT EXISTS sms_subscriptions (id BIGSERIAL PRIMARY KEY, name TEXT DEFAULT '', phone TEXT, school TEXT DEFAULT '', grade TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await archivePool.query(`CREATE TABLE IF NOT EXISTS reservations (id BIGSERIAL PRIMARY KEY, student_name TEXT DEFAULT '', student_phone TEXT DEFAULT '', parent_phone TEXT DEFAULT '', school TEXT DEFAULT '', class_name TEXT DEFAULT '', subject TEXT DEFAULT '', teacher_name TEXT DEFAULT '', class_time TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  // 기존(구버전) reservations 테이블 호환: 누락 컬럼 보강
  for (const c of ["subject", "teacher_name", "class_time"]) {
    await archivePool.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ${c} TEXT DEFAULT ''`);
  }
  archiveReady = true;
}
function archiveInsert(table: string, cols: Record<string, any>) {
  if (!archivePool) return;
  ensureArchiveTables()
    .then(() => {
      const keys = Object.keys(cols);
      const ph = keys.map((_, i) => `$${i + 1}`).join(",");
      return archivePool!.query(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${ph})`, keys.map((k) => cols[k]));
    })
    .then(() => console.log(`[Archive] saved to ${table}`))
    .catch((err) => console.error(`[Archive] ${table} insert failed:`, err.message));
}

async function ensurePopupsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS popups (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        link_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE popups ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`ALTER TABLE popups ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE popups ADD COLUMN IF NOT EXISTS link_url TEXT`);
  } catch (err) {
    console.error("Failed to ensure popups table:", err);
  }
}

async function ensureSmsSubscriptionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_subscriptions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL,
        school TEXT NOT NULL DEFAULT '',
        grade TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE sms_subscriptions ADD COLUMN IF NOT EXISTS school TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE sms_subscriptions ADD COLUMN IF NOT EXISTS grade TEXT NOT NULL DEFAULT ''`);
  } catch (err) {
    console.error("Failed to ensure sms_subscriptions table:", err);
  }
}

async function ensureSupabaseApplicationTables() {
  const createSmsSQL = `
    CREATE TABLE IF NOT EXISTS sms_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      school TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  const createLevelTestSQL = `
    CREATE TABLE IF NOT EXISTS level_test_registrations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      school TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  for (const [label, sql] of [
    ["sms_subscriptions", createSmsSQL],
    ["level_test_registrations", createLevelTestSQL],
  ] as [string, string][]) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql }),
      });
      if (!res.ok) {
        const { data, error } = await supabase.from(label).select("id").limit(1);
        if (error && error.code === "42P01") {
          console.warn(`[Supabase] '${label}' 테이블이 없습니다. Supabase SQL 에디터에서 아래 SQL을 실행해 주세요:\n${sql}`);
        }
      } else {
        console.log(`[Supabase] '${label}' 테이블 준비 완료`);
      }
    } catch {
      const { error } = await supabase.from(label).select("id").limit(1);
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
        console.warn(`[Supabase] '${label}' 테이블이 없습니다. Supabase SQL 에디터에서 아래 SQL을 실행해 주세요:\n${sql}`);
      }
    }
  }
}

async function ensureTeacherTimetablePhotosTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_timetable_photos (
        teacher_id INTEGER PRIMARY KEY,
        teacher_name TEXT,
        image_url TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure teacher_timetable_photos table:", err);
  }
}

async function ensureLevelTestTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS level_test_registrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        school TEXT NOT NULL DEFAULT '',
        grade TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure level_test_registrations table:", err);
  }
}

async function ensureMembersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        member_type TEXT NOT NULL DEFAULT 'student',
        student_name TEXT NOT NULL DEFAULT '',
        gender TEXT NOT NULL DEFAULT '',
        track TEXT NOT NULL DEFAULT '',
        grade TEXT NOT NULL DEFAULT '',
        school TEXT NOT NULL DEFAULT '',
        student_phone TEXT NOT NULL DEFAULT '',
        parent_phone TEXT NOT NULL DEFAULT '',
        birthday TEXT NOT NULL DEFAULT '',
        subject TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        academy_status TEXT NOT NULL DEFAULT 'none',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure members table:", err);
  }
}

async function ensurePhoneVerificationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS phone_verifications (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure phone_verifications table:", err);
  }
}

async function ensureBriefingsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS briefings (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL DEFAULT '',
        time TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        form_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE briefings ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE briefings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
  } catch (err) {
    console.error("Failed to ensure briefings table:", err);
  }
}

async function ensureBriefingEventsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS briefing_events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        event_date DATE NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure briefing_events table:", err);
  }
}

async function ensureTimetablesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetables (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER,
        teacher_name TEXT,
        category TEXT,
        target_school TEXT,
        class_name TEXT,
        class_time TEXT,
        start_date TEXT,
        teacher_image_url TEXT,
        is_union BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS teacher_image_url TEXT`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS teacher_name TEXT`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS class_name TEXT`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS target_school TEXT`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS class_time TEXT`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS start_date TEXT`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS teacher_id INTEGER`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS detail_image_url TEXT`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS is_union BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE timetables ADD COLUMN IF NOT EXISTS teacher_ids INTEGER[]`);
    await pool.query(`UPDATE timetables SET subject = '논술' WHERE class_name LIKE '%약술논술%'`);
  } catch (err) {
    console.error("Failed to ensure timetables table:", err);
  }
}

async function ensureSchoolsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        logo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Auto-populate default school logos
    const defaultSchools = [
      { name: "화성고", logo: "https://i.namu.wiki/i/No_NaYgYBWTmfTSTJknmWAA5c9wmQsVid6IU0DtWYjecwMe8C0zrEWAtrdHs_zmW9BU8NlvgN8jcyuO5bhMrJQ.svg" },
      { name: "가온고", logo: "https://i.namu.wiki/i/_cvPJiqBOMdfNCNdIoY3FMDA6xuSGbD1sl5rOAS6p8uoZD8dZLwqriM2Rcb69MLOYCPehuCf3DcQ2oSLl2ntWg.svg" },
      { name: "병점고", logo: "https://i.namu.wiki/i/Py9hY720Z3S3PQ0mDh0W1Opx5Tpymw0q6C5G9dB8INK5wT6riW18fL0GW0Gpxf7s4hKelA2kWuDKwCw1rq03mA.svg" },
      { name: "영덕고", logo: "https://i.namu.wiki/i/PvvY7dFuA5gT7ostWUzsE3qhtaMKOT_skwrC8ddzF0ydMi75KC3Wv2A8IK1u1fv6vGhC0mkA44lK_MF7zZ1i3w.bmp" },
      { name: "수원고", logo: "https://i.namu.wiki/i/SHh7bV4c8xzGKj4ofz86-gngBABM8Ywstv368h5v2tdCIDWWQ-03iPuq_XGJJq65zHQwQ6bcJGDJV4B_HiS1zg.webp" },
      { name: "청명고", logo: "https://i.namu.wiki/i/jTHdZXBq637mSrkXdEDVSTXwpG3wiXVmL_vwIawPp6ivAOnZq9hBRcuw3SAw3h-LThmUayMOQ0dqWg-NjWtVZA.svg" },
      { name: "고색고", logo: "https://i.namu.wiki/i/TV50pF-IwPdJ_jr86HIzthu7T9Nc27D71a-EOad3FQ_faVBtc1rImx7yV4twnnCRKXVqyDdJwNFYh2_LtjklbQ.svg" },
      { name: "동탄국제고", logo: "/attached_assets/dongtan_logo.png" }
    ];

    for (const s of defaultSchools) {
      await pool.query(
        "INSERT INTO schools (name, logo_url) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING",
        [s.name, s.logo]
      );
    }
  } catch (err) {
    console.error("Failed to ensure schools table:", err);
  }
}

async function ensureNavigationMenusTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS navigation_menus (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        path TEXT NOT NULL,
        parent_id INTEGER REFERENCES navigation_menus(id) ON DELETE CASCADE,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_visible BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const { rows } = await pool.query("SELECT count(*) FROM navigation_menus");
    if (parseInt(rows[0].count) === 0) {
      const initialMenus = [
        { label: "학원소개", path: "/about", sub: [{ label: "학원소개", path: "/about" }, { label: "오시는길", path: "/directions" }] },
        { label: "고등관", path: "/high-school", sub: [
          { label: "고1 시간표", path: "/high-school/schedule/g1" },
          { label: "고2 시간표", path: "/high-school/schedule/g2" },
          { label: "고3 시간표", path: "/high-school/schedule/g3" },
          { label: "요약 시간표", path: "/high-school/summary" }
        ] },
        { label: "중3", path: "/middle-school", sub: [] },
        { label: "초/중등관", path: "/junior-school", sub: [{ label: "강의시간표", path: "/junior-school/schedule" }, { label: "프리미엄 학습 시스템", path: "/junior-school/premium-system" }] },
        { label: "썸머", path: "/summer", sub: [] },
        { label: "수학스쿨", path: "/math-school", sub: [] },
        { label: "올빼미", path: "/owl", sub: [{ label: "독학관 안내", path: "/owl/info" }, { label: "이용 방법", path: "/owl/usage" }] },
        { label: "선생님", path: "/teachers", sub: [] },
        { label: "설명회", path: "/briefing", sub: [] },
        { label: "입시", path: "/admissions", sub: [{ label: "입시 실적", path: "/admissions/results" }, { label: "합격 후기", path: "/admissions/reviews" }] },
        { label: "공지사항", path: "/notices", sub: [] },
      ];

      for (let i = 0; i < initialMenus.length; i++) {
        const item = initialMenus[i];
        const res = await pool.query(
          "INSERT INTO navigation_menus (label, path, display_order) VALUES ($1, $2, $3) RETURNING id",
          [item.label, item.path, i]
        );
        const parentId = res.rows[0].id;
        for (let j = 0; j < item.sub.length; j++) {
          const sub = item.sub[j];
          await pool.query(
            "INSERT INTO navigation_menus (label, path, parent_id, display_order) VALUES ($1, $2, $3, $4)",
            [sub.label, sub.path, parentId, j]
          );
        }
      }
    }
  } catch (err) {
    console.error("Failed to ensure navigation_menus table:", err);
  }
}

async function ensureReservationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        timetable_id INTEGER,
        student_name TEXT,
        student_phone TEXT,
        parent_phone TEXT,
        school TEXT,
        class_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const cols = [
      { name: "timetable_id", type: "INTEGER" },
      { name: "student_name", type: "TEXT" },
      { name: "student_phone", type: "TEXT" },
      { name: "parent_phone", type: "TEXT" },
      { name: "school", type: "TEXT" },
      { name: "class_name", type: "TEXT" },
      // 예약 시점의 과목/강사/수업시간을 스냅샷으로 저장(시간표가 바뀌거나 삭제돼도 관리자에서 보이도록)
      { name: "subject", type: "TEXT" },
      { name: "teacher_name", type: "TEXT" },
      { name: "class_time", type: "TEXT" },
    ];
    for (const col of cols) {
      await pool.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
    }
  } catch (err) {
    console.error("Failed to ensure reservations table:", err);
  }
}

async function ensureReviewsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        school TEXT NOT NULL DEFAULT '',
        division TEXT NOT NULL DEFAULT 'high',
        content TEXT NOT NULL DEFAULT '',
        image_urls TEXT[] NOT NULL DEFAULT '{}',
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure reviews table:", err);
  }
}

async function ensureNoticesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS image_url TEXT`);
    // notice_images: 다중 이미지 지원
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notice_images (
        id SERIAL PRIMARY KEY,
        notice_id INTEGER NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0
      )
    `);
    // 기존 image_url 데이터를 notice_images로 마이그레이션 (중복 방지)
    await pool.query(`
      INSERT INTO notice_images (notice_id, image_url, display_order)
      SELECT n.id, n.image_url, 0
      FROM notices n
      WHERE n.image_url IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM notice_images ni WHERE ni.notice_id = n.id
        )
    `);
  } catch (err) {
    console.error("Failed to ensure notices table:", err);
  }
}

async function ensureBannersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        subtitle TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        link_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        division TEXT NOT NULL DEFAULT 'main',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS link_url TEXT`);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS division TEXT NOT NULL DEFAULT 'main';
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
  } catch (err) {
    console.error("Failed to ensure banners table:", err);
  }
}

async function ensureSummaryTimetablesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS summary_timetables (
        id SERIAL PRIMARY KEY,
        division TEXT NOT NULL DEFAULT 'high',
        image_url TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure summary_timetables table:", err);
  }
}

async function ensureSummerImagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS summer_images (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER,
        image_url TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE summer_images ADD COLUMN IF NOT EXISTS teacher_id INTEGER`);
    await pool.query(`ALTER TABLE summer_images ADD COLUMN IF NOT EXISTS division TEXT NOT NULL DEFAULT '중등'`);
    await pool.query(`ALTER TABLE summer_images ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'curriculum'`);
  } catch (err) {
    console.error("Failed to ensure summer_images table:", err);
  }
}

async function ensureMiddleSchoolImagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS middle_school_images (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure middle_school_images table:", err);
  }
}

async function ensureSummerGuidelinesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS summer_guidelines (
        id SERIAL PRIMARY KEY,
        division TEXT NOT NULL DEFAULT '중등',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE summer_guidelines ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'guideline'`);
  } catch (err) {
    console.error("Failed to ensure summer_guidelines table:", err);
  }
}



async function ensureSummerHighlightsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS summer_highlights (
        id SERIAL PRIMARY KEY,
        division TEXT NOT NULL DEFAULT '중등',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'Target',
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure summer_highlights table:", err);
  }
}


async function ensureSummerSchedulesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS summer_schedules (
        id SERIAL PRIMARY KEY,
        division TEXT NOT NULL DEFAULT '중등',
        time TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT,
        label TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure summer_schedules table:", err);
  }
}


async function ensureSummerNoticesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS summer_notices (
        id SERIAL PRIMARY KEY,
        division TEXT NOT NULL DEFAULT '중등',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure summer_notices table:", err);
  }
}


async function ensureTeacherImagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_images (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure teacher_images table:", err);
  }
}

async function ensureTeachersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure teachers table:", err);
  }
}

async function ensureFilterTabsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS filter_tabs (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        label TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0
      )
    `);
  } catch (err) {
    console.error("Failed to ensure filter_tabs table:", err);
  }
}

const DEFAULT_FILTER_TABS: Record<string, string[]> = {
  "고등관-고1": ["썸머시간표", "전체시간표", "화성고", "가온고", "병점고", "영덕고", "수원고", "청명고", "수학/탐구"],
  "고등관-고2": ["썸머시간표", "전체시간표", "화성고", "가온고", "동탄국제고", "청명고", "영덕고", "수원고", "고색고", "수학/탐구"],
  "고등관-고3": ["썸머시간표", "전체", "국어", "영어", "수학", "생명과학", "사회문화", "생윤", "논술"],
};

async function ensureSummerTimetableSlotsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS summer_timetable_slots (
        id SERIAL PRIMARY KEY,
        division TEXT NOT NULL DEFAULT '고2',
        slot_label TEXT NOT NULL,
        slot_time TEXT NOT NULL DEFAULT '',
        mon TEXT NOT NULL DEFAULT '',
        tue TEXT NOT NULL DEFAULT '',
        wed TEXT NOT NULL DEFAULT '',
        thu TEXT NOT NULL DEFAULT '',
        fri TEXT NOT NULL DEFAULT '',
        is_merged BOOLEAN NOT NULL DEFAULT false,
        merged_content TEXT NOT NULL DEFAULT '',
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure summer_timetable_slots table:", err);
  }
}


const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("이미지 파일만 업로드 가능합니다. (jpg, png, webp, gif)"));
    }
    cb(null, true);
  },
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
// In-memory admin token - works across all request types including iframe context
// 서버 재시작(배포)마다 토큰이 바뀌면 로그인된 관리자가 전부 로그아웃되어
// 쓰기 요청이 401로 조용히 실패한다. 비밀번호+시크릿에서 결정적으로 파생해
// 재시작에도 동일한 토큰이 유지되도록 한다. (env로 직접 지정도 가능)
const ADMIN_SESSION_TOKEN =
  process.env.ADMIN_SESSION_TOKEN ||
  crypto
    .createHash("sha256")
    .update(`yigang-admin::${ADMIN_PASSWORD}::${process.env.SESSION_SECRET || "v1"}`)
    .digest("hex");

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any)?.isAdmin) return next();
  // Also accept token from header (works in iframe/cross-site contexts where cookies may be blocked)
  const headerToken = req.headers["x-admin-token"] as string | undefined;
  if (headerToken && headerToken === ADMIN_SESSION_TOKEN) return next();
  return res.status(401).json({ error: "관리자 인증이 필요합니다." });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await ensurePopupsTable();
  await ensureBannersTable();
  await ensureSupabaseApplicationTables();
  await ensureBriefingsTable();
  await ensureSmsSubscriptionsTable();
  await ensureTeacherTimetablePhotosTable();
  await ensureLevelTestTable();
  await ensureMembersTable();
  await ensurePhoneVerificationsTable();
  await ensureReviewsTable();
  await ensureTimetablesTable();
  

  await ensureReservationsTable();
  await ensureSummaryTimetablesTable();
  await ensureSummerImagesTable();
  await ensureSummerGuidelinesTable();
  await ensureSummerHighlightsTable();
  await ensureSummerSchedulesTable();
  await ensureSummerNoticesTable();
  await ensureSummerTimetableSlotsTable();
  await ensureBriefingEventsTable();
  await ensureTeacherImagesTable();
  await ensureTeachersTable();
  await ensureFilterTabsTable();
  await ensureMiddleSchoolImagesTable();
  try {
    const updateRes = await pool.query(
      "UPDATE filter_tabs SET label = '썸머시간표' WHERE label = '요약시간표'"
    );
    console.log(`[Startup Migration] Renamed '요약시간표' to '썸머시간표'. Updated rows:`, updateRes.rowCount);
  } catch (migrationErr) {
    console.error("[Startup Migration] Failed to rename '요약시간표' to '썸머시간표':", migrationErr);
  }

  await ensureNoticesTable();
  await ensureSchoolsTable();
  await ensureNavigationMenusTable();
  try {
    await pool.query(`ALTER TABLE teachers ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0`);
  } catch (err) {
    console.error("Failed to add display_order to teachers:", err);
  }

  // ========== SITEMAP & ROBOTS ==========
  const SITE_PAGES = [
    "/",
    "/high-school",
    "/high-school/schedule/g1",
    "/high-school/schedule/g2",
    "/high-school/schedule/g3",
    "/high-school/schedule/dongtan",
    "/high-school/summary",
    "/high-school/teachers",
    "/junior-school",
    "/junior-school/schedule",
    "/junior-school/teachers",
    "/teachers",
    "/owl",
    "/owl/info",
    "/owl/usage",
    "/briefing",
    "/briefing/schedule",
    "/admissions",
    "/admissions/results",
    "/admissions/reviews",
    "/directions",
  ];

  app.get("/sitemap.xml", (_req, res) => {
    const host = _req.headers.host || "localhost:5000";
    const protocol = _req.headers["x-forwarded-proto"] || _req.protocol || "https";
    const baseUrl = `${protocol}://${host}`;
    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const page of SITE_PAGES) {
      const priority = page === "/" ? "1.0" : page.split("/").length <= 2 ? "0.8" : "0.6";
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${priority}</priority>\n`;
      xml += `  </url>\n`;
    }
    xml += `</urlset>`;
    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  app.get("/robots.txt", (_req, res) => {
    const host = _req.headers.host || "localhost:5000";
    const protocol = _req.headers["x-forwarded-proto"] || _req.protocol || "https";
    const baseUrl = `${protocol}://${host}`;

    const txt = [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /api/",
      "",
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join("\n");
    res.set("Content-Type", "text/plain");
    res.send(txt);
  });

  // ========== ADMIN AUTH ==========
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      (req.session as any).isAdmin = true;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "세션 저장 실패" });
        }
        return res.json({ success: true, adminToken: ADMIN_SESSION_TOKEN });
      });
      return;
    }
    return res.status(401).json({ error: "비밀번호가 틀렸습니다." });
  });

  app.get("/api/admin/status", (req, res) => {
    res.set("Cache-Control", "no-store");
    // 세션(메모리)은 서버 재시작 시 사라지므로 헤더 토큰도 함께 인정한다.
    const headerToken = req.headers["x-admin-token"] as string | undefined;
    const isAdmin = !!(req.session as any)?.isAdmin || (!!headerToken && headerToken === ADMIN_SESSION_TOKEN);
    res.json({ isAdmin });
  });

  // ========== SUMMER IMAGES ==========
  app.get("/api/summer-images", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT s.*, t.name as teacher_name 
        FROM summer_images s
        LEFT JOIN teachers t ON s.teacher_id = t.id
        ORDER BY s.display_order ASC, s.created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/summer-images", requireAdmin, upload.single("image"), async (req, res) => {
    const { teacher_id, division, category } = req.body;
    if (!req.file) return res.status(400).json({ error: "이미지 파일이 필요합니다." });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `summer/${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
    const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);

    try {
      const { rows: maxOrderRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) AS max_order FROM summer_images WHERE COALESCE(teacher_id, 0) = $1 AND COALESCE(division, '중등') = $2 AND COALESCE(category, 'curriculum') = $3",
        [teacher_id ? parseInt(teacher_id) : 0, division || '중등', category || 'curriculum']
      );
      const nextOrder = (maxOrderRows[0]?.max_order ?? -1) + 1;
      const { rows } = await pool.query(
        "INSERT INTO summer_images (image_url, display_order, teacher_id, division, category) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [urlData.publicUrl, nextOrder, teacher_id ? parseInt(teacher_id) : null, division || '중등', category || 'curriculum']
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summer-images/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await pool.query("UPDATE summer_images SET display_order = $1 WHERE id = $2", [i, ids[i]]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/summer-images/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query("SELECT image_url FROM summer_images WHERE id = $1", [id]);
      if (rows.length > 0) {
        const url = rows[0].image_url;
        const urlParts = url.split("/images/");
        if (urlParts[1]) {
          await supabase.storage.from("images").remove([urlParts[1]]);
        }
      }
      await pool.query("DELETE FROM summer_images WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== MIDDLE SCHOOL IMAGES ==========
  app.get("/api/middle-school-images", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM middle_school_images
        ORDER BY display_order ASC, created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/middle-school-images", requireAdmin, upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "이미지 파일이 필요합니다." });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `middle-school/${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
    const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);

    try {
      const { rows: maxOrderRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) AS max_order FROM middle_school_images"
      );
      const nextOrder = (maxOrderRows[0]?.max_order ?? -1) + 1;
      const { rows } = await pool.query(
        "INSERT INTO middle_school_images (image_url, display_order) VALUES ($1, $2) RETURNING *",
        [urlData.publicUrl, nextOrder]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/middle-school-images/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await pool.query("UPDATE middle_school_images SET display_order = $1 WHERE id = $2", [i, ids[i]]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/middle-school-images/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query("SELECT image_url FROM middle_school_images WHERE id = $1", [id]);
      if (rows.length > 0) {
        const url = rows[0].image_url;
        const urlParts = url.split("/images/");
        if (urlParts[1]) {
          await supabase.storage.from("images").remove([urlParts[1]]);
        }
      }
      await pool.query("DELETE FROM middle_school_images WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== SUMMER GUIDELINES ==========
  app.get("/api/dev/delete-curriculum-images", async (req, res) => {
    try {
      await pool.query("DELETE FROM summer_images WHERE category = 'curriculum'");
      res.send("Deleted curriculum images using db");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });


  app.get("/api/dev/fix-db-format", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM summer_guidelines ORDER BY id ASC");
      
      const seen: Record<string, number> = {};
      let count = 0;
      let dupCount = 0;

      for (let row of rows) {
        let title = row.title;
        let c = row.content || "";
        
        // --- 1. Deduplicate ---
        // If exact same title and division exists, delete the older one
        const key = title + "|" + row.division;
        if (seen[key]) {
          await pool.query("DELETE FROM summer_guidelines WHERE id = $1", [row.id]);
          dupCount++;
          continue;
        }
        seen[key] = row.id;

        // --- 2. Fix line breaks in "회차별 내용" and Remove "수업 후 ~22" ---
        c = c.replace(/수업 후 ~22/g, "");

        let inSessionContent = false;
        let formattedLines = [];
        let sessionLines = [];

        const lines = c.split('\n');
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];
          if (line.match(/^\[.*\]$/)) {
            if (inSessionContent) {
              formattedLines.push(sessionLines.join('\n'));
              sessionLines = [];
              inSessionContent = false;
            }
            if (line === "[회차별 내용]") {
              inSessionContent = true;
              formattedLines.push(line);
              continue;
            }
          }

          if (inSessionContent) {
            // Remove dates
            let m = line.match(/^(\d+회차\s*-\s*)\d{1,2}\/\d{1,2}(?:\([가-힣]\))?\s*(.*)$/);
            if (m) line = m[1] + m[2];
            let m2 = line.match(/^(\d+회차\s*-\s*)\d{1,2}월\s*\d{1,2}일\s*(.*)$/);
            if (m2) line = m2[1] + m2[2];

            if (line.trim() !== "") {
              if (line.match(/^\d+회차/) || line.match(/^개강일/)) {
                sessionLines.push(line.trim());
              } else {
                if (sessionLines.length > 0) {
                  sessionLines[sessionLines.length - 1] += " " + line.trim();
                } else {
                  sessionLines.push(line.trim());
                }
              }
            }
          } else {
            formattedLines.push(line);
          }
        }
        if (inSessionContent) {
          formattedLines.push(sessionLines.join('\n'));
        }
        c = formattedLines.join('\n');

        // --- 3. Fix names and rename Gaon High ---
        title = title.replace(/TT/g, "T");
        title = title.replace(/유승진T\s*\[/g, "유승진T [");
        title = title.replace(/유승진\s*\[/g, "유승진T [");
        title = title.replace(/유승진(\s*)\(/g, "유승진T$1(");
        title = title.replace(/역학특강-\s*유승진/g, "역학특강 - 유승진T");
        title = title.replace(/김종인\s*\[/g, "김종인T [");
        title = title.replace(/\[가온고1\]$/, "[가온고1 정규반]");
        title = title.replace(/\[가온고2\]$/, "[가온고2 정규반]");

        let tMatch = title.match(/^(\[[^\]]+\])\s*(.*?)\s*-\s*([^T]+T(?:[ ]+\w+)?)\s*(?:\[([^\]]+)\])?\s*(\([^\)]+\))?$/);
        if (tMatch) {
          let grade = tMatch[1].trim();
          let subject = tMatch[2].trim();
          let teacher = tMatch[3].trim();
          let school = tMatch[4] ? tMatch[4].trim() : "";
          let schedule = tMatch[5] ? tMatch[5].trim() : "";
          
          if (school && !subject.includes(school)) {
            title = `${grade} ${school} ${subject} - ${teacher} ${schedule}`.trim();
          } else {
            title = `${grade} ${subject} - ${teacher} ${schedule}`.trim();
          }
        }
        
        await pool.query("UPDATE summer_guidelines SET title = $1, content = $2 WHERE id = $3", [title, c, row.id]);
        count++;
      }
      
      // Merge Park Jong-yoon
      const pj1 = (await pool.query("SELECT * FROM summer_guidelines WHERE title LIKE '%박종윤%' AND title LIKE '%공통수학1%'")).rows[0];
      const pj2 = (await pool.query("SELECT * FROM summer_guidelines WHERE title LIKE '%박종윤%' AND title LIKE '%공통수학2%'")).rows[0];
      if (pj1 && pj2) {
        const combinedTitle = `[중3] 공통수학1+공통수학2 수학 - 박종윤T`;
        const combinedContent = `[공통수학1]\n${pj1.content}\n\n[공통수학2]\n${pj2.content}`;
        await pool.query("UPDATE summer_guidelines SET title = $1, content = $2 WHERE id = $3", [combinedTitle, combinedContent, pj1.id]);
        await pool.query("DELETE FROM summer_guidelines WHERE id = $1", [pj2.id]);
        
        // Remove ALL other Park Jong-yoon classes to prevent 3 duplicates
        const allPj = (await pool.query("SELECT id FROM summer_guidelines WHERE title LIKE '%박종윤%' AND id != $1", [pj1.id])).rows;
        for (let r of allPj) {
           await pool.query("DELETE FROM summer_guidelines WHERE id = $1", [r.id]);
        }
      } else {
        // If only one exists, make sure no duplicates of that one exist
        const allPj = (await pool.query("SELECT id FROM summer_guidelines WHERE title LIKE '%박종윤%'")).rows;
        if (allPj.length > 1) {
          for (let i = 1; i < allPj.length; i++) {
            await pool.query("DELETE FROM summer_guidelines WHERE id = $1", [allPj[i].id]);
          }
        }
      }

      // Merge Hwang Jun-woo
      const hw1 = (await pool.query("SELECT * FROM summer_guidelines WHERE title LIKE '%황준우%' AND title LIKE '%물리%' AND division = '중등'")).rows[0];
      const hw2 = (await pool.query("SELECT * FROM summer_guidelines WHERE title LIKE '%황준우%' AND title LIKE '%통과%' AND division = '중등'")).rows[0];
      if (hw1 && hw2) {
        const combinedTitle = `[중등] 물리+통과 - 황준우T (7/11(토) 개강, 15회)`;
        const combinedContent = `[물리]\n${hw1.content}\n\n[통과]\n${hw2.content}`;
        await pool.query("UPDATE summer_guidelines SET title = $1, content = $2 WHERE id = $3", [combinedTitle, combinedContent, hw1.id]);
        await pool.query("DELETE FROM summer_guidelines WHERE id = $1", [hw2.id]);
      }

      res.send(`Database formatting completed successfully! Deduplicated ${dupCount} rows, formatted ${count} rows.`);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.post("/api/dev/update-curriculums", express.json({ limit: "50mb" }), async (req, res) => {
    try {
      const updates = req.body; // array of { title, content }
      let count = 0;
      for (const u of updates) {
        const resDb = await pool.query("UPDATE summer_guidelines SET content = $1 WHERE title = $2", [u.content, u.title]);
        if (resDb.rowCount && resDb.rowCount > 0) count++;
      }
      res.send(`Updated ${count} curriculums`);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/dev/split-hwang", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT id, title, content, division FROM summer_guidelines WHERE title = '[중등] 통과 - 황준우T [중3]'");
      if (rows.length === 0) return res.send("Row not found.");
      
      const row = rows[0];
      const parts = row.content.split('\n[[중등] 물리 - 황준우T [중3]]\n');
      
      if (parts.length === 2) {
        const part1 = parts[0].trim();
        const part2 = parts[1].trim();
        
        await pool.query("UPDATE summer_guidelines SET content = $1 WHERE id = $2", [part1, row.id]);
        
        const existing = await pool.query("SELECT id FROM summer_guidelines WHERE title = '[중등] 물리 - 황준우T [중3]'");
        if (existing.rows.length === 0) {
          await pool.query(
            "INSERT INTO summer_guidelines (title, content, division) VALUES ($1, $2, $3)",
            ["[중등] 물리 - 황준우T [중3]", part2, row.division]
          );
          res.send("Successfully split into two curriculums!");
        } else {
          await pool.query("UPDATE summer_guidelines SET content = $1 WHERE title = $2", [part2, "[중등] 물리 - 황준우T [중3]"]);
          res.send("Updated existing second curriculum!");
        }
      } else {
        res.send("Could not split properly, parts count: " + parts.length);
      }
    } catch(err: any) {
      res.status(500).send(err.message);
    }
  });

  app.get("/api/dev/check-hwang", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT id, title, content, division FROM summer_guidelines WHERE title LIKE '%황준우%'");
      res.json(rows.map(r => ({ ...r, content: r.content.substring(0, 100) + '... (length: ' + r.content.length + ')' })));
    } catch(err: any) {
      res.status(500).send(err.message);
    }
  });



  app.get("/api/dev/upload-curriculums", async (req, res) => {
    try {
      const fs = await import('fs');
      const data = JSON.parse(fs.readFileSync('scratch/curriculums.json', 'utf8'));
      
      // Delete old curriculums
      await supabase.from("summer_guidelines").delete().eq("category", "curriculum");
      
      for (const item of data) {
        await supabase.from("summer_guidelines").insert({
          division: item.division,
          category: 'curriculum',
          title: item.title,
          content: item.content,
          display_order: 100
        });
      }
      res.send(`Cleared and uploaded ${data.length} curriculums`);
    } catch (e) {
      res.status(500).send(String(e));
    }
  });

  app.get("/api/summer-guidelines", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM summer_guidelines
        ORDER BY display_order ASC, created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/summer-guidelines", requireAdmin, async (req, res) => {
    const { division, title, content, category } = req.body;
    if (!division || !title || content === undefined) {
      return res.status(400).json({ error: "division, title, content가 필요합니다." });
    }
    try {
      const { rows: maxOrderRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) AS max_order FROM summer_guidelines WHERE division = $1 AND COALESCE(category, 'guideline') = $2",
        [division, category || 'guideline']
      );
      const nextOrder = (maxOrderRows[0]?.max_order ?? -1) + 1;
      const { rows } = await pool.query(
        "INSERT INTO summer_guidelines (division, title, content, display_order, category) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [division, title, content, nextOrder, category || 'guideline']
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summer-guidelines/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await pool.query("UPDATE summer_guidelines SET display_order = $1 WHERE id = $2", [i, ids[i]]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summer-guidelines/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    const { title, content, division, category } = req.body;
    try {
      const { rows } = await pool.query(
        "UPDATE summer_guidelines SET title = COALESCE($1, title), content = COALESCE($2, content), division = COALESCE($3, division), category = COALESCE($4, category) WHERE id = $5 RETURNING *",
        [title ?? null, content ?? null, division ?? null, category ?? null, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "존재하지 않는 가이드라인" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/summer-guidelines/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    try {
      await pool.query("DELETE FROM summer_guidelines WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== SUMMER HIGHLIGHTS ==========
  app.get("/api/summer-highlights", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM summer_highlights
        ORDER BY display_order ASC, created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/summer-highlights", requireAdmin, async (req, res) => {
    const { division, title, content, icon } = req.body;
    if (!division || !title || !content || !icon) {
      return res.status(400).json({ error: "division, title, content, icon이 필요합니다." });
    }
    try {
      const { rows: maxOrderRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) AS max_order FROM summer_highlights WHERE division = $1",
        [division]
      );
      const nextOrder = (maxOrderRows[0]?.max_order ?? -1) + 1;
      const { rows } = await pool.query(
        "INSERT INTO summer_highlights (division, title, content, icon, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [division, title, content, icon, nextOrder]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summer-highlights/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await pool.query("UPDATE summer_highlights SET display_order = $1 WHERE id = $2", [i, ids[i]]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summer-highlights/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    const { title, content, icon, division } = req.body;
    try {
      const { rows } = await pool.query(
        "UPDATE summer_highlights SET title = COALESCE($1, title), content = COALESCE($2, content), icon = COALESCE($3, icon), division = COALESCE($4, division) WHERE id = $5 RETURNING *",
        [title, content, icon, division, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "존재하지 않는 하이라이트" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/summer-highlights/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    try {
      await pool.query("DELETE FROM summer_highlights WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== SUMMER SCHEDULES ==========
  app.get("/api/summer-schedules", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM summer_schedules
        ORDER BY display_order ASC, created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/summer-schedules", requireAdmin, async (req, res) => {
    const { division, time, content, type, label } = req.body;
    if (!division || !time || !content) {
      return res.status(400).json({ error: "division, time, content가 필요합니다." });
    }
    try {
      const { rows: maxOrderRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) AS max_order FROM summer_schedules WHERE division = $1",
        [division]
      );
      const nextOrder = (maxOrderRows[0]?.max_order ?? -1) + 1;
      const { rows } = await pool.query(
        "INSERT INTO summer_schedules (division, time, content, type, label, display_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [division, time, content, type || null, label || null, nextOrder]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summer-schedules/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await pool.query("UPDATE summer_schedules SET display_order = $1 WHERE id = $2", [i, ids[i]]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summer-schedules/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    const { time, content, type, label, division } = req.body;
    try {
      const { rows } = await pool.query(
        "UPDATE summer_schedules SET time = COALESCE($1, time), content = COALESCE($2, content), type = COALESCE($3, type), label = COALESCE($4, label), division = COALESCE($5, division) WHERE id = $6 RETURNING *",
        [time, content, type === undefined ? undefined : (type || null), label === undefined ? undefined : (label || null), division, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "존재하지 않는 시간표" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/summer-schedules/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    try {
      await pool.query("DELETE FROM summer_schedules WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== SUMMER TIMETABLE SLOTS ==========
  app.get("/api/summer-timetable-slots", async (req, res) => {
    const division = req.query.division as string | undefined;
    try {
      const query = division
        ? "SELECT * FROM summer_timetable_slots WHERE division = $1 ORDER BY display_order ASC"
        : "SELECT * FROM summer_timetable_slots ORDER BY division ASC, display_order ASC";
      const result = division
        ? await pool.query(query, [division])
        : await pool.query(query);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/summer-timetable-slots", requireAdmin, async (req, res) => {
    const { division, timetable_title, slot_label, slot_time, is_merged, merged_content, mon, tue, wed, thu, fri, sat, sun } = req.body;
    if (!division || !timetable_title || !slot_label) {
      return res.status(400).json({ error: "division, timetable_title, slot_label이 필요합니다." });
    }
    try {
      const { rows: maxOrderRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) AS max_order FROM summer_timetable_slots WHERE division = $1",
        [division]
      );
      const nextOrder = (maxOrderRows[0]?.max_order ?? -1) + 1;
      const { rows } = await pool.query(
        `INSERT INTO summer_timetable_slots 
         (division, timetable_title, slot_label, slot_time, is_merged, merged_content, mon, tue, wed, thu, fri, sat, sun, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          division,
          timetable_title,
          slot_label,
          slot_time || "",
          !!is_merged,
          merged_content || "",
          mon || "",
          tue || "",
          wed || "",
          thu || "",
          fri || "",
          sat || "",
          sun || "",
          nextOrder
        ]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/summer-timetable-slots/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    const { timetable_title, slot_label, slot_time, is_merged, merged_content, mon, tue, wed, thu, fri, sat, sun } = req.body;
    try {
      const { rows } = await pool.query(
        `UPDATE summer_timetable_slots SET
          timetable_title = COALESCE($1, timetable_title),
          slot_label = COALESCE($2, slot_label),
          slot_time = COALESCE($3, slot_time),
          is_merged = COALESCE($4, is_merged),
          merged_content = COALESCE($5, merged_content),
          mon = COALESCE($6, mon),
          tue = COALESCE($7, tue),
          wed = COALESCE($8, wed),
          thu = COALESCE($9, thu),
          fri = COALESCE($10, fri),
          sat = COALESCE($11, sat),
          sun = COALESCE($12, sun)
         WHERE id = $13
         RETURNING *`,
        [
          timetable_title,
          slot_label,
          slot_time,
          is_merged === undefined ? undefined : !!is_merged,
          merged_content,
          mon,
          tue,
          wed,
          thu,
          fri,
          sat,
          sun,
          id
        ]
      );
      if (rows.length === 0) return res.status(404).json({ error: "존재하지 않는 시간표 슬롯" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/summer-timetable-slots/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    try {
      await pool.query("DELETE FROM summer_timetable_slots WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/summer-timetable-slots/reset", requireAdmin, async (req, res) => {
    try {
      await pool.query("DELETE FROM summer_timetable_slots");
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // ========== SUMMER NOTICES ==========
  app.get("/api/summer-notices", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM summer_notices
        ORDER BY display_order ASC, created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/summer-notices", requireAdmin, async (req, res) => {
    const { division, title, content, is_active } = req.body;
    if (!division || !title || content === undefined) {
      return res.status(400).json({ error: "division, title, content가 필요합니다." });
    }
    try {
      const { rows: maxOrderRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) AS max_order FROM summer_notices WHERE division = $1",
        [division]
      );
      const nextOrder = (maxOrderRows[0]?.max_order ?? -1) + 1;
      const { rows } = await pool.query(
        "INSERT INTO summer_notices (division, title, content, display_order, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [division, title, content, nextOrder, is_active === undefined ? true : !!is_active]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summer-notices/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await pool.query("UPDATE summer_notices SET display_order = $1 WHERE id = $2", [i, ids[i]]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summer-notices/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    const { title, content, division, is_active } = req.body;
    try {
      const { rows } = await pool.query(
        "UPDATE summer_notices SET title = COALESCE($1, title), content = COALESCE($2, content), division = COALESCE($3, division), is_active = COALESCE($4, is_active) WHERE id = $5 RETURNING *",
        [title, content, division, is_active === undefined ? undefined : !!is_active, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "존재하지 않는 공지사항" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/summer-notices/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID" });
    try {
      await pool.query("DELETE FROM summer_notices WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== TEACHERS ==========
  app.get("/api/teachers", async (req, res) => {
    const division = req.query.division as string | undefined;
    let query = supabase
      .from("teachers")
      .select("*")
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (division) {
      query = query.like("subject", `${division}::%`);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const teachers = (data || []).map((t: any) => {
      const parts = (t.subject || "").split("::");
      return {
        ...t,
        division: parts.length > 1 ? parts[0] : "",
        subject: parts.length > 1 ? parts[1] : t.subject,
      };
    });

    res.json(teachers);
  });

  app.post("/api/teachers", requireAdmin, upload.single("image"), async (req, res) => {
    const { name, subject, description, division } = req.body;
    if (!name || !subject || !description || !division) {
      return res.status(400).json({ error: "이름, 소속, 과목, 한줄 소개는 필수입니다." });
    }

    const encodedSubject = `${division}::${subject}`;

    let image_url: string | null = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `teachers/${crypto.randomUUID()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      image_url = urlData.publicUrl;
    }

    const { data: maxOrderData } = await supabase
      .from("teachers")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();
    const nextOrder = (maxOrderData?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("teachers")
      .insert({ name, subject: encodedSubject, description, image_url, display_order: nextOrder })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    const parts = (data.subject || "").split("::");
    res.json({
      ...data,
      division: parts.length > 1 ? parts[0] : "",
      subject: parts.length > 1 ? parts[1] : data.subject,
    });
  });

  app.patch("/api/teachers/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await supabase.from("teachers").update({ display_order: i }).eq("id", ids[i]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/teachers/:id/photo", requireAdmin, upload.single("image"), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "이미지 파일이 필요합니다." });
    const { data: existing } = await supabase.from("teachers").select("image_url").eq("id", id).single();
    if (existing?.image_url) {
      const urlParts = existing.image_url.split("/images/");
      if (urlParts[1]) await supabase.storage.from("images").remove([urlParts[1]]);
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `teachers/${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage.from("images").upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
    const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
    const image_url = urlData.publicUrl;
    const { data, error } = await supabase.from("teachers").update({ image_url }).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    const parts = (data.subject || "").split("::");
    res.json({ ...data, division: parts.length > 1 ? parts[0] : "", subject: parts.length > 1 ? parts[1] : data.subject });
  });

  app.patch("/api/teachers/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { bio } = req.body;
    if (bio === undefined) {
      return res.status(400).json({ error: "bio 필드가 필요합니다." });
    }
    const { data, error } = await supabase
      .from("teachers")
      .update({ description: bio })
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    const parts = (data.subject || "").split("::");
    res.json({
      ...data,
      division: parts.length > 1 ? parts[0] : "",
      subject: parts.length > 1 ? parts[1] : data.subject,
    });
  });

  app.delete("/api/teachers/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { data: teacher } = await supabase.from("teachers").select("image_url").eq("id", id).single();
    if (teacher?.image_url) {
      const urlParts = teacher.image_url.split("/images/");
      if (urlParts[1]) {
        await supabase.storage.from("images").remove([urlParts[1]]);
      }
    }
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // ========== TEACHER IMAGES (multiple per teacher) ==========
  app.get("/api/teachers/:id/images", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "SELECT * FROM teacher_images WHERE teacher_id = $1 ORDER BY display_order ASC, id ASC",
        [id]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/teachers/:id/images", requireAdmin, upload.single("image"), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "이미지 파일이 필요합니다." });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `teachers/${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
    const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);

    try {
      const maxOrder = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) AS max_order FROM teacher_images WHERE teacher_id = $1",
        [id]
      );
      const nextOrder = (maxOrder.rows[0]?.max_order ?? -1) + 1;
      const result = await pool.query(
        "INSERT INTO teacher_images (teacher_id, image_url, display_order) VALUES ($1, $2, $3) RETURNING *",
        [id, urlData.publicUrl, nextOrder]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/teacher-images/:imageId", requireAdmin, async (req, res) => {
    const { imageId } = req.params;
    try {
      const result = await pool.query("SELECT image_url FROM teacher_images WHERE id = $1", [imageId]);
      if (result.rows.length > 0) {
        const url = result.rows[0].image_url;
        const urlParts = url.split("/images/");
        if (urlParts[1]) {
          await supabase.storage.from("images").remove([urlParts[1]]);
        }
      }
      await pool.query("DELETE FROM teacher_images WHERE id = $1", [imageId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== TIMETABLES (text-based) ==========
  app.get("/api/timetables", async (req, res) => {
    const category = req.query.category as string | undefined;
    const isAdmin = !!(req.session as any)?.isAdmin || (req.headers["x-admin-token"] === ADMIN_SESSION_TOKEN);
    try {
      let sql = "SELECT * FROM timetables";
      const params: any[] = [];
      const whereClauses: string[] = [];

      if (!isAdmin) {
        whereClauses.push("is_visible = true");
      }

      if (category) {
        const dashIdx = category.indexOf("-");
        if (dashIdx !== -1) {
          // 하위 카테고리 (예: 고등관-고1) → 정확히 일치 OR 상위 카테고리 (예: 고등관) 포함
          const parent = category.substring(0, dashIdx);
          whereClauses.push("(category = $" + (params.length + 1) + " OR category = $" + (params.length + 2) + ")");
          params.push(category, parent);
        } else {
          // 상위 카테고리 (예: 고등관) → 해당 카테고리와 모든 하위 카테고리 포함
          whereClauses.push("category LIKE $" + (params.length + 1));
          params.push(category + "%");
        }
      }

      if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
      }
      sql += " ORDER BY display_order ASC, created_at DESC";
      const { rows } = await pool.query(sql, params);

      // Fetch ALL teachers from Supabase (for ID-based and name-based matching)
      const { data: allTeachers } = await supabase
        .from("teachers")
        .select("id, name, image_url");
      const profileMap = new Map((allTeachers ?? []).map((t: any) => [t.id, t.image_url]));
      const nameToTeacher = new Map((allTeachers ?? []).map((t: any) => [t.name?.trim(), t]));

      // Fetch timetable-specific bulk photos from local DB
      const allTeacherIds = [...new Set((allTeachers ?? []).map((t: any) => t.id))];
      const timetablePhotoMap = new Map<number, string>();
      if (allTeacherIds.length > 0) {
        const { rows: timetablePhotos } = await pool.query(
          "SELECT teacher_id, image_url FROM teacher_timetable_photos WHERE teacher_id = ANY($1)",
          [allTeacherIds]
        );
        timetablePhotos.forEach((r: any) => timetablePhotoMap.set(r.teacher_id, r.image_url));
      }

      // Fetch all schools for logo mapping
      const { rows: schoolRows } = await pool.query("SELECT name, logo_url FROM schools");
      const schoolLogoMap = new Map(schoolRows.map((s: any) => [s.name, s.logo_url]));

      for (const row of rows as any[]) {
        let effectiveTeacherId = row.teacher_id || null;

        // Add school logo info
        row.school_logo_url = schoolLogoMap.get(row.target_school) || null;

        // Auto-match by name if teacher_id is not set
        if (!effectiveTeacherId && row.teacher_name) {
          const matched = nameToTeacher.get(row.teacher_name?.trim()) as any;
          if (matched) {
            effectiveTeacherId = matched.id;
          }
        }

        if (effectiveTeacherId) {
          // Priority: 1) individual timetable photo (DB), 2) teacher-level bulk photo, 3) Supabase profile
          const individualUrl = row.teacher_image_url || null;
          const bulkUrl = timetablePhotoMap.get(effectiveTeacherId) || null;
          const profileUrl = profileMap.get(effectiveTeacherId) || null;
          row.teacher_image_url = individualUrl || bulkUrl || profileUrl || "";
          // Expose the effective teacher_id so frontend can use it
          if (!row.teacher_id && effectiveTeacherId) {
            row.effective_teacher_id = effectiveTeacherId;
          }
        }
      }

      res.json(rows);
    } catch (err: any) {
      console.error("[GET /api/timetables] Error:", err);
      res.status(500).json({ error: err.message || "시간표 조회 중 오류가 발생했습니다." });
    }
  });

  app.patch("/api/timetables/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await pool.query("UPDATE timetables SET display_order = $1 WHERE id = $2", [i, ids[i]]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/timetables/bulk-visibility", requireAdmin, async (req, res) => {
    const { ids, is_visible } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      await pool.query(
        "UPDATE timetables SET is_visible = $1 WHERE id = ANY($2)",
        [is_visible, ids]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Individual timetable photo upload ---
  app.patch("/api/timetables/:id/photo", requireAdmin, upload.single("image"), async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 id" });
    if (!req.file) return res.status(400).json({ error: "이미지 파일이 필요합니다." });

    const ext = req.file.originalname.split(".").pop() || "jpg";
    const fileName = `teachers/timetable-individual/${id}_${Date.now()}.${ext}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
      if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;

      await pool.query("UPDATE timetables SET teacher_image_url = $1 WHERE id = $2", [imageUrl, id]);
      res.json({ success: true, image_url: imageUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/timetables/:id/photo", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 id" });
    try {
      await pool.query("UPDATE timetables SET teacher_image_url = '' WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Teacher Timetable Photos (separate from profile) ---
  app.get("/api/teacher-timetable-photos", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM teacher_timetable_photos ORDER BY teacher_id ASC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/teacher-timetable-photos/:teacherId", requireAdmin, upload.single("image"), async (req, res) => {
    const teacherId = parseInt(req.params.teacherId as string);
    if (isNaN(teacherId)) return res.status(400).json({ error: "유효하지 않은 teacher_id" });
    if (!req.file) return res.status(400).json({ error: "이미지 파일이 필요합니다." });

    const { teacher_name } = req.body;
    const ext = req.file.originalname.split(".").pop() || "jpg";
    const fileName = `teachers/timetable/${teacherId}_${Date.now()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
      if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });

      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;

      await pool.query(
        `INSERT INTO teacher_timetable_photos (teacher_id, teacher_name, image_url, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (teacher_id) DO UPDATE SET image_url = $3, teacher_name = $2, updated_at = NOW()`,
        [teacherId, teacher_name || null, imageUrl]
      );

      res.json({ success: true, image_url: imageUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/teacher-timetable-photos/:teacherId", requireAdmin, async (req, res) => {
    const teacherId = parseInt(req.params.teacherId as string);
    if (isNaN(teacherId)) return res.status(400).json({ error: "유효하지 않은 teacher_id" });
    try {
      await pool.query("DELETE FROM teacher_timetable_photos WHERE teacher_id = $1", [teacherId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== SCHOOLS (Logo Management) ==========
  // ========== NAVIGATION (Menu Management) ==========
  app.get("/api/navigation", async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM navigation_menus WHERE is_visible = true ORDER BY parent_id ASC, display_order ASC"
      );
      
      // Normalize paths and specifically ensure Math School path is correct
      const normalizedRows = rows.map(r => {
        let path = r.path || "";
        if (path && !path.startsWith("/") && !path.startsWith("http")) {
          path = "/" + path;
        }
        // Force /math-school for anything labeled '수학스쿨'
        if (r.label === "수학스쿨" || r.label === "수학 스쿨") {
          path = "/math-school";
        }
        return { ...r, path };
      });

      // Group by parent_id
      const menus = normalizedRows.filter(r => !r.parent_id);
      menus.forEach(m => {
        m.sub = normalizedRows.filter(r => r.parent_id === m.id);
      });
      res.json(menus);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/navigation", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM navigation_menus ORDER BY parent_id ASC, display_order ASC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/navigation", requireAdmin, async (req, res) => {
    const { label, path, parent_id, display_order, is_visible } = req.body;
    try {
      const { rows } = await pool.query(
        "INSERT INTO navigation_menus (label, path, parent_id, display_order, is_visible) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [label, path, parent_id || null, display_order || 0, is_visible !== undefined ? is_visible : true]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/navigation/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const body = req.body;

    const setClauses: string[] = [];
    const values: any[] = [];

    if (body.label !== undefined) { values.push(body.label); setClauses.push(`label = $${values.length}`); }
    if (body.path !== undefined) { values.push(body.path); setClauses.push(`path = $${values.length}`); }
    if ("parent_id" in body) {
      const pid = body.parent_id === "" || body.parent_id === null ? null : Number(body.parent_id);
      values.push(pid);
      setClauses.push(`parent_id = $${values.length}`);
    }
    if (body.display_order !== undefined) { values.push(body.display_order); setClauses.push(`display_order = $${values.length}`); }
    if (body.is_visible !== undefined) { values.push(body.is_visible); setClauses.push(`is_visible = $${values.length}`); }

    if (setClauses.length === 0) return res.status(400).json({ error: "변경할 내용이 없습니다." });

    try {
      values.push(id);
      const { rows } = await pool.query(
        `UPDATE navigation_menus SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/navigation/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    try {
      await pool.query("DELETE FROM navigation_menus WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/schools", requireAdmin, upload.single("logo"), async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "학교 이름은 필수입니다." });

    let logo_url: string | null = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `schools/${crypto.randomUUID()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
      if (uploadError) return res.status(500).json({ error: "로고 업로드 실패: " + uploadError.message });
      logo_url = supabase.storage.from("images").getPublicUrl(fileName).data.publicUrl;
    }

    try {
      const { rows } = await pool.query(
        "INSERT INTO schools (name, logo_url) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url RETURNING *",
        [name, logo_url]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/schools/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM schools WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timetables", requireAdmin, upload.fields([{ name: "teacher_image", maxCount: 1 }, { name: "detail_image", maxCount: 1 }]), async (req, res) => {
    const { teacher_id, teacher_ids, teacher_name, category, target_school, class_name, class_time, class_date, start_date, description, subject, is_visible, is_union } = req.body;
    let teacherIdsArray: number[] | null = null;
    if (teacher_ids) {
      teacherIdsArray = Array.isArray(teacher_ids) ? teacher_ids.map(Number) : String(teacher_ids).split(",").map(Number).filter(id => !isNaN(id));
    }
    const dateValue = start_date || class_date || "";
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    console.log("[POST /api/timetables] body:", { teacher_id, teacher_name, category, target_school, class_name, class_time, dateValue, subject });
    if (!class_name) {
      return res.status(400).json({ error: "수업명은 필수입니다." });
    }
    try {
      let teacher_image_url = "";
      const teacherFile = files?.["teacher_image"]?.[0];
      if (teacherFile) {
        const ext = path.extname(teacherFile.originalname) || ".jpg";
        const fileName = `timetables/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, teacherFile.buffer, { contentType: teacherFile.mimetype, upsert: false });
        if (uploadError) {
          console.error("[POST /api/timetables] Image upload error:", uploadError);
          return res.status(500).json({ error: "이미지 업로드 실패: " + (uploadError.message || JSON.stringify(uploadError)) });
        }
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        teacher_image_url = urlData.publicUrl;
      }
      let detail_image_url = "";
      const detailFile = files?.["detail_image"]?.[0];
      if (detailFile) {
        const ext = path.extname(detailFile.originalname) || ".jpg";
        const fileName = `timetables/detail_${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, detailFile.buffer, { contentType: detailFile.mimetype, upsert: false });
        if (uploadError) {
          console.error("[POST /api/timetables] Detail image upload error:", uploadError);
          return res.status(500).json({ error: "상세 이미지 업로드 실패: " + uploadError.message });
        }
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        detail_image_url = urlData.publicUrl;
      }
      const countRes = await pool.query(
        "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM timetables WHERE category = $1",
        [category]
      );
      const next_order = countRes.rows[0].next_order;
      const { rows } = await pool.query(
        `INSERT INTO timetables (title, teacher_id, teacher_name, category, target_school, class_name, class_time, start_date, teacher_image_url, detail_image_url, display_order, description, subject, is_visible, is_union, teacher_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
        [
          class_name || "",
          teacher_id ? Number(teacher_id) : null,
          teacher_name || "",
          category || "",
          target_school || "",
          class_name || "",
          class_time || "",
          dateValue,
          teacher_image_url || "",
          detail_image_url || null,
          next_order,
          description || "",
          subject || "",
          is_visible !== undefined ? is_visible === "true" || is_visible === true : true,
          is_union !== undefined ? is_union === "true" || is_union === true : false,
          teacherIdsArray
        ]
      );
      res.json(rows[0]);
    } catch (err: any) {
      console.error("[POST /api/timetables] Error:", err);
      res.status(500).json({ error: err.message || JSON.stringify(err) || "시간표 등록 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/timetables/:id", requireAdmin, upload.fields([{ name: "teacher_image", maxCount: 1 }, { name: "detail_image", maxCount: 1 }]), async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;

    // Partial update: only modify columns whose keys are explicitly present in the request body.
    // This prevents clients that send only a subset of fields (e.g. the visibility toggle)
    // from wiping out the other columns.
    if (body.class_name !== undefined && !String(body.class_name).trim()) {
      return res.status(400).json({ error: "수업명은 필수입니다." });
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    const addField = (column: string, value: any) => {
      values.push(value);
      setClauses.push(`${column} = $${values.length}`);
    };
    const toBool = (v: any) => v === true || v === "true";

    try {
      if (body.class_name !== undefined) {
        addField("class_name", body.class_name);
        addField("title", body.class_name);
      }
      if (body.teacher_id !== undefined) {
        addField("teacher_id", body.teacher_id ? Number(body.teacher_id) : null);
      }
      if (body.teacher_name !== undefined) {
        addField("teacher_name", body.teacher_name || "");
      }
      if (body.category !== undefined) {
        addField("category", body.category || "");
      }
      if (body.target_school !== undefined) {
        addField("target_school", body.target_school || "");
      }
      if (body.class_time !== undefined) {
        addField("class_time", body.class_time || "");
      }
      if (body.start_date !== undefined) {
        addField("start_date", body.start_date || "");
      }
      if (body.description !== undefined) {
        addField("description", body.description || "");
      }
      if (body.subject !== undefined) {
        addField("subject", body.subject || "");
      }
      if (body.is_visible !== undefined) {
        addField("is_visible", toBool(body.is_visible));
      }
      if (body.is_union !== undefined) {
        addField("is_union", toBool(body.is_union));
      }
      if (body.teacher_ids !== undefined) {
        let teacherIdsArray: number[] = [];
        if (Array.isArray(body.teacher_ids)) {
          teacherIdsArray = body.teacher_ids.map(Number).filter((n: number) => !isNaN(n));
        } else if (typeof body.teacher_ids === "string" && body.teacher_ids.length > 0) {
          teacherIdsArray = body.teacher_ids.split(",").map(Number).filter((n: number) => !isNaN(n));
        }
        addField("teacher_ids", teacherIdsArray);
      }

      const teacherFile = files?.["teacher_image"]?.[0];
      if (teacherFile) {
        const ext = path.extname(teacherFile.originalname) || ".jpg";
        const fileName = `timetables/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, teacherFile.buffer, { contentType: teacherFile.mimetype, upsert: false });
        if (uploadError) {
          return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
        }
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        addField("teacher_image_url", urlData.publicUrl);
      }

      const detailFile = files?.["detail_image"]?.[0];
      if (detailFile) {
        const ext = path.extname(detailFile.originalname) || ".jpg";
        const fileName = `timetables/detail_${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, detailFile.buffer, { contentType: detailFile.mimetype, upsert: false });
        if (uploadError) {
          return res.status(500).json({ error: "상세 이미지 업로드 실패: " + uploadError.message });
        }
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        addField("detail_image_url", urlData.publicUrl);
      } else if (body.delete_detail_image === "true") {
        addField("detail_image_url", null);
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: "변경할 내용이 없습니다." });
      }

      values.push(id);
      const { rows } = await pool.query(
        `UPDATE timetables SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (rows.length === 0) return res.status(404).json({ error: "시간표를 찾을 수 없습니다." });
      res.json(rows[0]);
    } catch (err: any) {
      console.error("[PUT /api/timetables/:id] Error:", err);
      res.status(500).json({ error: err.message || "수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/timetables/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const cols = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'timetable_id'"
      );
      if (cols.rows.length > 0) {
        await pool.query("DELETE FROM reservations WHERE timetable_id = $1", [id]);
      }
      await pool.query("DELETE FROM timetables WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== RESERVATIONS ==========
  app.post("/api/reservations", async (req, res) => {
    const { timetable_id, student_name, student_phone, parent_phone, school, subject, teacher_name } = req.body;

    if (!student_name || !student_name.trim()) {
      return res.status(400).json({ error: "학생 이름을 입력해 주세요." });
    }
    if (!parent_phone || !parent_phone.trim()) {
      return res.status(400).json({ error: "부모님 전화번호를 입력해 주세요." });
    }
    if (!school || !school.trim()) {
      return res.status(400).json({ error: "재학중인 학교를 입력해 주세요." });
    }

    const phoneRegex = /^01[0-9]-?\d{3,4}-?\d{4}$/;
    if (!phoneRegex.test(parent_phone.replace(/\s/g, ""))) {
      return res.status(400).json({ error: "부모님 전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)" });
    }
    if (student_phone && student_phone.trim() && !phoneRegex.test(student_phone.replace(/\s/g, ""))) {
      return res.status(400).json({ error: "학생 전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)" });
    }

    const COMMON_SUBJECTS = ["수학", "국어", "영어", "과학", "사회", "논술", "입시", "상담"];
    function tryExtractSubject(text: string) {
      for (const s of COMMON_SUBJECTS) {
        if (text.includes(s)) return s;
      }
      return "";
    }

    try {
      let className = "";
      let classTime = "";
      let fetchedSubject = subject || "";
      let fetchedTeacher = teacher_name || "";

      if (timetable_id) {
        const { rows: ttRows } = await pool.query(
          `SELECT t.class_name, t.target_school, t.subject, t.teacher_name, t.category, t.class_time, tr.name as teacher_real_name
           FROM timetables t
           LEFT JOIN teachers tr ON t.teacher_id = tr.id
           WHERE t.id = $1`,
          [timetable_id]
        );
        if (ttRows[0]) {
          className = ttRows[0].class_name || ttRows[0].target_school || "";
          classTime = ttRows[0].class_time || "";

          // Use 'subject' if available, otherwise fallback to 'category'
          if (!fetchedSubject || fetchedSubject.trim() === "") {
            fetchedSubject = ttRows[0].subject || ttRows[0].category || "";
          }

          // Use 'teacher_name' if available, otherwise fallback to 'teacher_real_name' from JOIN
          if (!fetchedTeacher || fetchedTeacher.trim() === "") {
            fetchedTeacher = ttRows[0].teacher_name || ttRows[0].teacher_real_name || "";
          }
        }
      }



      // Final fallbacks if still empty
      if (!fetchedSubject || fetchedSubject.trim() === "") {
        fetchedSubject = tryExtractSubject(className) || "기타";
      }
      if (!fetchedTeacher || fetchedTeacher.trim() === "") {
        // Try to find teacher pattern like "(홍길동T)" or "홍길동 선생님"
        const teacherMatch = className.match(/([가-힣]{2,4})(T|선생님)/);
        fetchedTeacher = teacherMatch ? teacherMatch[1] : "-";
      }

      const { rows } = await pool.query(
        `INSERT INTO reservations (timetable_id, student_name, student_phone, parent_phone, school, class_name, subject, teacher_name, class_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [timetable_id || null, student_name.trim(), (student_phone || "").trim(), parent_phone.trim(), school.trim(), className,
         (fetchedSubject || "").trim(), (fetchedTeacher || "").trim(), classTime]
      );


      appendReservationRow({
        subject: (fetchedSubject || "").trim(),
        teacherName: (fetchedTeacher || "").trim(),
        className: className,
        studentName: student_name.trim(),
        studentPhone: (student_phone || "").trim(),
        parentPhone: parent_phone.trim(),
        school: school.trim(),
      }).catch((err) => {
        console.error("[SheetsSync Error] 수강예약:", err);
      });

      // 영구 보관용 Supabase 아카이브에도 저장
      archiveInsert("reservations", {
        student_name: student_name.trim(),
        student_phone: (student_phone || "").trim(),
        parent_phone: parent_phone.trim(),
        school: school.trim(),
        class_name: className,
        subject: (fetchedSubject || "").trim(),
        teacher_name: (fetchedTeacher || "").trim(),
        class_time: classTime,
      });

      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/reservations", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT r.id, r.created_at, r.timetable_id,
               r.student_name, r.student_phone, r.parent_phone, r.school as student_school, r.class_name,
               COALESCE(NULLIF(r.subject, ''), t.subject, t.category) AS subject,
               COALESCE(NULLIF(r.teacher_name, ''), t.teacher_name) AS teacher_name,
               COALESCE(NULLIF(r.class_time, ''), t.class_time) AS class_time,
               t.target_school, t.start_date, t.category
        FROM reservations r
        LEFT JOIN timetables t ON r.timetable_id = t.id
        ORDER BY r.created_at DESC
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/reservations/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM reservations WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== POPUPS ==========
  app.get("/api/popups", async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM popups WHERE is_active = true ORDER BY display_order ASC, created_at DESC"
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/popups/all", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM popups ORDER BY display_order ASC, created_at DESC"
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/popups", requireAdmin, upload.single("image"), async (req, res) => {
    const { title, link_url, display_order } = req.body;
    if (!title) {
      return res.status(400).json({ error: "제목은 필수입니다." });
    }

    let image_url: string | null = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `popups/${crypto.randomUUID()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      image_url = urlData.publicUrl;
    }

    try {
      const { rows } = await pool.query(
        "INSERT INTO popups (title, image_url, link_url, display_order) VALUES ($1, $2, $3, $4) RETURNING *",
        [title, image_url, link_url || null, parseInt(display_order) || 0]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/popups/:id", requireAdmin, upload.single("image"), async (req, res) => {
    const { id } = req.params;
    const { title, link_url, display_order } = req.body;
    if (!title) return res.status(400).json({ error: "제목은 필수입니다." });
    try {
      let newImageUrl: string | undefined;
      if (req.file) {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const fileName = `popups/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images").upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
        newImageUrl = supabase.storage.from("images").getPublicUrl(fileName).data.publicUrl;
      }
      const sets: string[] = ["title = $1", "link_url = $2", "display_order = $3"];
      const vals: any[] = [title, link_url || null, parseInt(display_order) || 0];
      if (newImageUrl !== undefined) { sets.push(`image_url = $${vals.length + 1}`); vals.push(newImageUrl); }
      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE popups SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`, vals
      );
      if (!rows.length) return res.status(404).json({ error: "팝업을 찾을 수 없습니다." });
      res.json(rows[0]);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/popups/:id/toggle", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query(
        "UPDATE popups SET is_active = NOT is_active WHERE id = $1 RETURNING *",
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "팝업을 찾을 수 없습니다." });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/popups/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query("SELECT image_url FROM popups WHERE id = $1", [id]);
      if (rows[0]?.image_url) {
        const urlParts = rows[0].image_url.split("/images/");
        if (urlParts[1]) {
          await supabase.storage.from("images").remove([urlParts[1]]);
        }
      }
      await pool.query("DELETE FROM popups WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== BANNERS ==========
  app.get("/api/banners", async (req, res) => {
    try {
      const division = (req.query.division as string) || "main";
      const { rows } = await pool.query(
        "SELECT * FROM banners WHERE is_active = true AND division = $1 ORDER BY display_order ASC, created_at DESC",
        [division]
      );
      const normalizedRows = rows.map(r => {
        let link_url = r.link_url || "";
        if (link_url && !link_url.startsWith("/") && !link_url.startsWith("http")) {
          link_url = "/" + link_url;
        }
        // Force /math-school for math-related banners
        const combinedText = `${r.title} ${r.subtitle} ${r.description}`.toLowerCase();
        if (combinedText.includes("수학스쿨") || combinedText.includes("math school")) {
          link_url = "/math-school";
        }
        return { ...r, link_url };
      });
      res.json(normalizedRows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/banners/all", requireAdmin, async (req, res) => {
    try {
      const division = req.query.division as string | undefined;
      const query = division
        ? "SELECT * FROM banners WHERE division = $1 ORDER BY display_order ASC, created_at DESC"
        : "SELECT * FROM banners ORDER BY display_order ASC, created_at DESC";
      const params = division ? [division] : [];
      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/banners", requireAdmin, upload.single("image"), async (req, res) => {
    const { title, subtitle, description, link_url, display_order, division } = req.body;

    let image_url: string | null = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `banners/${crypto.randomUUID()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      image_url = urlData.publicUrl;
    }

    try {
      const { rows } = await pool.query(
        "INSERT INTO banners (title, subtitle, description, image_url, link_url, display_order, division) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [title || "", subtitle || "", description || "", image_url, link_url || null, parseInt(display_order) || 0, division || "main"]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/banners/:id", requireAdmin, upload.single("image"), async (req, res) => {
    const { id } = req.params;
    const { title, subtitle, description, link_url, display_order } = req.body;
    try {
      let newImageUrl: string | undefined;
      if (req.file) {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const fileName = `banners/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images").upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
        newImageUrl = supabase.storage.from("images").getPublicUrl(fileName).data.publicUrl;
      }
      const sets: string[] = ["title = $1", "subtitle = $2", "description = $3", "link_url = $4", "display_order = $5"];
      const vals: any[] = [title || "", subtitle || "", description || "", link_url || null, parseInt(display_order) || 0];
      if (newImageUrl !== undefined) { sets.push(`image_url = $${vals.length + 1}`); vals.push(newImageUrl); }
      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE banners SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`, vals
      );
      if (!rows.length) return res.status(404).json({ error: "배너를 찾을 수 없습니다." });
      res.json(rows[0]);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/banners/:id/toggle", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query(
        "UPDATE banners SET is_active = NOT is_active WHERE id = $1 RETURNING *",
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "배너를 찾을 수 없습니다." });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/banners/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query("SELECT image_url FROM banners WHERE id = $1", [id]);
      if (rows[0]?.image_url) {
        const urlParts = rows[0].image_url.split("/images/");
        if (urlParts[1]) {
          await supabase.storage.from("images").remove([urlParts[1]]);
        }
      }
      await pool.query("DELETE FROM banners WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== SUMMARY TIMETABLES ==========
  app.get("/api/summary-timetables", async (req, res) => {
    const division = req.query.division as string | undefined;
    try {
      let sql = "SELECT * FROM summary_timetables";
      const params: any[] = [];
      if (division) {
        sql += " WHERE division = $1";
        params.push(division);
      }
      sql += " ORDER BY display_order ASC, created_at ASC";
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/summary-timetables", requireAdmin, upload.array("images", 20), async (req, res) => {
    const { division } = req.body;
    if (!division) {
      return res.status(400).json({ error: "구분(division)은 필수입니다." });
    }
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "이미지는 필수입니다." });
    }
    try {
      const { rows: countRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), 0) as max_order FROM summary_timetables WHERE division = $1",
        [division]
      );
      let nextOrder = (countRows[0].max_order || 0) + 1;

      const results = [];
      for (const file of files) {
        const ext = path.extname(file.originalname) || ".jpg";
        const fileName = `summary-timetables/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });
        if (uploadError) {
          return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
        }
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        const image_url = urlData.publicUrl;

        const { rows } = await pool.query(
          "INSERT INTO summary_timetables (division, image_url, display_order) VALUES ($1, $2, $3) RETURNING *",
          [division, image_url, nextOrder]
        );
        results.push(rows[0]);
        nextOrder++;
      }
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/summary-timetables/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query("SELECT image_url FROM summary_timetables WHERE id = $1", [id]);
      if (rows[0]?.image_url) {
        const urlParts = rows[0].image_url.split("/images/");
        if (urlParts[1]) {
          await supabase.storage.from("images").remove([urlParts[1]]);
        }
      }
      await pool.query("DELETE FROM summary_timetables WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/summary-timetables/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await pool.query("UPDATE summary_timetables SET display_order = $1 WHERE id = $2", [i, ids[i]]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== FILTER TABS ==========
  app.get("/api/filter-tabs", async (req, res) => {
    const category = req.query.category as string | undefined;
    try {
      let query = "SELECT * FROM filter_tabs";
      const params: string[] = [];
      if (category) {
        query += " WHERE category = $1";
        params.push(category);
      }
      query += " ORDER BY display_order ASC, id ASC";
      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/filter-tabs/reorder", requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids 배열이 필요합니다." });
    try {
      for (let i = 0; i < ids.length; i++) {
        await pool.query("UPDATE filter_tabs SET display_order = $1 WHERE id = $2", [i, ids[i]]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/filter-tabs", requireAdmin, async (req, res) => {
    const { category, label } = req.body;
    if (!category || !label) return res.status(400).json({ error: "category와 label이 필요합니다." });
    try {
      const { rows: maxRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM filter_tabs WHERE category = $1",
        [category]
      );
      const nextOrder = maxRows[0].next_order;
      const { rows } = await pool.query(
        "INSERT INTO filter_tabs (category, label, display_order) VALUES ($1, $2, $3) RETURNING *",
        [category, label, nextOrder]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/filter-tabs/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query("DELETE FROM filter_tabs WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/filter-tabs/:id", requireAdmin, async (req, res) => {
    const { label } = req.body;
    if (!label) return res.status(400).json({ error: "label이 필요합니다." });
    try {
      const { rows } = await pool.query(
        "UPDATE filter_tabs SET label = $1 WHERE id = $2 RETURNING *",
        [label, req.params.id]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== REVIEWS ==========
  app.get("/api/reviews", async (req, res) => {
    const division = req.query.division as string | undefined;
    try {
      let query = "SELECT * FROM reviews";
      const params: string[] = [];
      if (division) {
        query += " WHERE division = $1";
        params.push(division);
      }
      query += " ORDER BY display_order ASC, created_at DESC";
      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/reviews", requireAdmin, upload.array("images", 10), async (req, res) => {
    const { name, school, division, content, display_order } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: "이름과 내용은 필수입니다." });
    }

    const image_urls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const fileName = `reviews/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });
        if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        image_urls.push(urlData.publicUrl);
      }
    }

    try {
      const { rows } = await pool.query(
        "INSERT INTO reviews (name, school, division, content, image_urls, display_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [name, school || "", division || "high", content, image_urls, parseInt(display_order) || 0]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/reviews/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { rows } = await pool.query("SELECT image_urls FROM reviews WHERE id = $1", [id]);
      if (rows[0]?.image_urls) {
        for (const url of rows[0].image_urls) {
          const urlParts = url.split("/images/");
          if (urlParts[1]) {
            await supabase.storage.from("images").remove([urlParts[1]]);
          }
        }
      }
      await pool.query("DELETE FROM reviews WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== SMS SUBSCRIPTIONS ==========
  app.post("/api/sms-subscriptions", async (req, res) => {
    const { name, phone, school, grade } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "전화번호는 필수입니다." });
    }
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.length < 10) {
      return res.status(400).json({ error: "올바른 전화번호를 입력하세요." });
    }
    try {
      const { rows } = await pool.query(
        "INSERT INTO sms_subscriptions (name, phone, school, grade) VALUES ($1, $2, $3, $4) RETURNING *",
        [name || "", cleaned, school || "", grade || ""]
      );

      archiveInsert("sms_subscriptions", { name: name || "", phone: cleaned, school: school || "", grade: grade || "" });

      appendSmsRow({ name: name || "", phone: cleaned, school: school || "", grade: grade || "" }).catch((err) => {
        console.error("[SheetsSync Error] 문자수신:", err);
      });

      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/sms-subscriptions", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM sms_subscriptions ORDER BY created_at DESC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/sms-subscriptions/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM sms_subscriptions WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== LEVEL TEST REGISTRATIONS ==========

  app.post("/api/level-test-registrations", async (req, res) => {
    const { name, phone, school, grade } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "이름과 전화번호는 필수입니다." });
    }
    const cleaned = phone.replace(/[^0-9-]/g, "");
    if (cleaned.length < 10) {
      return res.status(400).json({ error: "올바른 전화번호를 입력하세요." });
    }
    try {
      const { rows } = await pool.query(
        "INSERT INTO level_test_registrations (name, phone, school, grade) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, cleaned, school || "", grade || ""]
      );

      archiveInsert("level_test_registrations", { name, phone: cleaned, school: school || "", grade: grade || "" });

      appendLevelTestRow({ name, phone: cleaned, school: school || "", grade: grade || "" }).catch((err) => {
        console.error("[SheetsSync Error] 수학레벨테스트:", err);
      });

      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/level-test-registrations", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM level_test_registrations ORDER BY created_at DESC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/level-test-registrations/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM level_test_registrations WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 구글시트(원본)에 남아있는 과거 접수내역을 DB로 복원하기 위한 일회성 가져오기.
  // 시트 웹훅을 다시 트리거하지 않도록 DB에 직접 INSERT한다. created_at으로 신청일시 보존.
  app.post("/api/admin/import-submissions", requireAdmin, async (req, res) => {
    const { levelTest = [], sms = [], reservations = [], clearLevelTest = false, clearSms = false, clearReservations = false } = req.body || {};
    try {
      if (clearLevelTest) await pool.query("DELETE FROM level_test_registrations");
      if (clearSms) await pool.query("DELETE FROM sms_subscriptions");
      if (clearReservations) await pool.query("DELETE FROM reservations");
      let lt = 0, s = 0, rv = 0;
      for (const r of reservations) {
        if (!r) continue;
        await pool.query(
          "INSERT INTO reservations (student_name, student_phone, parent_phone, school, class_name, subject, teacher_name, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, now()))",
          [r.student_name || "", r.student_phone || "", r.parent_phone || "", r.school || "", r.class_name || "", r.subject || "", r.teacher_name || "", r.created_at || null]
        );
        rv++;
      }
      for (const r of levelTest) {
        if (!r || !r.name || !r.phone) continue;
        await pool.query(
          "INSERT INTO level_test_registrations (name, phone, school, grade, created_at) VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz, now()))",
          [r.name, r.phone, r.school || "", r.grade || "", r.created_at || null]
        );
        lt++;
      }
      for (const r of sms) {
        if (!r || !r.phone) continue;
        await pool.query(
          "INSERT INTO sms_subscriptions (name, phone, school, grade, created_at) VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz, now()))",
          [r.name || "", r.phone, r.school || "", r.grade || "", r.created_at || null]
        );
        s++;
      }
      res.json({ levelTest: lt, sms: s, reservations: rv });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== USER AUTH (회원가입/로그인/전화번호 인증) ==========

  app.get("/api/auth/me", (req, res) => {
    const member = (req.session as any)?.member;
    if (member) {
      return res.json({ loggedIn: true, member });
    }
    return res.json({ loggedIn: false });
  });

  app.post("/api/auth/logout", (req, res) => {
    (req.session as any).member = null;
    req.session.save(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/check-username", async (req, res) => {
    const { username } = req.query;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "아이디를 입력해 주세요." });
    }
    if (!/^[a-z0-9]{6,15}$/.test(username)) {
      return res.status(400).json({ error: "6~15자의 영문 소문자, 숫자만 가능합니다." });
    }
    try {
      const { rows } = await pool.query("SELECT id FROM members WHERE username = $1", [username]);
      if (rows.length > 0) {
        return res.json({ available: false, message: "이미 사용 중인 아이디입니다." });
      }
      return res.json({ available: true, message: "사용 가능한 아이디입니다." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/phone/send", async (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ error: "올바른 전화번호를 입력해 주세요." });
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    try {
      await pool.query("UPDATE phone_verifications SET verified = true WHERE phone = $1 AND verified = false", [cleanPhone]);
      await pool.query(
        "INSERT INTO phone_verifications (phone, code, expires_at) VALUES ($1, $2, $3)",
        [cleanPhone, code, expiresAt]
      );
      console.log(`[PHONE AUTH] 인증번호 발송 (mock): ${cleanPhone} -> ${code}`);
      res.json({ success: true, message: "인증번호가 발송되었습니다." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/phone/verify", async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: "전화번호와 인증번호를 입력해 주세요." });
    }
    const cleanPhone = phone.replace(/\D/g, "");
    try {
      const { rows } = await pool.query(
        "SELECT * FROM phone_verifications WHERE phone = $1 AND code = $2 AND verified = false AND expires_at > now() ORDER BY created_at DESC LIMIT 1",
        [cleanPhone, code]
      );
      if (rows.length === 0) {
        return res.status(400).json({ error: "인증번호가 올바르지 않거나 만료되었습니다." });
      }
      await pool.query("UPDATE phone_verifications SET verified = true WHERE id = $1", [rows[0].id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const {
      username, password, memberType, studentName, gender, track, grade,
      school, studentPhone, parentPhone, birthday, subject, email, academyStatus
    } = req.body;

    if (!username || !/^[a-z0-9]{6,15}$/.test(username)) {
      return res.status(400).json({ error: "아이디는 6~15자의 영문 소문자, 숫자만 가능합니다." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "비밀번호는 6자 이상이어야 합니다." });
    }
    if (!studentName?.trim()) {
      return res.status(400).json({ error: "학생이름을 입력해 주세요." });
    }
    if (!gender) {
      return res.status(400).json({ error: "성별을 선택해 주세요." });
    }
    if (!track) {
      return res.status(400).json({ error: "계열을 선택해 주세요." });
    }
    if (!grade) {
      return res.status(400).json({ error: "학년을 선택해 주세요." });
    }
    if (!school?.trim()) {
      return res.status(400).json({ error: "학교를 입력해 주세요." });
    }
    if (!studentPhone || studentPhone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ error: "학생 휴대폰 번호를 입력해 주세요." });
    }
    if (!parentPhone || parentPhone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ error: "학부모 휴대폰 번호를 입력해 주세요." });
    }

    try {
      const { rows: existing } = await pool.query("SELECT id FROM members WHERE username = $1", [username]);
      if (existing.length > 0) {
        return res.status(400).json({ error: "이미 사용 중인 아이디입니다." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const cleanStudentPhone = studentPhone.replace(/\D/g, "");
      const cleanParentPhone = parentPhone.replace(/\D/g, "");

      const { rows: created } = await pool.query(
        `INSERT INTO members (username, password, member_type, student_name, gender, track, grade, school, student_phone, parent_phone, birthday, subject, email, academy_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id, username, student_name, member_type`,
        [username, hashedPassword, memberType || "student", studentName.trim(), gender, track, grade, school.trim(), cleanStudentPhone, cleanParentPhone, birthday || "", subject || "", email || "", academyStatus || "none"]
      );
      const member = created[0];

      (req.session as any).member = { id: member.id, name: member.student_name, username: member.username, memberType: member.member_type };
      req.session.save(() => {
        res.json({ success: true, member: { id: member.id, name: member.student_name, username: member.username } });
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ error: "회원가입에 실패했습니다." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "아이디와 비밀번호를 입력해 주세요." });
    }
    try {
      const { rows } = await pool.query("SELECT * FROM members WHERE username = $1", [username]);
      if (rows.length === 0) {
        return res.status(401).json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." });
      }
      const member = rows[0];
      const valid = await bcrypt.compare(password, member.password);
      if (!valid) {
        return res.status(401).json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." });
      }

      (req.session as any).member = { id: member.id, name: member.student_name, username: member.username, memberType: member.member_type };
      req.session.save(() => {
        res.json({ success: true, member: { id: member.id, name: member.student_name, username: member.username } });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== BRIEFINGS ==========
  app.get("/api/briefings", async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM briefings ORDER BY display_order ASC, created_at DESC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/briefings/active", async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM briefings WHERE is_active = true ORDER BY display_order ASC, created_at DESC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/briefings", requireAdmin, async (req, res) => {
    try {
      const { title, date, time, description, form_url, is_active, display_order } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO briefings (title, date, time, description, form_url, is_active, display_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [title || "", date || "", time || "", description || "", form_url || null, is_active !== false, display_order || 0]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/briefings/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, date, time, description, form_url, is_active, display_order } = req.body;
      const { rows } = await pool.query(
        "UPDATE briefings SET title=$1, date=$2, time=$3, description=$4, form_url=$5, is_active=$6, display_order=$7 WHERE id=$8 RETURNING *",
        [title, date, time, description, form_url || null, is_active, display_order || 0, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/briefings/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query("DELETE FROM briefings WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/briefing-events", async (req, res) => {
    try {
      const { year, month } = req.query;
      let sql = "SELECT * FROM briefing_events";
      const params: any[] = [];
      if (year && month) {
        sql += " WHERE EXTRACT(YEAR FROM event_date) = $1 AND EXTRACT(MONTH FROM event_date) = $2";
        params.push(Number(year), Number(month));
      }
      sql += " ORDER BY event_date ASC, id ASC";
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/briefing-events", requireAdmin, async (req, res) => {
    try {
      const { title, event_date, category } = req.body;
      if (!title || !event_date) return res.status(400).json({ error: "제목과 날짜는 필수입니다." });
      const { rows } = await pool.query(
        "INSERT INTO briefing_events (title, event_date, category) VALUES ($1, $2, $3) RETURNING *",
        [title, event_date, category || ""]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/briefing-events/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, event_date, category } = req.body;
      if (!title || !event_date) return res.status(400).json({ error: "제목과 날짜는 필수입니다." });
      const { rows } = await pool.query(
        "UPDATE briefing_events SET title=$1, event_date=$2, category=$3 WHERE id=$4 RETURNING *",
        [title, event_date, category || "", id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/briefing-events/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query("DELETE FROM briefing_events WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== NOTICES ==========
  // 공지 목록 — notice_images 포함
  app.get("/api/notices", async (req, res) => {
    try {
      const adminOnly = req.query.admin === "1";
      const whereClause = adminOnly ? "" : "WHERE n.is_active = true";
      const { rows } = await pool.query(`
        SELECT n.*,
          COALESCE(
            json_agg(
              json_build_object('id', ni.id, 'image_url', ni.image_url, 'display_order', ni.display_order)
              ORDER BY ni.display_order ASC, ni.id ASC
            ) FILTER (WHERE ni.id IS NOT NULL),
            '[]'
          ) AS images
        FROM notices n
        LEFT JOIN notice_images ni ON ni.notice_id = n.id
        ${whereClause}
        GROUP BY n.id
        ORDER BY n.display_order ASC, n.created_at DESC
      `);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 공지 등록 — 다중 이미지
  app.post("/api/notices", requireAdmin, upload.array("images", 20), async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ error: "제목은 필수입니다." });

      const { rows: maxRows } = await pool.query("SELECT COALESCE(MAX(display_order), -1) AS mo FROM notices");
      const nextOrder = parseInt(maxRows[0].mo) + 1;
      const { rows } = await pool.query(
        "INSERT INTO notices (title, content, is_active, display_order) VALUES ($1, $2, true, $3) RETURNING *",
        [title.trim(), (content || "").trim(), nextOrder]
      );
      const noticeId = rows[0].id;

      // 이미지 업로드
      const files = (req.files as Express.Multer.File[]) || [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = path.extname(file.originalname).toLowerCase();
        const fileName = `notices/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: false });
        if (uploadError) continue;
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        await pool.query(
          "INSERT INTO notice_images (notice_id, image_url, display_order) VALUES ($1, $2, $3)",
          [noticeId, urlData.publicUrl, i]
        );
      }

      // 최종 데이터 반환
      const { rows: final } = await pool.query(`
        SELECT n.*,
          COALESCE(json_agg(json_build_object('id', ni.id, 'image_url', ni.image_url, 'display_order', ni.display_order) ORDER BY ni.display_order ASC, ni.id ASC) FILTER (WHERE ni.id IS NOT NULL), '[]') AS images
        FROM notices n LEFT JOIN notice_images ni ON ni.notice_id = n.id
        WHERE n.id=$1 GROUP BY n.id
      `, [noticeId]);
      res.json(final[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 공지 수정 — 다중 이미지
  app.put("/api/notices/:id", requireAdmin, upload.array("images", 20), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, delete_image_ids } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ error: "제목은 필수입니다." });

      const { rows: existing } = await pool.query("SELECT id FROM notices WHERE id=$1", [id]);
      if (existing.length === 0) return res.status(404).json({ error: "Not found" });

      // 개별 이미지 삭제
      if (delete_image_ids) {
        let ids: number[] = [];
        try { ids = JSON.parse(delete_image_ids); } catch { ids = []; }
        for (const imgId of ids) {
          const { rows: imgRows } = await pool.query("SELECT image_url FROM notice_images WHERE id=$1 AND notice_id=$2", [imgId, id]);
          if (imgRows[0]?.image_url) {
            const parts = imgRows[0].image_url.split("/images/");
            if (parts[1]) await supabase.storage.from("images").remove([parts[1]]);
          }
          await pool.query("DELETE FROM notice_images WHERE id=$1", [imgId]);
        }
      }

      // 새 이미지 추가
      const files = (req.files as Express.Multer.File[]) || [];
      const { rows: orderRows } = await pool.query(
        "SELECT COALESCE(MAX(display_order), -1) AS mo FROM notice_images WHERE notice_id=$1", [id]
      );
      let nextOrder = parseInt(orderRows[0].mo) + 1;
      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const fileName = `notices/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: false });
        if (uploadError) continue;
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        await pool.query(
          "INSERT INTO notice_images (notice_id, image_url, display_order) VALUES ($1, $2, $3)",
          [id, urlData.publicUrl, nextOrder++]
        );
      }

      await pool.query(
        "UPDATE notices SET title=$1, content=$2 WHERE id=$3",
        [title.trim(), (content || "").trim(), id]
      );

      const { rows: final } = await pool.query(`
        SELECT n.*,
          COALESCE(json_agg(json_build_object('id', ni.id, 'image_url', ni.image_url, 'display_order', ni.display_order) ORDER BY ni.display_order ASC, ni.id ASC) FILTER (WHERE ni.id IS NOT NULL), '[]') AS images
        FROM notices n LEFT JOIN notice_images ni ON ni.notice_id = n.id
        WHERE n.id=$1 GROUP BY n.id
      `, [id]);
      res.json(final[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/notices/:id/toggle", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        "UPDATE notices SET is_active = NOT is_active WHERE id=$1 RETURNING *",
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/notices/:id", requireAdmin, async (req, res) => {
    try {
      // notice_images 삭제 (Supabase Storage 포함)
      const { rows: imgRows } = await pool.query("SELECT image_url FROM notice_images WHERE notice_id=$1", [req.params.id]);
      for (const row of imgRows) {
        const parts = row.image_url.split("/images/");
        if (parts[1]) await supabase.storage.from("images").remove([parts[1]]);
      }
      // ON DELETE CASCADE 이므로 notices 삭제하면 notice_images도 삭제됨
      await pool.query("DELETE FROM notices WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
