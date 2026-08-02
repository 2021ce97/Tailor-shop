# Clothes & Tailor Shop Management System — Project Overview

## What this is

A management system for a shop that does two things at once: sells
ready-made clothing off the shelf, and takes custom tailoring and
alteration orders. It's a separate project from Rayan Solutions (the
travel agency system) — its own codebase, its own database, built for
a single shop rather than multiple tenants.

Built on the same technical foundation as Rayan Solutions (Next.js,
PostgreSQL, Drizzle ORM) but reshaped around a completely different
business: instead of vouchers and accounting entries for travel
bookings, this system tracks garments, fabric, measurements, and a
tailoring production pipeline.

---

## The two sides of the business

### 1. Retail — selling ready-made clothes

A customer walks in, picks a shirt off the rack, pays, and leaves.
The system handles this through:

- **Products & variants.** A "product" is the general item — say,
  "Men's Formal Shirt." Each size/color combination of that shirt
  (Medium/Blue, Large/White, etc.) is a **variant** with its own SKU,
  barcode, price, and stock count. This is the standard way clothing
  inventory works everywhere — you never sell "the shirt," you sell
  "the Medium Blue shirt."
- **Point of Sale (POS).** A cashier searches for an item by name or
  SKU, adds it to a cart, adjusts quantity, applies a discount or tax,
  and completes the sale. Stock is deducted the instant the sale
  completes.
- **Stock tracking.** Every single stock change — a sale, a
  restock, a manual adjustment — is logged individually, so at any
  point you can see exactly why a variant's stock count is what it is,
  not just trust a number that might have quietly drifted.
- **Low-stock alerts.** Anything at or below its reorder level shows
  up on the Inventory page automatically.

### 2. Tailoring — custom garments and alterations

A customer wants a suit made from scratch, or an existing garment
taken in. This is a longer process with real stages:

**Measurement → Fabric Selection → Cutting → Stitching → Fitting →
Finishing → Ready for Pickup → Delivered**

- **Measurement profiles.** Each customer can have multiple saved
  measurement profiles (a shirt profile, a suit profile, etc.).
  Measurements are stored flexibly — chest, waist, shoulder, sleeve,
  or whatever fields a particular garment type needs — so the shop
  isn't locked into one rigid measurement form. Once saved, a
  profile can be reused for future orders instead of re-measuring
  every time.
- **The order pipeline.** Every tailor order moves through the
  stages above, one at a time, and every stage change is timestamped
  and logged — so you always have a full history of who moved the
  order forward and when, not just its current state.
- **Fabric inventory.** Fabric is tracked by continuous quantity
  (meters or yards), not whole units like retail stock. When an
  order uses shop fabric, the quantity is deducted the moment the
  order is created — the cloth is physically cut then, even if the
  money for it isn't "earned" in the books until later (see below).
- **Alterations** use the same order system as custom garments but
  are flagged as a lighter-weight order kind, since they typically
  skip most of the pipeline stages.
- **Appointments** for fittings, measurement sessions, or
  consultations, linked to a customer and optionally to a specific
  order.

---

## The accounting behind both sides

Both sides of the business post into one shared, real double-entry
accounting system — the same proven approach used in the travel
agency project. Every sale and every order automatically creates
balanced debit/credit entries; nothing is ever half-posted, and the
books can't silently drift out of balance.

The two sides post very differently, on purpose:

**Retail sales are simple and immediate.** The moment a sale
completes, the system posts the full picture at once: cash in, sales
income earned, and the cost of the goods sold moved out of inventory
— all in one transaction, because a retail sale really is complete
the instant it happens.

**Tailor orders are deferred — and this is the more interesting
design decision in the whole system.** When a customer places a
custom order and pays an advance, that advance is *not* counted as
income yet. It's booked as a **liability** (an obligation — you've
taken money but haven't delivered the garment). Only when the order
is actually marked **delivered** does the system recognize the
income, and the fabric cost is expensed at that same moment. This
matches how the business actually works: you haven't really earned
that money, or used up that fabric's value, until the customer has
the finished garment in hand. Getting this right matters — it's the
difference between a profit and loss report that reflects reality and
one that's quietly wrong every month there are unfinished orders on
the books.

From these postings, the system produces:
- A full **ledger** — every debit and credit line, in order
- A **trial balance** — every account's running balance, with a
  live check confirming the books are actually balanced
- A **profit & loss report** — real income and expenses, split out
  by retail vs. tailoring vs. alterations

---

## Reports built in

Beyond the core accounting reports, the system includes:

- **Order pipeline snapshot** — how many orders sit in each stage
  right now, and how much money is still owed across them
- **Overdue orders** — anything past its promised delivery date
- **Staff workload** — how many active orders each tailor is
  currently assigned
- **Top-selling products** — units sold, revenue, and gross profit
  per product, so you can see what's actually moving
- **Low-stock alerts** — across both retail variants and fabric, in
  one list

---

## Restocking, returns, and multiple branches

**Purchase orders** cover restocking from suppliers — for either
retail products or fabric, mixed in the same order if that's how the
shop actually buys. Creating a purchase order doesn't touch stock or
the books at all; it's just a record of what's on its way. Only when
you **receive** it does stock go up and the accounting entry post —
and receiving supports partial deliveries, so if half a shipment
arrives today and the rest next week, both get recorded accurately
against the same order.

**Returns and exchanges** work by looking up the original sale by its
sale number, choosing which items and quantities are coming back, and
processing a refund — cash, bank, or store credit. This properly
reverses both sides of the original sale: the income is taken back
out of the books, the item's cost is moved back into inventory, and
the stock count goes back up. An exchange is just a return followed by
a fresh sale for whatever the customer's taking instead; the two can
optionally be linked for record-keeping, but each posts its own
correct, independent accounting.

**Multiple branches** are supported if the shop grows beyond one
location. Every branch keeps its own stock — the same product can
exist as separate rows in different branches, each with its own SKU
and count, so one branch's sale never touches another branch's shelf.
Staff work in whichever branch they're assigned to; owners and
managers can switch their working branch from a dropdown in the
header without logging out, which is handy for anyone who splits time
across locations.

**Every sale and tailor order can be printed or downloaded as a PDF**
— a proper invoice with the shop's letterhead, the customer's details,
an itemized breakdown, and the total (plus balance due, for a tailor
order that isn't fully paid yet).

## Customers sit at the center of both sides

A customer's profile page shows their measurement profiles, their
tailor order history, *and* their retail purchase history — one place
to see everything about someone who might come in occasionally for a
shirt and other times for a full custom suit.

---

## Staff & access

Every user has a role — owner, manager, cashier, or tailor — with
its own set of permissions. Staff who actually do tailoring work
(cutting, stitching) are flagged separately so they can be assigned
to orders and show up in the workload report; a cashier who never
touches a needle doesn't clutter that list.

---

## How a typical day would actually flow through the system

1. A walk-in customer buys a shirt → cashier rings it up at **POS** →
   stock drops, sale is posted, income recognized instantly.
2. A regular customer comes in for a custom suit → staff pull up
   their saved measurement profile (or take new measurements) →
   create a new **tailor order**, selecting fabric from stock,
   entering the stitching charge, and collecting an advance.
3. Over the following days, staff move the order through
   **cutting → stitching → fitting → finishing → ready** as work
   progresses, each step logged with a timestamp.
4. The customer returns, pays the remaining balance, and the order is
   marked **delivered** — this is the moment the sale actually lands
   in the books as income, and the fabric cost is expensed.
5. At any point, the owner checks **Reports** to see the day's
   retail sales, how many orders are overdue, and the shop's real
   profit and loss.

---

## What's built

| Area | What's included |
|---|---|
| **Retail** | Products, size/color variants (per branch), barcode-ready SKUs, stock movement audit trail, POS checkout, low-stock alerts, printable receipts |
| **Purchasing** | Purchase orders covering both retail variants and fabric in one order, with partial receiving — creating a PO doesn't touch stock; receiving it does, and posts the accounting entry |
| **Returns** | Look up any sale by number, select what's coming back, refund via cash/bank/store credit — reverses both income and cost, restocks the item; exchanges are a return plus a fresh sale, optionally linked |
| **Tailoring** | Measurement profiles (flexible per garment type), full order pipeline with stage history, fabric inventory and consumption, alterations, appointments, printable invoices |
| **Accounting** | Full chart of accounts, double-entry engine with balance-or-throw guards, deferred revenue recognition for tailor orders, ledger, trial balance, profit & loss |
| **Multi-branch** | Every branch has its own stock, sales, and orders; staff work in their assigned branch, owners/managers can switch branches from the header |
| **People** | Customers (with combined measurement + order + purchase history), suppliers, staff with roles and tailor-specific flags |
| **Reports** | P&L, order pipeline, overdue orders, staff workload, top-selling products, low stock |
| **System** | Login/session auth, shop settings (name, currency, tax rate) |

## What's not built yet

- **Paying suppliers** — receiving a purchase order posts what the
  shop owes to Accounts Payable, but there's no screen yet to record
  actually paying that down
- **Staff attendance/payroll** — daily wage is stored per staff
  member, but there's no attendance tracking or payroll run
- **Barcode scanner integration** — barcodes are stored on variants,
  but POS currently searches by typed name/SKU rather than a scanner
  input
- **Self-serve shop signup** — this is installed and configured by
  the shop owner directly (via the seed script and a manually created
  first user), not a multi-tenant SaaS with its own signup flow
- **Cross-branch report filtering** — Dashboard and the Tailor Orders
  list are scoped to your current working branch, but Ledger, Trial
  Balance, and Reports currently show figures combined across every
  branch (the underlying data does carry a branch_id on every row, so
  branch-specific filtering there is a straightforward follow-up)

---

## Getting it running

See `SETUP_GUIDE.md` in the project zip for exact steps: creating the
database, running the 5 migrations, seeding the chart of accounts and
default roles, creating your first login, and starting the app.
