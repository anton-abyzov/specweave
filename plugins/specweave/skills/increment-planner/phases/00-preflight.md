# Phase 0: Pre-Flight Checks

Load this phase when starting increment planning.

## STEP 0-Prime: Self-Awareness Check

**Detect if running in SpecWeave repository itself!**

```bash
# Check if this is SpecWeave repo
if grep -q '"name": "specweave"' package.json 2>/dev/null; then
  echo "WARNING: You are in the SpecWeave framework repository!"
  echo "Confirm intent: 1) Framework dev, 2) Testing, 3) Cancel"
fi
```

## STEP 0: Detect Multi-Project Mode

Run BEFORE creating user stories:

```bash
# Automated detection
specweave context projects
```

**If multi-project detected:**
- Generate project-scoped US: `US-FE-001`, `US-BE-001`
- Use project-scoped AC-IDs: `AC-FE-US1-01`
- Group by project in spec.md

**Project Prefix Detection from Repo Names:**
```
sw-app-fe     → FE (frontend)
sw-app-be     → BE (backend)
sw-app-shared → SHARED
my-app-mobile → MOBILE
infra-*       → INFRA
```

## STEP 0A: TDD Mode Detection

**Run this command:**
```bash
testMode=$(jq -r '.testing.defaultTestMode // "test-after"' .specweave/config.json 2>/dev/null)
coverageTarget=$(jq -r '.testing.defaultCoverageTarget // 80' .specweave/config.json 2>/dev/null)

if [ "$testMode" = "TDD" ]; then
  echo "TDD MODE ACTIVE - Use tasks-tdd-single-project.md template"
  echo "Structure: RED → GREEN → REFACTOR triplets"
else
  echo "STANDARD MODE - Use tasks-single-project.md template"
fi
```

**Store results for STEP 3:**
- `TASK_TEMPLATE` - Which template to use
- `testMode` - For metadata.json
- `coverageTarget` - For metadata.json

## Next Phase

After pre-flight passes, load `phases/01-project-context.md` for project selection.
