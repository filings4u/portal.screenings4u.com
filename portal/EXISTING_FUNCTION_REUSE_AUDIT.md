# Phase 1 — Existing Function Reuse and Consolidation Audit

**Source of truth:** Existing Screenings4u Enterprise project `elpbnytpciqnbexiaebp`. Production Edge Functions remain untouched. No extra project/tables/customer rows.

## Confirmed by direct inspection of deployed `workforce-workspaces` source
- Authenticates the bearer token; queries active DOT organization memberships, organizations, portal access, C/TPAs, employers, owner-operators, subscriptions and active plans.
- Discovers some DOT subscriptions and individual DOT account-type assignments.
- Also emits `management:*`, `business:*`, `workforce:*`, and `testing:customer` entries. **Never pass management/staff entries straight into a customer-only selector.**
- `workforce:*` and `testing:customer` are not the customer portal codes expected by the draft selector; normalize only after independently verifying recipient access and preserving the exact organization/tenant/assignment.
- The deployed implementation does not implement complete NON-DOT organization-membership/C/TPA discovery or LMS enrollment discovery, and its initial DOT C/TPA listing is subscription/grant-based. These differ from the user's requirement that a verified C/TPA gets DOT and NON-DOT portal ENTRY automatically while subscriptions control module entitlements.
- The existing function is a useful base, **not** a drop-in replacement for the draft `unified-customer-workspaces`. Replacing its response shape could break current callers.

## Decision / safe migration
1. Keep existing `workforce-workspaces`, `portal-access-context`, DOT session/action, NON-DOT C/TPA and employer, Testing and LMS functions unchanged until verified.
2. Add a **versioned customer-only discovery contract** via a deliberately scoped existing-function extension or a single temporary compatibility adapter; do not rewrite existing responses used by legacy customers.
3. Normalize to canonical customer codes; exclude management/public workspaces; keep user-specific role/assignment/tenant/subscription scope. A C/TPA's dual entry is separate from feature authorization.
4. Audit which old route functions accept *selected* account IDs and enforce role/resource authorization before wiring a live action. Do not replace backend workflows with counts/placeholder screens.
5. Avoid deploying the nine draft `unified-*` functions as a package. Review each for redundant behavior; deploy only the minimum independently authorized integration capability after authenticated tests.
6. Require client compatibility checks, multi-organization C/TPA/sponsored/direct/owner-operator cases, revoked access, plan expiration, and actual module parity before flipping production traffic.

## Open release gates
- Versioned customer discovery/selected-account contract implementation and authenticated verification.
- Sponsored employer, employee, driver and owner-operator role/tenant mapping, including the three unverified C/TPA-sponsored NON-DOT URLs.
- Cross-business C/TPA entry and independent subscription module-gating.
- Full operational navigation/actions, not only read-only summaries.
- Protected end-to-end testing without exposing production customers.
- Branch/deployment cutover only when verified; Phase 2 branded emails remain deferred.

This audit is based on deployed source inspected on the date of review; it does not certify those functions' live behavior with test users.
