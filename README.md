# International Conference

A comprehensive, production-ready International Conference Platform built with **React 19**, **TypeScript**, **Tailwind CSS v4**, **Express**, **Supabase**, and **Google Gemini AI**.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 2. Installation
Clone or extract the repository and install all dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (or copy from `.env.example`):
```bash
cp .env.example .env
```

Your `.env` file should contain:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://ilicuncursyfodhnzhak.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_EIJRqidBxMleMh6UPlHWWA_Z95fCpsp
SUPABASE_URL=https://ilicuncursyfodhnzhak.supabase.co
SUPABASE_ANON_KEY=sb_publishable_EIJRqidBxMleMh6UPlHWWA_Z95fCpsp

# Server-only key required for protected Admin database deletion/reset actions.
# Copy it from Supabase Project Settings → API and never expose it in VITE_* variables.
SUPABASE_SERVICE_ROLE_KEY=

# Gemini API Key (Optional for AI Quality Score & Duplicate Detection)
GEMINI_API_KEY=

# Server Port
PORT=3000
```

### 4. Running the Development Server
Start the development server:
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🛠️ Production Build & Start

To create an optimized production build and start the server:

```bash
# 1. Build client and server bundles
npm run build

# 2. Run the production server
npm start
```

---

## 📁 Project Structure

- `src/userportal/` - Public portal, conference search, city/country exploration, organizer directory, feedback carousel, collaboration registration form.
- `src/adminportal/` - Admin dashboard, conference moderation, media partner management, associate management, subscribers, analytics, database controls.
- `src/organizerportal/` - Organizer dashboard for submitting and managing academic events.
- `src/database/` - Supabase schema and client integration with offline/localStorage fallback.
- `src/shared/` - Shared TypeScript interfaces, components, utilities, and helpers.
- `server.ts` - Express backend with Vite middleware, timezone computation, Gemini AI integration, and auto-completion cron tasks.

---

## 🛡️ Key Features

- **Full Conference Discovery & Filtering**: Search by keyword, category, country, city, date, and venue status (in-person/hybrid/online).
- **Automated Feedback Carousel**: Smooth single-card auto-sliding customer testimonials pool with Fisher-Yates randomization.
- **Collaboration & Registration Form**: Validated 150-character submissions for media partners and academic associates.
- **AI-Powered Quality Score & Duplicate Detection**: Integrated Google Gemini AI analysis.
- **Real-Time Database Sync**: Powered by Supabase with resilient offline caching and recovery.
- **Role-Based Access**: Dedicated Public Portal, Organizer Portal, and Super Admin Management.

## Production deployment checklist (2026-08 hardening)

1. Copy `.env.example` to your host's environment settings and provide all required values. There are no built-in Admin credentials or Supabase project fallbacks.
2. Set a long random `SESSION_SECRET` and a server-only `SUPABASE_SERVICE_ROLE_KEY`.
3. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`. The hash is SHA-256 of `gch_auth_salt_2026_` followed by your chosen password.
4. Apply database migrations in numeric order. `src/database/migrations/` is the canonical migration history; standalone schema files are reference/bootstrap files only.
5. Run `npm install`, `npm run lint`, `npm run build`, then `npm start`.
6. Organizer authentication redesign is intentionally deferred. Because of that, the final organizer-specific RLS lockdown for `organizers`, `conferences`, and organizer-scoped `notifications` must be completed together with that redesign.

## Production runtime requirement
Use Node.js 20.3 or newer. The server uses modern AbortSignal/fetch APIs and the package metadata enforces this minimum to prevent deployment on an incompatible Node runtime.

## Organizer Auth Production Migration (required)
The final production source uses Supabase Auth for Organizer passwords. Before deploying this version to an existing database, apply `src/database/migrations/08_organizer_supabase_auth.sql` after migrations 01–07. This migration preserves legacy Organizer credentials in a server-only temporary migration table, removes password/PIN columns from the public Organizer profile table, and enables final Organizer RLS policies. Existing Organizer accounts are upgraded automatically on their next valid login or Reset PIN recovery.

`SUPABASE_SERVICE_ROLE_KEY` is mandatory in production for Organizer signup, legacy-account migration, recovery, and protected Admin operations. Never expose it through a `VITE_*` environment variable.

## Production authentication migration

Before deploying this version, apply all SQL migrations in `src/database/migrations/` in numeric order, including:

`08_organizer_supabase_auth.sql`

This migration moves Organizer passwords to Supabase Auth, isolates Reset PIN secrets, migrates legacy Organizer accounts safely, and applies ownership-based RLS. The server must have `SUPABASE_SERVICE_ROLE_KEY` configured. Do not put the service-role key in a browser/Vite environment variable.
