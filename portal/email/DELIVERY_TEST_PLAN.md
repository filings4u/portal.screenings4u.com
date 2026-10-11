# Controlled email delivery test plan

This branch does **not** send real email. The audience resolver responds with `delivery_enabled:false`. All requests must be internal and must specify an exact organization, portal and subscription.

## Preconditions
- Verify an internal calling service, not a customer browser, is the only permitted caller.
- Confirm the selected subscription matches the portal grant and business account; organization-only matching is insufficient.
- Ensure the target user is actively assigned to that portal and that the specific event resource authorizes them.
- Resolve customer and business logos from verified branding records; do not accept branding from user input.
- Check notification preferences, bounce/suppression, event idempotency and a verified sender domain.

## Negative tests
- Wrong organization, wrong portal code and wrong subscription must each fail closed.
- Revoked membership, disabled portal access, expired subscription and missing plan entitlement must fail.
- A user with two accounts must never receive notifications for the other account.
- A regular customer must never receive admin-only event details.
- Result notifications must not contain sensitive results or other health details.
- Replaying the same event identifier must not send an additional email.
- Unverified or non-HTTPS logo and CTA URLs must be rejected or fall back safely.

## Staging-only delivery workflow
1. Compile all TypeScript functions and renderer; run unit tests against the negative cases.
2. Build a provider sandbox/test-recipient dispatcher behind an explicit disabled-by-default flag.
3. Map each event to a verified action source, trusted recipient resolver and idempotent log.
4. Verify at least one admin/customer fixture per portal family, then enable one event at a time.
5. Only after signoff, deploy to production with incremental monitoring.

**Current scope:** The generic audience function resolves only the affected subject user and does not authorize notification dispatch. Admin fanout is intentionally suspended pending resource-specific role and subscription checks. No email delivery or event triggers are enabled.