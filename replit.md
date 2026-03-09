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
- **subscriptions**: id, userId, paypalSubscriptionId, status, createdAt
- **reports**: id, title, content (markdown), reportType, publishedAt
- **report_reads**: id (uuid), userId, reportId, readAt — tracks which reports a user has read

## API Routes
- `POST /api/auth/sync` - Sync Supabase user to local DB
- `GET /api/reports` - List all reports
- `GET /api/reports/recent` - Last 5 reports
- `GET /api/reports/:id` - Single report
- `POST /api/reports` - Create report (admin)
- `DELETE /api/reports/:id` - Delete report (admin)
- `GET /api/paypal/client-id` - Get PayPal client ID for frontend
- `POST /api/paypal/create-subscription` - Save PayPal subscription after approval
- `POST /api/paypal/webhook` - PayPal webhook for subscription status updates
- `GET /api/subscriptions/me` - Get user's subscription
- `GET /api/report-reads` - Get IDs of reports the current user has read
- `POST /api/report-reads/:reportId` - Mark a report as read for the current user

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection (auto-set)
- `VITE_SUPABASE_URL` - Supabase project URL (user must set)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (user must set)
- `PAYPAL_CLIENT_ID` - PayPal app client ID
- `PAYPAL_CLIENT_SECRET` - PayPal app client secret
- `VITE_PAYPAL_PLAN_ID` - PayPal subscription plan ID (optional, for landing page PayPal button)

## Running
- `npm run dev` starts the dev server on port 5000
- `npm run db:push` pushes schema changes to database
