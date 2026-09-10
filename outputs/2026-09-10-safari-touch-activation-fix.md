# Safari touch activation fix

## Summary

Added an explicit Safari touch-end activation path to Checkout product buttons, Inventory product links, and the bottom navigation. Touch activation prevents Safari's follow-up synthetic click and invokes each action once, while mouse and keyboard users retain the standard click/link behavior.

## Test results

`npx.cmd playwright test tests/e2e/14-mobile-pwa-hit-testing.spec.ts --config=playwright.safari.config.ts`

```text
✓ [mobile-webkit] standalone mobile product rows and bottom navigation remain tappable (6.6s)

1 passed (1.4m)
```

The focused iPhone 13/WebKit flow tapped a Checkout product, navigated through the unsaved-cart confirmation, tapped an Inventory product, and used the bottom navigation to return to Checkout.

## Screenshot comparison

| Before | After |
|--------|-------|
| ![Before](./attachments/2026-09-10-safari-touch-activation-fix/before-safari-touch.png) | ![After](./attachments/2026-09-10-safari-touch-activation-fix/after-safari-touch.png) |

## Notes

Playwright WebKit approximates physical Safari behavior but does not replace a physical-device check. The LAN server must be refreshed after rebuilding so Safari receives the new hashed assets.
