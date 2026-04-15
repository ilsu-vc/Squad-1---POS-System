# POS System API Inventory

This document contains a complete inventory of all Application Programming Interfaces (APIs) available across the microservices of the POS System. It is formatted for easy export to a PDF.

---

## 1. Auth Service

Manages user authentication, sessions, profiles, and cashier shift management.

### `[POST] /login`
- **Description:** Authenticates a user and returns a session.
- **Request Body:**
  - `email` (string): The user's email address.
  - `password` (string): The user's password.
- **Returns:** Session object and user data.

### `[POST] /logout`
- **Description:** Logs out the currently authenticated user and terminates the session.
- **Request Body:** None.

### `[GET] /session`
- **Description:** Retrieves the current active session data.
- **Parameters:** None.

### `[GET] /profile/:userId`
- **Description:** Retrieves the profile information for a specific user.
- **Path Parameters:**
  - `userId` (string, UUID): The unique identifier of the user.

### `[POST] /password/change`
- **Description:** Changes the password of the currently authenticated user.
- **Request Body:**
  - `newPassword` (string): The newly desired password.

### `[POST] /shift/clock-in`
- **Description:** Initiates a new shift for a given user.
- **Request Body:**
  - `userId` (string): The user's unique identifier.
- **Returns:** Shift record details.

### `[POST] /shift/clock-out`
- **Description:** Concludes an active shift with handover details and discrepancies.
- **Request Body:**
  - `shiftId` (string): The ID of the shift.
  - `userId` (string): The ID of the user.
  - `clockOutAt` (string, ISO date): Timestamp of clock-out.
  - `totalHours` (number): Total hours worked during the shift.
  - `handoverNotes` (string, optional): Notes for the next shift.
  - `cashDiscrepancies` (number, optional): Any cash register discrepancies.
  - `issues` (string, optional): Logged issues during the shift.
  - `pendingItems` (string, optional): Tasks handed over to the next shift.

### `[GET] /shift/active/:userId`
- **Description:** Retrieves the currently active shift for a given user.
- **Path Parameters:**
  - `userId` (string, UUID): The user's unique identifier.

### `[GET] /shift/latest-handover`
- **Description:** Retrieves the most recent shift handover details.
- **Parameters:** None.

---

## 2. Inventory Service

Handles product catalogs, branches, stock adjustments, and stock transfers.

### `[GET] /branches`
- **Description:** Retrieves a list of all store branches.
- **Parameters:** None.

### `[GET] /products`
- **Description:** Retrieves the full product catalog along with active transfer adjustments.
- **Parameters:** None.

### `[GET] /products/:sku`
- **Description:** Retrieves details for a single product by its ID / SKU.
- **Path Parameters:**
  - `sku` (string): The product's SKU or unique identifier.

### `[GET] /products/:sku/stock`
- **Description:** Retrieves only the current stock level for a product.
- **Path Parameters:**
  - `sku` (string): The product's SKU.

### `[PUT] /products/:id`
- **Description:** Updates the details of a product.
- **Path Parameters:**
  - `id` (string): Product ID to update.
- **Request Body:** Product object containing fields to update (e.g., `name`, `price`, `category`, `low_stock_threshold`).

### `[PATCH] /products/:id/decrement`
- **Description:** Decrements the stock of a product, usually after a sale.
- **Path Parameters:**
  - `id` (string): The product ID.
- **Request Body:**
  - `quantity` (number): The amount of stock to detach.

### `[POST] /stock/adjust`
- **Description:** Adjusts the stock level of a product directly (positive or negative).
- **Request Body:**
  - `sku` (string): Product SKU.
  - `amount` (number): Quantity to add or subtract.

### `[POST] /stock/transfer`
- **Description:** Initiates a stock transfer request between branches or warehouses.
- **Request Body:** Stock transfer object containing destination and quantity.

### `[GET] /transfers`
- **Description:** Retrieves a list of all requested stock transfers.
- **Parameters:** None.

### `[POST] /transfers`
- **Description:** Creates a new transfer request explicitely.
- **Request Body:** Transfer details object.

### `[PUT] /transfers/:id`
- **Description:** Updates the status or details of a stock transfer.
- **Path Parameters:**
  - `id` (string): Transfer Request ID.
- **Request Body:** Transfer object detailing modifications or status updates.

---

## 3. Transaction Service

Manages sales processing, transaction states (hold, complete, cancel, refund), and discount validation.

### `[POST] /transactions`
- **Description:** Creates a new sales transaction immediately resolving stock and issuing a receipt.
- **Request Body:**
  - `vat` (number): Value Added Tax amount.
  - `subtotal` (number): Pre-tax computation subtotal.
  - `totalAmount` (number): Overall transaction total.
  - `paymentMethod` (string): Method of payment (e.g., 'cash', 'card').
  - `itemsCount` (number): Total count of items purchased.
  - `items` (array): Array of purchased item objects.
  - `discountType` (string, optional): Nature of the discount applied.
  - `discountAmount` (number, optional): Computed discount amount.
  - `notes` (string, optional): Attached transaction notes.
  - `tags` (array of strings, optional): Categorical tags.

### `[GET] /transactions`
- **Description:** Retrieves all non-pending transactions (paid, completed, refunded, sale).
- **Parameters:** None.

### `[GET] /transactions/:id`
- **Description:** Retrieves detailed information for a specific transaction.
- **Path Parameters:**
  - `id` (string, UUID): Transaction distinct identifier.

### `[GET] /transactions/:id/receipt`
- **Description:** Retrieves the receipt associated with a finished transaction.
- **Path Parameters:**
  - `id` (string, UUID): Transaction ID.

### `[POST] /transactions/initiate`
- **Description:** Initializes a bare, pending transaction.
- **Request Body:** None.
- **Returns:** Draft transaction ID.

### `[POST] /transactions/complete`
- **Description:** Completes a pending transaction with payment and stock resolution.
- **Request Body:**
  - `transactionId` (string, UUID): ID of the pending transaction.
  - (Includes all properties found in `[POST] /transactions` along with `amountPaid` for change calculation).
- **Returns:** Receipt number and calculated change amount.

### `[POST] /transactions/cancel`
- **Description:** Marks a transaction as cancelled.
- **Request Body:**
  - `transactionId` (string): ID of the transaction to cancel.

### `[POST] /transactions/hold`
- **Description:** Puts a current cart/transaction on hold for later resumption.
- **Request Body:**
  - `label` (string, optional): A reference name for the held cart.
  - `total` (number): Cart total.
  - `items` (array): Items included in the hold.

### `[POST] /transactions/hold/:id/resume`
- **Description:** Removes a transaction from hold and brings it back to active state.
- **Path Parameters:**
  - `id` (string): Held transaction distinctive ID.

### `[POST] /transactions/refund`
- **Description:** Processes a refund for an originally completed transaction.
- **Request Body:**
  - `originalTransactionId` (string): The ID being refunded.
  - `items` (array): List of items to refund.
  - `refundSubtotal` (number): Subtotal of the refund.
  - `refundTax` (number): Tax adjustments mapped to refund.
  - `refundTotal` (number): Total money requested to be refunded.
  - `reason` (string, optional): Justification for the refund.

### `[PUT] /transactions/:id/notes`
- **Description:** Updates notes and tags for an existing transaction.
- **Path Parameters:**
  - `id` (string): Transaction ID.
- **Request Body:** `notes` (string), `tags` (array).

### `[POST] /discounts/validate`
- **Description:** Validates a promotional or static discount code.
- **Request Body:**
  - `code` (string): Discount code to validate.
  - `cartTotal` (number): The total to evaluate against minimum spend requirements.
  - `cashierId` (string): Current cashier validating the discount (for supervisor clearance).
- **Returns:** Validation status and discount configuration logic.

---

## 4. Role Service

Responsible for managing POS system users, active statuses, roles, and administrative password resets.

### `[GET] /users`
- **Description:** Retrieves the active directory of system users alongside their roles.
- **Parameters:** None.

### `[GET] /users/:id`
- **Description:** Retrieves comprehensive user and role data for a specific user ID.
- **Path Parameters:**
  - `id` (string, UUID): The user identifier.

### `[PUT] /users/:id/role`
- **Description:** Modifies the assigned role of a user.
- **Path Parameters:**
  - `id` (string, UUID): The target user ID.
- **Request Body:**
  - `role` (string): The exact role key to be applied.

### `[PUT] /users/:id/active`
- **Description:** Toggles whether a user’s account is active and can login.
- **Path Parameters:**
  - `id` (string, UUID): Target user ID.
- **Request Body:**
  - `is_active` (boolean): Setting to active or inactive.

### `[POST] /users/reset-password`
- **Description:** Sends a password reset email link to a targeted user.
- **Request Body:**
  - `email` (string): The associated email address.

---

## 5. Receipt Service

Used primarily for external or soft printing rendering of receipts.

### `[GET] /receipt/:transactionId`
- **Description:** Retrieves a rendered or database copy of a receipt via transaction association.
- **Path Parameters:**
  - `transactionId` (string, UUID): Connected transaction tracking.

### `[POST] /print`
- **Description:** Posts receipt data for hardware or console printing dispatch.
- **Request Body:**
  - `receiptNumber` (string): Computed receipt number.
  - `items` (array): List of items formatting print.
  - `vatable` (number): Vatable quantity.
  - `vatAmount` (number): Extracted VAT amount.
  - `total` (number): Printed total.
  - `splitPayments` (array, optional): Mixed modes of payments to detail.

---

## 6. Reporting Service

Centralized aggregator for tracking overall user activity and viewing shift log history spanning multiple cashiers.

### `[GET] /activity-logs`
- **Description:** Obtains the 5000 most recent operational logs and behaviors.
- **Parameters:** None.

### `[POST] /activity-logs`
- **Description:** Submits a systemic user activity for persistence auditing.
- **Request Body:**
  - `userId` (string): Active user making the action.
  - `userEmail` (string): Active user's email.
  - `actionType` (string): Context of action (e.g., CREATE, DELETE).
  - `actionDetails` (string): Verbatim details or JSON metadata.
  - `entityType` (string): Component changed (e.g., 'Discount', 'Product').
  - `entityId` (string): Internal ID of the edited component.

### `[GET] /shift-records`
- **Description:** Obtains historical shift attendance records with complete breakdown of discrepancies.
- **Parameters:** None.
