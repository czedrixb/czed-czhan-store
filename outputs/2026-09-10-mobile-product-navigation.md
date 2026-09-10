# Mobile product navigation and sticky search

## Summary

Fixed mobile tap handling for populated Inventory and Checkout screens by isolating the fixed bottom navigation above animated product lists and giving product controls explicit touch interaction layers. Inventory and Checkout search controls now remain sticky beneath the page header while scrolling.

## Test results

- **PASS** — `tests/e2e/04-inventory.spec.ts: products and bottom navigation stay tappable on a populated mobile inventory` (Pixel 7 / mobile Chrome, 3.1s). Verified a product row opens its detail route, the Home tab navigates successfully, and the inventory search remains visible after scrolling.
- **PASS** — `tests/e2e/03-sales.spec.ts: bottom navigation stays tappable after mobile sale products load` (Pixel 7 / mobile Chrome, 2.9s). Verified the Stock tab navigates successfully after sale products load and the checkout search remains visible after scrolling.

## Screenshot comparison

This is an interaction and stacking fix with no intended visual restyle, so the baseline reference and verified result should appear identical.

| Before | After |
|--------|-------|
| ![Inventory baseline](./attachments/2026-09-10-mobile-product-navigation/inventory-nav-before.png) | ![Inventory verified](./attachments/2026-09-10-mobile-product-navigation/inventory-nav-after.png) |
| ![Checkout baseline](./attachments/2026-09-10-mobile-product-navigation/sales-nav-before.png) | ![Checkout verified](./attachments/2026-09-10-mobile-product-navigation/sales-nav-after.png) |

## Notes

- The screenshots show each search control pinned below the sticky header after the page was scrolled to the bottom.
- The runner required a project-local Playwright Chromium download because the machine did not have the configured browser revision.
- The E2E launcher now explicitly migrates its disposable database before starting the app, avoiding an intermittent login-before-migrations race observed during verification.
