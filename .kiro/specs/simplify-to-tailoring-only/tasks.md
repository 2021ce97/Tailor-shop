# Implementation Plan: Simplify to Tailoring-Only

## Overview

This implementation transforms the dual-purpose Clothes & Tailor Shop Management System into a single-purpose tailoring-only system through a comprehensive database migration. The migration removes all retail inventory management, multi-user authentication, multi-branch support, and tailor assignment features while preserving the complete tailoring order pipeline and accounting infrastructure. All business data will be reset to provide a clean starting state.

The migration follows a transaction-wrapped, cascading approach to ensure atomic execution and automatic cleanup of dependent objects.

## Tasks

- [x] 1. Create migration file structure and transaction wrapper
  - Create file `db/migrations/009_simplify_to_tailoring_only.sql`
  - Add migration header comment describing the transformation
  - Add BEGIN transaction statement
  - Add placeholder for COMMIT statement at the end
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 8.1_

- [x] 2. Implement retail infrastructure removal
  - [x] 2.1 Drop retail tables with CASCADE
    - Add DROP TABLE statements for sale_items, sales, purchase_order_items, purchase_orders
    - Add DROP TABLE statements for stock_movements, product_variants, products, categories
    - Use IF EXISTS clause for each table
    - Use CASCADE to automatically remove dependent constraints
    - Add inline comment grouping these as "Retail Infrastructure Removal"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 8.3_

- [x] 3. Implement user management system removal
  - [x] 3.1 Drop user and role tables with CASCADE
    - Add DROP TABLE statements for users and roles
    - Use IF EXISTS and CASCADE clauses
    - Add inline comment "User Management System Removal"
    - _Requirements: 2.1, 2.2, 2.3, 8.3_
  
  - [x] 3.2 Remove user reference columns from remaining tables
    - Remove created_by from measurement_profiles
    - Remove taken_by from measurement_profiles
    - Remove created_by from fabric_movements
    - Remove created_by from transactions
    - Remove created_by from expenses
    - Remove received_by from tailor_order_payments
    - Remove assigned_to from appointments
    - Remove created_by from tailor_orders
    - Use IF EXISTS clause for each ALTER TABLE DROP COLUMN
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 2.10, 2.11, 2.12, 4.4_

- [x] 4. Implement multi-branch support removal
  - [x] 4.1 Drop branches table with CASCADE
    - Add DROP TABLE statement for branches
    - Use IF EXISTS and CASCADE clauses
    - Add inline comment "Multi-Branch Support Removal"
    - _Requirements: 3.7, 8.3_
  
  - [x] 4.2 Remove branch_id columns from all tables
    - Remove branch_id from fabrics
    - Remove branch_id from tailor_orders
    - Remove branch_id from transactions
    - Remove branch_id from expenses
    - Remove branch_id from appointments
    - Remove branch_id from fabric_movements
    - Use IF EXISTS clause for each ALTER TABLE DROP COLUMN
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 3.9_

- [x] 5. Implement tailor assignment system removal
  - [x] 5.1 Remove tailor assignment columns from tailor_orders and stages
    - Remove assigned_tailor_id from tailor_orders
    - Remove assigned_cutter_id from tailor_orders
    - Remove changed_by from tailor_order_stages
    - Use IF EXISTS clause for each ALTER TABLE DROP COLUMN
    - Add inline comment "Tailor Assignment System Removal"
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 6. Remove retail accounting accounts
  - [x] 6.1 Delete retail-specific accounts from chart_of_accounts
    - Delete account with code '1200' (Retail Inventory)
    - Delete account with code '4000' (Retail Sales Income)
    - Delete account with code '5000' (Cost of Goods Sold - Retail)
    - Add inline comment "Remove Retail Accounting Accounts"
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7, 9.8_

- [x] 7. Reset all business data
  - [x] 7.1 Truncate customer and order data with CASCADE
    - Add TRUNCATE TABLE statement for customers with CASCADE
    - This will cascade to measurement_profiles, tailor_orders, appointments
    - Tailor_orders will cascade to tailor_order_stages and tailor_order_payments
    - Add inline comment explaining CASCADE behavior
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.10_
  
  - [x] 7.2 Truncate fabric and supplier data with CASCADE
    - Add TRUNCATE TABLE statement for fabrics with CASCADE
    - This will cascade to fabric_movements
    - Add TRUNCATE TABLE statement for suppliers with CASCADE
    - Add inline comment "Reset Business Data"
    - _Requirements: 5.7, 5.8, 5.9, 5.10_

- [x] 8. Reset accounting system data
  - [x] 8.1 Truncate accounting tables with CASCADE
    - Add TRUNCATE TABLE statement for transaction_lines with CASCADE
    - Add TRUNCATE TABLE statement for transactions with CASCADE
    - Add TRUNCATE TABLE statement for expenses with CASCADE
    - Add inline comment "Reset Accounting Data"
    - Add comment noting that chart_of_accounts is preserved
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.11_

- [x] 9. Finalize migration with transaction commit
  - [x] 9.1 Add closing COMMIT statement
    - Add COMMIT statement at the end of the migration
    - Add final comment confirming migration completion
    - _Requirements: 8.1, 8.2, 8.7, 11.6, 11.7_

- [x] 10. Checkpoint - Review migration file for correctness
  - Review the complete migration file for syntax errors
  - Verify all operations are within the BEGIN-COMMIT block
  - Verify proper ordering (DROP TABLE before ALTER TABLE, structural before data)
  - Verify IF EXISTS clauses are used appropriately
  - Verify CASCADE is used for DROP TABLE operations
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 11. Create migration verification script
  - Create file `db/migrations/verify_009.sql` with post-migration checks
  - Add queries to verify retail tables are gone
  - Add queries to verify user/role tables are gone
  - Add queries to verify branches table is gone
  - Add queries to verify user reference columns are gone
  - Add queries to verify branch_id columns are gone
  - Add queries to verify data tables are empty
  - Add queries to verify chart_of_accounts is preserved
  - Add queries to verify shop_settings is preserved
  - Add queries to verify retail accounts are gone
  - _Validation Criteria: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10_

- [ ]* 12. Write integration tests for migration execution
  - Create test script that sets up a test database with existing migrations
  - Seed test database with representative data (customers, orders, retail inventory)
  - Execute migration 009
  - Run verification queries to confirm all acceptance criteria
  - Verify no errors or warnings produced
  - Clean up test database
  - _Requirements: All requirements validation_

- [~] 13. Final checkpoint - Migration ready for deployment
  - Confirm migration file is complete and reviewed
  - Confirm verification script is ready
  - Document the deployment plan (backup, execute, verify, rollback if needed)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional verification and testing tasks
- The migration uses a single transaction (BEGIN-COMMIT) for atomicity
- CASCADE clauses automatically handle dependent constraints and indexes
- IF EXISTS clauses provide idempotency for structural changes
- Data truncation happens after structural changes to avoid constraint violations
- The migration follows the same style as existing migrations (001-008)
- All tailoring infrastructure is preserved—only retail and multi-user features are removed
- Shop settings and chart of accounts (minus retail accounts) are preserved
- The next migration will be numbered 009 following the existing sequence

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "6.1"] },
    { "id": 4, "tasks": ["7.1", "7.2"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["11.1", "12.1"] }
  ]
}
```
