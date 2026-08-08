-- Reusable measurement categories for each garment type.
BEGIN;

CREATE TABLE IF NOT EXISTS measurement_templates (
    id BIGSERIAL PRIMARY KEY,
    garment_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (garment_type, name)
);

INSERT INTO measurement_templates (garment_type, name, fields) VALUES
('shirt', 'Standard Shirt', '["chest","waist","shoulder","sleeve_length","collar","shirt_length"]'),
('pant', 'Standard Pant', '["waist","hip","inseam","outseam","thigh","bottom"]'),
('kurta', 'Standard Kurta', '["chest","shoulder","sleeve_length","kurta_length"]')
ON CONFLICT (garment_type, name) DO NOTHING;

COMMIT;
