-- =====================================================================
-- Migration 005: Reporting Views
-- =====================================================================

BEGIN;

CREATE VIEW ledger_view AS
SELECT
    tl.account_id,
    coa.account_name,
    t.id AS transaction_id,
    t.txn_no,
    t.txn_type,
    t.txn_date,
    tl.description,
    tl.debit_amount,
    tl.credit_amount,
    (tl.debit_amount - tl.credit_amount) AS net_amount
FROM transaction_lines tl
JOIN transactions t ON t.id = tl.transaction_id
JOIN chart_of_accounts coa ON coa.id = tl.account_id
WHERE t.status = 'posted';

CREATE VIEW trial_balance_view AS
SELECT
    tl.account_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    SUM(tl.debit_amount) AS total_debit,
    SUM(tl.credit_amount) AS total_credit,
    SUM(tl.debit_amount) - SUM(tl.credit_amount) AS balance
FROM transaction_lines tl
JOIN transactions t ON t.id = tl.transaction_id
JOIN chart_of_accounts coa ON coa.id = tl.account_id
WHERE t.status = 'posted'
GROUP BY tl.account_id, coa.account_code, coa.account_name, coa.account_type;

CREATE VIEW profit_loss_view AS
SELECT
    coa.account_type,
    coa.account_name,
    SUM(tl.credit_amount) - SUM(tl.debit_amount) AS net_amount
FROM transaction_lines tl
JOIN transactions t ON t.id = tl.transaction_id
JOIN chart_of_accounts coa ON coa.id = tl.account_id
WHERE t.status = 'posted' AND coa.account_type IN ('income', 'expense')
GROUP BY coa.account_type, coa.account_name;

-- Retail: best/worst selling variants
CREATE VIEW product_sales_view AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    pv.id AS variant_id,
    pv.sku,
    pv.size,
    pv.color,
    SUM(si.quantity - si.returned_qty) AS units_sold,
    SUM((si.quantity - si.returned_qty) * si.unit_price) AS revenue,
    SUM((si.quantity - si.returned_qty) * (si.unit_price - si.unit_cost)) AS gross_profit
FROM sale_items si
JOIN sales s ON s.id = si.sale_id AND s.status = 'completed'
JOIN product_variants pv ON pv.id = si.variant_id
JOIN products p ON p.id = pv.product_id
GROUP BY p.id, p.name, pv.id, pv.sku, pv.size, pv.color;

-- Low stock alert across both retail variants and fabric
CREATE VIEW low_stock_view AS
SELECT 'variant' AS item_kind, pv.id AS item_id, p.name || ' (' || COALESCE(pv.size,'') || '/' || COALESCE(pv.color,'') || ')' AS item_name,
       pv.stock_qty AS current_qty, pv.reorder_level
FROM product_variants pv JOIN products p ON p.id = pv.product_id
WHERE pv.stock_qty <= pv.reorder_level AND pv.status = 'active'
UNION ALL
SELECT 'fabric' AS item_kind, f.id AS item_id, f.name AS item_name,
       f.stock_qty AS current_qty, f.reorder_level
FROM fabrics f
WHERE f.stock_qty <= f.reorder_level AND f.status = 'active';

-- Tailor order pipeline snapshot — how many orders sit in each stage
CREATE VIEW order_pipeline_view AS
SELECT current_stage, order_kind, COUNT(*) AS order_count,
       SUM(balance_due) AS total_balance_due
FROM tailor_orders
WHERE status = 'in_progress'
GROUP BY current_stage, order_kind;

-- Overdue orders — promised date has passed but not yet delivered
CREATE VIEW overdue_orders_view AS
SELECT o.id, o.order_no, o.customer_id, c.name AS customer_name, o.garment_type,
       o.promised_date, o.current_stage, (CURRENT_DATE - o.promised_date) AS days_overdue
FROM tailor_orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'in_progress' AND o.promised_date < CURRENT_DATE;

-- Staff workload — active orders assigned per tailor/cutter
CREATE VIEW staff_workload_view AS
SELECT u.id AS user_id, u.name AS staff_name, COUNT(o.id) AS active_orders
FROM users u
LEFT JOIN tailor_orders o ON o.assigned_tailor_id = u.id AND o.status = 'in_progress'
WHERE u.is_tailor_staff = true
GROUP BY u.id, u.name;

COMMIT;
