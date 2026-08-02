-- =====================================================================
-- Migration 003: Fabric Inventory & Tailoring Orders
-- =====================================================================

BEGIN;

-- Fabric/accessories are consumed by tailoring orders, unlike retail
-- variants which are sold as whole units. Tracked by continuous
-- quantity (meters/yards/pieces) rather than integer stock counts.
CREATE TABLE fabrics (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    fabric_type     VARCHAR(50),   -- cotton, linen, silk, wool, blend
    color           VARCHAR(50),
    pattern         VARCHAR(50),
    unit            VARCHAR(10) NOT NULL DEFAULT 'meter', -- meter, yard, piece
    stock_qty       NUMERIC(10,2) NOT NULL DEFAULT 0,
    reorder_level   NUMERIC(10,2) NOT NULL DEFAULT 10,
    cost_per_unit   NUMERIC(12,2) NOT NULL DEFAULT 0,
    selling_price_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
    supplier_id     BIGINT REFERENCES suppliers(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fabric_movements (
    id              BIGSERIAL PRIMARY KEY,
    fabric_id       BIGINT NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
    movement_type   VARCHAR(30) NOT NULL, -- purchase_in, order_consumed, adjustment, damage_out
    quantity        NUMERIC(10,2) NOT NULL, -- positive = in, negative = out
    reference_type  VARCHAR(30),           -- 'tailor_order', 'purchase_order', 'manual'
    reference_id    BIGINT,
    notes           TEXT,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tailoring orders — the core of the custom side of the business.
-- Covers both brand-new made-to-measure garments and alterations
-- (order_kind distinguishes them; alterations skip most stages).
-- ---------------------------------------------------------------------

CREATE TABLE tailor_orders (
    id                      BIGSERIAL PRIMARY KEY,
    order_no                VARCHAR(50) NOT NULL UNIQUE,
    order_kind              VARCHAR(20) NOT NULL DEFAULT 'custom', -- custom, alteration
    customer_id             BIGINT NOT NULL REFERENCES customers(id),
    measurement_profile_id  BIGINT REFERENCES measurement_profiles(id),
    garment_type            VARCHAR(50) NOT NULL, -- shirt, pant, suit, kurta, dress, coat, other
    fabric_id               BIGINT REFERENCES fabrics(id),
    fabric_source           VARCHAR(20) NOT NULL DEFAULT 'shop', -- shop, customer_provided
    fabric_qty_used         NUMERIC(10,2),
    style_notes             TEXT,
    assigned_tailor_id      BIGINT REFERENCES users(id),
    assigned_cutter_id      BIGINT REFERENCES users(id),

    order_date              DATE NOT NULL,
    promised_date            DATE,
    delivered_date            DATE,

    -- current_stage mirrors the latest row in tailor_order_stages for
    -- fast filtering/display; the stage history table is the source of
    -- truth for the full timeline.
    current_stage            VARCHAR(30) NOT NULL DEFAULT 'measurement',
        -- measurement, fabric_selected, cutting, stitching, fitting, finishing, ready, delivered, cancelled

    stitching_charge         NUMERIC(12,2) NOT NULL DEFAULT 0,
    fabric_charge             NUMERIC(12,2) NOT NULL DEFAULT 0,
    other_charges              NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount                    NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount                NUMERIC(12,2) NOT NULL DEFAULT 0,
    advance_paid                  NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance_due                    NUMERIC(12,2) NOT NULL DEFAULT 0,

    status                   VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress, ready, delivered, cancelled
    notes                    TEXT,
    created_by                BIGINT REFERENCES users(id),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Full audit trail of every stage transition, with who moved it and
-- when — this is what powers the "visual pipeline" / real-time status
-- that customers and staff both rely on.
CREATE TABLE tailor_order_stages (
    id              BIGSERIAL PRIMARY KEY,
    tailor_order_id BIGINT NOT NULL REFERENCES tailor_orders(id) ON DELETE CASCADE,
    stage           VARCHAR(30) NOT NULL,
    notes           TEXT,
    changed_by      BIGINT REFERENCES users(id),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Appointments (fittings, measurement sessions, consultations)
-- ---------------------------------------------------------------------

CREATE TABLE appointments (
    id               BIGSERIAL PRIMARY KEY,
    customer_id      BIGINT NOT NULL REFERENCES customers(id),
    tailor_order_id  BIGINT REFERENCES tailor_orders(id),
    appointment_type VARCHAR(30) NOT NULL DEFAULT 'fitting', -- measurement, fitting, consultation
    scheduled_at     TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    assigned_to      BIGINT REFERENCES users(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX idx_fabric_movements_fabric ON fabric_movements(fabric_id);
CREATE INDEX idx_tailor_orders_customer ON tailor_orders(customer_id);
CREATE INDEX idx_tailor_orders_stage ON tailor_orders(current_stage);
CREATE INDEX idx_tailor_orders_status ON tailor_orders(status);
CREATE INDEX idx_tailor_order_stages_order ON tailor_order_stages(tailor_order_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);

COMMIT;
