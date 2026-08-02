-- =====================================================================
-- Migration 002: Retail Inventory (ready-made garments)
-- =====================================================================
-- A product is the general item (e.g. "Men's Formal Shirt"); a
-- product_variant is the sellable unit (size + color combination),
-- each with its own SKU and stock count. This is the standard apparel
-- pattern — selling and stocking always happens at the variant level.
-- =====================================================================

BEGIN;

CREATE TABLE categories (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL UNIQUE,
    parent_id       BIGINT REFERENCES categories(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    category_id     BIGINT REFERENCES categories(id),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    brand           VARCHAR(100),
    gender          VARCHAR(20),  -- men, women, kids, unisex
    base_price      NUMERIC(12,2) NOT NULL DEFAULT 0, -- default selling price, can be overridden per variant
    cost_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
    image_url       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, discontinued
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_variants (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku             VARCHAR(60) NOT NULL UNIQUE,
    size            VARCHAR(20),   -- S, M, L, XL, 32, 34, etc.
    color           VARCHAR(50),
    barcode         VARCHAR(60) UNIQUE,
    price           NUMERIC(12,2), -- overrides products.base_price when set
    cost_price      NUMERIC(12,2),
    stock_qty       INT NOT NULL DEFAULT 0,
    reorder_level   INT NOT NULL DEFAULT 5, -- low-stock alert threshold
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every stock change (purchase received, sale, adjustment, return,
-- fabric consumed by a tailor order) is logged here so stock_qty on
-- the variant is always explainable and auditable, not just a number
-- that silently drifts.
CREATE TABLE stock_movements (
    id              BIGSERIAL PRIMARY KEY,
    variant_id      BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    movement_type   VARCHAR(30) NOT NULL, -- purchase_in, sale_out, return_in, adjustment, damage_out
    quantity        INT NOT NULL,          -- positive = stock increased, negative = decreased
    reference_type  VARCHAR(30),           -- 'sale', 'purchase_order', 'manual'
    reference_id    BIGINT,
    notes           TEXT,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Purchasing (restocking from suppliers)
-- ---------------------------------------------------------------------

CREATE TABLE purchase_orders (
    id              BIGSERIAL PRIMARY KEY,
    po_no           VARCHAR(50) NOT NULL UNIQUE,
    supplier_id     BIGINT NOT NULL REFERENCES suppliers(id),
    order_date      DATE NOT NULL,
    expected_date   DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, ordered, received, cancelled
    total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_items (
    id                  BIGSERIAL PRIMARY KEY,
    purchase_order_id   BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    variant_id          BIGINT REFERENCES product_variants(id), -- null when receiving raw fabric, see 003
    description         VARCHAR(200),
    quantity            NUMERIC(12,2) NOT NULL,
    unit_cost           NUMERIC(12,2) NOT NULL,
    line_total          NUMERIC(14,2) NOT NULL
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_barcode ON product_variants(barcode);
CREATE INDEX idx_stock_movements_variant ON stock_movements(variant_id);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);

COMMIT;
