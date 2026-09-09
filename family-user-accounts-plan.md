# Family User Accounts Plan

Status: Proposal only. No application changes are included in this document.

## Recommendation

Use one owner/admin account that can create individual accounts for family members. Each person should have their own login so the audit log can identify who performed each action.

Keep account management simple for a small family operation, starting with two roles.

## Roles

| Role | Proposed access |
|------|-----------------|
| Owner/admin | Manage users, assign roles, access all store features, and review audit logs. |
| Family member | Access the everyday store features they need, with activity recorded under their own account. |

Add a manager role later only if someone needs additional responsibility without full administrator access.

## Account Lifecycle

1. The admin creates an account using the family member's name and username or email.
2. The family member sets their own password through an invitation, or receives a temporary password that must be changed at first login.
3. The family member signs in with their own account when using the app.
4. The admin can change their role, help reset access, or deactivate the account.
5. Deactivation prevents further access while preserving the person's historical audit entries.

## Account and Audit Rules

- Disable public registration; only the admin can add users.
- Use separate accounts for each person rather than shared logins.
- Restrict user management, audit log access, and major settings to the admin.
- Decide whether refunds, deletions, and price changes need additional restrictions.
- Prevent users from editing or deleting audit entries through the app.
- Record account creation, role changes, access resets, and deactivation in the audit log. Never record passwords or reset tokens.
- Preserve attribution to the original person when an account is renamed or deactivated.
- Provide a recovery method for the owner account.

## Proposed Users Page

The admin's Users page should show each person's name, username or email, role, and account status.

Available actions:

- Add user
- Change role
- Reset access
- Deactivate user

Prefer deactivation over deleting accounts so historical activity remains understandable.

## Decisions Before Implementation

- Which everyday store actions can family members perform?
- Should refunds, deletions, and price changes be admin-only?
- Will accounts use usernames or email addresses?
- Will onboarding use invitations or temporary passwords?
- How will the owner recover access if locked out?

## Suggested Implementation Order

1. Review existing authentication and audit logging.
2. Agree on permissions for the two roles.
3. Add administrator-managed accounts and enforce permissions on the server.
4. Add onboarding, access reset, and deactivation flows.
5. Connect account management events to the audit log.
6. Verify the implemented behavior with focused Playwright tests and capture screenshots of the affected UI, including before/after comparisons for UI changes.
7. Save the verification report and screenshots in the Obsidian vault according to the project's testing policy.

This document is a planning artifact; implementation and verification are future work.
