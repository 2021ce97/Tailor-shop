-- =====================================================================
-- Migration 007: Purchase Order Receiving & Sales Returns
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Purchase orders: add branch, allow fabric lines (not just retail
-- variants), and track what's actually been received vs. ordered so
-- partial receiving is possible.
-- ---------------------------------------------------------------------

ALTER TABLE purchase_orders ADD COLUMN branch_id BIGINT REFERENCES branches(id) DEFAULT 1;
UPDATE purchase_orders SET branch_id = 1 WHERE branch_id IS NULL;
ALTER TABLE purchase_orders ALTER COLUMN branch_id SET NOT NULL;
CREATE INDEX idx_po_branch ON purchase_orders(branch_id);

ALTER TABLE purchase_order_items ADD COLUMN fabric_id BIGINT REFERENCES fabrics(id);
ALTER TABLE purchase_order_items ADD COLUMN received_qty NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE purchase_order_items ADD CONSTRAINT chk_po_item_target
    CHECK (variant_id IS NOT NULL OR fabric_id IS NOT NULL OR description IS NOT NULL);

-- ---------------------------------------------------------------------
-- Sales returns / exchanges
-- ---------------------------------------------------------------------

CREATE TABLE sale_returns (
    id              BIGSERIAL PRIMARY KEY,
    return_no       VARCHAR(50) NOT NULL UNIQUE,
    sale_id         BIGINT NOT NULL REFERENCES sales(id),
    branch_id       BIGINT NOT NULL REFERENCES branches(id) DEFAULT 1,
    return_date     DATE NOT NULL,
    reason          TEXT,
    refund_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
    refund_method   VARCHAR(30),
    new_sale_id     BIGINT REFERENCES sales(id),
    processed_by    BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sale_return_items (
    id              BIGSERIAL PRIMARY KEY,
    sale_return_id  BIGINT NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    sale_item_id    BIGINT NOT NULL REFERENCES sale_items(id),
    quantity        INT NOT NULL,
    unit_price      NUMERIC(12,2) NOT NULL,
    line_total      NUMERIC(14,2) NOT NULL
);

CREATE INDEX idx_sale_returns_sale ON sale_returns(sale_id);
CREATE INDEX idx_sale_returns_branch ON sale_returns(branch_id);
CREATE INDEX idx_sale_return_items_return ON sale_return_items(sale_return_id);

COMMIT;
