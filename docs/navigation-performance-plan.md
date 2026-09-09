# Project navigation performance plan

Status: proposed; no implementation changes made.

## Objective and scope

Make in-app navigation respond promptly, reduce redundant requests, and preserve authentication, permissions, and data accuracy. All work is within this repository. Vercel settings, hosting regions, deployment changes, database hosting configuration, and infrastructure upgrades are outside scope.

## Evidence

Browser observations on September 10, 2026 showed approximately 2.9 seconds to display Home, 1.7 seconds to display More, and 0.9 seconds to display Stock, which then continued loading data. These are individual observations including browser automation overhead, not precise network benchmarks.

The current source explains avoidable waiting:

- `app/middleware/auth.global.ts` requests `/api/auth/session` on every protected navigation.
- `app/middleware/admin.ts` repeats that request for admin routes. Several account pages request it again.
- `server/utils/current-user.ts` queries the database when resolving a session. Protected API requests independently perform this check through `server/middleware/auth.ts`.
- Several pages use blocking page-data fetching, including `app/pages/index.vue` and account/detail pages.
- `server/api/dashboard/today.get.ts` awaits three independent queries in sequence.
- Inventory already renders before its data arrives, but its requests need protection against stale responses when filters change quickly.

## 1. Capture a focused baseline

- Use the existing local Playwright setup and seeded test database; do not create test records in production.
- Measure Home, Stock, More, and one admin route. Record session request counts, page-data request counts, click-to-heading time, and click-to-data-ready time separately.
- Capture screenshots of the affected views before changes, including a controlled delayed-data state. Preserve the baseline commit identifier and use the same viewport and fixtures afterward.
- Use request interception to hold responses until explicitly released. This provides deterministic evidence of whether navigation waits for data, without relying on fragile millisecond assertions.

## 2. Share session state across navigation

Primary files: new `app/composables/useSession.ts`, both route middleware files, login/logout handling, and session-consuming account pages.

- Store session data in Nuxt request-scoped/hydrated state, never server module-global user state or persistent browser storage.
- Provide one session loader that deduplicates simultaneous requests. Scope any in-flight promise to the current application/request instance.
- Resolve the session on initial protected entry and reuse that state for route guards and account display. Reuse the login response if it includes the required user information; otherwise perform one shared session fetch after login.
- Use a concrete freshness policy: reuse a successful session for 60 seconds, then revalidate on the next protected navigation. Admin guards and page components must reuse the same validation result.
- Clear session and user-specific page caches on logout and confirmed authentication failure. Refresh session state after password changes and changes affecting the current user's role or account status.
- Distinguish unauthenticated responses from transient network/server failures; provide retry feedback for the latter.
- Keep backend cookie verification, active-user checks, role checks, and forced-password-change enforcement on every protected API request. Client session state is a navigation convenience, not authorization.
- Handle API rejection of stale client state: 401 clears the session and returns to login; password-change-required responses refresh state and redirect appropriately; ordinary forbidden responses show access denied without incorrectly logging out. Use structured error reasons if necessary.

Acceptance: within the freshness window, Home → Stock → More causes no new session requests after initialization; an expired session triggers at most one shared validation request. Direct protected entry and server rendering remain authenticated and isolated per user.

## 3. Render destination pages before page data completes

Primary files: `app/pages/index.vue`, affected settings and product/count detail pages, and `app/app.vue` if a navigation indicator is needed.

- Use Nuxt lazy page-data fetching where page content currently blocks route completion. Keep route authorization separate from data loading.
- Render the destination heading and navigation immediately after the session guard permits entry, with loading placeholders in data-dependent areas.
- Distinguish loading, failed, empty, and loaded states. Do not show zero sales, missing products, or empty results while a request is merely pending or has failed.
- Provide retry controls for failed page-data requests and prevent data-dependent actions until their prerequisites load.
- Audit dashboard lifecycle refresh behavior and remove duplicate initial loads only if baseline request counts demonstrate them. Define one initial fetch and deliberate subsequent refresh triggers.
- Ensure changes after sales, product edits, stock adjustments, and account updates remain visible on subsequent affected page visits. Avoid introducing persistent business-data caching in this phase.
- Preserve the existing visual design; limit visual changes to loading and error feedback.

Acceptance: with a page-data response held by Playwright, the destination heading and loading state are visible before that response is released. Releasing it displays the correct data without a full reload.

## 4. Reduce dashboard query waiting

Primary file: `server/api/dashboard/today.get.ts`.

- Start the independent transaction totals, item totals, and low-stock queries together and await them with `Promise.all`.
- Preserve date boundaries, voided-sale filtering, output fields, numeric conversion, ordering, and low-stock limits.
- Verify the query scheduling with the configured drivers. Parallel promises remove the application-level sequential dependency; actual database speedup depends on driver and connection behavior.
- Do not add speculative indexes, rewrite unrelated report queries, or change database connection settings without evidence that they are needed.

Acceptance: seeded dashboard totals and low-stock results are unchanged, and the handler no longer explicitly waits for one independent query before starting the next.

## 5. Keep inventory feedback accurate during fast interaction

Primary file: `app/pages/inventory/index.vue`.

- Preserve the existing 200 ms search debounce.
- Cancel superseded requests or ignore results whose request identifier is no longer current.
- Ensure only the current request controls the loading/error state; clean up timers and pending work on unmount.
- Add visible failure/retry feedback so a request failure does not appear to be an empty inventory.

Acceptance: when two filter requests finish out of order, only results matching the latest filters appear.

## Verification and delivery

Write a focused Playwright spec, provisionally `tests/e2e/09-navigation-performance.spec.ts`, using the existing setup and helpers. Cover only these changes:

1. Session request deduplication during warm navigation and expiry revalidation.
2. Initial/direct protected navigation, member access denial, logout, inactive users, and required password changes as they intersect with shared session state. Include separate browser contexts to catch user-state leakage.
3. Destination visibility while dashboard/detail data is held, followed by correct loaded content and retry behavior.
4. Dashboard values with seeded transactions, including a voided transaction, and unchanged low-stock results.
5. Inventory out-of-order response handling.
6. Fresh affected data after a representative product or stock mutation, and no previous-user data after switching accounts.

Run the focused spec and fix failures before considering implementation complete:

```powershell
npm.cmd run test:e2e -- tests/e2e/09-navigation-performance.spec.ts
```

Run the project build after implementation. Run additional existing tests only when they directly cover modified behavior; do not launch a full regression suite.

Capture before/after screenshots using `await page.screenshot(...)` for the same affected views and controlled loading states. Report request-count reductions and separate navigation/data timings; do not promise production speed from local measurements.

For the implementation report, use the implementation date in `<YYYY-MM-DD>-navigation-performance`:

- Report: `D:\Submit\Obsidian Vault\Reports\<YYYY-MM-DD>-navigation-performance.md`
- Screenshots: `D:\Submit\Obsidian Vault\Reports\attachments\<YYYY-MM-DD>-navigation-performance\`

Include Summary, Test results with relevant output, a before/after screenshot table using relative links such as `./attachments/<YYYY-MM-DD>-navigation-performance/home-before.png`, and Notes. Obtain filesystem write approval if the vault is outside the permitted workspace. Finish by providing the report path and its summary.

## Completion criteria

- Warm navigation removes redundant session round trips within the defined freshness window.
- Data loading no longer blocks affected page shells, and failures have clear recovery feedback.
- Server-side security and existing business results remain correct.
- Independent dashboard queries are dispatched together; inventory cannot render superseded filter results.
- Focused Playwright tests pass, the build succeeds, and the Obsidian report includes before/after evidence.
- No hosting or Vercel configuration changes are included.
