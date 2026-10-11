#!/usr/bin/env python3
"""Structural release gate for NON-DOT selected-account replacements.
Not a substitute for authenticated integration tests, RLS review, or runtime permission tests.
"""
from pathlib import Path

ROOT = Path("supabase/patches")
FILES = {
    "nondot-workforce-session-context": ['"organization_id","membership_id","subscription_id"', 'eq("id",body.membership_id)', 'eq("organization_id",body.organization_id)', 'eq("subscription_id",body.subscription_id)', 'sq.data.tenant_id!==tenantId'],
    "nondot-workforce-ctpa-programs": ['"organization_id","membership_id","subscription_id"', 'eq("id",body.membership_id)', 'eq("organization_id",body.organization_id)', 'eq("id",body.subscription_id)', 'eq("tenant_id",ctpa.tenant_id)'],
    "nondot-workforce-ctpa-testing": ['"organization_id","membership_id","subscription_id"', 'eq("id",body.membership_id)', 'eq("organization_id",body.organization_id)', 'eq("subscription_id",body.subscription_id)', 'eq("tenant_id",ctpa.tenant_id)'],
    "nondot-employer-people": ['"organization_id","membership_id","subscription_id"', 'eq("id",body.membership_id)', 'eq("organization_id",body.organization_id)', 'eq("subscription_id",body.subscription_id)', 'eq("tenant_id",employer.tenant_id)'],
    "nondot-employer-programs": ['"organization_id","membership_id","subscription_id"', 'eq("id",body.membership_id)', 'eq("organization_id",body.organization_id)', 'eq("subscription_id",body.subscription_id)', 'eq("tenant_id",employer.tenant_id)'],
}
for name, required in FILES.items():
    target = ROOT / name / "index.ts"
    source = target.read_text()
    missing = [snippet for snippet in required if snippet not in source]
    if missing:
        raise SystemExit(f"{target}: missing structural checks {missing}")
    print(f"PASS: {name} has required selected-account scope markers")
# Prevent a foreign program ID from triggering enrollment changes after a no-op archive.
programs = (ROOT / "nondot-employer-programs" / "index.ts").read_text()
archive = programs.split('if(action==="archive"){', 1)[1]
assert 'if(!p.data)return J({error:"Program not found for selected employer."},404);' in archive
assert archive.index('if(!p.data)return J(') < archive.index('db.from("workforce_employee_programs").update(')
assert 'if(valid.size!==desired.length)return J(' in programs
print("PASS: employer program archive and enrollment scope regression guards")
print("PASS: static NON-DOT authorization guard audit (runtime verification still required)")
