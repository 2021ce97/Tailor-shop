-- =====================================================================
-- Migration 004: POS Sales, Payments, and Accounting Ledger
-- =====================================================================
-- A lightweight double-entry ledger, same proven pattern as the travel
-- agency system: every sale, purchase, expense, and tailor-order
-- payment posts balanced debit/credit lines, so profit and account
-- balances are always derived from real postings, never hand-entered.
-- =====================================================================

BEGIN;

CREATE TABLE chart_of_accounts (
    id              BIGSERIAL PRIMARY KEY,
    account_code    VARCHAR(30) NOT NULL UNIQUE,
    account_name    VARCHAR(200) NOT NULL,
    account_type    VARCHAR(30) NOT NULL, -- asset, liability, equity, income, expense
    balance_type    VARCHAR(10) NOT NULL DEFAULT 'debit',
    is_system       BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generic transaction header for every posting: retail sale, tailor
-- order payment, purchase, expense, or manual journal entry.
CREATE TABLE transactions (
    id              BIGSERIAL PRIMARY KEY,
    txn_no          VARCHAR(50) NOT NULL UNIQUE,
    txn_type        VARCHAR(30) NOT NULL, -- sale, tailor_order, purchase, expense, journal, payment_in, payment_out
    txn_date        DATE NOT NULL,
    reference_type  VARCHAR(30), -- 'sale', 'tailor_order', 'purchase_order', null for manual journal
    reference_id    BIGINT,
    customer_id     BIGINT REFERENCES customers(id),
    supplier_id     BIGINT REFERENCES suppliers(id),
    total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, posted, cancelled
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transaction_lines (
    id              BIGSERIAL PRIMARY KEY,
    transaction_id  BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id      BIGINT NOT NULL REFERENCES chart_of_accounts(id),
    description     TEXT,
    debit_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    credit_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_single_side CHECK (
        (debit_amount = 0 OR credit_amount = 0) AND NOT (debit_amount = 0 AND credit_amount = 0)
    )
);

-- ---------------------------------------------------------------------
-- POS retail sales
-- ---------------------------------------------------------------------

CREATE TABLE sales (
    id              BIGSERIAL PRIMARY KEY,
    sale_no         VARCHAR(50) NOT NULL UNIQUE,
    customer_id     BIGINT REFERENCES customers(id), -- walk-in sales can be customer-less
    sale_date       DATE NOT NULL,
    subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    amount_paid     NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_method  VARCHAR(30), -- cash, card, bank_transfer, mixed
    status          VARCHAR(20) NOT NULL DEFAULT 'completed', -- completed, returned, cancelled
    cashier_id      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sale_items (
    id              BIGSERIAL PRIMARY KEY,
    sale_id         BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    variant_id      BIGINT NOT NULL REFERENCES product_variants(id),
    quantity        INT NOT NULL,
    unit_price      NUMERIC(12,2) NOT NULL,
    unit_cost       NUMERIC(12,2) NOT NULL DEFAULT 0, -- snapshot of cost at sale time, for margin reporting
    line_total      NUMERIC(14,2) NOT NULL,
    returned_qty    INT NOT NULL DEFAULT 0
);

-- Payments against tailor orders (advance + balance on delivery) are
-- tracked separately from the order header so partial/multiple
-- payments are all individually auditable.
CREATE TABLE tailor_order_payments (
    id              BIGSERIAL PRIMARY KEY,
    tailor_order_id BIGINT NOT NULL REFERENCES tailor_orders(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL,
    payment_method  VARCHAR(30),
    payment_date    DATE NOT NULL,
    notes           TEXT,
    received_by     BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
    id              BIGSERIAL PRIMARY KEY,
    expense_no      VARCHAR(50) NOT NULL UNIQUE,
    category        VARCHAR(50) NOT NULL, -- rent, salaries, utilities, supplies, other
    amount          NUMERIC(12,2) NOT NULL,
    expense_date    DATE NOT NULL,
    paid_via        VARCHAR(30), -- cash, bank
    notes           TEXT,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX idx_transactions_type_date ON transactions(txn_type, txn_date);
CREATE INDEX idx_transactions_reference ON transactions(reference_type, reference_id);
CREATE INDEX idx_transaction_lines_txn ON transaction_lines(transaction_id);
CREATE INDEX idx_transaction_lines_account ON transaction_lines(account_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_variant ON sale_items(variant_id);
CREATE INDEX idx_tailor_payments_order ON tailor_order_payments(tailor_order_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

COMMIT;
