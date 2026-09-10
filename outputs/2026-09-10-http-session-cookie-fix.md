# HTTP session cookie fix

## Summary

Fixed authentication over a local HTTP/LAN address by setting the session cookie's `Secure` attribute from the actual request protocol instead of `NODE_ENV`. Desktop and mobile browsers can now retain the session at `http://192.168.1.58:3000`, while HTTPS requests still receive secure cookies.

## Test results

`npm.cmd run test:e2e -- tests/e2e/01-auth.spec.ts`

```text
✓ unauthenticated visitors are redirected to the account sign-in screen
✓ incorrect account credentials are rejected
✓ the correct account credentials admit the user to the dashboard

3 passed (1.3m)
```

The successful-login test also verifies that `sari_session` is HTTP-only, `SameSite=Lax`, not marked Secure on HTTP, and that an authenticated request to `/api/dashboard/today` returns HTTP 200.

## Screenshot comparison

| Before | After |
|--------|-------|
| ![Before HTTP login](./attachments/2026-09-10-http-session-cookie-fix/before-http-login.png) | ![After HTTP login](./attachments/2026-09-10-http-session-cookie-fix/after-http-login.png) |

## Notes

The before image shows the HTTP sign-in state; the after image shows the authenticated dashboard reached with the retained session cookie. Verification used the configured Pixel 7 Playwright project and a disposable test database.
