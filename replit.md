# Overview

This is a website for **영통이강학원 (Yeongtong Lee Gang Academy)**, a Korean math tutoring academy. The site serves as the academy's official homepage, showcasing their programs across three divisions: high school (고등관), middle school (중등관), and elementary school (초등관). It features banner slides, quick menu navigation, instructor introductions, schedules, and admission results.

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
- **Migrations:** Output to `./migrations` directory
- **Schema Push:** Use `npm run db:push` (runs `drizzle-kit push`)
- **Connection:** Requires `DATABASE_URL` environment variable

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
- **connect-pg-simple** — PostgreSQL session store (available but not yet wired up)
- **Replit plugins** — `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` for development on Replit