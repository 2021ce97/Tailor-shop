-- =====================================================================
-- Initial setup seed — run once after migrations, before first use.
-- Single-shop system, so this isn't per-tenant like the travel agency
-- seed — it sets up the one shop_settings row, default roles, and the
-- standard chart of accounts every posting path depends on.
-- =====================================================================

-- 1. Shop settings (edit the values below before running, or update
--    later via the Settings page once the app is running).
INSERT INTO shop_settings (id, shop_name, currency)
VALUES (1, 'My Clothing & Tailor Shop', 'PKR')
ON CONFLICT (id) DO NOTHING;

-- 2. Default roles
INSERT INTO roles (name, description, permissions) VALUES
('owner',   'Full access to everything',              '{"*": true}'),
('manager', 'Manage staff, inventory, orders, reports','{"orders.*": true, "inventory.*": true, "reports.*": true, "staff.manage": true}'),
('cashier', 'POS sales and customer lookup',            '{"sales.create": true, "customers.view": true}'),
('tailor',  'View and update assigned tailor orders',   '{"orders.view_assigned": true, "orders.update_stage": true}')
ON CONFLICT (name) DO NOTHING;

-- 3. Chart of accounts
-- (account_code convention: 1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx income, 5xxx expense)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, balance_type, is_system) VALUES
('1000', 'Cash in Hand',              'asset',     'debit',  true),
('1010', 'Bank Account',              'asset',     'debit',  true),
('1100', 'Accounts Receivable',       'asset',     'debit',  true),
('1200', 'Retail Inventory',          'asset',     'debit',  true),
('1210', 'Fabric Inventory',          'asset',     'debit',  true),
('2000', 'Accounts Payable',          'liability', 'credit', true),
('2100', 'Customer Advances',         'liability', 'credit', true), -- tailor order deposits not yet earned
('3000', 'Owner''s Equity',           'equity',    'credit', true),
('4000', 'Retail Sales Income',       'income',    'credit', true),
('4010', 'Tailoring Income',          'income',    'credit', true),
('4020', 'Alteration Income',         'income',    'credit', true),
('5000', 'Cost of Goods Sold (Retail)', 'expense', 'debit',  true),
('5010', 'Fabric & Materials Cost',   'expense',   'debit',  true),
('5100', 'Staff Wages',               'expense',   'debit',  true),
('5200', 'Rent',                      'expense',   'debit',  true),
('5300', 'Utilities',                 'expense',   'debit',  true),
('5900', 'Other Expenses',            'expense',   'debit',  true)
ON CONFLICT (account_code) DO NOTHING;
