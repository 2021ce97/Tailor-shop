-- =====================================================================
-- Migration 008: Branch-Aware Reporting Views
-- =====================================================================
-- Re-creates the accounting views from 005 with branch_id exposed, so
-- report pages can filter to a single branch or show all branches
-- combined. CREATE OR REPLACE is safe here since nothing else
-- references these views by a fixed column list that would break.
-- =====================================================================

BEGIN;

CREATE OR REPLACE VIEW ledger_view AS
SELECT
    t.branch_id,
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

CREATE OR REPLACE VIEW trial_balance_view AS
SELECT
    t.branch_id,
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
GROUP BY t.branch_id, tl.account_id, coa.account_code, coa.account_name, coa.account_type;

CREATE OR REPLACE VIEW profit_loss_view AS
SELECT
    t.branch_id,
    coa.account_type,
    coa.account_name,
    SUM(tl.credit_amount) - SUM(tl.debit_amount) AS net_amount
FROM transaction_lines tl
JOIN transactions t ON t.id = tl.transaction_id
JOIN chart_of_accounts coa ON coa.id = tl.account_id
WHERE t.status = 'posted' AND coa.account_type IN ('income', 'expense')
GROUP BY t.branch_id, coa.account_type, coa.account_name;

-- Order pipeline and overdue-orders views gain branch_id too, since
-- tailor_orders now carries it.
CREATE OR REPLACE VIEW order_pipeline_view AS
SELECT branch_id, current_stage, order_kind, COUNT(*) AS order_count,
       SUM(balance_due) AS total_balance_due
FROM tailor_orders
WHERE status = 'in_progress'
GROUP BY branch_id, current_stage, order_kind;

CREATE OR REPLACE VIEW overdue_orders_view AS
SELECT o.id, o.branch_id, o.order_no, o.customer_id, c.name AS customer_name, o.garment_type,
       o.promised_date, o.current_stage, (CURRENT_DATE - o.promised_date) AS days_overdue
FROM tailor_orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'in_progress' AND o.promised_date < CURRENT_DATE;

-- Low stock view gains branch_id too, since both product_variants and
-- fabrics are now per-branch rows.
CREATE OR REPLACE VIEW low_stock_view AS
SELECT 'variant' AS item_kind, pv.id AS item_id, pv.branch_id,
       p.name || ' (' || COALESCE(pv.size,'') || '/' || COALESCE(pv.color,'') || ')' AS item_name,
       pv.stock_qty AS current_qty, pv.reorder_level
FROM product_variants pv JOIN products p ON p.id = pv.product_id
WHERE pv.stock_qty <= pv.reorder_level AND pv.status = 'active'
UNION ALL
SELECT 'fabric' AS item_kind, f.id AS item_id, f.branch_id, f.name AS item_name,
       f.stock_qty AS current_qty, f.reorder_level
FROM fabrics f
WHERE f.stock_qty <= f.reorder_level AND f.status = 'active';

COMMIT;
