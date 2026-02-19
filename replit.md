# GMR - Global Market Radar

## Overview
A subscription newsletter platform for financial content. Users log in via Supabase (email/password auth), view a dashboard of recent reports, browse the full archive, and admins can publish new reports in Markdown. Branded as GMR (Global Market Radar) with custom logo.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (serves both API and frontend)
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: Supabase (email/password) - client-side auth with server-side user sync
- **Routing**: wouter

## Project Structure
- `client/src/pages/` - Login, Dashboard, Archive, Admin (restricted to globalmarketradar@gmail.com), OAuth Consent
- `client/src/components/` - ThemeProvider, ThemeToggle, GmrLogo, ProtectedRoute, shadcn/ui
- `client/src/lib/` - supabase.ts (client), auth-context.tsx, queryClient.ts
- `server/` - Express routes, DB storage, seed data
- `shared/schema.ts` - Drizzle schema (users, subscriptions, reports)

## Branding
- Logo: `/gmr-logo.jpg` in `client/public/` (circular radar design)
- GmrLogo component: `client/src/components/gmr-logo.tsx` — reusable, supports `showTagline`, `size`, and `linkTo` props
- All headers use GmrLogo with "Global Market Radar" tagline
- Footers show "GMR · Global Market Radar"

## Database Schema
- **users**: id, email, name, avatarUrl, isAdmin, supabaseId
- **subscriptions**: id, userId, lemonsqueezySubscriptionId, status, createdAt
- **reports**: id, title, content (markdown), reportType, publishedAt

## API Routes
- `POST /api/auth/sync` - Sync Supabase user to local DB
- `GET /api/reports` - List all reports
- `GET /api/reports/recent` - Last 5 reports
- `GET /api/reports/:id` - Single report
- `POST /api/reports` - Create report (admin)
- `DELETE /api/reports/:id` - Delete report (admin)
- `GET /api/subscriptions/me` - Get user's subscription

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection (auto-set)
- `VITE_SUPABASE_URL` - Supabase project URL (user must set)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (user must set)

## Running
- `npm run dev` starts the dev server on port 5000
- `npm run db:push` pushes schema changes to database
