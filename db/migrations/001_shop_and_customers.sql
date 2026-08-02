-- =====================================================================
-- Clothes & Tailor Shop Management System
-- Migration 001: Shop settings, auth, customers, measurement profiles
-- =====================================================================
-- Single-shop system (not multi-tenant): one row in shop_settings holds
-- the shop's own identity. Kept as a table (not hardcoded) so branding,
-- currency, and address can change without a migration.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE shop_settings (
    id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
    shop_name       VARCHAR(200) NOT NULL,
    address         TEXT,
    phone           VARCHAR(50),
    email           VARCHAR(200),
    logo_url        TEXT,
    currency        VARCHAR(10) NOT NULL DEFAULT 'PKR',
    tax_percent     NUMERIC(5,2) NOT NULL DEFAULT 0,
    invoice_prefix  VARCHAR(20) NOT NULL DEFAULT 'INV',
    order_prefix    VARCHAR(20) NOT NULL DEFAULT 'ORD',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Auth & staff
-- ---------------------------------------------------------------------

CREATE TABLE roles (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,  -- owner, manager, cashier, tailor, cutter
    description     TEXT,
    permissions     JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    role_id         BIGINT NOT NULL REFERENCES roles(id),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(200) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    phone           VARCHAR(50),
    -- Staff who actually perform tailoring work (cutter/tailor/finisher)
    -- get assigned to order stages; not every user needs this.
    is_tailor_staff BOOLEAN NOT NULL DEFAULT false,
    daily_wage      NUMERIC(12,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Customers & measurement profiles
-- ---------------------------------------------------------------------

CREATE TABLE customers (
    id              BIGSERIAL PRIMARY KEY,
    customer_code   VARCHAR(30) UNIQUE,
    name            VARCHAR(200) NOT NULL,
    phone           VARCHAR(50),
    email           VARCHAR(200),
    address         TEXT,
    notes           TEXT,
    loyalty_points  INT NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A customer can have several measurement profiles (shirt, pant, suit,
-- kids' wear...). Measurements themselves vary a lot by garment type
-- and by shop convention, so they're stored as flexible JSONB rather
-- than one fixed column per measurement — a shop can measure chest,
-- waist, shoulder, sleeve, etc. without a schema change every time a
-- new field is needed. The `label` distinguishes multiple profiles of
-- the same garment_type (e.g. "Formal shirt" vs "Casual shirt").
CREATE TABLE measurement_profiles (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    garment_type    VARCHAR(50) NOT NULL,  -- shirt, pant, suit, kurta, dress, coat, other
    label           VARCHAR(100),
    measurements    JSONB NOT NULL DEFAULT '{}', -- e.g. {"chest": 40, "waist": 34, "shoulder": 18, "sleeve": 24, "unit": "in"}
    notes           TEXT,
    taken_by        BIGINT REFERENCES users(id),
    taken_at        DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Suppliers (fabric wholesalers, ready-made garment suppliers)
-- ---------------------------------------------------------------------

CREATE TABLE suppliers (
    id              BIGSERIAL PRIMARY KEY,
    supplier_code   VARCHAR(30) UNIQUE,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(50), -- fabric, ready_made, accessories, other
    phone           VARCHAR(50),
    email           VARCHAR(200),
    address         TEXT,
    opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_measurement_profiles_customer ON measurement_profiles(customer_id);
CREATE INDEX idx_users_role ON users(role_id);

COMMIT;
