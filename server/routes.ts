import type { Express } from "express";
import { createServer, type Server } from "http";
import { supabase } from "./supabase";
import multer from "multer";
import path from "path";
import crypto from "crypto";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ========== TEACHERS ==========
  app.get("/api/teachers", async (_req, res) => {
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/teachers", upload.single("image"), async (req, res) => {
    const { name, subject, description } = req.body;
    if (!name || !subject || !description) {
      return res.status(400).json({ error: "이름, 과목, 한줄 소개는 필수입니다." });
    }

    let image_url: string | null = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname) || ".jpg";
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
      .insert({ name, subject, description, image_url })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/teachers/:id", async (req, res) => {
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

  app.post("/api/timetables", upload.single("image"), async (req, res) => {
    const { title, category } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: "제목과 카테고리는 필수입니다." });
    }

    let image_url: string | null = null;
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
      image_url = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("timetables")
      .insert({ title, category, image_url })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/timetables/:id", async (req, res) => {
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

  // ========== INIT TABLES ==========
  app.post("/api/init-tables", async (_req, res) => {
    const { error: tErr } = await supabase.rpc("exec_sql", {
      query: `
        CREATE TABLE IF NOT EXISTS teachers (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          name text NOT NULL,
          subject text NOT NULL,
          description text NOT NULL,
          image_url text,
          created_at timestamptz DEFAULT now()
        );
      `,
    });
    const { error: ttErr } = await supabase.rpc("exec_sql", {
      query: `
        CREATE TABLE IF NOT EXISTS timetables (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          title text NOT NULL,
          category text NOT NULL,
          image_url text,
          created_at timestamptz DEFAULT now()
        );
      `,
    });
    if (tErr || ttErr) {
      return res.status(500).json({ error: "테이블 생성 실패. Supabase에서 직접 테이블을 만들어주세요.", details: { tErr, ttErr } });
    }
    res.json({ success: true });
  });

  return httpServer;
}
