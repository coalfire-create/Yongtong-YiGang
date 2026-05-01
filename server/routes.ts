import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { supabase } from "./supabase";
import { appendReservationRow, appendSmsRow, appendLevelTestRow } from "./sheets-sync";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

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
  } catch (err) {
    console.error("Failed to ensure timetables table:", err);
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
  "고등관-고1": ["요약시간표", "전체시간표", "화성고", "가온고", "병점고", "영덕고", "수원고", "청명고", "수학/탐구"],
  "고등관-고2": ["요약시간표", "전체시간표", "화성고", "가온고", "청명고", "영덕고", "수원고", "고색고", "수학/탐구"],
  "고등관-고3": ["요약시간표", "전체", "국어", "영어", "수학", "생명과학", "사회문화", "생윤", "논술"],
};

async function seedFilterTabs() {
  try {
    // 기존 탭 목록 조회
    const { rows: existing } = await pool.query(
      "SELECT category, label FROM filter_tabs"
    );
    const existingSet = new Set(existing.map((r: any) => `${r.category}::${r.label}`));

    if (existingSet.size === 0) {
      // 최초 시드: 전체 삽입
      for (const [category, labels] of Object.entries(DEFAULT_FILTER_TABS)) {
        for (let i = 0; i < labels.length; i++) {
          await pool.query(
            "INSERT INTO filter_tabs (category, label, display_order) VALUES ($1, $2, $3)",
            [category, labels[i], i]
          );
        }
      }
    } else {
      // 이미 시드된 경우: 누락된 탭만 추가
      for (const [category, labels] of Object.entries(DEFAULT_FILTER_TABS)) {
        for (const label of labels) {
          if (!existingSet.has(`${category}::${label}`)) {
            // 해당 카테고리에서 현재 최대 display_order 조회 후 삽입
            const { rows: maxRows } = await pool.query(
              "SELECT COALESCE(MAX(display_order), -1) AS max_order FROM filter_tabs WHERE category = $1",
              [category]
            );
            const nextOrder = parseInt(maxRows[0].max_order) + 1;
            await pool.query(
              "INSERT INTO filter_tabs (category, label, display_order) VALUES ($1, $2, $3)",
              [category, label, nextOrder]
            );
            console.log(`[seedFilterTabs] 누락 탭 추가: ${category} - ${label}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to seed filter_tabs:", err);
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
const ADMIN_SESSION_TOKEN = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);

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
  await ensureBriefingEventsTable();
  await ensureTeacherImagesTable();
  await ensureFilterTabsTable();
  await seedFilterTabs();
  await ensureNoticesTable();
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
    res.json({ isAdmin: !!(req.session as any)?.isAdmin });
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
    try {
      let sql = "SELECT * FROM timetables";
      const params: string[] = [];
      if (category) {
        const dashIdx = category.indexOf("-");
        if (dashIdx !== -1) {
          // 하위 카테고리 (예: 고등관-고1) → 정확히 일치 OR 상위 카테고리 (예: 고등관) 포함
          const parent = category.substring(0, dashIdx);
          sql += " WHERE (category = $1 OR category = $2)";
          params.push(category, parent);
        } else {
          // 상위 카테고리 (예: 고등관) → 해당 카테고리와 모든 하위 카테고리 포함
          sql += " WHERE category LIKE $1";
          params.push(category + "%");
        }
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

      for (const row of rows as any[]) {
        let effectiveTeacherId = row.teacher_id || null;

        // Auto-match by name if teacher_id is not set
        if (!effectiveTeacherId && row.teacher_name) {
          const matched = nameToTeacher.get(row.teacher_name?.trim());
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

  // --- Individual timetable photo upload ---
  app.patch("/api/timetables/:id/photo", requireAdmin, upload.single("image"), async (req, res) => {
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
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
    const teacherId = parseInt(req.params.teacherId);
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
    const teacherId = parseInt(req.params.teacherId);
    if (isNaN(teacherId)) return res.status(400).json({ error: "유효하지 않은 teacher_id" });
    try {
      await pool.query("DELETE FROM teacher_timetable_photos WHERE teacher_id = $1", [teacherId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timetables", requireAdmin, upload.fields([{ name: "teacher_image", maxCount: 1 }, { name: "detail_image", maxCount: 1 }]), async (req, res) => {
    const { teacher_id, teacher_name, category, target_school, class_name, class_time, class_date, start_date, description, subject } = req.body;
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
        `INSERT INTO timetables (title, teacher_id, teacher_name, category, target_school, class_name, class_time, start_date, teacher_image_url, detail_image_url, display_order, description, subject)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
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
          subject || ""
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
    const { teacher_id, teacher_name, category, target_school, class_name, class_time, start_date, description, subject } = req.body;
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    if (!class_name) {
      return res.status(400).json({ error: "수업명은 필수입니다." });
    }
    try {
      let teacher_image_url: string | undefined;
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
        teacher_image_url = urlData.publicUrl;
      }
      let detail_image_url: string | null | undefined;
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
        detail_image_url = urlData.publicUrl;
      } else if (req.body.delete_detail_image === "true") {
        detail_image_url = null;
      }
      const setClauses = [
        "title = $1",
        "teacher_id = $2",
        "teacher_name = $3",
        "category = $4",
        "target_school = $5",
        "class_name = $6",
        "class_time = $7",
        "start_date = $8",
        "description = $9",
        "subject = $10",
      ];
      const values: any[] = [
        class_name || "",
        teacher_id ? Number(teacher_id) : null,
        teacher_name || "",
        category || "",
        target_school || "",
        class_name || "",
        class_time || "",
        start_date || "",
        description || "",
        subject || "",
      ];
      if (teacher_image_url !== undefined) {
        setClauses.push(`teacher_image_url = $${values.length + 1}`);
        values.push(teacher_image_url);
      }
      if (detail_image_url !== undefined) {
        setClauses.push(`detail_image_url = $${values.length + 1}`);
        values.push(detail_image_url);
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

    try {
      let className = "";
      if (timetable_id) {
        const { rows: ttRows } = await pool.query(
          "SELECT class_name FROM timetables WHERE id = $1",
          [timetable_id]
        );
        if (ttRows[0]) className = ttRows[0].class_name;
      }

      const { rows } = await pool.query(
        `INSERT INTO reservations (timetable_id, student_name, student_phone, parent_phone, school, class_name)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [timetable_id || null, student_name.trim(), (student_phone || "").trim(), parent_phone.trim(), school.trim(), className]
      );

      appendReservationRow({
        subject: (subject || "").trim(),
        teacherName: (teacher_name || "").trim(),
        className: className,
        studentName: student_name.trim(),
        studentPhone: (student_phone || "").trim(),
        parentPhone: parent_phone.trim(),
        school: school.trim(),
      }).catch(() => {});

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
               t.teacher_name, t.target_school, t.class_time, t.start_date, t.category
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
      res.json(rows);
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

      appendSmsRow({ name: name || "", phone: cleaned, school: school || "", grade: grade || "" }).catch(() => {});

      supabase.from("sms_subscriptions").insert({
        name: name || "",
        phone: cleaned,
        school: school || "",
        grade: grade || "",
      }).then(({ error }) => {
        if (error) console.error("[Supabase] 문자수신 저장 실패:", error.message);
        else console.log("[Supabase] 문자수신 저장 성공");
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

      appendLevelTestRow({ name, phone: cleaned, school: school || "", grade: grade || "" }).catch(() => {});

      supabase.from("level_test_registrations").insert({
        name,
        phone: cleaned,
        school: school || "",
        grade: grade || "",
      }).then(({ error }) => {
        if (error) console.error("[Supabase] 레벨테스트 저장 실패:", error.message);
        else console.log("[Supabase] 레벨테스트 저장 성공");
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
  app.get("/api/notices", async (req, res) => {
    try {
      const adminOnly = req.query.admin === "1";
      const query = adminOnly
        ? "SELECT * FROM notices ORDER BY display_order ASC, created_at DESC"
        : "SELECT * FROM notices WHERE is_active = true ORDER BY display_order ASC, created_at DESC";
      const { rows } = await pool.query(query);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notices", requireAdmin, upload.single("image"), async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ error: "제목은 필수입니다." });

      let image_url: string | null = null;
      if (req.file) {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const fileName = `notices/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        image_url = urlData.publicUrl;
      }

      const { rows: maxRows } = await pool.query("SELECT COALESCE(MAX(display_order), -1) AS mo FROM notices");
      const nextOrder = parseInt(maxRows[0].mo) + 1;
      const { rows } = await pool.query(
        "INSERT INTO notices (title, content, image_url, is_active, display_order) VALUES ($1, $2, $3, true, $4) RETURNING *",
        [title.trim(), (content || "").trim(), image_url, nextOrder]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/notices/:id", requireAdmin, upload.single("image"), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, delete_image } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ error: "제목은 필수입니다." });

      // 기존 공지 조회
      const { rows: existing } = await pool.query("SELECT image_url FROM notices WHERE id=$1", [id]);
      if (existing.length === 0) return res.status(404).json({ error: "Not found" });
      let image_url: string | null = existing[0].image_url;

      // 이미지 삭제 요청
      if (delete_image === "true" && image_url) {
        const parts = image_url.split("/images/");
        if (parts[1]) await supabase.storage.from("images").remove([parts[1]]);
        image_url = null;
      }

      // 새 이미지 업로드
      if (req.file) {
        if (image_url) {
          const parts = image_url.split("/images/");
          if (parts[1]) await supabase.storage.from("images").remove([parts[1]]);
        }
        const ext = path.extname(req.file.originalname).toLowerCase();
        const fileName = `notices/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        image_url = urlData.publicUrl;
      }

      const { rows } = await pool.query(
        "UPDATE notices SET title=$1, content=$2, image_url=$3 WHERE id=$4 RETURNING *",
        [title.trim(), (content || "").trim(), image_url, id]
      );
      res.json(rows[0]);
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
      const { rows } = await pool.query("SELECT image_url FROM notices WHERE id=$1", [req.params.id]);
      if (rows[0]?.image_url) {
        const parts = rows[0].image_url.split("/images/");
        if (parts[1]) await supabase.storage.from("images").remove([parts[1]]);
      }
      await pool.query("DELETE FROM notices WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
