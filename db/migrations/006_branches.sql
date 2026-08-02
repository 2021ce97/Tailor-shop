-- =====================================================================
-- Migration 006: Multi-Branch Support
-- =====================================================================
-- Adds a `branches` table and a branch_id column to every table where
-- "which branch did this happen at" matters: staff, stock, sales,
-- tailor orders, accounting, purchasing, and appointments.
--
-- Design choice: stock (product_variants, fabrics) is tracked
-- per-branch by giving each branch its own variant/fabric rows rather
-- than a shared catalog with a separate per-branch stock table. This
-- is simpler to reason about and query, at the cost of duplicating a
-- product's definition (name, price) across branches if the same item
-- is stocked in more than one place. Fine for a small number of
-- branches; revisit with a shared-catalog + per-branch-stock model if
-- the shop grows into many branches carrying identical catalogs.
--
-- A single default branch ("Main Branch") is created here and used as
-- the default for every existing/new row, so this migration is safe
-- to run against a database that already has data in it.
-- =====================================================================

BEGIN;

CREATE TABLE branches (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    address         TEXT,
    phone           VARCHAR(50),
    is_main         BOOLEAN NOT NULL DEFAULT false,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO branches (name, is_main, status) VALUES ('Main Branch', true, 'active');
-- This is the only row inserted here, so its id is deterministically 1
-- (fresh sequence on a fresh table) — used as the default below.

ALTER TABLE users             ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
ALTER TABLE product_variants  ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
ALTER TABLE fabrics           ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
ALTER TABLE sales             ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
ALTER TABLE tailor_orders     ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
ALTER TABLE transactions      ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
ALTER TABLE expenses          ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
ALTER TABLE appointments      ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
ALTER TABLE stock_movements   ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
ALTER TABLE fabric_movements  ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;

-- Backfill existing rows (the DEFAULT above only applies to new rows
-- in some Postgres versions' historical behavior with ADD COLUMN; this
-- UPDATE guarantees every existing row is explicitly set regardless).
UPDATE users            SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE product_variants SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE fabrics           SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE sales             SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE tailor_orders     SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE transactions      SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE expenses          SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE appointments      SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE stock_movements   SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE fabric_movements  SET branch_id = 1 WHERE branch_id IS NULL;

ALTER TABLE users             ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE product_variants  ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE fabrics           ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE sales             ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE tailor_orders     ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE transactions      ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE expenses          ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE appointments      ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE stock_movements   ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE fabric_movements  ALTER COLUMN branch_id SET NOT NULL;

-- SKU/barcode were globally unique; now that variants are per-branch
-- rows, uniqueness should scope to the branch instead — two branches
-- may reasonably want to reuse the same SKU pattern independently.
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_sku_key;
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_barcode_key;
ALTER TABLE product_variants ADD CONSTRAINT uq_variant_branch_sku UNIQUE (branch_id, sku);
ALTER TABLE product_variants ADD CONSTRAINT uq_variant_branch_barcode UNIQUE (branch_id, barcode);

CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_variants_branch ON product_variants(branch_id);
CREATE INDEX idx_fabrics_branch ON fabrics(branch_id);
CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_tailor_orders_branch ON tailor_orders(branch_id);
CREATE INDEX idx_transactions_branch ON transactions(branch_id);
CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_appointments_branch ON appointments(branch_id);

COMMIT;
