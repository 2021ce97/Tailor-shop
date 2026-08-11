# Tailor Shop Project Overview

This project is a tailoring shop management system built with Next.js, PostgreSQL, Drizzle ORM, and server actions.

The app is focused on the full clothes-making workflow: taking customer orders, consuming shop fabric, assigning cutter and tailor work, tracking worker balances, storing ready garments in cabinets, delivering completed orders, and keeping accounting records.

## Main Workflow

1. Create the order in `New Order`.
   - Select an existing customer or create a new one.
   - Add garment measurements and design choices.
   - Select fabric from shop inventory when the shop provides fabric.
   - Enter the quantity of fabric used.
   - The order number is generated as `001`, `002`, `003`, and so on.

2. Review orders in `Orders Report`.
   - All created orders appear in reports.
   - The PDF option generates a formatted order PDF with customer, garment, fabric, measurements, payment, and balance details.

3. Assign cutting work in `Stitching/Cutting`.
   - Assign a cutter and agreed rate.
   - When the cutter completes the work, the order moves forward and the cutter balance appears in `Accounts`.

4. Assign tailoring work.
   - Assign a tailor and agreed rate.
   - When the tailor completes the work, the order moves to quality check and the tailor balance appears in `Accounts`.

5. Approve quality.
   - After quality approval, the garment becomes ready.
   - Ready garments are automatically placed in an available cabinet.

6. Manage cabinets in `Garment Cabinet`.
   - Add a cabinet with name and capacity.
   - Remove a cabinet only when it is empty.
   - Use `Sync ready garments` to place old ready garments into cabinet storage.

7. Deliver orders in `Garment Delivery`.
   - Only orders where all garments are ready appear for delivery.
   - Collect the remaining balance if needed.
   - Delivering the order clears the garment from cabinet storage and posts accounting entries.

8. Pay workers in `Accounts`.
   - Cutter and tailor payable balances are shown per worker/contact.
   - Open a worker account to record cash or bank payment.

## Settings And Garment Configuration

The sidebar uses `Setting & Garment Configuration`.

This section contains:

- Shop settings: shop name, contact details, currency, tax, and logo.
- Garment types: examples are shirt, pant, waistcoat, coat.
- Measurement fields: examples are chest, shoulder, sleeve, length.
- Design categories and options: examples are collar type, cuff style, pocket style.

### Purpose Of Code

The code is the internal system key for a garment type, measurement field, or design category.

Use short stable English-style codes, for example:

- `shirt`
- `pant`
- `chest`
- `sleeve`
- `collar_style`

The displayed Dari/Pashto names can change, but codes should stay stable because saved orders use them in stored measurements and design snapshots.

## Fabric Inventory Connection

Fabric inventory is connected to new orders.

When shop fabric is selected in a new order and a quantity is entered:

- The app checks that enough fabric is available.
- The used quantity is deducted from fabric stock.
- A fabric movement record is created for audit/history.

If the customer brings their own fabric, leave the fabric selection empty and no shop stock is deducted.

## Mobile Support

The dashboard layout is mobile friendly:

- Desktop sidebar hides on small screens.
- A mobile menu appears in the header.
- Tables scroll horizontally instead of squeezing text.
- Main forms and settings panels fit small screens.

## Important Project Folders

- `app/` - Next.js application.
- `app/app/` - routes, pages, and server actions.
- `app/lib/db/` - database schema definitions.
- `app/lib/accounting/` - accounting helpers for order creation and delivery.
- `app/lib/pdf/` - PDF invoice/order generation.
- `db/migrations/` - database migrations.
- `db/seeds/` - initial setup data.

## Verification

The latest feature work was verified with:

```bash
cd app
npm run build
```

The build passes. There are non-blocking Turbopack warnings related to workspace-root detection and PDF file tracing.
