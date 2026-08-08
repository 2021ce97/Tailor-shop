# Requirements Document

## Introduction

Transform the dual-purpose Clothes & Tailor Shop Management System into a single-purpose tailoring-only system optimized for a single user operating from a single location. This transformation removes all retail inventory management, multi-branch support, and user/role management while preserving and enhancing the complete tailoring order pipeline and accounting system. The tailor assignment system will be simplified by converting staff assignment fields from foreign key references to simple text fields. The order creation workflow will be improved to support inline customer and measurement profile entry without navigation away from the order form. The system will be reset to a clean state with all accounting data cleared and retail database structures completely removed.

## Glossary

- **System**: The Tailor Shop Management application
- **Database**: The PostgreSQL database containing all application data
- **Migration**: A SQL script that modifies database schema
- **UI**: The user interface components of the application
- **Retail_Tables**: Database tables related to ready-made garment inventory (categories, products, product_variants, stock_movements, purchase_orders)
- **User_Management_Tables**: Database tables related to multi-user authentication and authorization (roles, users)
- **Branch_Tables**: Database tables and columns related to multi-location support (branches table, branch_id columns)
- **Tailor_Assignment_Foreign_Keys**: Foreign key constraints linking assigned_tailor_id and assigned_cutter_id to the users table
- **Tailor_Assignment_Text_Fields**: Simple VARCHAR text fields storing tailor and cutter names directly
- **Accounting_Data**: All rows in accounting-related tables (transactions, transaction_lines, expenses, tailor_order_payments)
- **Customer_Data**: All rows in customer-related tables (customers, measurement_profiles)
- **Order_Data**: All rows in tailor order tables (tailor_orders, tailor_order_stages, appointments)
- **Fabric_Data**: All rows in fabric inventory tables (fabrics, fabric_movements)
- **Supplier_Data**: All rows in supplier table (suppliers)
- **Chart_Of_Accounts**: The accounting chart defining all financial accounts
- **Order_Creation_Form**: The user interface component for creating new tailor orders
- **Inline_Customer_Entry**: A modal or embedded form allowing customer creation without leaving the order form
- **Inline_Measurement_Entry**: A modal or embedded form allowing measurement profile creation without leaving the order form

## Requirements

### Requirement 1: Remove Retail Database Infrastructure

**User Story:** As a system administrator, I want to completely remove all retail-related database structures, so that the system has no traces of the discontinued retail functionality.

#### Acceptance Criteria

1. THE Migration SHALL drop the categories table with CASCADE
2. THE Migration SHALL drop the products table with CASCADE
3. THE Migration SHALL drop the product_variants table with CASCADE
4. THE Migration SHALL drop the stock_movements table with CASCADE
5. THE Migration SHALL drop the purchase_orders table with CASCADE
6. THE Migration SHALL drop the purchase_order_items table with CASCADE
7. THE Migration SHALL drop the sales table with CASCADE
8. THE Migration SHALL drop the sale_items table with CASCADE
9. WHEN dropping tables, THE Migration SHALL use CASCADE to automatically remove dependent constraints and indexes
10. THE Migration SHALL execute all DROP TABLE statements within a single database transaction

### Requirement 2: Remove User and Role Management System

**User Story:** As a system administrator, I want to remove the multi-user authentication system, so that the application operates as a single-user system without login requirements.

#### Acceptance Criteria

1. THE Migration SHALL drop the roles table with CASCADE
2. THE Migration SHALL drop the users table with CASCADE
3. WHEN dropping the users table, THE Migration SHALL automatically remove foreign key references from other tables via CASCADE
4. THE Migration SHALL remove the created_by column from the measurement_profiles table
5. THE Migration SHALL remove the created_by column from the stock_movements table if it still exists
6. THE Migration SHALL remove the created_by column from the fabric_movements table
7. THE Migration SHALL remove the created_by column from the transactions table
8. THE Migration SHALL remove the created_by column from the expenses table
9. THE Migration SHALL remove the cashier_id column from the sales table if it still exists
10. THE Migration SHALL remove the received_by column from the tailor_order_payments table
11. THE Migration SHALL remove the assigned_to column from the appointments table
12. THE Migration SHALL remove the taken_by column from the measurement_profiles table

### Requirement 3: Remove Multi-Branch Support

**User Story:** As a system administrator, I want to remove all multi-branch infrastructure, so that the system operates as a single-location system.

#### Acceptance Criteria

1. THE Migration SHALL remove the branch_id column from the fabrics table
2. THE Migration SHALL remove the branch_id column from the tailor_orders table
3. THE Migration SHALL remove the branch_id column from the transactions table
4. THE Migration SHALL remove the branch_id column from the expenses table
5. THE Migration SHALL remove the branch_id column from the appointments table
6. THE Migration SHALL remove the branch_id column from the fabric_movements table
7. THE Migration SHALL drop the branches table with CASCADE
8. WHEN removing branch_id columns, THE Migration SHALL automatically drop associated indexes
9. THE Migration SHALL execute all branch removal operations within the same transaction as other removals

### Requirement 4: Convert Tailor Assignment System to Text Fields

**User Story:** As a system administrator, I want to convert tailor assignment fields from foreign key references to simple text fields, so that the system can track tailor names without requiring user accounts.

#### Acceptance Criteria

1. THE Migration SHALL alter the assigned_tailor_id column in tailor_orders to type VARCHAR(100)
2. THE Migration SHALL rename the assigned_tailor_id column to assigned_tailor_name
3. THE Migration SHALL alter the assigned_cutter_id column in tailor_orders to type VARCHAR(100)
4. THE Migration SHALL rename the assigned_cutter_id column to assigned_cutter_name
5. THE Migration SHALL remove the changed_by column from the tailor_order_stages table
6. THE Migration SHALL remove the created_by column from the tailor_orders table
7. WHEN converting columns, THE Migration SHALL drop existing foreign key constraints automatically
8. THE Migration SHALL allow NULL values in the assigned_tailor_name field
9. THE Migration SHALL allow NULL values in the assigned_cutter_name field

### Requirement 5: Reset All Business Data

**User Story:** As a system administrator, I want to completely clear all existing business data, so that the system starts fresh with no legacy records.

#### Acceptance Criteria

1. THE Migration SHALL delete all rows from the customers table using TRUNCATE CASCADE
2. THE Migration SHALL delete all rows from the measurement_profiles table via CASCADE from customers
3. THE Migration SHALL delete all rows from the tailor_orders table via CASCADE from customers
4. THE Migration SHALL delete all rows from the tailor_order_stages table via CASCADE from tailor_orders
5. THE Migration SHALL delete all rows from the tailor_order_payments table via CASCADE from tailor_orders
6. THE Migration SHALL delete all rows from the appointments table via CASCADE from customers
7. THE Migration SHALL delete all rows from the fabrics table using TRUNCATE CASCADE
8. THE Migration SHALL delete all rows from the fabric_movements table via CASCADE from fabrics
9. THE Migration SHALL delete all rows from the suppliers table using TRUNCATE CASCADE
10. THE Migration SHALL preserve the structure of all tailoring-related tables while clearing their data

### Requirement 6: Reset Accounting System

**User Story:** As a system administrator, I want to completely reset the accounting system, so that the system starts with a clean financial slate.

#### Acceptance Criteria

1. THE Migration SHALL delete all rows from the transaction_lines table using TRUNCATE CASCADE
2. THE Migration SHALL delete all rows from the transactions table using TRUNCATE CASCADE
3. THE Migration SHALL delete all rows from the expenses table using TRUNCATE CASCADE
4. THE Migration SHALL preserve the chart_of_accounts table structure and all account definitions
5. WHEN truncating accounting tables, THE Migration SHALL reset associated sequence generators
6. THE Migration SHALL execute all accounting data removal within the same transaction as other data removal

### Requirement 7: Preserve Core Tailoring Infrastructure

**User Story:** As a system administrator, I want to ensure that all essential tailoring functionality remains intact, so that the system can continue to manage custom garment orders.

#### Acceptance Criteria

1. THE Migration SHALL preserve the shop_settings table with all columns
2. THE Migration SHALL preserve the customers table structure
3. THE Migration SHALL preserve the measurement_profiles table structure
4. THE Migration SHALL preserve the suppliers table structure
5. THE Migration SHALL preserve the fabrics table structure
6. THE Migration SHALL preserve the fabric_movements table structure
7. THE Migration SHALL preserve the tailor_orders table structure with converted text fields
8. THE Migration SHALL preserve the tailor_order_stages table structure
9. THE Migration SHALL preserve the tailor_order_payments table structure
10. THE Migration SHALL preserve the appointments table structure
11. THE Migration SHALL preserve the chart_of_accounts table with all rows
12. THE Migration SHALL preserve the transactions table structure
13. THE Migration SHALL preserve the transaction_lines table structure
14. THE Migration SHALL preserve the expenses table structure

### Requirement 8: Maintain Database Integrity

**User Story:** As a system administrator, I want the migration to execute safely with proper transaction handling, so that the database remains in a consistent state.

#### Acceptance Criteria

1. THE Migration SHALL wrap all operations in a single BEGIN-COMMIT transaction block
2. IF any operation fails, THEN THE Migration SHALL rollback all changes automatically
3. THE Migration SHALL execute DROP TABLE operations before ALTER TABLE operations
4. THE Migration SHALL execute data truncation operations after structural changes
5. THE Migration SHALL use CASCADE where appropriate to handle dependent objects automatically
6. WHEN removing columns, THE Migration SHALL allow automatic dropping of dependent constraints
7. THE Migration SHALL complete successfully without manual intervention
8. THE Migration SHALL be idempotent where possible using IF EXISTS clauses

### Requirement 9: Remove Retail-Related Accounting Accounts

**User Story:** As a system administrator, I want to remove accounting accounts specific to retail operations, so that the chart of accounts contains only tailoring-relevant accounts.

#### Acceptance Criteria

1. THE Migration SHALL delete the Retail Sales Revenue account from chart_of_accounts
2. THE Migration SHALL delete the Cost of Goods Sold - Retail account from chart_of_accounts
3. THE Migration SHALL delete the Retail Inventory account from chart_of_accounts
4. THE Migration SHALL delete the Purchase Returns account from chart_of_accounts if it exists
5. THE Migration SHALL preserve all tailoring-related revenue accounts
6. THE Migration SHALL preserve all fabric-related expense accounts
7. THE Migration SHALL preserve all core accounting accounts (Cash, Bank, Accounts Payable, Equity)
8. WHEN deleting accounts, THE Migration SHALL use account_code for precise identification

### Requirement 10: Update System Configuration

**User Story:** As a system administrator, I want the shop settings to reflect the simplified single-location tailoring focus, so that the system identity matches its purpose.

#### Acceptance Criteria

1. THE Migration SHALL preserve all existing rows in the shop_settings table
2. THE Migration SHALL NOT modify shop_name, address, phone, email, or logo_url values
3. THE Migration SHALL preserve the currency setting
4. THE Migration SHALL preserve the tax_percent setting
5. THE Migration SHALL preserve the order_prefix setting for tailor orders
6. THE Migration SHALL allow manual updates to shop_settings after migration completion
7. THE Migration SHALL ensure the shop_settings singleton constraint remains enforced

### Requirement 11: Create Clean Migration File

**User Story:** As a developer, I want a well-documented migration script, so that I can understand and safely execute the transformation.

#### Acceptance Criteria

1. THE Migration SHALL be named with sequential numbering following existing migrations
2. THE Migration SHALL include a header comment describing its purpose
3. THE Migration SHALL group related operations with inline comments
4. THE Migration SHALL follow the same SQL style as existing migrations
5. THE Migration SHALL include BEGIN and COMMIT statements
6. WHEN operations are order-dependent, THE Migration SHALL include explanatory comments
7. THE Migration SHALL be executable via the same migration runner used for existing migrations
8. THE Migration SHALL produce no warnings or errors when executed on a database with all previous migrations applied

### Requirement 12: Enable Inline Customer Creation in Order Form

**User Story:** As a shop operator, I want to create a new customer directly from the order creation form, so that I can complete an order without navigating away to a separate customer page.

#### Acceptance Criteria

1. WHEN creating a new order, THE Order_Creation_Form SHALL display a customer selection dropdown
2. THE Order_Creation_Form SHALL include an "Add New Customer" button next to the customer dropdown
3. WHEN the Add New Customer button is clicked, THE UI SHALL display an Inline_Customer_Entry form
4. THE Inline_Customer_Entry form SHALL include fields for name, phone, email, and address
5. THE Inline_Customer_Entry form SHALL validate that the name field is required
6. THE Inline_Customer_Entry form SHALL validate that the phone field is required
7. WHEN the customer is successfully created, THE UI SHALL close the Inline_Customer_Entry form
8. WHEN the customer is successfully created, THE UI SHALL automatically select the newly created customer in the dropdown
9. WHEN the customer is successfully created, THE UI SHALL allow the order creation process to continue without page reload
10. IF the customer creation fails, THEN THE UI SHALL display an error message within the Inline_Customer_Entry form

### Requirement 13: Enable Inline Measurement Profile Creation in Order Form

**User Story:** As a shop operator, I want to create a new measurement profile directly from the order creation form, so that I can take measurements and complete an order in one workflow.

#### Acceptance Criteria

1. WHEN a customer is selected in the order form, THE Order_Creation_Form SHALL display a measurement profile selection dropdown
2. THE Order_Creation_Form SHALL include an "Add New Measurements" button next to the measurement profile dropdown
3. WHEN the Add New Measurements button is clicked, THE UI SHALL display an Inline_Measurement_Entry form
4. THE Inline_Measurement_Entry form SHALL include a garment type selector matching the order's garment type
5. THE Inline_Measurement_Entry form SHALL display measurement fields appropriate for the selected garment type
6. THE Inline_Measurement_Entry form SHALL include an optional label field for naming the profile
7. THE Inline_Measurement_Entry form SHALL include an optional notes field
8. WHEN the measurement profile is successfully created, THE UI SHALL close the Inline_Measurement_Entry form
9. WHEN the measurement profile is successfully created, THE UI SHALL automatically select the newly created profile in the dropdown
10. WHEN the measurement profile is successfully created, THE UI SHALL allow the order creation process to continue without page reload
11. IF the measurement profile creation fails, THEN THE UI SHALL display an error message within the Inline_Measurement_Entry form
12. THE Inline_Measurement_Entry form SHALL associate the measurement profile with the currently selected customer

### Requirement 14: Maintain Order Form State During Inline Entry

**User Story:** As a shop operator, I want all data I've entered in the order form to remain intact when I create a customer or measurement profile inline, so that I don't lose any work.

#### Acceptance Criteria

1. WHEN the Inline_Customer_Entry form is displayed, THE Order_Creation_Form SHALL preserve all entered field values
2. WHEN the Inline_Measurement_Entry form is displayed, THE Order_Creation_Form SHALL preserve all entered field values
3. WHEN the inline forms are closed, THE Order_Creation_Form SHALL maintain all previously entered data
4. THE UI SHALL NOT trigger a page reload during inline customer or measurement creation
5. WHEN validation errors occur in inline forms, THE Order_Creation_Form SHALL retain its state

### Requirement 15: Update Order Form UI to Support Text-Based Tailor Assignment

**User Story:** As a shop operator, I want to enter tailor and cutter names as free text when creating an order, so that I can track assignments without managing user accounts.

#### Acceptance Criteria

1. THE Order_Creation_Form SHALL display an assigned_tailor_name field as a text input
2. THE Order_Creation_Form SHALL display an assigned_cutter_name field as a text input
3. THE Order_Creation_Form SHALL allow the assigned_tailor_name field to be left empty
4. THE Order_Creation_Form SHALL allow the assigned_cutter_name field to be left empty
5. THE Order_Creation_Form SHALL accept any alphanumeric text in the assigned_tailor_name field up to 100 characters
6. THE Order_Creation_Form SHALL accept any alphanumeric text in the assigned_cutter_name field up to 100 characters
7. WHEN an order is saved, THE System SHALL store the assigned_tailor_name value in the tailor_orders table
8. WHEN an order is saved, THE System SHALL store the assigned_cutter_name value in the tailor_orders table

## Validation Criteria

After migration completion:

1. All retail-related tables SHALL NOT exist in the database schema
2. The roles and users tables SHALL NOT exist in the database schema
3. The branches table SHALL NOT exist in the database schema
4. All branch_id columns SHALL NOT exist on any remaining tables
5. All user reference columns except assigned_tailor_name and assigned_cutter_name SHALL NOT exist on any remaining tables
6. The tailor_orders table SHALL contain assigned_tailor_name and assigned_cutter_name as VARCHAR(100) columns
7. All data tables (customers, fabrics, tailor_orders, transactions) SHALL be empty
8. The chart_of_accounts table SHALL contain accounts but no retail-specific accounts
9. The shop_settings table SHALL contain exactly one row with preserved configuration
10. All foreign key constraints SHALL be valid with no broken references
11. The order creation UI SHALL include inline customer and measurement profile entry capabilities
12. The order creation form SHALL preserve state during inline entry operations
13. The order form SHALL support text-based tailor and cutter assignment
