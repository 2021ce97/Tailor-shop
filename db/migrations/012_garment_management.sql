BEGIN;

CREATE TABLE garment_types (
  id BIGSERIAL PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE,
  name_fa VARCHAR(120) NOT NULL, name_ps VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE garment_measurement_fields (
  id BIGSERIAL PRIMARY KEY, garment_type_id BIGINT NOT NULL REFERENCES garment_types(id) ON DELETE CASCADE,
  code VARCHAR(60) NOT NULL, label_fa VARCHAR(120) NOT NULL, label_ps VARCHAR(120) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'inch', is_required BOOLEAN NOT NULL DEFAULT false, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE garment_design_categories (
  id BIGSERIAL PRIMARY KEY, garment_type_id BIGINT NOT NULL REFERENCES garment_types(id) ON DELETE CASCADE,
  code VARCHAR(60) NOT NULL, label_fa VARCHAR(120) NOT NULL, label_ps VARCHAR(120) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE garment_design_options (
  id BIGSERIAL PRIMARY KEY, category_id BIGINT NOT NULL REFERENCES garment_design_categories(id) ON DELETE CASCADE,
  label_fa VARCHAR(120) NOT NULL, label_ps VARCHAR(120) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE business_contacts (
  id BIGSERIAL PRIMARY KEY, branch_id BIGINT NOT NULL REFERENCES branches(id) DEFAULT 1,
  contact_code VARCHAR(30) NOT NULL UNIQUE, name VARCHAR(200) NOT NULL, phone VARCHAR(50),
  roles JSONB NOT NULL DEFAULT '[]', status VARCHAR(20) NOT NULL DEFAULT 'active', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE tailor_order_items (
  id BIGSERIAL PRIMARY KEY, tailor_order_id BIGINT NOT NULL REFERENCES tailor_orders(id) ON DELETE CASCADE,
  garment_type_id BIGINT REFERENCES garment_types(id), garment_type_snapshot JSONB NOT NULL DEFAULT '{}',
  ticket_no VARCHAR(60) NOT NULL UNIQUE, measurement_snapshot JSONB NOT NULL DEFAULT '{}', design_snapshot JSONB NOT NULL DEFAULT '{}',
  current_stage VARCHAR(30) NOT NULL DEFAULT 'measurement', status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  item_amount NUMERIC(12,2) NOT NULL DEFAULT 0, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE storage_locations (
  id BIGSERIAL PRIMARY KEY, branch_id BIGINT NOT NULL REFERENCES branches(id) DEFAULT 1,
  code VARCHAR(20) NOT NULL, capacity_garments INTEGER NOT NULL DEFAULT 20, capacity_orders INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(branch_id, code)
);
CREATE TABLE garment_storage_assignments (
  id BIGSERIAL PRIMARY KEY, garment_item_id BIGINT NOT NULL REFERENCES tailor_order_items(id) ON DELETE CASCADE,
  storage_location_id BIGINT NOT NULL REFERENCES storage_locations(id), stored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ, stored_by BIGINT REFERENCES users(id)
);
CREATE TABLE worker_assignments (
  id BIGSERIAL PRIMARY KEY, garment_item_id BIGINT NOT NULL REFERENCES tailor_order_items(id) ON DELETE CASCADE,
  business_contact_id BIGINT NOT NULL REFERENCES business_contacts(id), work_type VARCHAR(20) NOT NULL,
  agreed_rate NUMERIC(12,2) NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ, notes TEXT
);
CREATE TABLE contact_account_entries (
  id BIGSERIAL PRIMARY KEY, business_contact_id BIGINT NOT NULL REFERENCES business_contacts(id) ON DELETE CASCADE,
  transaction_id BIGINT REFERENCES transactions(id), entry_type VARCHAR(40) NOT NULL,
  debit_amount NUMERIC(14,2) NOT NULL DEFAULT 0, credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO garment_types (code, name_fa, name_ps, sort_order) VALUES
('perahan_tunban','پیراهن‌وتنبان','پرتوګ‌کميس',1), ('wasakat','واسکت','واسکټ',2),
('coat','کوټ','کوټ',3), ('jacket','جاکت','جاکټ',4), ('pant','پتلون','پتلون',5),
('shirt','پیراهن','کميس',6), ('women_dress','لباس زنانه','د ښځو جامې',7),
('uniform','یونیفورم','یونیفورم',8), ('alteration','ترمیم','ترمیم',9);
INSERT INTO garment_measurement_fields (garment_type_id, code, label_fa, label_ps, unit, is_required, sort_order)
SELECT garment.id, field.code, field.label_fa, field.label_ps, 'inch', true, field.sort_order
FROM garment_types garment CROSS JOIN (VALUES
  ('height','قد','قد',1), ('shoulder','شانه','اوږه',2), ('chest','بخن','سینه',3),
  ('waist','کمر','ملا',4), ('sleeve','آستین','لستوڼی',5), ('length','قد لباس','د جامو اوږدوالی',6)
) AS field(code, label_fa, label_ps, sort_order);
INSERT INTO garment_design_categories (garment_type_id, code, label_fa, label_ps, is_required, sort_order)
SELECT garment.id, category.code, category.label_fa, category.label_ps, false, category.sort_order
FROM garment_types garment CROSS JOIN (VALUES
  ('collar','یخن','یخن',1), ('pocket','جیب','جیب',2), ('hem','دامن','لمن',3), ('sleeve_style','شکل آستین','د لستوڼي ډول',4)
) AS category(code, label_fa, label_ps, sort_order);
INSERT INTO garment_design_options (category_id, label_fa, label_ps, sort_order)
SELECT category.id, option.label_fa, option.label_ps, option.sort_order
FROM garment_design_categories category CROSS JOIN (VALUES
  ('ساده','ساده',1), ('کلاسیک','کلاسیک',2), ('دوخت خاص','ځانګړې ګنډنه',3)
) AS option(label_fa, label_ps, sort_order);
INSERT INTO storage_locations (branch_id, code, capacity_garments, capacity_orders)
SELECT 1, code, 20, 10 FROM unnest(ARRAY['A1','A2','A3','A4','A5','B1','B2','B3','B4','B5']) AS code;
UPDATE shop_settings SET currency = 'AFN' WHERE id = 1;

INSERT INTO tailor_order_items (tailor_order_id, ticket_no, garment_type_snapshot, current_stage, status, item_amount, notes)
SELECT id, order_no || '-1', jsonb_build_object('legacy', true, 'name', garment_type), current_stage, status, total_amount, style_notes
FROM tailor_orders
WHERE NOT EXISTS (SELECT 1 FROM tailor_order_items item WHERE item.tailor_order_id = tailor_orders.id);

COMMIT;
