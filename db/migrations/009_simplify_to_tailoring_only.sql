-- =====================================================================
-- Clothes & Tailor Shop Management System
-- Migration 009: Simplify to Tailoring-Only System
-- =====================================================================
-- This migration transforms the dual-purpose system into a streamlined,
-- single-purpose tailoring system by:
--   1. Removing all retail infrastructure (8 tables)
--   2. Keeping the minimal authentication and location context required
--      by the deployed application
--   3. Removing retail assignment and multi-branch management UI only
--   4. Resetting all business and accounting data
--   5. Preserving tailoring infrastructure and accounting system
--
-- The system will operate as a single-user, single-location tailoring
-- shop with simplified staff assignment and a clean data slate.
-- =====================================================================

BEGIN;

-- =====================================================================
-- Phase 1: Drop Retail Tables
-- =====================================================================
-- Remove all retail inventory management infrastructure.
-- Tables dropped in order to handle dependencies.
-- =====================================================================

-- Retail sales tables
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;

-- Retail purchasing tables
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;

-- Retail inventory tables
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- =====================================================================
-- Phase 2: Clean Accounting Chart
-- =====================================================================
-- Remove retail-specific accounts from chart of accounts.
-- =====================================================================

-- =====================================================================
-- Phase 3: Reset Business Data
-- =====================================================================
-- Clear all customer, fabric, and supplier data.
-- CASCADE automatically clears dependent records.
-- =====================================================================

TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE fabrics CASCADE;
TRUNCATE TABLE suppliers CASCADE;

-- =====================================================================
-- Phase 4: Reset Accounting Data
-- =====================================================================
-- Clear all transaction and expense records for a fresh start.
-- Preserve chart_of_accounts structure and definitions.
-- =====================================================================

TRUNCATE TABLE transaction_lines CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE expenses CASCADE;

DELETE FROM chart_of_accounts
WHERE account_code IN ('1200', '4000', '5000');

-- =====================================================================
-- Migration Complete
-- =====================================================================

COMMIT;
