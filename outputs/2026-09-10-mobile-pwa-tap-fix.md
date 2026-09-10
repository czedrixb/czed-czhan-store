# Mobile PWA tap fix

## Summary

Fixed product rows and bottom navigation becoming untappable in real mobile browsers and standalone/home-screen mode. The global full-screen confirmation dialog is now client-only and is removed from the DOM whenever inactive, preventing mobile WebViews from hit-testing an invisible fixed overlay above Checkout and Inventory.

## Test results

`npm.cmd run test:e2e -- tests/e2e/14-mobile-pwa-hit-testing.spec.ts`

```text
✓ [mobile-chrome] standalone mobile product rows and bottom navigation remain tappable (4.9s)

1 passed (1.1m)
```

The focused Pixel 7 flow verified a Checkout product tap, an unsaved-cart confirmation triggered from the Stock bottom tab, dismissal of the modal layer after accepting, an Inventory product tap, and navigation back to Checkout through the bottom tab.

## Screenshot comparison

| Before | After |
|--------|-------|
| ![Before](./attachments/2026-09-10-mobile-pwa-tap-fix/before-inventory.png) | ![After](./attachments/2026-09-10-mobile-pwa-tap-fix/after-inventory.png) |

## Notes

Standalone display mode was emulated in the configured Pixel 7 Playwright project. The prior screenshot is the same populated Inventory mobile view from the immediately preceding navigation attempt; the after screenshot is from the new end-to-end tap flow.
