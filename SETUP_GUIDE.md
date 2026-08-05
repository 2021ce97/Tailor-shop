# Clothes & Tailor Shop Management System — Setup Guide

## What's in this project

```
tailor-shop/
├── db/
│   ├── migrations/
│   │   ├── 001_shop_and_customers.sql
│   │   ├── 002_retail_inventory.sql
│   │   ├── 003_fabric_and_tailor_orders.sql
│   │   ├── 004_sales_and_accounts.sql
│   │   ├── 005_reporting_views.sql
│   │   ├── 006_branches.sql
│   │   ├── 007_purchase_orders_and_returns.sql
│   │   └── 008_branch_aware_views.sql
│   └── seeds/
│       └── initial_setup.sql
└── app/                      -- the Next.js application
```

Standalone project, own database, separate from Rayan Solutions (the
travel agency system). Supports multiple branches under one shop.

## 1. Prerequisites

- Node.js 20+
- PostgreSQL 14+

## 2. Create the database

```bash
createdb tailor_shop
```

## 3. Environment variables

In `app/.env.local`:

```
DATABASE_URL="postgres://postgres:yourpassword@localhost:5432/tailor_shop"
SESSION_SECRET="generate-a-long-random-string-here"
```

If you are connecting to Supabase/Postgres over TLS, make sure your `DATABASE_URL` includes `?sslmode=require` or use the Supabase connection string exactly as provided.

```bash
openssl rand -base64 48
```

For Vercel, add the same two environment variables to your project:

- `DATABASE_URL` = your Supabase/Postgres connection string
- `SESSION_SECRET` = a long random string used to sign session cookies

In the Vercel project settings, set the Root Directory to `app` if your repository is configured from the repo root. Do not keep `rootDirectory` in `vercel.json` because Vercel may reject it.

For this app, `NEXT_PUBLIC_APP_URL` is not required.

## 4. Run the migrations, in order

```bash
psql "$DATABASE_URL" -f db/migrations/001_shop_and_customers.sql
psql "$DATABASE_URL" -f db/migrations/002_retail_inventory.sql
psql "$DATABASE_URL" -f db/migrations/003_fabric_and_tailor_orders.sql
psql "$DATABASE_URL" -f db/migrations/004_sales_and_accounts.sql
psql "$DATABASE_URL" -f db/migrations/005_reporting_views.sql
psql "$DATABASE_URL" -f db/migrations/006_branches.sql
psql "$DATABASE_URL" -f db/migrations/007_purchase_orders_and_returns.sql
psql "$DATABASE_URL" -f db/migrations/008_branch_aware_views.sql
```

Migration 006 creates a "Main Branch" automatically (id 1) — every
other table's `branch_id` defaults to it, so existing setups don't
need any manual backfill.

## 5. Run the seed script

```bash
psql "$DATABASE_URL" -f db/seeds/initial_setup.sql
```

Sets your shop's name (edit the SQL file first, or update later via
Settings), creates default roles (owner, manager, cashier, tailor),
and installs the full chart of accounts.

## 6. Create your first login user

```bash
cd app
node -e "console.log(require('bcryptjs').hashSync('your-password-here', 10))"
```

```sql
INSERT INTO users (role_id, branch_id, name, email, password_hash, is_tailor_staff)
VALUES (
  (SELECT id FROM roles WHERE name = 'owner'),
  (SELECT id FROM branches WHERE is_main = true),
  'Your Name',
  'you@shop.com',
  '<paste the bcrypt hash here>',
  false
);
```

## 7. Install dependencies and run

```bash
cd app
npm install
npm run dev
```

Visit `http://localhost:3000` → redirects to `/login`.

## 8. Where everything is

- `/pos` — retail checkout; a "Print Receipt" link appears after each sale
- `/sale-returns` — look up a sale by number, pick what's coming back, process the refund (cash/bank/store credit); for an exchange, ring up the replacement separately and optionally link it
- `/purchase-orders`, `/purchase-orders/new`, `/purchase-orders/[id]` — owner/manager-only purchase orders; receive stock (partial receiving supported), record cash/bank supplier payments, and review payment history
- `/products`, `/products/[id]` — ready-made garments and their branch-specific size/color variants
- `/inventory` — low-stock alerts across retail variants and fabric
- `/tailor-orders/new`, `/tailor-orders`, `/tailor-orders/[id]` — custom orders and alterations; choose a customer's saved measurement profile when creating an order, with a "Download Invoice" link once created
- `/fabrics` — fabric stock, restocking
- `/appointments` — fittings, measurement sessions
- `/customers`, `/customers/[id]` — customer profiles, measurement profiles, order/purchase history with PDF links
- `/staff` — owner/manager-only staff management; add tailor/cutter staff for assignment on new tailor orders
- `/suppliers` — fabric and ready-made goods suppliers
- `/branches` — add branches (owner/manager only); switch your working branch from the header dropdown
- `/ledger`, `/trial-balance`, `/reports` — accounting and business reports
- `/settings` — shop name, contact info, currency, tax rate

## 9. How multi-branch works

Every user has a home branch (`users.branch_id`) and works in it by
default. Owners and managers can switch branches from a dropdown in
the header without logging out — everything they create afterward
(sales, orders, stock, appointments) is stamped with the branch they're
currently working in.

Retail and fabric stock are tracked **per branch**: the same product
can exist as separate variant rows in different branches, each with
its own SKU, price, and stock count. This keeps each branch's
inventory independent — no need to worry about one branch's sale
accidentally depleting another branch's shelf.

## 10. Printable invoices

Every sale and tailor order can be downloaded as a PDF:

```
/api/sales/{id}/pdf
/api/tailor-orders/{id}/pdf
```

Built with `pdf-lib` — no system dependencies, works the same way in
any deployment environment.

## What's built vs. what's next

**Built:** full retail POS with variant-level, per-branch stock
tracking; purchase order creation and receiving (partial receiving
supported, posts real accounting entries); sales returns and exchange
support with income/COGS reversal; complete tailoring pipeline with
fabric consumption and deferred revenue recognition; multi-branch
support with a branch switcher for managers/owners; printable PDF
invoices for both sales and tailor orders; a full double-entry
accounting engine behind every one of these; profit/loss, pipeline,
overdue-orders, staff-workload, and top-seller reports.

**Not yet built:** staff attendance/payroll, barcode scanner
integration at POS, self-serve shop signup (intentionally out of
scope for this single-owner installation), per-branch
report filtering beyond what's already in Dashboard/Tailor Orders
(Ledger/Trial Balance/Reports currently show figures across all
branches combined).
