# Screenings4u branded email integration — pre-release contract

## Scope
Every customer portal in `../portal-integration-registry.json` uses the same email HTML/text renderer (`renderer.ts`), with branding selected from the **verified workspace**, not a caller-supplied logo. Event types and intended *roles* are defined in `event-catalog.json`. An entry in the catalog does not activate an email.

## Branding precedence
1. DOT C/TPA: verified `ctpa_id` → `ctpa_branding` (logo_path, portal_name, primary_color, accent_color).
2. DOT Employer: verified `employer_id` → `employer_branding`. For C/TPA-sponsored employer, honor the account's effective branding policy rather than arbitrarily using employer branding.
3. NON-DOT C/TPA: `workforce_ctpa_branding` by verified `ctpa_id`.
4. NON-DOT Employer: `workforce_employer_branding` by verified `employer_id`; honor `apply_email` and account scope.
5. Learning Center, Testing Services and generic enterprise account: business-unit branding records or verified public Enterprise logo. Actual per-business asset URL must be confirmed; no guess or placeholder stock logo.
6. If no verified logo exists, renderer uses a legible branded text header. Logo paths are storage paths, not inherently trusted URLs; resolve against an approved storage bucket server-side and restrict to https.

## Recipient routing — mandatory server checks
- Never accept arbitrary `to` addresses, `actor_user_id`, `branding.logo_url`, or organization IDs as authorization.
- The service that owns an event publishes a **trusted internal event** with a stable event ID, actor, organization/tenant, subject record ID and portal code.
- Resolve recipient identities through existing active memberships and explicit role/portal grants for that organization; confirm the subscription is active when required.
- For each intended role (customer, admin, learner, assigned support agent, authorized results viewer, billing contact, donor), resolve only users who are entitled to the specific affected resource. Distinguish business admins from Screenings4u internal staff; internal staff notifications require assigned business scope.
- Do not send result details, diagnoses, test outcomes, medical contents, credentials, or full personal identifiers in email. Send generic notification with a deep link to authenticated portal access.
- Support notification preferences, suppression/unsubscribe rules where applicable, bounces, rate limiting, retries, and deduplication; transactional/security event classification must be explicit.
- Write idempotent delivery logs and dispatch only after the source transaction commits. Reuse existing `workforce_dot_email_events`, `testing_email_events`, `training_email_events` when suited, or add a migration after reviewing schemas.
- Verify sending domain and sender identity in email provider before enabling transport. Do not automatically email real users from a development branch.

## Per-portal examples
C/TPA DOT and agency portals: memberships and subscriptions, program activity, compliance tasks, worker onboarding, selections, orders, document availability, billing, support.
NON-DOT C/TPA/Employer/Employee/Driver: program assignment, worker invites, testing order/status, account access, document availability, billing, support — filtered by individual role.
Owner-Operator: driver enrollment, consortium, testing, compliance and return-to-duty updates.
Learning Center: course enrollment/completion, live sessions, certificate availability, support.
Testing Customer: purchase/order, donor assignment, testing status, securely available results/documents and support.

## Release gates
1. Validate email renderer and template metadata via TypeScript compiler and local tests, including unsafe HTML escaping and non-HTTPS CTA prevention.
2. Resolve each event's actual source and recipient query; prevent cross-tenant/admin over-notification.
3. Verify real business logos or intentionally use text fallback.
4. Stage delivery through sandbox/test recipients first. Do not connect production event triggers before approval.
5. Review auth, subscription, modules, account switching, staging and design parity for the unified portal independently of email readiness.

**Current state**: event catalog and renderer source saved. No provider templates published, recipients dispatched or live triggers activated.
