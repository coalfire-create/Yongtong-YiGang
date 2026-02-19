import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { supabase } from "./supabase";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import pg from "pg";

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
        kakao_id TEXT UNIQUE,
        naver_id TEXT UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        phone TEXT,
        auth_provider TEXT NOT NULL DEFAULT 'phone',
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  } catch (err) {
    console.error("Failed to ensure banners table:", err);
  }
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
  await ensureSmsSubscriptionsTable();
  await ensureMembersTable();
  await ensurePhoneVerificationsTable();

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

  // ========== TIMETABLES ==========
  app.get("/api/timetables", async (req, res) => {
    const category = req.query.category as string | undefined;
    let query = supabase.from("timetables").select("*").order("created_at", { ascending: false });
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/timetables", requireAdmin, upload.single("image"), async (req, res) => {
    const { title, category } = req.body;
    if (!category) {
      return res.status(400).json({ error: "카테고리는 필수입니다." });
    }

    let image_url: string | null = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `timetables/${crypto.randomUUID()}${ext}`;
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
      .from("timetables")
      .insert({ title: title || "", category, image_url })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/timetables/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { data: timetable } = await supabase.from("timetables").select("image_url").eq("id", id).single();
    if (timetable?.image_url) {
      const urlParts = timetable.image_url.split("/images/");
      if (urlParts[1]) {
        await supabase.storage.from("images").remove([urlParts[1]]);
      }
    }
    const { error } = await supabase.from("timetables").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
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
  app.get("/api/banners", async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM banners WHERE is_active = true ORDER BY display_order ASC, created_at DESC"
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/banners/all", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM banners ORDER BY display_order ASC, created_at DESC"
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/banners", requireAdmin, upload.single("image"), async (req, res) => {
    const { title, subtitle, description, link_url, display_order } = req.body;
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
        "INSERT INTO banners (title, subtitle, description, image_url, link_url, display_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [title, subtitle || "", description || "", image_url, link_url || null, parseInt(display_order) || 0]
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

  // ========== USER AUTH (카카오/네이버/전화번호) ==========

  // --- Current user status ---
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

  // --- 카카오 OAuth ---
  app.get("/api/auth/kakao", (req, res) => {
    const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
    if (!KAKAO_KEY) return res.status(500).json({ error: "카카오 API 키가 설정되지 않았습니다." });
    const redirectUri = `${getBaseUrl(req)}/api/auth/kakao/callback`;
    const state = crypto.randomBytes(16).toString("hex");
    (req.session as any).kakaoState = state;
    req.session.save(() => {
      const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
      res.redirect(url);
    });
  });

  app.get("/api/auth/kakao/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.redirect("/?auth_error=missing_code");
    const savedState = (req.session as any)?.kakaoState;
    if (!state || state !== savedState) return res.redirect("/?auth_error=invalid_state");
    (req.session as any).kakaoState = null;
    const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
    const KAKAO_SECRET = process.env.KAKAO_CLIENT_SECRET || "";
    const redirectUri = `${getBaseUrl(req)}/api/auth/kakao/callback`;

    try {
      const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: KAKAO_KEY!,
          ...(KAKAO_SECRET ? { client_secret: KAKAO_SECRET } : {}),
          redirect_uri: redirectUri,
          code: code as string,
        }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) return res.redirect("/?auth_error=token_failed");

      const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json() as any;
      const kakaoId = String(profile.id);
      const name = profile.kakao_account?.profile?.nickname || "";

      const { rows: existing } = await pool.query("SELECT * FROM members WHERE kakao_id = $1", [kakaoId]);
      let member;
      if (existing.length > 0) {
        member = existing[0];
      } else {
        const { rows: created } = await pool.query(
          "INSERT INTO members (kakao_id, name, auth_provider) VALUES ($1, $2, 'kakao') RETURNING *",
          [kakaoId, name]
        );
        member = created[0];
      }

      (req.session as any).member = { id: member.id, name: member.name, provider: "kakao" };
      req.session.save(() => {
        res.redirect("/?auth_success=kakao");
      });
    } catch (err: any) {
      console.error("Kakao auth error:", err);
      res.redirect("/?auth_error=kakao_failed");
    }
  });

  // --- 네이버 OAuth ---
  app.get("/api/auth/naver", (req, res) => {
    const NAVER_ID = process.env.NAVER_CLIENT_ID;
    if (!NAVER_ID) return res.status(500).json({ error: "네이버 API 키가 설정되지 않았습니다." });
    const redirectUri = `${getBaseUrl(req)}/api/auth/naver/callback`;
    const state = crypto.randomBytes(16).toString("hex");
    (req.session as any).naverState = state;
    req.session.save(() => {
      const url = `https://nid.naver.com/oauth2.0/authorize?client_id=${NAVER_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
      res.redirect(url);
    });
  });

  app.get("/api/auth/naver/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.redirect("/?auth_error=missing_code");
    const savedState = (req.session as any)?.naverState;
    if (!state || state !== savedState) return res.redirect("/?auth_error=invalid_state");
    (req.session as any).naverState = null;

    const NAVER_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET;
    if (!NAVER_ID || !NAVER_SECRET) return res.redirect("/?auth_error=config_missing");

    try {
      const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${NAVER_ID}&client_secret=${NAVER_SECRET}&code=${code}&state=${state}`, {
        method: "GET",
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) return res.redirect("/?auth_error=token_failed");

      const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profileData = await profileRes.json() as any;
      const naverId = String(profileData.response?.id);
      const name = profileData.response?.name || profileData.response?.nickname || "";
      const phone = profileData.response?.mobile?.replace(/-/g, "") || "";

      const { rows: existing } = await pool.query("SELECT * FROM members WHERE naver_id = $1", [naverId]);
      let member;
      if (existing.length > 0) {
        member = existing[0];
      } else {
        const { rows: created } = await pool.query(
          "INSERT INTO members (naver_id, name, phone, auth_provider) VALUES ($1, $2, $3, 'naver') RETURNING *",
          [naverId, name, phone]
        );
        member = created[0];
      }

      (req.session as any).member = { id: member.id, name: member.name, provider: "naver" };
      req.session.save(() => {
        res.redirect("/?auth_success=naver");
      });
    } catch (err: any) {
      console.error("Naver auth error:", err);
      res.redirect("/?auth_error=naver_failed");
    }
  });

  // --- 전화번호 인증 ---
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
    const { phone, code, name } = req.body;
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

      const { rows: existing } = await pool.query("SELECT * FROM members WHERE phone = $1 AND auth_provider = 'phone'", [cleanPhone]);
      let member;
      if (existing.length > 0) {
        member = existing[0];
        if (name && name.trim()) {
          await pool.query("UPDATE members SET name = $1 WHERE id = $2", [name.trim(), member.id]);
          member.name = name.trim();
        }
      } else {
        const { rows: created } = await pool.query(
          "INSERT INTO members (phone, name, auth_provider) VALUES ($1, $2, 'phone') RETURNING *",
          [cleanPhone, name?.trim() || ""]
        );
        member = created[0];
      }

      (req.session as any).member = { id: member.id, name: member.name || cleanPhone, provider: "phone" };
      req.session.save(() => {
        res.json({ success: true, member: { id: member.id, name: member.name, provider: "phone" } });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}

function getBaseUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
  return `${proto}://${host}`;
}
