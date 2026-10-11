# Unified customer portal: full connection gate

The user-provided portal registry is in `portal-integration-registry.json`. It is an **inventory** of requested legacy addresses, not a list of enabled or security-verified unified workspaces.

## Connection contract (required for EACH customer portal)
1. Confirm the canonical legacy GitHub implementation and its deployed customer host. Do not guess a missing repository from a hostname.
2. Confirm the exact `portal_code` and source of customer-specific memberships, subscriptions, user assignments, and plan features. Agency code and employee/driver scope are distinct entitlements.
3. Authenticate the Supabase user on the server, and resolve the **selected** organization, membership, subscription and role; fail closed on mismatch. Never select an arbitrary first eligible account when switching.
4. Return only granted workspace descriptors from unified discovery. Do not use active relationships or organization membership as a substitute for a portal-specific grant.
5. Resolve modules and actions from the verified workspace context and enforce them again on **every** business service. Menu visibility alone is not permission enforcement.
6. Reuse the existing service with scoped parameters and preserve its business workflows. Migrate the original portal UI into the shared shell without breaking it.
7. Test two users and two accounts to catch cross-account leakage; test revoked, expired and missing subscriptions.
8. Keep legacy customer sites operational until the specific migrated workspace passes staging tests.

## Scope boundaries
- `non-dot.screenings4u.com` is a public-facing site; not a customer account workspace.
- `non-dot-portal.screenings4u.com` is a business management portal; not a customer workspace. Do not auto-expose it in customer discovery.
- `lms.screenings4u.com` and `customers.screenings4u.com` are customer-facing and belong in discovery only when directly authorized.
- A mapped domain/Edge Function does **not** mean that the shared portal currently implements its modules.

## Known blockers
- `nondot-workforce-session-context` currently selects the first eligible account and needs exact account scoping.
- The current `unified-customer-workspaces` function is source only; it has not been deployed/tested.
- Workforce roles, agency roles, employee and driver grants, LMS course enrollment, and Testing customer access have different data models.
- Multi-account selection, branding, subscription gating, real module integration, full visual parity, and end-to-end tests are not complete.

Sequence: **connect/verify every requested customer portal** first; only then complete the cross-cutting operational phase (authorization hardening, dynamic branding, operational modules, exact design, staging testing). Security checks above are mandatory prerequisites during connection work, not postponed.

## NON-DOT verification findings (October 2026)
- `employer-non-dot` application config uses `employer_workforce`; `employee-workforce` uses `employee_workforce`; `driver-workforce` uses `driver_workforce`.
- `nondot-workforce-session-context` currently maps requested codes containing `employer` to `employer_workforce`, and all other requested codes to `ctpa_workforce`. It selects the first matching membership. Therefore it is not a valid authorization mechanism for an arbitrary selected employee/driver account.
- `nondot-employer-portal` forwards to `nondot-workforce-employer-portal`, which forwards to that same session-context function. These wrappers do not provide independent account selection.
- A new, separate account-scoped verification endpoint is required. Accept explicit selected membership/subscription/organization, authenticate signed-in user, validate active exact memberships, portal grant, correct C/TPA/employer/employee/driver relation and active relevant plan. Do not return any business data on mismatch.
- Do not treat the public NON-DOT site or internal NON-DOT management portal as customer workspaces.
- The source-only backend write attempted in this work session was blocked by a safety check; no new NON-DOT backend function was created or deployed.

## Scoped NON-DOT validator added (source only)
- `supabase/functions/unified-nondot-selected-context/index.ts` now validates explicit C/TPA or Employer workforce organization, active user membership, exact enabled portal/subscription grant, tenant-matched account, active matching subscription, and active plan. It does not authorize NON-DOT employee or driver portals.
- Shared shell's C/TPA NON-DOT overview calls the new validator first, then requires the legacy session and overview responses to match exactly. Legacy first-membership behavior can still block legitimate secondary accounts until the legacy overview is made selection-aware.
- This is committed GitHub source only. Deploy and test in staging first; do not mark any portal fully integrated.
