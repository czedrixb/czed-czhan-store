# Member Checkout UI Plan

## Goal

Make the member experience a simple store checkout: search for a product, enter the quantity sold, enter the customer's cash payment, and see the change due before completing the sale. Members should land directly on this transaction screen.

## Scope and assumptions

- Treat members as cashiers, with access to checkout and sign out only.
- Keep management functions available to administrators: inventory, pricing, reports, account management, audit logs, and sale voiding.
- Support multiple products per transaction (a cart): the cashier can add several products, pay once, and complete one receipt covering all of them.
- Use Philippine pesos for display and integer centavos for calculations and storage.
- Cash payments only for this release. Discounts, credit sales, receipt printing, and other payment methods are outside scope.

## Current implementation

- `app/pages/sales/new.vue` already supports product search, frequently sold products, quantity buttons, subtotal, and saving a sale. It currently displays profit and has no cash received or change fields.
- `app/components/BottomNav.vue` exposes Home, Sale, Stock, Reports, and More without role filtering.
- `app/middleware/auth.global.ts` and `server/middleware/auth.ts` check authentication but do not enforce member versus administrator access.
- `server/db/schema.ts` currently has no user role or sale payment fields.
- `server/api/sales/index.post.ts` records one product per sale, updates stock, and writes an audit entry inside a database transaction.
- Playwright is already configured, including `tests/e2e/03-sales.spec.ts`.

## Proposed member flow

1. After signing in, open `/sales/new` as the member's home screen.
2. Search products by name or variant. Show matching products with selling price and available stock, with clear empty and loading states.
3. Select a product and enter a positive whole-number quantity using a numeric input or plus/minus buttons.
4. Show the selected product, unit price, quantity, and total prominently. Do not display cost or profit to members.
5. Enter **Cash received**. Recalculate **Change due** immediately as cash received minus total.
6. If cash is insufficient, show the remaining amount needed and prevent completion. Do not display a negative value as change.
7. Select **Complete sale** to save the transaction and deduct stock.
8. Keep a success summary visible with product, quantity, total, cash received, and change due until the member selects **New sale**. Then reset the form and focus product search.

Example: a product priced at PHP 25.00 with quantity 3 totals PHP 75.00. Cash received of PHP 100.00 displays PHP 25.00 change. Cash received of PHP 50.00 displays PHP 25.00 still needed and cannot complete the sale.

## Implementation steps

### 1. Add member and administrator roles

- Add a validated `member` / `admin` role to users and expose it in session data and application types.
- Define an explicit migration mapping for existing accounts before deployment; do not infer administrators from arbitrary account names or grant every existing account administrator access.
- Default newly created accounts to member and restrict role assignment to administrators.
- Redirect members from management pages to checkout and replace their management navigation with a simple checkout header and sign-out action.
- Enforce permissions on the server as well as in navigation. Allow member product lookup and sale creation; reject management APIs, reports, exports, account creation, and sale voiding.
- Return only checkout-relevant product and sale fields to members, excluding cost and profit. Verify authentication endpoints cannot bypass account-management restrictions.

### 2. Build the checkout form

- Update `app/pages/sales/new.vue` with editable quantity, unit price, total, cash received, and change due.
- Use clear labels, large touch targets, a decimal keypad for cash, and a layout usable on mobile and desktop.
- Prevent completion for missing product, unavailable pricing, inactive or out-of-stock product, invalid quantity, quantity above stock, blank or invalid payment, or insufficient cash.
- Recalculate payment feedback whenever the product, quantity, or cash amount changes.
- Keep entered values after save errors so the member can correct or retry the transaction.
- Disable submission while saving and guard against duplicate transaction creation on retries using a server-validated unique submission key.

### 3. Save and validate cash payment

- Add nullable cash-received and change-due fields to sales so historical transactions remain valid without invented payment values.
- Extend the sale request to include cash received in integer centavos and the unique submission key.
- Re-read authoritative pricing and stock on the server, calculate the total and change, and reject insufficient cash. Never trust a client-provided total or change.
- Persist payment values with the existing price snapshots, stock update, and audit entry in one atomic database transaction.
- Retain stock concurrency protection and return a clear error if another sale changes availability. If pricing changes, require the cashier to review the updated total before completing.
- Preserve existing reporting behavior and update affected sale types and fixtures for the payment contract.

### 4. Verify the changed flow

Write or update focused Playwright tests covering:

- Member login lands on checkout; management navigation is absent; direct management routes and API calls are blocked.
- Administrator access to the affected management entry points remains available.
- Search, selection, direct quantity entry, and quantity buttons produce the correct total.
- Exact payment shows zero change; excess payment shows correct change, including centavo amounts.
- Blank, negative, malformed, or insufficient cash prevents saving.
- Invalid quantities and unavailable products cannot be sold.
- A successful sale saves payment data, deducts stock once, and displays a persistent change summary.
- Repeated submission does not create a duplicate sale; failed saves preserve input.
- New sale resets checkout for the next customer.

Run only the tests related to this change and resolve failures before marking implementation complete. Capture Playwright before/after screenshots of the same affected member sale view, including the new payment and confirmation states. Capture mobile and desktop layouts for the changed screen.

Write the implementation verification report to `D:\Submit\Obsidian Vault\Reports\<YYYY-MM-DD>-member-checkout.md`, with screenshots under `Reports\attachments\<YYYY-MM-DD>-member-checkout\`. Include summary, test output, before/after image table using relative Markdown links, and caveats, following the project testing instructions.

## Acceptance criteria

- Members see checkout as their main and only operational UI, with sign out available.
- Members can search an item, set quantity, enter customer cash, and clearly see the total and change.
- Only valid, fully paid transactions can complete.
- Completed sales retain payment details and update inventory exactly once.
- Members cannot access management data or actions through direct URLs or API calls.
- The focused Playwright tests pass and the verification report contains before/after screenshots.

## Deliverable status

This document is the implementation plan only. No application behavior has been changed, and implementation tests and screenshots are pending the implementation phase.
