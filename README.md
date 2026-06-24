# Mahalatly

A production-ready, multi-tenant SaaS platform for managing delivery orders and generating **80mm thermal receipt** invoices for multiple businesses from a single dashboard.

Built with **Next.js 15 (App Router)**, **TypeScript**, **PostgreSQL + Prisma**, **NextAuth**, **TailwindCSS + shadcn/ui**, **React Hook Form + Zod**, server actions, QR codes, and `@react-pdf/renderer`.

- **Currency:** KD (KWD) · **Timezone:** Asia/Kuwait · **Date format:** DD/MM/YYYY · **Language:** English

---

## Features

- **Auth & RBAC** — Login, logout, forgot/reset password, JWT sessions, 3 roles (Super Admin, Admin, Employee) enforced in every server action and on the API.
- **Projects** — CRUD for businesses; project info auto-appears on receipts. Project-scoped access for non-super-admins.
- **Products** — Per-project catalog with quantity-based tiered pricing (the more units, the lower the unit price). Products surface in the order form for their project and auto-fill the unit price for the chosen quantity.
- **Orders** — Fast create workflow with dynamic governorate → area dropdowns, unlimited line items with live totals (catalog products or custom), optional delivery fee, sequential `ORD-YYYY-000001` numbers (transaction-safe).
- **Thermal receipt PDF** — Clean black-and-white 80mm layout with embedded QR code.
- **QR codes** — Each order has a public `/invoice/:publicId` page; high-error-correction QR stays scannable at sticker size. Downloadable PNG.
- **Public invoice page** — Mobile-friendly, no login required.
- **Dashboard** — Stat cards + charts (orders per day, by project, by source) + recent orders.
- **Users** — Create/edit/disable/delete, assign projects, generate password-reset links.
- **Reports** — Daily/weekly/monthly/custom ranges with PDF + Excel export.
- **Activity logs** — Full audit trail of every action.
- **Settings** — Currency, timezone, receipt header/footer, QR size.
- **UX** — Responsive, dark/light mode, modern SaaS UI.
- **Security** — bcrypt hashing, role-based authorization, Zod validation, audit logging, rate limiting on auth.

---

## Local setup

### 1. Prerequisites
- Node.js 18.18+ (20+ recommended)
- A PostgreSQL database

### 2. Install
```bash
npm install
```

### 3. Environment
```bash
cp .env.example .env
```
Edit `.env`:
- `DATABASE_URL` — your Postgres connection string
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000`
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — initial Super Admin credentials

### 4. Migrate & seed
```bash
npm run db:migrate      # applies the committed migration (prisma/migrations/)
npm run db:seed         # production bootstrap: ensures the Super Admin + global settings
```
> The repo ships an initial migration (`prisma/migrations/20260609000000_init`), so `db:migrate` (dev) and `db:deploy` (prod/CI) both work without a baseline step. The seed is a lean, idempotent production bootstrap — it creates the Super Admin if missing (preserving a password you later change) and removes the original demo data; it does **not** create dummy projects/orders.

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000 and sign in with the seeded Super Admin.

Seeded accounts:
- **Super Admin:** `admin@mahalatly.com` / `Admin@12345`
- **Employee:** `employee@mahalatly.com` / `Employee@123`

> Change these immediately in any real deployment.

---

## Testing

Pure business logic (money math, order-number formatting, KD/timezone formatting, Zod validation, RBAC scoping) is covered by a Vitest suite:

```bash
npm test          # run once
npm run test:watch
```

Tests live in `src/lib/__tests__/`. The KD-rounding logic is extracted into `src/lib/order-totals.ts` (`computeOrderTotals`) so the order actions and the tests share one implementation. CI runs `npm test` on every push and PR.

---

## Run with Docker (one command)

Spins up Postgres + the app, runs migrations, and seeds automatically.

```bash
# optional: set a real secret first
export NEXTAUTH_SECRET="$(openssl rand -base64 32)"

docker compose up --build
```

Then open http://localhost:3000 and sign in with the seeded Super Admin
(`admin@mahalatly.com` / `Admin@12345`).

- The `app` container waits for Postgres, runs `prisma migrate deploy`, and (when `SEED_ON_START=true`, the default) seeds idempotently.
- Postgres data persists in the `mahalatly-pgdata` volume across restarts.
- Override any value via env vars (`NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ON_START=false`).

To stop and wipe the database:
```bash
docker compose down -v
```

---

## Deployment (Vercel + Neon)

The app runs on **Vercel** with a **Neon** Postgres database.

1. **Database (Neon):** create a project and grab two connection strings — the **pooled** one (for runtime) and the **direct** one (for migrations). Both with `?sslmode=require`.
2. **Import the repo into Vercel** (Vercel auto-detects Next.js and runs the `build` script).
3. **Environment variables** (Vercel → Settings → Environment Variables):
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** URL |
   | `DIRECT_URL` | Neon **direct** URL (used by migrations) |
   | `NEXTAUTH_URL` | the domain you log in on (e.g. `https://dashboard.mahalatly.com`) |
   | `NEXT_PUBLIC_APP_URL` | the public base for store/invoice/QR links (e.g. `https://mahalatly.com`) |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
   | `RESEND_API_KEY` / `RESEND_FROM` | Resend key + verified sender |
   | `INVOICE_NOTIFY_EMAIL` | where order emails go |
   | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | first Super Admin |
4. **Custom domains** (Vercel → Settings → Domains): add the dashboard subdomain and (to serve `/store/...`) the apex domain — both pointing at this project.
5. **Deploy.** On a **production** build, `scripts/vercel-build.sh` runs `prisma migrate deploy` + the seed automatically, so the schema and first Super Admin are created with no manual step. Preview/CI builds only build.
6. Open your dashboard domain and sign in.

### Notes for serverless
- `@react-pdf/renderer`, `bcryptjs`, and `pngjs` are in `serverExternalPackages` so they run correctly in serverless functions.
- The in-memory rate limiter resets per instance. For scale, back it with Redis (swap `src/lib/rate-limit.ts`).

---

## Backup & restore (and changing database providers)

No DB tools required — do it from the dashboard:

1. **Back up:** **Settings → Download full backup (JSON)**. Keep the file safe.
2. **Restore / migrate:** point the app at the target database (set `DATABASE_URL`/`DIRECT_URL` and redeploy — the production build creates the schema and a bootstrap Super Admin), then **Settings → Restore / Migrate → choose the backup → "Replace all data with this backup"**. This loads your real data (users, passwords, project assignments, orders). You'll be signed out — log back in with your original credentials.

> Tip: prefer a quiet moment — orders placed between backup and restore won't be in the file.

Prefer the CLI? `DATABASE_URL=<url> DIRECT_URL=<direct-url> npx prisma migrate deploy` then `DATABASE_URL=<url> npm run db:restore -- backup.json` (needs Node + the repo).

---

## Project structure

```
prisma/
  schema.prisma           # Users, Projects, Orders, OrderItems, ActivityLogs, OrderCounter, Setting
  migrations/             # committed SQL migrations (initial schema)
  seed.ts                 # idempotent demo data
src/
  middleware.ts           # protects /dashboard/*
  app/
    (auth)/               # login, forgot-password, reset-password
    dashboard/            # dashboard, orders, projects, users, reports, activity, settings
    invoice/[publicId]/   # public invoice page
    api/
      auth/[...nextauth]/
      orders/[id]/pdf/    # thermal receipt download
      orders/[id]/qr/     # QR PNG download
      reports/export/     # PDF + Excel export
    actions/              # server actions: auth, orders, projects, users, settings
  components/             # ui/ (shadcn), dashboard/, orders/, projects/, users/, reports/, settings/
  lib/                    # prisma, auth, rbac, validations, constants, format, qr, stats, reports, receipt-pdf, report-pdf, order-number, order-totals, rate-limit, activity
  lib/__tests__/          # Vitest unit tests
```

---

## Roles & permissions

| Capability | Super Admin | Admin | Employee |
|---|:---:|:---:|:---:|
| Manage projects / users / settings / activity | ✅ | — | — |
| View all projects & orders | ✅ | assigned | assigned |
| Create orders | ✅ | ✅ | ✅ |
| Edit orders / change status / delete | ✅ | ✅ | — |
| Download PDF / QR | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | — |

Admins and Employees only ever see and act on the projects assigned to them; this is enforced server-side in `src/lib/rbac.ts`.
