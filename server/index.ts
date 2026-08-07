import fs from "fs";
import path from "path";

// Proactively load .env variables in local sandbox environment if not populated
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach(line => {
        const parts = line.trim().split("=");
        if (parts.length >= 2 && !line.startsWith("#")) {
          const key = parts[0].trim();
          const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
          process.env[key] = val;
        }
      });
    }
  } catch (e) {
    console.error("Failed to load .env manually:", e);
  }
}

// Production 안전장치: 필수 env var가 비어있으면(미설정 또는 빈 문자열)
// 관리자 비밀번호/세션 시크릿이 하드코딩된 기본값으로 조용히 폴백되는 것을 막기 위해
// 서버 시작 자체를 차단한다.
if (process.env.NODE_ENV === "production") {
  const required = ["ADMIN_PASSWORD", "SESSION_SECRET", "DATABASE_URL"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error(`[Startup] Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const insecureDefaults: Record<string, string> = {
    ADMIN_PASSWORD: "admin",
    SESSION_SECRET: "fallback-secret",
  };
  for (const [key, insecureValue] of Object.entries(insecureDefaults)) {
    if (process.env[key] === insecureValue) {
      console.error(`[Startup] ${key} is set to an insecure default value.`);
      process.exit(1);
    }
  }
}

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.set("trust proxy", 1);

const PgStore = connectPgSimple(session);
const sessionPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgStore({
      pool: sessionPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
      secure: process.env.NODE_ENV === "production",
    },
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Serve attached_assets statically so uploaded images can be accessed directly
app.use('/attached_assets', express.static(path.resolve(process.cwd(), 'attached_assets')));

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
