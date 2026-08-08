-- Restore the minimal auth/location tables required by the deployed app.
-- Safe to run after the earlier tailoring cleanup migration.

BEGIN;

CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    is_main BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO roles (name, description, permissions)
VALUES ('owner', 'Single shop owner', '{"*": true}')
ON CONFLICT (name) DO NOTHING;

INSERT INTO branches (name, is_main, status)
SELECT 'Main Shop', true, 'active'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE is_main = true);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES roles(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone VARCHAR(50),
    is_tailor_staff BOOLEAN NOT NULL DEFAULT false,
    daily_wage NUMERIC(12,2),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
