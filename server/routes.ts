import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { supabase } from "./supabase";
import { appendReservationRow, appendSmsRow } from "./sheets-sync";
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure sms_subscriptions table:", err);
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
  } catch (err) {
    console.error("Failed to ensure briefings table:", err);
  }
}

async function ensureTimetablesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetables (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER,
        teacher_name TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        target_school TEXT NOT NULL DEFAULT '',
        class_name TEXT NOT NULL DEFAULT '',
        class_time TEXT NOT NULL DEFAULT '',
        class_date TEXT NOT NULL DEFAULT '',
        teacher_image_url TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      ALTER TABLE timetables ADD COLUMN IF NOT EXISTS teacher_image_url TEXT NOT NULL DEFAULT ''
    `);
  } catch (err) {
    console.error("Failed to ensure timetables table:", err);
  }
}

async function ensureReservationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        timetable_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
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

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any)?.isAdmin) return next();
  return res.status(401).json({ error: "관리자 인증이 필요합니다." });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await ensurePopupsTable();
  await ensureBannersTable();
  await ensureBriefingsTable();
  await ensureSmsSubscriptionsTable();
  await ensureMembersTable();
  await ensurePhoneVerificationsTable();
  await ensureReviewsTable();
  await ensureTimetablesTable();
  await ensureReservationsTable();

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
        return res.json({ success: true });
      });
      return;
    }
    return res.status(401).json({ error: "비밀번호가 틀렸습니다." });
  });

  app.get("/api/admin/status", (req, res) => {
    res.json({ isAdmin: !!(req.session as any)?.isAdmin });
  });

  // ========== TEACHERS ==========
  app.get("/api/teachers", async (req, res) => {
    const division = req.query.division as string | undefined;
    let query = supabase
      .from("teachers")
      .select("*")
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

    const { data, error } = await supabase
      .from("teachers")
      .insert({ name, subject: encodedSubject, description, image_url })
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

  // ========== TIMETABLES (text-based) ==========
  app.get("/api/timetables", async (req, res) => {
    const category = req.query.category as string | undefined;
    try {
      let sql = "SELECT * FROM timetables";
      const params: string[] = [];
      if (category) {
        sql += " WHERE category = $1";
        params.push(category);
      }
      sql += " ORDER BY created_at DESC";
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/timetables", requireAdmin, upload.single("teacher_image"), async (req, res) => {
    const { teacher_id, teacher_name, category, target_school, class_name, class_time, class_date } = req.body;
    if (!category || !class_name) {
      return res.status(400).json({ error: "카테고리와 수업명은 필수입니다." });
    }
    try {
      let teacher_image_url = "";
      if (req.file) {
        const ext = path.extname(req.file.originalname) || ".jpg";
        const fileName = `timetables/${crypto.randomUUID()}${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false,
          });
        if (uploadError) return res.status(500).json({ error: "이미지 업로드 실패: " + uploadError.message });
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        teacher_image_url = urlData.publicUrl;
      }
      const { rows } = await pool.query(
        `INSERT INTO timetables (teacher_id, teacher_name, category, target_school, class_name, class_time, class_date, teacher_image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [teacher_id || null, teacher_name || "", category, target_school || "", class_name, class_time || "", class_date || "", teacher_image_url]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/timetables/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM reservations WHERE timetable_id = $1", [id]);
      await pool.query("DELETE FROM timetables WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== RESERVATIONS ==========
  app.post("/api/reservations", async (req, res) => {
    const member = (req.session as any)?.member;
    if (!member) {
      return res.status(401).json({ error: "로그인이 필요합니다." });
    }
    const { timetable_id } = req.body;
    if (!timetable_id) {
      return res.status(400).json({ error: "수업을 선택해 주세요." });
    }
    try {
      const { rows: existing } = await pool.query(
        "SELECT id FROM reservations WHERE user_id = $1 AND timetable_id = $2",
        [member.id, timetable_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: "이미 예약한 수업입니다." });
      }
      const { rows } = await pool.query(
        "INSERT INTO reservations (user_id, timetable_id) VALUES ($1, $2) RETURNING *",
        [member.id, timetable_id]
      );

      const { rows: memberRows } = await pool.query(
        "SELECT student_name, school, grade, student_phone FROM members WHERE id = $1",
        [member.id]
      );
      const { rows: ttRows } = await pool.query(
        "SELECT class_name FROM timetables WHERE id = $1",
        [timetable_id]
      );
      const m = memberRows[0];
      const tt = ttRows[0];
      if (m && tt) {
        appendReservationRow({
          studentName: m.student_name || "",
          school: m.school || "",
          grade: m.grade || "",
          phone: m.student_phone || "",
          className: tt.class_name || "",
        }).catch(() => {});
      }

      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/reservations", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT r.id, r.created_at, r.timetable_id, r.user_id,
               m.student_name, m.student_phone, m.parent_phone, m.school as student_school, m.grade as student_grade,
               t.class_name, t.teacher_name, t.target_school, t.class_time, t.class_date, t.category
        FROM reservations r
        LEFT JOIN members m ON r.user_id = m.id
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
    if (!title) {
      return res.status(400).json({ error: "제목은 필수입니다." });
    }

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
        [title, subtitle || "", description || "", image_url, link_url || null, parseInt(display_order) || 0, division || "main"]
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
    const { name, phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "전화번호는 필수입니다." });
    }
    const cleaned = phone.replace(/[^0-9-]/g, "");
    if (cleaned.length < 10) {
      return res.status(400).json({ error: "올바른 전화번호를 입력하세요." });
    }
    try {
      const { rows } = await pool.query(
        "INSERT INTO sms_subscriptions (name, phone) VALUES ($1, $2) RETURNING *",
        [name || "", cleaned]
      );

      appendSmsRow({ name: name || "", phone: cleaned }).catch(() => {});

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

  return httpServer;
}
