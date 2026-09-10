# Safari mobile tap fix

## Summary

Fixed Safari/mobile-WebView hit testing on Checkout and Inventory by removing `backdrop-filter` from sticky and fixed interaction layers and using opaque surfaces. This avoids iOS Safari retaining an oversized compositing layer that intercepts product-row and bottom-navigation taps.

## Test results

`npx.cmd playwright test tests/e2e/14-mobile-pwa-hit-testing.spec.ts --config=playwright.safari.config.ts`

```text
✓ [mobile-webkit] standalone mobile product rows and bottom navigation remain tappable (6.6s)

1 passed (1.0m)
```

The iPhone 13/WebKit flow verified a Checkout product tap, Stock bottom-tab tap, unsaved-cart confirmation, Inventory product tap, and Sale bottom-tab tap.

## Screenshot comparison

| Before | After |
|--------|-------|
| ![Before](./attachments/2026-09-10-safari-mobile-tap-fix/before-safari-inventory.png) | ![After](./attachments/2026-09-10-safari-mobile-tap-fix/after-safari-inventory.png) |

## Notes

The automated check uses Playwright WebKit with an iPhone 13 viewport and standalone display-mode emulation. It closely exercises Safari's engine, though it is not a physical iPhone run.
