# Design Document: Simplify to Tailoring-Only

## Introduction

This document outlines the design for transforming the dual-purpose Clothes & Tailor Shop Management System into a streamlined, single-purpose tailoring system. The transformation consists of three major components:

1. **Database Migration**: Complete removal of retail, multi-user, and multi-branch infrastructure through a comprehensive SQL migration script
2. **UI Workflow Improvements**: Enhanced order creation workflow with inline customer and measurement profile entry
3. **Tailor Assignment Simplification**: Conversion of foreign key-based staff assignments to simple text fields

This design ensures a clean, maintainable codebase focused exclusively on tailoring operations while preserving all essential functionality and accounting integrity.

## Architecture Overview

### System Transformation Flow

```
┌─────────────────────────────────────────────────────┐
│           Current System (Dual-Purpose)              │
│                                                      │
│  • Retail inventory management                      │
│  • Multi-user authentication system                 │
│  • Multi-branch support                             │
│  • Tailoring operations                             │
│  • Double-entry accounting                          │
└─────────────────────────────────────────────────────┘
                         ↓
            [Migration Script Execution]
                         ↓
┌─────────────────────────────────────────────────────┐
│         Simplified System (Tailoring-Only)           │
│                                                      │
│  • Tailoring operations (enhanced)                  │
│  • Double-entry accounting (preserved)              │
│  • Single-location, single-user                     │
│  • Text-based staff assignment                      │
│  • Inline workflow improvements                     │
└─────────────────────────────────────────────────────┘
```
### Component Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Migration Layer                       │
│              (009_simplify_to_tailoring.sql)             │
│                                                          │
│  ┌───────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │   Schema      │  │    Data    │  │  Accounting  │   │
│  │ Modifications │  │   Reset    │  │   Cleanup    │   │
│  └───────────────┘  └────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│                 Simplified Database                      │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Tailoring  │  │  Accounting  │  │   Fabric &   │   │
│  │   Tables    │  │    System    │  │   Suppliers  │   │
│  └─────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│                 Enhanced UI Layer                        │
│                                                          │
│  ┌───────────────────────────────────────────────┐      │
│  │          Order Creation Form                  │      │
│  │                                               │      │
│  │  ┌─────────────┐  ┌──────────────────────┐   │      │
│  │  │   Inline    │  │      Inline          │   │      │
│  │  │  Customer   │  │   Measurement        │   │      │
│  │  │   Modal     │  │     Modal            │   │      │
│  │  └─────────────┘  └──────────────────────┘   │      │
│  └───────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

## Database Migration Design

### Migration Script Structure

The migration script (`009_simplify_to_tailoring.sql`) follows a carefully ordered sequence of operations:

```sql
BEGIN;  -- All operations in single transaction

-- Phase 1: Drop Retail Tables
-- Phase 2: Drop User/Role Tables
-- Phase 3: Drop Branch Infrastructure
-- Phase 4: Remove User Reference Columns
-- Phase 5: Remove Branch ID Columns
-- Phase 6: Convert Tailor Assignment Fields
-- Phase 7: Clean Accounting Chart
-- Phase 8: Reset Business Data
-- Phase 9: Reset Accounting Data

COMMIT;
```

### Phase 1: Retail Infrastructure Removal

**Tables to Drop:**
- `categories` - Product categorization
- `products` - Retail product definitions
- `product_variants` - Size/color variants with SKUs
- `stock_movements` - Retail inventory tracking
- `purchase_orders` - Retail restocking
- `purchase_order_items` - Purchase order line items
- `sales` - POS transactions
- `sale_items` - Sale line items

**Strategy:**
- Use `DROP TABLE ... CASCADE` to automatically remove dependent constraints and indexes
- Order matters: Drop child tables before parents where explicit foreign keys exist
- CASCADE handles most dependencies automatically

```sql
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
```

### Phase 2: User and Role Management Removal

**Tables to Drop:**
- `users` - User accounts and authentication
- `roles` - Permission roles (owner, manager, cashier, tailor)

**Affected Columns (removed automatically via CASCADE):**
- `created_by` columns across multiple tables
- `assigned_to`, `received_by`, `taken_by`, `cashier_id` columns
- Foreign key constraints linking to users table

**Strategy:**
- Drop `users` table with CASCADE first - automatically removes foreign key dependencies
- Explicitly drop user reference columns that may not be covered by CASCADE
- Preserve `assigned_tailor_id` and `assigned_cutter_id` for later conversion

```sql
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Explicit column removals for clarity
ALTER TABLE measurement_profiles DROP COLUMN IF EXISTS created_by;
ALTER TABLE measurement_profiles DROP COLUMN IF EXISTS taken_by;
ALTER TABLE fabric_movements DROP COLUMN IF EXISTS created_by;
ALTER TABLE transactions DROP COLUMN IF EXISTS created_by;
ALTER TABLE expenses DROP COLUMN IF EXISTS created_by;
ALTER TABLE tailor_order_payments DROP COLUMN IF EXISTS received_by;
ALTER TABLE appointments DROP COLUMN IF EXISTS assigned_to;
```

### Phase 3: Multi-Branch Infrastructure Removal

**Table to Drop:**
- `branches` - Branch locations and settings

**Columns to Remove:**
- `branch_id` from: fabrics, tailor_orders, transactions, expenses, appointments, fabric_movements

**Strategy:**
- Drop branches table first with CASCADE
- Explicitly remove branch_id columns from remaining tables
- Associated indexes drop automatically

```sql
DROP TABLE IF EXISTS branches CASCADE;

ALTER TABLE fabrics DROP COLUMN IF EXISTS branch_id;
ALTER TABLE tailor_orders DROP COLUMN IF EXISTS branch_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS branch_id;
ALTER TABLE expenses DROP COLUMN IF EXISTS branch_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS branch_id;
ALTER TABLE fabric_movements DROP COLUMN IF EXISTS branch_id;
```

### Phase 4: Tailor Assignment Field Conversion

**Current Structure:**
- `assigned_tailor_id INTEGER` - Foreign key to users table
- `assigned_cutter_id INTEGER` - Foreign key to users table

**Target Structure:**
- `assigned_tailor_name VARCHAR(100)` - Free text field
- `assigned_cutter_name VARCHAR(100)` - Free text field

**Conversion Process:**
```sql
-- Convert assigned_tailor_id
ALTER TABLE tailor_orders 
  ALTER COLUMN assigned_tailor_id TYPE VARCHAR(100);

ALTER TABLE tailor_orders 
  RENAME COLUMN assigned_tailor_id TO assigned_tailor_name;

-- Convert assigned_cutter_id
ALTER TABLE tailor_orders 
  ALTER COLUMN assigned_cutter_id TYPE VARCHAR(100);

ALTER TABLE tailor_orders 
  RENAME COLUMN assigned_cutter_id TO assigned_cutter_name;

-- Remove audit columns from stages
ALTER TABLE tailor_order_stages DROP COLUMN IF EXISTS changed_by;
ALTER TABLE tailor_orders DROP COLUMN IF EXISTS created_by;
```

**Rationale:**
- Eliminates dependency on user management system
- Allows flexible staff name entry without account creation
- Maintains assignment tracking for workflow purposes
- Both fields nullable to allow unassigned orders

### Phase 5: Accounting Chart Cleanup

**Accounts to Remove:**
- Retail Sales Revenue
- Cost of Goods Sold - Retail
- Retail Inventory
- Purchase Returns (if exists)

**Accounts to Preserve:**
- All tailoring revenue accounts
- Fabric inventory and expense accounts
- Core accounts: Cash, Bank, Accounts Payable, Equity
- Custom Garment Revenue, Alteration Revenue

**Strategy:**
```sql
DELETE FROM chart_of_accounts 
WHERE account_code IN ('4100', '5100', '1300', '5200');
-- Precise identification by account code
-- Preserves all tailoring-specific and core accounting structure
```

### Phase 6: Business Data Reset

**Tables to Truncate:**
- `customers` (CASCADE to measurement_profiles, tailor_orders, appointments)
- `fabrics` (CASCADE to fabric_movements)
- `suppliers`

**Strategy:**
```sql
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE fabrics CASCADE;
TRUNCATE TABLE suppliers CASCADE;
```

**Cascade Effects:**
- `customers` truncation automatically clears:
  - `measurement_profiles`
  - `tailor_orders` (and its children: tailor_order_stages, tailor_order_payments)
  - `appointments`
- `fabrics` truncation automatically clears:
  - `fabric_movements`

### Phase 7: Accounting Data Reset

**Tables to Truncate:**
- `transaction_lines`
- `transactions`
- `expenses`

**Table to Preserve:**
- `chart_of_accounts` - Structure and account definitions maintained

**Strategy:**
```sql
TRUNCATE TABLE transaction_lines CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE expenses CASCADE;
```

**Sequence Reset:**
- TRUNCATE with CASCADE automatically resets sequences
- All ID generators start fresh at 1

### Preserved Tables and Structure

After migration, the following tables remain with their structure intact:

**Core Business Tables:**
- `shop_settings` - Shop configuration (name, currency, tax, order prefix)
- `customers` - Customer records (empty)
- `measurement_profiles` - Garment measurements (empty)
- `suppliers` - Supplier information (empty)

**Tailoring Operations:**
- `tailor_orders` - Custom order records (empty, with converted text fields)
- `tailor_order_stages` - Stage transition history (empty)
- `tailor_order_payments` - Payment records (empty)
- `appointments` - Customer appointments (empty)

**Inventory:**
- `fabrics` - Fabric inventory (empty)
- `fabric_movements` - Fabric usage tracking (empty)

**Accounting:**
- `chart_of_accounts` - Account definitions (preserved with data, minus retail accounts)
- `transactions` - Journal entries (empty)
- `transaction_lines` - Transaction line items (empty)
- `expenses` - Direct expense records (empty)

## UI Workflow Improvements

### Enhanced Order Creation Flow

The order creation workflow is enhanced with inline entry capabilities to eliminate navigation away from the order form during order creation.

### Current Workflow (Problem)

```
[Order Form]
   ↓ Need new customer
   → Navigate to Customers page
   → Create customer
   → Navigate back to Orders
   → Start over entering order details
   → Select customer
   ↓ Need measurements
   → Navigate to Customer profile
   → Create measurement profile
   → Navigate back to Orders
   → Re-enter order details again
   → Select measurement profile
   → Complete order
```

**Problems:**
- Context switching disrupts workflow
- Order form data lost during navigation
- Repetitive data entry
- Time-consuming for staff

### Enhanced Workflow (Solution)

```
[Order Form]
   ↓ Need new customer
   → Click "Add New Customer"
   → [Inline Customer Modal opens]
   → Enter name, phone, email, address
   → Save
   → [Modal closes, customer auto-selected]
   ↓ Need measurements
   → Click "Add New Measurements"
   → [Inline Measurement Modal opens]
   → Select garment type
   → Enter measurements
   → Save
   → [Modal closes, profile auto-selected]
   ↓ Complete order
```

**Benefits:**
- No navigation away from order form
- All entered data preserved
- Continuous workflow
- Faster order creation

### Inline Customer Entry Component

**Trigger:**
- "Add New Customer" button next to customer dropdown in order form

**Modal Structure:**

```tsx
<InlineCustomerModal>
  <Form>
    <Input name="name" label="Customer Name" required />
    <Input name="phone" label="Phone Number" required />
    <Input name="email" label="Email" type="email" optional />
    <TextArea name="address" label="Address" optional />
    <ButtonGroup>
      <Button type="submit">Save Customer</Button>
      <Button type="button" onClick={close}>Cancel</Button>
    </ButtonGroup>
  </Form>
  <ErrorDisplay />
</InlineCustomerModal>
```

**Validation:**
- Name: Required, non-empty
- Phone: Required, non-empty
- Email: Optional, must be valid email format if provided
- Address: Optional

**State Management:**
```typescript
interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
}

// On successful save:
// 1. Call customer creation API
// 2. Update customer dropdown options
// 3. Auto-select newly created customer
// 4. Close modal
// 5. Focus returns to order form
```

### Inline Measurement Profile Entry Component

**Trigger:**
- "Add New Measurements" button next to measurement profile dropdown
- Only enabled when a customer is selected

**Modal Structure:**

```tsx
<InlineMeasurementModal customer={selectedCustomer}>
  <Form>
    <Select 
      name="garmentType" 
      label="Garment Type"
      options={['Shirt', 'Pants', 'Suit', 'Thobe', 'Other']}
      required 
    />
    <DynamicMeasurementFields garmentType={selectedGarmentType} />
    <Input name="label" label="Profile Label" optional />
    <TextArea name="notes" label="Notes" optional />
    <ButtonGroup>
      <Button type="submit">Save Measurements</Button>
      <Button type="button" onClick={close}>Cancel</Button>
    </ButtonGroup>
  </Form>
  <ErrorDisplay />
</InlineMeasurementModal>
```

**Dynamic Field Rendering:**

```typescript
const measurementFields = {
  Shirt: ['chest', 'waist', 'shoulder', 'sleeve', 'length', 'neck'],
  Pants: ['waist', 'hip', 'inseam', 'outseam', 'thigh', 'calf'],
  Suit: ['chest', 'waist', 'shoulder', 'sleeve', 'jacket_length', 
         'pant_waist', 'pant_inseam'],
  Thobe: ['shoulder', 'chest', 'sleeve', 'length', 'neck'],
  Other: [] // Custom free-form measurement entry
};

function DynamicMeasurementFields({ garmentType }) {
  const fields = measurementFields[garmentType] || [];
  return fields.map(field => (
    <Input 
      key={field} 
      name={field} 
      label={formatLabel(field)} 
      type="number" 
      step="0.1"
    />
  ));
}
```

**State Management:**
```typescript
interface MeasurementFormState {
  customerId: number;  // From parent order form
  garmentType: string;
  measurements: Record<string, number>;
  label?: string;
  notes?: string;
}

// On successful save:
// 1. Call measurement profile creation API with customer association
// 2. Update measurement dropdown options for selected customer
// 3. Auto-select newly created profile
// 4. Close modal
// 5. Focus returns to order form
```

### Order Form State Preservation

**Challenge:**
When modals open, the parent order form must maintain all entered data without losing state.

**Solution Strategy:**

```typescript
function OrderCreationForm() {
  // Main form state
  const [formState, setFormState] = useState<OrderFormState>({
    customerId: null,
    measurementProfileId: null,
    garmentType: '',
    fabricId: null,
    quantity: 1,
    stitchingCharge: 0,
    deliveryDate: null,
    advancePayment: 0,
    assignedTailorName: '',
    assignedCutterName: '',
    notes: ''
  });

  // Modal visibility state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);

  // Form state persists across modal interactions
  // Modals are rendered as controlled components
  // Parent form remains mounted throughout
}
```

**React Implementation:**

```tsx
<OrderCreationForm>
  {/* Main form always mounted */}
  <form onSubmit={handleOrderSubmit}>
    <CustomerSelector 
      value={formState.customerId}
      onChange={handleCustomerChange}
    />
    <Button onClick={() => setShowCustomerModal(true)}>
      Add New Customer
    </Button>

    {formState.customerId && (
      <>
        <MeasurementSelector 
          customerId={formState.customerId}
          value={formState.measurementProfileId}
          onChange={handleMeasurementChange}
        />
        <Button onClick={() => setShowMeasurementModal(true)}>
          Add New Measurements
        </Button>
      </>
    )}

    {/* Rest of order form fields */}
  </form>

  {/* Modals render conditionally but don't unmount parent */}
  {showCustomerModal && (
    <InlineCustomerModal 
      onSave={(customer) => {
        setFormState(prev => ({ ...prev, customerId: customer.id }));
        setShowCustomerModal(false);
      }}
      onCancel={() => setShowCustomerModal(false)}
    />
  )}

  {showMeasurementModal && (
    <InlineMeasurementModal 
      customerId={formState.customerId}
      onSave={(profile) => {
        setFormState(prev => ({ 
          ...prev, 
          measurementProfileId: profile.id 
        }));
        setShowMeasurementModal(false);
      }}
      onCancel={() => setShowMeasurementModal(false)}
    />
  )}
</OrderCreationForm>
```

**Key Principles:**
1. Parent form never unmounts during modal interaction
2. Form state managed in parent component
3. Modals are sibling components, not children of form
4. No page navigation = no state loss
5. Modal callbacks update parent state directly

### Text-Based Tailor Assignment UI

**Current Structure (Before Migration):**
- Dropdown selector pulling from users table
- Only users with `is_tailor` flag appear
- Foreign key constraint

**New Structure (After Migration):**
- Free text input fields
- No validation against user database
- VARCHAR(100) storage

**Component Design:**

```tsx
<OrderForm>
  <Input
    name="assignedTailorName"
    label="Assigned Tailor"
    type="text"
    maxLength={100}
    placeholder="Enter tailor name"
    optional
  />
  
  <Input
    name="assignedCutterName"
    label="Assigned Cutter"
    type="text"
    maxLength={100}
    placeholder="Enter cutter name"
    optional
  />
</OrderForm>
```

**Validation:**
- Both fields optional (can be left empty)
- Maximum 100 characters
- Accept any alphanumeric text including spaces
- No database lookup required

**Benefits:**
- Flexible staff naming without user account overhead
- Supports temporary or external workers
- No authentication system dependency
- Simpler data model

## Data Model Changes

### Schema Comparison

**Before Migration:**

```sql
-- User-dependent structure
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  is_tailor BOOLEAN DEFAULT FALSE,
  branch_id INTEGER REFERENCES branches(id)
);

CREATE TABLE tailor_orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  branch_id INTEGER REFERENCES branches(id),
  assigned_tailor_id INTEGER REFERENCES users(id),
  assigned_cutter_id INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  -- ... other fields
);
```

**After Migration:**

```sql
-- Simplified, self-contained structure
CREATE TABLE tailor_orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  assigned_tailor_name VARCHAR(100),  -- Text field
  assigned_cutter_name VARCHAR(100),  -- Text field
  -- ... other fields
  -- No branch_id
  -- No created_by
  -- No user foreign keys
);

-- users and roles tables completely removed
-- branches table completely removed
```

### Field Mapping

| Table | Old Column | New Column | Type Change | Notes |
|-------|------------|------------|-------------|-------|
| tailor_orders | assigned_tailor_id | assigned_tailor_name | INTEGER → VARCHAR(100) | FK removed |
| tailor_orders | assigned_cutter_id | assigned_cutter_name | INTEGER → VARCHAR(100) | FK removed |
| tailor_orders | created_by | (removed) | — | User tracking removed |
| tailor_orders | branch_id | (removed) | — | Multi-branch removed |
| tailor_order_stages | changed_by | (removed) | — | User tracking removed |
| measurement_profiles | created_by | (removed) | — | User tracking removed |
| measurement_profiles | taken_by | (removed) | — | User tracking removed |
| transactions | created_by | (removed) | — | User tracking removed |
| expenses | created_by | (removed) | — | User tracking removed |
| fabrics | branch_id | (removed) | — | Multi-branch removed |
| fabric_movements | created_by | (removed) | — | User tracking removed |

## API Changes

### Affected Endpoints

**Order Creation Endpoint:**

Before:
```typescript
POST /api/orders
{
  customerId: number,
  measurementProfileId: number,
  assignedTailorId: number,  // FK reference
  assignedCutterId: number,  // FK reference
  // ...
}
```

After:
```typescript
POST /api/orders
{
  customerId: number,
  measurementProfileId: number,
  assignedTailorName: string,  // Free text
  assignedCutterName: string,  // Free text
  // ...
}
```

### New Inline Entry Endpoints

**Customer Creation (Inline):**
```typescript
POST /api/customers
{
  name: string,        // Required
  phone: string,       // Required
  email?: string,      // Optional
  address?: string     // Optional
}

Response:
{
  id: number,
  name: string,
  phone: string,
  email: string | null,
  address: string | null,
  createdAt: string
}
```

**Measurement Profile Creation (Inline):**
```typescript
POST /api/measurement-profiles
{
  customerId: number,                    // Required
  garmentType: string,                   // Required
  measurements: Record<string, number>,  // Required
  label?: string,                        // Optional
  notes?: string                         // Optional
}

Response:
{
  id: number,
  customerId: number,
  garmentType: string,
  measurements: Record<string, number>,
  label: string | null,
  notes: string | null,
  createdAt: string
}
```

## Error Handling

### Migration Errors

**Transaction Rollback:**
- All operations wrapped in single transaction
- Any failure triggers complete rollback
- Database remains in pre-migration state

**Common Failure Scenarios:**
1. Foreign key violations (should not occur with proper CASCADE usage)
2. Column doesn't exist (handled with IF EXISTS clauses)
3. Table doesn't exist (handled with IF EXISTS clauses)
4. Permission errors (migration must run with sufficient privileges)

**Recovery:**
- Fix error cause
- Re-run migration script
- Idempotent operations allow safe re-execution

### UI Validation Errors

**Inline Customer Form:**
- Name required: "Customer name is required"
- Phone required: "Phone number is required"
- Invalid email: "Please enter a valid email address"
- Server error: Display server-provided error message

**Inline Measurement Form:**
- No customer selected: Button disabled
- Garment type required: "Please select a garment type"
- Invalid measurements: "Please enter valid numeric measurements"
- Server error: Display server-provided error message

**State Preservation on Error:**
- Form validation errors do not clear form state
- Modal remains open on validation failure
- Parent order form maintains all data
- User can correct errors without losing work

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Required Field Validation

*For any* customer creation form submission where the name field is empty or contains only whitespace, the validation SHALL reject the submission and preserve the form state with an appropriate error message.

*For any* customer creation form submission where the phone field is empty or contains only whitespace, the validation SHALL reject the submission and preserve the form state with an appropriate error message.

**Validates: Requirements 12.5, 12.6**

### Property 2: Garment-Specific Measurement Fields

*For any* garment type selected in the inline measurement entry form, the displayed measurement fields SHALL match the predefined field set for that garment type, ensuring users are prompted for exactly the measurements relevant to that garment.

**Validates: Requirements 13.5**

### Property 3: Order Form State Preservation Across Modal Interactions

*For any* order form state and any inline modal interaction (opening customer modal, opening measurement modal, closing either modal, or validation error within modal), all field values in the main order form SHALL remain unchanged after the modal interaction completes.

**Validates: Requirements 14.1, 14.2, 14.3, 14.5**

### Property 4: No Page Reload During Inline Operations

*For any* inline customer creation or inline measurement profile creation operation, the system SHALL NOT trigger a page reload, preserving all application state and allowing the order workflow to continue seamlessly.

**Validates: Requirements 14.4**

### Property 5: Measurement Profile Customer Association

*For any* customer selected in the order form, when a measurement profile is created via the inline entry modal, the created measurement profile SHALL be associated with that selected customer's ID in the database.

**Validates: Requirements 13.12**

### Property 6: Text Field Input Validation

*For any* alphanumeric string (including spaces) with length ≤ 100 characters submitted in the assigned_tailor_name field, the order form SHALL accept the value without validation errors.

*For any* alphanumeric string (including spaces) with length ≤ 100 characters submitted in the assigned_cutter_name field, the order form SHALL accept the value without validation errors.

**Validates: Requirements 15.5, 15.6**

### Property 7: Tailor Assignment Data Persistence

*For any* order submission with assigned_tailor_name value (including empty string or null), the value SHALL be stored exactly as provided in the tailor_orders.assigned_tailor_name database column.

*For any* order submission with assigned_cutter_name value (including empty string or null), the value SHALL be stored exactly as provided in the tailor_orders.assigned_cutter_name database column.

**Validates: Requirements 15.7, 15.8**

### Property 8: Migration Transaction Atomicity

*For any* migration execution, if any single operation within the migration script fails, then ALL operations SHALL be rolled back, leaving the database in its pre-migration state with no partial changes applied.

**Validates: Requirements 8.1, 8.2**

### Property 9: Data Truncation with Structure Preservation

*For any* table listed in the business data reset (customers, fabrics, suppliers, transactions, transaction_lines, expenses), after migration execution, the table SHALL exist with its complete schema intact (all columns, constraints, indexes) but contain zero rows.

**Validates: Requirements 5.10, 6.4, 7.1-7.14**

## Testing Strategy

### Migration Testing

**Integration Tests:**
1. **Schema Verification Test**
   - Execute migration on test database with sample data
   - Query information_schema to verify:
     - Retail tables do not exist
     - Users and roles tables do not exist
     - Branches table does not exist
     - User reference columns removed from all tables
     - Branch_id columns removed from all tables
     - Tailor assignment fields are VARCHAR(100)
   - Verify all expected tables still exist

2. **Data Reset Verification Test**
   - Pre-populate test database with sample data
   - Execute migration
   - Query all data tables and verify row count = 0
   - Verify chart_of_accounts contains data (minus retail accounts)
   - Verify shop_settings preserved

3. **Rollback Test**
   - Create migration that will fail mid-execution
   - Verify complete rollback occurred
   - Verify database state unchanged

4. **Idempotency Test**
   - Execute migration twice on same database
   - Verify second execution completes without errors
   - Verify final state identical to single execution

### UI Component Testing

**Unit Tests:**

1. **Inline Customer Modal**
   - Render test: Verify all fields present
   - Required field validation: Name and phone
   - Optional field handling: Email and address
   - Error display on validation failure
   - Success callback with created customer data

2. **Inline Measurement Modal**
   - Render test: Verify form structure
   - Dynamic field rendering per garment type
   - Customer association verification
   - Success callback with created profile data

3. **Order Form State Management**
   - State preservation during modal open
   - State preservation during modal close
   - State preservation on validation errors
   - No page reload verification

4. **Text-Based Assignment Fields**
   - Accept alphanumeric input up to 100 chars
   - Accept empty/null values
   - Reject input > 100 chars

**Property-Based Tests:**

1. **Property 1: Required Field Validation**
   - Generate random whitespace-only strings
   - Test name field rejection
   - Test phone field rejection
   - Verify form state preserved with error message
   - Minimum 100 iterations
   - **Tag: Feature: simplify-to-tailoring-only, Property 1: For any customer creation form submission where the name field is empty or contains only whitespace, the validation SHALL reject the submission**

2. **Property 2: Garment-Specific Measurement Fields**
   - For each garment type in system
   - Render measurement form
   - Verify displayed fields match expected set
   - Minimum 100 iterations with various garment types
   - **Tag: Feature: simplify-to-tailoring-only, Property 2: For any garment type selected, the displayed measurement fields SHALL match the predefined field set**

3. **Property 3: Order Form State Preservation**
   - Generate random order form states
   - Test state preservation across all modal operations
   - Verify all fields unchanged
   - Minimum 100 iterations with diverse form states
   - **Tag: Feature: simplify-to-tailoring-only, Property 3: For any order form state and modal interaction, all field values SHALL remain unchanged**

4. **Property 4: No Page Reload**
   - Monitor page reload events during inline operations
   - Test across various inline creation scenarios
   - Verify no reload occurs
   - Minimum 100 iterations
   - **Tag: Feature: simplify-to-tailoring-only, Property 4: For any inline operation, the system SHALL NOT trigger a page reload**

5. **Property 5: Measurement Profile Customer Association**
   - Generate random customer selections
   - Create measurement profiles
   - Verify customer_id association in database
   - Minimum 100 iterations
   - **Tag: Feature: simplify-to-tailoring-only, Property 5: For any selected customer, created measurement profile SHALL be associated with that customer**

6. **Property 6: Text Field Input Validation**
   - Generate random alphanumeric strings ≤ 100 chars
   - Test tailor_name field acceptance
   - Test cutter_name field acceptance
   - Verify no validation errors
   - Minimum 100 iterations
   - **Tag: Feature: simplify-to-tailoring-only, Property 6: For any alphanumeric string ≤ 100 characters, the order form SHALL accept the value**

7. **Property 7: Tailor Assignment Data Persistence**
   - Generate random tailor/cutter names (including empty)
   - Submit orders
   - Query database and verify exact value stored
   - Minimum 100 iterations with various inputs
   - **Tag: Feature: simplify-to-tailoring-only, Property 7: For any order submission, tailor assignment values SHALL be stored exactly as provided**

8. **Property 8: Migration Transaction Atomicity**
   - Create failing migrations with errors at various points
   - Execute each failing migration
   - Verify complete rollback occurred
   - Test with multiple failure scenarios
   - **Tag: Feature: simplify-to-tailoring-only, Property 8: For any migration failure, ALL operations SHALL be rolled back**

9. **Property 9: Data Truncation with Structure Preservation**
   - For each table in reset list
   - Verify table exists
   - Verify schema intact (columns, constraints, indexes)
   - Verify row count = 0
   - Test across all listed tables
   - **Tag: Feature: simplify-to-tailoring-only, Property 9: For any table in business data reset, table SHALL exist with complete schema and zero rows**

### Integration Testing

**End-to-End Workflow Test:**
1. Start order creation
2. Click "Add New Customer"
3. Fill customer form and save
4. Verify customer auto-selected
5. Click "Add New Measurements"
6. Fill measurement form and save
7. Verify profile auto-selected
8. Complete order with text-based tailor assignment
9. Submit order
10. Verify order created in database with all associations

**Database State Verification:**
- Execute migration on populated test database
- Verify all retail tables removed
- Verify user/role tables removed
- Verify branch infrastructure removed
- Verify all data tables empty
- Verify accounting chart cleaned
- Verify shop_settings preserved
- Verify all preserved tables have correct schema

## Implementation Plan

### Phase 1: Database Migration (Priority: Critical)

1. Create migration script `009_simplify_to_tailoring.sql`
2. Test on development database copy
3. Backup production database
4. Execute migration on production
5. Verify all validation criteria met

### Phase 2: API Updates (Priority: High)

1. Update order creation endpoint to accept text fields
2. Remove user authentication middleware
3. Update customer creation endpoint (already exists)
4. Update measurement profile creation endpoint (already exists)
5. Remove branch filtering from queries
6. Update all queries removing user reference joins

### Phase 3: UI Component Development (Priority: High)

1. Create `InlineCustomerModal` component
2. Create `InlineMeasurementModal` component
3. Update `OrderCreationForm` to integrate modals
4. Convert tailor assignment dropdowns to text inputs
5. Implement state preservation logic
6. Add validation and error handling

### Phase 4: Testing (Priority: High)

1. Write and run migration integration tests
2. Write unit tests for UI components
3. Write property-based tests for all 9 properties
4. Execute end-to-end workflow tests
5. Perform manual testing of complete order flow

### Phase 5: Documentation (Priority: Medium)

1. Update user documentation
2. Document new inline entry workflow
3. Update API documentation
4. Create migration runbook

## Security Considerations

### Removed Authentication

**Impact:**
- No login system
- No user roles or permissions
- Single-user assumption

**Mitigation:**
- Deploy on local network only
- Use OS-level authentication if needed
- Consider adding basic auth at web server level if internet-exposed

### Data Access

**Before:** Role-based access control, branch-scoped queries
**After:** All data accessible to anyone with system access

**Recommendation:**
- Physical security of machine
- Network isolation
- Regular backups

## Performance Considerations

### Database

**Improvements:**
- Fewer joins (no user lookups)
- Fewer foreign key checks
- Simpler queries overall

**Neutral:**
- Table count reduced but data volume similar for active tailoring business

### UI

**Improvements:**
- Fewer page navigations
- Faster order creation workflow
- Less network requests (modal operations vs full page loads)

**Considerations:**
- Modal rendering adds minimal overhead
- State management slightly more complex but negligible performance impact

## Migration Execution Checklist

### Pre-Migration

- [ ] Create complete database backup
- [ ] Test migration on database copy
- [ ] Verify all existing migrations applied
- [ ] Review migration script for errors
- [ ] Confirm downtime window (if needed)
- [ ] Document current system state

### During Migration

- [ ] Stop application server
- [ ] Execute `psql -d tailor_shop -f 009_simplify_to_tailoring.sql`
- [ ] Monitor for errors
- [ ] If error occurs, restore from backup

### Post-Migration Verification

- [ ] Verify retail tables removed: `\dt` should show no categories, products, etc.
- [ ] Verify users/roles tables removed
- [ ] Verify branches table removed
- [ ] Query tailor_orders: verify text fields exist
- [ ] Verify data tables empty: `SELECT COUNT(*) FROM customers;` should return 0
- [ ] Verify chart_of_accounts contains data (minus retail accounts)
- [ ] Verify shop_settings preserved
- [ ] Check foreign key constraints valid: No orphaned references

### Application Updates

- [ ] Deploy updated API code
- [ ] Deploy updated UI code
- [ ] Test order creation workflow end-to-end
- [ ] Test inline customer creation
- [ ] Test inline measurement creation
- [ ] Test text-based tailor assignment

## Rollback Plan

If migration fails or produces unexpected results:

1. **Stop application immediately**
2. **Restore database from backup:**
   ```bash
   psql -d postgres -c "DROP DATABASE tailor_shop;"
   psql -d postgres -c "CREATE DATABASE tailor_shop;"
   psql -d tailor_shop -f backup_before_migration.sql
   ```
3. **Restart application with previous code version**
4. **Investigate migration failure**
5. **Fix issues and retry with fresh backup**

## Future Enhancements

While not part of this transformation, potential future improvements include:

- **Autocomplete for tailor names:** Track previously used names and offer suggestions
- **Keyboard shortcuts:** For opening inline modals during order entry
- **Recent customers quick-select:** Show recently added customers at top of dropdown
- **Measurement templates:** Pre-fill common measurement patterns
- **Order drafts:** Save incomplete orders to resume later

## Conclusion

This transformation simplifies the system architecture by removing unnecessary complexity while enhancing the core tailoring workflow. The migration is designed to be safe, atomic, and verifiable. The UI improvements eliminate context-switching and accelerate order creation. The text-based staff assignment removes user management overhead while maintaining operational tracking capabilities.

The design maintains the integrity of the double-entry accounting system and preserves all essential tailoring functionality while creating a focused, efficient single-purpose application.