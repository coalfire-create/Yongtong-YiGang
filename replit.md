# Overview

This is a website for **영통이강학원 (Yeongtong Lee Gang Academy)**, a Korean math tutoring academy. The site serves as the academy's official homepage, showcasing their programs across two divisions: high school (고등관) and junior school (초/중등관, combining elementary and middle school). It features banner slides, quick menu navigation, instructor introductions, schedules, and admission results.

The project follows a full-stack TypeScript monorepo pattern with a React frontend and Express backend, using PostgreSQL for data storage.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Monorepo Structure

The project is organized into three main directories:
- **`client/`** — React single-page application (frontend)
- **`server/`** — Express API server (backend)
- **`shared/`** — Shared types and database schema used by both client and server

## Frontend

- **Framework:** React with TypeScript
- **Routing:** Wouter (lightweight client-side router)
- **UI Components:** shadcn/ui (new-york style) built on Radix UI primitives
- **Styling:** Tailwind CSS with CSS variables for theming, custom color scheme with light/dark mode support
- **State Management:** TanStack React Query for server state
- **Forms:** React Hook Form with Zod resolvers
- **Font:** Noto Sans KR (Korean font, loaded from Google Fonts)
- **Build Tool:** Vite with React plugin
- **Path Aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`

## Backend

- **Framework:** Express 5 on Node.js
- **Language:** TypeScript, run with `tsx` in development
- **API Pattern:** All API routes prefixed with `/api`
- **Storage Layer:** Abstracted through an `IStorage` interface in `server/storage.ts`. Currently uses in-memory storage (`MemStorage`), but designed to be swapped for database-backed storage.
- **Static Serving:** In production, the built client files are served from `dist/public`
- **Dev Server:** Vite dev server is integrated as Express middleware with HMR support

## Database

- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Schema Location:** `shared/schema.ts` — defines tables and Zod validation schemas using `drizzle-zod`
- **Current Schema:** A `users` table with `id` (UUID), `username`, and `password` fields
- **Additional Tables:** `popups` table (managed via raw pg.Pool, auto-created on server start) for homepage popup announcements
- **Supabase Tables:** `teachers` table managed via Supabase client with `display_order` column (auto-added on startup); images stored in Supabase Storage
- **Additional Local Tables:** `timetables` (title, teacher_id, teacher_name, category, target_school, class_name, class_time, start_date, teacher_image_url, display_order, description, subject), `summary_timetables` (division, image_url, display_order), `reservations`, `banners`, `popups`, `briefings`, `reviews`, `sms_subscriptions` - auto-created on server start
- **Subject Order:** All subject lists across the site use: 수학, 국어, 영어, 탐구 (in this order)
- **Timetable Subjects:** Timetables are grouped by subject (수학/국어/영어/탐구) on the schedule pages, with expandable "상세보기" for descriptions
- **Summary Timetable Divisions:** 'high-g1' (고1), 'high-g2' (고2), 'high-g3' (고3), 'junior' (초/중등관)
- **Reorder APIs:** `PATCH /api/timetables/reorder`, `PATCH /api/summary-timetables/reorder`, and `PATCH /api/teachers/reorder` accept `{ ids: number[] }` to set display_order
- **Google Sheets Sync:** Reservations and SMS subscriptions are logged to Google Sheets in real-time via Replit Google Sheets integration (`server/googleSheets.ts`, `server/sheets-sync.ts`). If `GOOGLE_SHEET_ID` env var is set, uses that spreadsheet; otherwise auto-creates one on first write
- **Migrations:** Output to `./migrations` directory
- **Schema Push:** Use `npm run db:push` (runs `drizzle-kit push`)
- **Connection:** Requires `DATABASE_URL` environment variable

## User Authentication

- **Component:** `client/src/components/auth-modal.tsx` - Login/Register modals with full registration form
- **Auth Context:** `AuthProvider` wraps the app in `App.tsx`, provides `useAuth()` hook
- **Header Integration:** `AuthHeaderButton` shows login/register buttons or user info/logout in header
- **DB Tables:** `members` (id, username, password, member_type, student_name, gender, track, grade, school, student_phone, parent_phone, birthday, subject, email, academy_status, created_at) and `phone_verifications` (id, phone, code, expires_at, verified, created_at) - auto-created on server start
- **Registration:** Student/Parent type selection, ID with duplicate check, password, student info (name, gender, track, grade, school), phone verification (mock), parent phone, birthday, subject, email, academy status, terms agreement
- **Auth Routes:** `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/check-username`, `/api/auth/phone/send`, `/api/auth/phone/verify`
- **Phone Auth:** `/api/auth/phone/send` (mock - logs code to console) + `/api/auth/phone/verify`
- **Session:** Member stored as `req.session.member` with `{ id, name, username, memberType }`
- **Password:** Hashed with bcryptjs

## Popup Feature

- **Component:** `client/src/components/popup-modal.tsx` - Shows promotional popups on homepage
- **Admin Management:** Managed via admin page "팝업 관리" tab
- **Storage:** `popups` table in local PostgreSQL (auto-created via `ensurePopupsTable()` on server start)
- **Images:** Uploaded to Supabase Storage `images/popups/` bucket
- **Dismiss Logic:** "오늘하루 보지않기" stores today's date in localStorage key `popup_dismissed_date`
- **Division Encoding:** Teachers use `division::subject` format in the subject column to encode division membership

## Banner Feature

- **Component:** Reusable `BannerCarousel` component in `client/src/components/banner-carousel.tsx`
- **Homepage:** Uses `HeroCarousel` in `client/src/pages/home.tsx` (division=main)
- **Division Pages:** 고등관 (division=high), 초/중등관 (division=junior), 올빼미 독학관 (division=owl) each have their own banner carousel
- **Admin Management:** Managed via admin page "배너 관리" tab with division filter tabs (메인/고등관/초/중등관/올빼미 독학관)
- **Storage:** `banners` table in local PostgreSQL (auto-created via `ensureBannersTable()` on server start)
- **Fields:** title, subtitle, description, image_url, link_url, is_active, display_order, division
- **Division Values:** 'main' (homepage), 'high' (고등관), 'junior' (초/중등관), 'owl' (올빼미 독학관)
- **API:** `GET /api/banners?division=main` returns active banners for specified division
- **Images:** Uploaded to Supabase Storage `images/banners/` bucket
- **Fallback:** Shows default slide with maroon gradient if no banners are registered for that division

## Build Process

- **Client Build:** Vite builds to `dist/public`
- **Server Build:** esbuild bundles the server to `dist/index.cjs`, with select dependencies bundled (allowlisted) to reduce cold start times
- **Production Start:** `node dist/index.cjs`

## Key Scripts

- `npm run dev` — Start development server with Vite HMR
- `npm run build` — Build both client and server for production
- `npm start` — Run production build
- `npm run check` — TypeScript type checking
- `npm run db:push` — Push Drizzle schema to database

# External Dependencies

- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable
- **Google Fonts** — Noto Sans KR font loaded via CDN
- **Radix UI** — Comprehensive set of accessible UI primitives (dialog, dropdown, tabs, tooltips, etc.)
- **Drizzle ORM + Drizzle Kit** — Database ORM and migration tooling for PostgreSQL
- **TanStack React Query** — Server state management and data fetching
- **Vite** — Frontend build tool and dev server
- **esbuild** — Server bundling for production
- **connect-pg-simple** — PostgreSQL session store, stores sessions in `session` table (auto-created)
- **Replit plugins** — `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` for development on Replit