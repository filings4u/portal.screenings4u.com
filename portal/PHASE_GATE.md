# Phase 1 — Customer portal connection gate

**Rule:** Do not begin Phase 2 (complete authorization/branding/emails/operational UI) until all Phase 1 portal routes are mapped, authorized, integrated, and staging-tested.

## Current milestone (source-only)
- NON-DOT Employer: `unified-nondot-employer-overview` and corresponding shared-shell read-only summary committed. Checks exact selected organization/membership/subscription through `unified-nondot-account-context`; no live deployment.
- NON-DOT C/TPA: exact-account overview source committed.
- NON-DOT Employee/Driver: user-linked, employee-ID-scoped overview source committed.
- Other DOT, agency, Testing, LMS and Owner Operator adapters: source-only, staged validation pending.

## Blocked before closing Phase 1
- Resolve C/TPA-sponsored NON-DOT Employer, Employee, Driver identity and portal-code mappings with real grants.
- Resolve C/TPA DOT Employee mismatch and agency host/repository discrepancies.
- Confirm per-portal subscription, feature, role and person-specific access; enforce them in business services.
- Run TypeScript check on all newly introduced Edge Functions and JavaScript/browser integration tests.
- Deploy only into a staging environment, then exercise two-user/two-account, revoked-access and subscription mismatch tests.
- Replace read-only placeholder modules with working, permission-scoped workflow integrations; verify parity with existing portals before switching customer traffic.

## Phase 2 (NOT STARTED)
- Full dynamic logo/branding resolution for every business and organization.
- Authorized admin/customer email recipient routing, delivery logs, event hooks and staging-only email tests.
- Consistent exact ZIP-based UI, module parity, accessibility and cross-browser testing.
- Launch readiness and monitored rollout, only after acceptance.

No production systems are modified by this file. No Phase 1 completion claim is made.

## C/TPA-sponsored NON-DOT audit (2026-10-10)
- Confirmed `ctpa_workforce` in existing C/TPA NON-DOT app and live portal-access grants.
- `ctpa_employer_workforce`, `ctpa_employee_workforce`, `ctpa_driver_workforce` do not currently appear in the inspected `workforce_portal_access` grant rows, and no corresponding legacy app repositories were confirmed. Their requested hostnames are requirements, not evidence of deployed, authorized workspaces.
- Keep those variants unavailable in unified discovery until the identity model, deployed app, explicit subscription and individual account access can be verified. Do not alias them to C/TPA admin privileges.
- The branded email event catalog and shared renderer already exist, but recipient/resource checks, triggers, transport, logo verification and safe staged testing remain unfinished. Complete these **after Phase 1**, before declaring Phase 2 finished; do not send customer notifications now.
