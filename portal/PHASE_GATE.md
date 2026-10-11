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
