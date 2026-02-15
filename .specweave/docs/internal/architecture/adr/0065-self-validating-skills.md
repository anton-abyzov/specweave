---
id: adr-0065-self-validating-skills
---

# ADR-0065: Self-Validating Skills Architecture

## Status
Proposed

## Context

Claude Code v2.1.0 introduced hooks support for skills, slash commands, and agents:
- **PreToolUse hooks** - Run before skill execution
- **PostToolUse hooks** - Run after skill execution
- **Stop hooks** - Validate completion conditions
- **SubagentStart/Stop hooks** - Validate spawned agents

This enables a paradigm shift: **Skills can now self-validate their outputs.**

## Decision

Implement a **Self-Validating Skills (SVS) pattern** where each skill:
1. Declares its validation requirements in frontmatter
2. Runs pre-execution validation (prerequisites)
3. Runs post-execution validation (quality gates)
4. Blocks completion until validation passes

## Architecture

### Skill Frontmatter Schema (Extended)

```yaml
---
name: sw:frontend-component
description: Generate a React component with tests
# NEW: Validation configuration
validation:
  # Pre-execution checks
  pre:
    - type: file_exists
      path: package.json
      message: "Must be in a Node.js project"
    - type: dependency_installed
      package: react
      message: "React must be installed"

  # Post-execution checks
  post:
    - type: tests_pass
      command: npm test -- --testPathPattern="$OUTPUT_FILE"
      message: "Generated component must pass tests"
    - type: lint_pass
      command: npm run lint -- $OUTPUT_FILE
      message: "Generated code must pass linting"
    - type: type_check
      command: npx tsc --noEmit $OUTPUT_FILE
      message: "Generated code must type-check"

  # Completion criteria
  completion:
    require_all: true
    max_retries: 3

# NEW: Hooks configuration (v2.1.0+)
hooks:
  pre_tool_use:
    - ./validate-prerequisites.sh
  post_tool_use:
    - ./validate-output.sh
  stop:
    - ./check-completion.sh
---
```

### Validation Types

| Type | Description | Example |
|------|-------------|---------|
| `file_exists` | File must exist | `package.json` |
| `dependency_installed` | npm/pip package installed | `react`, `pytorch` |
| `tests_pass` | Test command must pass | `npm test` |
| `lint_pass` | Linting must pass | `npm run lint` |
| `type_check` | Type checking must pass | `tsc --noEmit` |
| `coverage_threshold` | Coverage must meet % | `80%` |
| `schema_valid` | Output matches JSON schema | `component.schema.json` |
| `custom_command` | Any shell command | `./validate.sh` |

### Self-Healing Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-VALIDATING SKILL LOOP                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PRE-EXECUTION VALIDATION                                    │
│     └─ Check prerequisites (dependencies, files, config)        │
│     └─ If fails → BLOCK with helpful message                    │
│                                                                 │
│  2. SKILL EXECUTION                                             │
│     └─ Generate output (code, config, docs)                     │
│                                                                 │
│  3. POST-EXECUTION VALIDATION (attempt 1/3)                     │
│     ├─ Run tests → If fail → Analyze & fix → retry              │
│     ├─ Run lint → If fail → Auto-fix → retry                    │
│     └─ Type check → If fail → Fix types → retry                 │
│                                                                 │
│  4. COMPLETION CHECK                                            │
│     └─ All validations pass? → ✅ COMPLETE                      │
│     └─ Max retries hit? → ⏸️ PAUSE for human review             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation: Skill Hook Scripts

#### Pre-Tool-Use Hook (`validate-prerequisites.sh`)

```bash
#!/bin/bash
# Validates prerequisites before skill execution

SKILL_NAME="$1"
CONTEXT_FILE="$2"

# Load validation config from skill frontmatter
VALIDATIONS=$(yq '.validation.pre[]' "$SKILL_PATH")

for validation in $VALIDATIONS; do
  type=$(echo "$validation" | yq '.type')

  case "$type" in
    "file_exists")
      path=$(echo "$validation" | yq '.path')
      if [[ ! -f "$path" ]]; then
        echo "❌ PRE-VALIDATION FAILED: $path not found"
        echo '{"decision":"block","message":"Missing prerequisite: '$path'"}'
        exit 1
      fi
      ;;
    "dependency_installed")
      package=$(echo "$validation" | yq '.package')
      if ! npm ls "$package" &>/dev/null; then
        echo "❌ PRE-VALIDATION FAILED: $package not installed"
        echo '{"decision":"block","message":"Install '$package' first: npm install '$package'"}'
        exit 1
      fi
      ;;
  esac
done

echo "✅ All prerequisites met"
echo '{"decision":"approve"}'
```

#### Post-Tool-Use Hook (`validate-output.sh`)

```bash
#!/bin/bash
# Validates skill output after execution

OUTPUT_FILE="$1"
ATTEMPT="${2:-1}"
MAX_ATTEMPTS=3

# Run tests
if ! npm test -- --testPathPattern="$OUTPUT_FILE" 2>&1; then
  if [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; then
    echo "🔄 Tests failed (attempt $ATTEMPT/$MAX_ATTEMPTS), requesting fix..."
    echo '{"decision":"retry","message":"Tests failed. Please fix and regenerate."}'
    exit 0
  else
    echo "❌ Tests failed after $MAX_ATTEMPTS attempts"
    echo '{"decision":"block","message":"Tests still failing. Human review required."}'
    exit 1
  fi
fi

# Run lint
if ! npm run lint -- "$OUTPUT_FILE" 2>&1; then
  echo "🔧 Lint errors detected, auto-fixing..."
  npm run lint:fix -- "$OUTPUT_FILE"
fi

# Type check
if ! npx tsc --noEmit "$OUTPUT_FILE" 2>&1; then
  echo "❌ Type errors in generated code"
  echo '{"decision":"retry","message":"Type errors detected. Please fix types."}'
  exit 0
fi

echo "✅ All validations passed"
echo '{"decision":"approve"}'
```

### Example: Self-Validating Frontend Component Skill

```markdown
---
name: sw:react-component
description: Generate a React component with automatic test validation
validation:
  pre:
    - type: file_exists
      path: package.json
    - type: dependency_installed
      package: react
    - type: dependency_installed
      package: vitest
  post:
    - type: tests_pass
      command: npx vitest run --reporter=json $OUTPUT_PATH
    - type: lint_pass
      command: npx eslint $OUTPUT_PATH --fix
    - type: type_check
      command: npx tsc --noEmit $OUTPUT_PATH
  completion:
    require_all: true
    max_retries: 3
hooks:
  pre_tool_use:
    - plugins/specweave/hooks/validate-react-prereqs.sh
  post_tool_use:
    - plugins/specweave/hooks/validate-component-output.sh
---

# React Component Generator

You are generating a React component. Your output will be AUTOMATICALLY VALIDATED:

## Automatic Validations (you don't need to run these manually)
1. ✅ Tests will be run automatically after generation
2. ✅ Linting will be applied and auto-fixed
3. ✅ Type checking will verify your code

## Your Responsibilities
1. Generate the component with proper TypeScript types
2. Generate corresponding test file (`*.test.tsx`)
3. Export the component correctly

## Output Structure
```
src/components/
├── ComponentName.tsx      # Main component
├── ComponentName.test.tsx # Unit tests (REQUIRED)
└── index.ts              # Barrel export
```

If tests fail, I will automatically ask you to fix and regenerate.
Maximum 3 attempts before human review is required.
```

### Benefits

1. **Quality Guarantee**: Skills can't complete without passing validation
2. **Self-Healing**: Automatic retry with fix requests on failures
3. **Developer Trust**: Users know output is validated
4. **Reduced Review**: Less human review needed for generated code
5. **Consistent Standards**: Linting/typing enforced automatically

### Migration Path

1. **Phase 1**: Add validation schema to existing skills (opt-in)
2. **Phase 2**: Create hook scripts library for common validations
3. **Phase 3**: Make validation mandatory for code-generating skills
4. **Phase 4**: Add coverage tracking and quality metrics

### Configuration

In `.specweave/config.json`:

```json
{
  "skills": {
    "validation": {
      "enabled": true,
      "defaultMaxRetries": 3,
      "requireTestsForCodeGen": true,
      "autoFixLint": true,
      "blockOnTypeErrors": true
    }
  }
}
```

## Consequences

### Positive
- Higher quality skill output
- Reduced bugs in generated code
- Self-documenting validation requirements
- Automated quality enforcement

### Negative
- Longer skill execution time (validation adds overhead)
- More complex skill authoring (need to define validations)
- Potential for validation loops (bad validation config)

### Mitigations
- Cache validation results where possible
- Provide validation templates for common patterns
- Add timeout protection for validation loops

## References

- Claude Code Changelog v2.1.0: Hooks support for skills
- ADR-0045: Hook Architecture
- Stop Hook Feedback Loop Pattern: Self-healing iteration
