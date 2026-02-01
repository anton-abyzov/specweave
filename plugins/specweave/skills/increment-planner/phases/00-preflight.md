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

## STEP 0B: Deep Interview Mode Detection (v1.0.195+)

**Run this command:**
```bash
deepInterview=$(jq -r '.planning.deepInterview.enabled // false' .specweave/config.json 2>/dev/null)
enforcement=$(jq -r '.planning.deepInterview.enforcement // "advisory"' .specweave/config.json 2>/dev/null)
minQuestions=$(jq -r '.planning.deepInterview.minQuestions // 10' .specweave/config.json 2>/dev/null)

if [ "$deepInterview" = "true" ]; then
  echo "DEEP INTERVIEW MODE ACTIVE"
  echo "Enforcement: $enforcement"
  echo "Minimum questions: $minQuestions"
  echo ""

  if [ "$enforcement" = "strict" ]; then
    echo "⚠️ STRICT MODE: spec.md BLOCKED until ALL categories covered!"
    echo "Categories: architecture, integrations, ui-ux, performance, security, edge-cases"
  fi

  echo ""
  echo "BEFORE creating spec, you MUST:"
  echo "1. Ask thorough questions about architecture, integrations, UI/UX"
  echo "2. Cover: performance, security, edge cases"
  echo "3. Continue until requirements are crystal clear"
  echo ""
  echo "Load PM skill phases/00-deep-interview.md for question templates"
fi
```

**If Deep Interview Mode is enabled:**
1. Store `DEEP_INTERVIEW=true` for workflow
2. Load PM skill's `phases/00-deep-interview.md`
3. Conduct thorough interview BEFORE proceeding to STEP 1
4. Only continue after interview summary is complete

## STEP 0C: Initialize Interview State (Strict Mode Only)

**If strict enforcement is enabled, initialize interview tracking:**

```bash
# After increment ID is known, initialize interview state
if [ "$enforcement" = "strict" ]; then
  INCREMENT_ID="XXXX-name"  # Replace with actual increment ID
  mkdir -p .specweave/state

  # Create interview state file
  cat > ".specweave/state/interview-${INCREMENT_ID}.json" << EOF
{
  "incrementId": "${INCREMENT_ID}",
  "startedAt": "$(date -Iseconds)",
  "coveredCategories": {}
}
EOF

  echo "✅ Interview tracking initialized for ${INCREMENT_ID}"
  echo "Mark categories as you cover them:"
  echo "  specweave interview mark-covered ${INCREMENT_ID} architecture \"summary\""
fi
```

**Or use CLI:**
```bash
specweave interview start XXXX-name
```

## Next Phase

After pre-flight passes:
- If `DEEP_INTERVIEW=true` → Conduct interview first
- If `enforcement=strict` → Initialize interview state
- Then load `phases/01-project-context.md` for project selection
