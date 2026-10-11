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

## Discovery entitlement correction (2026-10-10)
- NON-DOT organization discovery now requires same-tenant membership/grant and an active/trialing subscription with active plan. Explicit selected-account validators remain mandatory at entry and each data API.
- Discovery must still be tested against two organizations, expired subscriptions, revoked grants, C/TPA sponsorship, employee/driver personal identities, and plan-feature limits. DOT organization grants and testing/learning identity paths also need targeted review.
- Changes were committed to a source branch, NOT deployed. Phase 1 remains open; keep live preview branch cutover and deletion deferred until staging verification succeeds.

## Testing Customer and LMS discovery correction
- Discovery now excludes revoked Testing Customer portal-access rows and expired LMS enrollments. Account-specific services must independently confirm access and expiry at every request.
- The filtering has not been validated through staged multi-user integration tests. Do not enable the live preview branch cutover yet.

## DOT discovery entitlement safeguard (2026-10-10)
- DOT organization portal grants now require a non-null subscription and tenant ID and an active/trialing matching subscription in that same tenant before being advertised by discovery.
- This is a listing filter only. Individual membership roles, subscription plan features, employee/driver assignment and portal-specific session checks still require verification.
- New Edge Function sources remain uncompiled, undeployed and untested in protected staging. Do not cut over production or retire branches yet.

## DOT inactive-plan discovery protection
- Discovery now checks `plans.active=true` for each same-tenant active/trialing DOT subscription; inactive-plan workspaces are not offered.
- Runtime authorization in the underlying DOT functions, role/feature checks, TypeScript compilation and staging tests remain required. This does not close Phase 1.

## Customer-only discovery allowlist audit
- Discovery now refuses to emit public/management portal codes or unverified sponsored NON-DOT variants, even if a database grant exists. This protects the customer-facing selector from accidentally showing administrative applications.
- Syntax-only validation passed for portal-shell.js, portal-module-manifest.js and workspace/index.html JavaScript.
- Full TypeScript compilation, authenticated integration testing, staging deployments, remaining role mappings, operational modules and real browser checks are still outstanding. Do not close Phase 1 or merge into the deployment branch.


## Repeatable code validation gate
- GitHub Actions workflow `.github/workflows/phase1-validation.yml` has been committed. It checks shared portal JavaScript, inline scripts, registries, and every draft Supabase Edge Function via `deno check`.
- At the time this gate was added, no Actions workflow run had been returned for the branch. Therefore **the code validation gate has not passed yet**.
- No distinct Supabase staging environment has been identified for this portal; the connected `screenings4u Enterprise` project is production. Do not deploy draft functions there to simulate a staging test.
- Phase 1 may only be marked complete after CI passes, a protected staging backend is available, authenticated multi-tenant role/subscription tests pass, and outstanding portal variants/modules are verified. Do not delete or rewire branches while this gate is open.


## Corrected C/TPA entitlement model — approved user requirement
- A C/TPA automatically has **both DOT and NON-DOT portal entry points** from its verified C/TPA account status and active user membership, even without separate purchased portal-access grants for each side.
- Subscription status and plan features determine **which modules and operations** are enabled inside each workspace; lack of a subscription is not itself a reason to hide either C/TPA entry point.
- Access to a C/TPA's sponsored employers, their employees, or sponsored owner-operators is **not** implied by membership alone; explicit delegated grants, relationship and person/role scoping are still required.
- A direct employer administers its own customer accounts. An owner-operator may have both driver and employer permissions, determined independently.
- Current unified discovery, NON-DOT account validator and C/TPA read-only adapters still couple C/TPA entry to subscription_id and must be refactored consistently before this requirement is operational.
- Do not relax the backend subscription checks for module actions; return both portals with safe, limited navigation when no matching entitlement is present.
