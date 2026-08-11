# Tailor Shop App

Next.js application for managing a tailoring shop.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Main Sections

- `Dashboard` - shop overview.
- `New Order` - create customer garment orders.
- `Orders Report` - order report and PDF download.
- `Stitching/Cutting` - assign cutter and tailor work.
- `Garment Cabinet` - manage cabinet storage for ready garments.
- `Garment Delivery` - deliver fully ready orders.
- `Fabric Inventory` - fabric stock and restocking.
- `Accounts` - workers, suppliers, and payable balances.
- `Ledger` and `Trial Balance` - accounting records.
- `Setting & Garment Configuration` - shop settings, garment types, measurements, and design options.

## Tailoring Flow

1. Create order and measurements in `New Order`.
2. Select shop fabric if used; stock is deducted automatically.
3. Assign cutter, then mark cutting complete.
4. Assign tailor, then mark tailoring complete.
5. Approve quality; garment is placed into cabinet.
6. Deliver ready order and collect balance.
7. Pay cutter/tailor from their account page.

## Notes

- Order numbers are generated as `001`, `002`, `003`, and so on.
- Worker balances are created when assigned work is completed.
- Cabinet storage is automatic after quality approval.
- PDFs are generated from `/api/tailor-orders/{id}/pdf`.
