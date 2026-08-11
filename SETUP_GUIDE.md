# Clothes & Tailor Shop Management System - Setup Guide

## Project Structure

```text
tailor-shop/
├── app/                  # Next.js application
├── db/migrations/        # SQL migrations
├── db/seeds/             # initial setup data
├── run-migration.js      # helper for applying later migrations
└── PROJECT_OVERVIEW.md   # business workflow guide
```

## Requirements

- Node.js 20+
- PostgreSQL 14+
- A `DATABASE_URL`
- A long random `SESSION_SECRET`

## Environment

Create `app/.env.local`:

```env
DATABASE_URL="postgres://postgres:yourpassword@localhost:5432/tailor_shop"
SESSION_SECRET="generate-a-long-random-string-here"
```

For Supabase or hosted PostgreSQL, use the connection string from the provider and include SSL if required.

## Install

```bash
cd app
npm install
```

## Database Setup

Run migrations in order:

```bash
psql "$DATABASE_URL" -f db/migrations/001_shop_and_customers.sql
psql "$DATABASE_URL" -f db/migrations/002_retail_inventory.sql
psql "$DATABASE_URL" -f db/migrations/003_fabric_and_tailor_orders.sql
psql "$DATABASE_URL" -f db/migrations/004_sales_and_accounts.sql
psql "$DATABASE_URL" -f db/migrations/005_reporting_views.sql
psql "$DATABASE_URL" -f db/migrations/006_branches.sql
psql "$DATABASE_URL" -f db/migrations/007_purchase_orders_and_returns.sql
psql "$DATABASE_URL" -f db/migrations/008_branch_aware_views.sql
psql "$DATABASE_URL" -f db/migrations/009_simplify_to_tailoring_only.sql
psql "$DATABASE_URL" -f db/migrations/010_restore_single_user_auth.sql
psql "$DATABASE_URL" -f db/migrations/011_measurement_templates.sql
psql "$DATABASE_URL" -f db/migrations/012_garment_management.sql
```

Then seed initial roles, branch, settings, and accounts:

```bash
psql "$DATABASE_URL" -f db/seeds/initial_setup.sql
```

## Create Owner User

Option 1: use the helper script from `app/`:

```bash
cd app
OWNER_EMAIL="owner@tailorshop.com" OWNER_PASSWORD="your-password" node create-user.js
```

Option 2: insert manually after generating a bcrypt password hash.

## Run The App

```bash
cd app
npm run dev
```

Open `http://localhost:3000`.

## Build Check

```bash
cd app
npm run build
```

The current app builds successfully. Next/Turbopack may show non-blocking warnings about workspace-root detection and PDF file tracing.

## Main Routes

- `/dashboard` - overview.
- `/tailor-orders/new` - create new garment orders.
- `/tailor-orders` - order report and PDF links.
- `/stitching-cutting` - assign and complete cutter/tailor work.
- `/cabinet` - cabinet capacity and ready garment storage.
- `/delivery` - deliver fully ready orders.
- `/fabrics` - fabric inventory and restocking.
- `/accounts` - worker/supplier balances and payments.
- `/ledger` - accounting ledger.
- `/trial-balance` - accounting balance check.
- `/settings` - shop settings and garment configuration.

## Business Workflow

1. Add garment types, measurements, and design options in `Setting & Garment Configuration`.
2. Add shop fabric in `Fabric Inventory`.
3. Create an order in `New Order`.
4. Assign cutter and tailor in `Stitching/Cutting`.
5. Complete worker assignments; balances appear in `Accounts`.
6. Approve quality; ready garments go into cabinet automatically.
7. Deliver ready orders from `Garment Delivery`.
8. Pay workers from their account detail page.

## PDF

Tailor order PDFs are available at:

```text
/api/tailor-orders/{id}/pdf
```

They include customer details, order number, garment tickets, measurements/design snapshots, fabric usage, totals, paid amount, and balance.

## Deployment Notes

For Vercel:

- Set the project root directory to `app`.
- Add `DATABASE_URL` and `SESSION_SECRET` in Vercel environment variables.
- Keep database migrations applied before using the deployed app.
