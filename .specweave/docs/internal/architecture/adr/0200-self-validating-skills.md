---
id: adr-0200-self-validating-skills
---

# ADR-0200: Self-Validating Skills Architecture

**Status**: Proposed
**Date**: 2026-01-19
**Author**: SpecWeave Team

## Context

Skills in SpecWeave execute domain-specific work (frontend components, backend APIs, mobile features, etc.) but currently lack automatic validation. Users must manually run tests to verify the work was done correctly.

We need a system where:
1. Each skill defines its own validation strategy
2. Validation runs automatically after skill work completes
3. Results are surfaced to users as warnings (non-blocking)
4. The system handles authentication for protected endpoints

## Decision

Implement **Self-Validating Skills** with these components:

### 1. VALIDATION.md File Per Skill

Each skill folder can contain an optional `VALIDATION.md` that defines:

```markdown
---
domain: frontend
validation_type: automated
requires_auth: false
timeout_seconds: 120
---

# Validation Strategy

## Quick Validation (< 30s)
- TypeScript type check: `npx tsc --noEmit`
- Lint check: `npm run lint`

## Standard Validation (< 2min)
- Unit tests: `npm test`
- Component tests: `npm run test:components`

## Full Validation (< 10min)
- E2E tests: `npx playwright test`
- Visual regression: `npm run test:visual`

## Success Criteria
- All tests pass
- No TypeScript errors
- Coverage >= 80%

## Auth Strategy
N/A - frontend tests don't require auth
```

### 2. Domain-Specific Validation Strategies

#### Frontend Skills
```yaml
domain: frontend
validations:
  quick:
    - command: "npx tsc --noEmit"
      name: "TypeScript check"
      timeout: 30
    - command: "npm run lint -- --max-warnings 0"
      name: "Lint check"
      timeout: 30
  standard:
    - command: "npm test -- --coverage"
      name: "Unit tests"
      timeout: 120
  full:
    - command: "npx playwright test"
      name: "E2E tests"
      timeout: 300
    - command: "npm run test:visual"
      name: "Visual regression"
      timeout: 180
      optional: true
preview:
  command: "npm run dev"
  port: 3000
  wait_for: "Ready"
```

#### Backend Skills
```yaml
domain: backend
validations:
  quick:
    - command: "npx tsc --noEmit"
      name: "TypeScript check"
      timeout: 30
  standard:
    - command: "npm test"
      name: "Unit tests"
      timeout: 120
    - command: "npm run test:integration"
      name: "Integration tests"
      timeout: 180
  full:
    - command: "npm run postman:generate"
      name: "Generate Postman collection"
      timeout: 60
    - command: "npm run postman:test"
      name: "Run Postman tests"
      timeout: 300
api_testing:
  base_url: "http://localhost:3001"
  health_check: "/health"
  auth_strategy: "jwt"  # jwt, api_key, basic, oauth2
  auth_env_var: "API_TEST_TOKEN"
  endpoints_to_test:
    - method: GET
      path: "/api/users"
      expected_status: 200
    - method: POST
      path: "/api/users"
      body_file: "tests/fixtures/user.json"
      expected_status: 201
```

#### Mobile Skills (React Native)
```yaml
domain: mobile
framework: react-native
validations:
  quick:
    - command: "npx tsc --noEmit"
      name: "TypeScript check"
      timeout: 30
    - command: "npx expo doctor"
      name: "Expo health check"
      timeout: 30
  standard:
    - command: "npm test"
      name: "Jest tests"
      timeout: 120
  full:
    - command: "npx maestro test .maestro/"
      name: "Maestro E2E"
      timeout: 600
      platform: ios
preview:
  command: "npx expo start --web"
  port: 8081
  wait_for: "Starting Metro"
  browser_url: "http://localhost:8081"
```

#### Mobile Skills (Swift/iOS)
```yaml
domain: mobile
framework: swift
validations:
  quick:
    - command: "swift build"
      name: "Swift build"
      timeout: 60
  standard:
    - command: "xcodebuild test -scheme App -destination 'platform=iOS Simulator,name=iPhone 15'"
      name: "XCTest"
      timeout: 300
  full:
    - command: "maestro test .maestro/"
      name: "Maestro E2E"
      timeout: 600
```

#### Infrastructure Skills
```yaml
domain: infrastructure
validations:
  quick:
    - command: "terraform fmt -check"
      name: "Terraform format"
      timeout: 10
    - command: "terraform validate"
      name: "Terraform validate"
      timeout: 30
  standard:
    - command: "terraform plan -out=tfplan"
      name: "Terraform plan"
      timeout: 120
  full:
    - command: "tflint"
      name: "TFLint check"
      timeout: 60
    - command: "checkov -d ."
      name: "Security scan"
      timeout: 120
```

#### ML Skills
```yaml
domain: ml
validations:
  quick:
    - command: "python -m py_compile *.py"
      name: "Python syntax"
      timeout: 10
    - command: "ruff check ."
      name: "Lint check"
      timeout: 30
  standard:
    - command: "pytest tests/ -v"
      name: "Pytest"
      timeout: 180
  full:
    - command: "python scripts/validate_model.py"
      name: "Model validation"
      timeout: 600
```

### 3. Validation Runner

New TypeScript module: `src/core/skills/skill-validator.ts`

```typescript
interface ValidationConfig {
  domain: string;
  validations: {
    quick: ValidationStep[];
    standard: ValidationStep[];
    full: ValidationStep[];
  };
  preview?: PreviewConfig;
  api_testing?: ApiTestConfig;
}

interface ValidationStep {
  command: string;
  name: string;
  timeout: number;
  optional?: boolean;
  platform?: string;
}

interface ValidationResult {
  passed: boolean;
  level: 'quick' | 'standard' | 'full';
  steps: StepResult[];
  duration_ms: number;
  coverage?: number;
}

class SkillValidator {
  async validate(
    skillFqn: string,
    level: 'quick' | 'standard' | 'full' = 'quick'
  ): Promise<ValidationResult>;

  async runQuickValidation(projectRoot: string): Promise<ValidationResult>;
  async runStandardValidation(projectRoot: string): Promise<ValidationResult>;
  async runFullValidation(projectRoot: string): Promise<ValidationResult>;
}
```

### 4. API Testing with Authentication

For backend skills that create protected endpoints:

```typescript
interface ApiTestConfig {
  base_url: string;
  health_check: string;
  auth_strategy: 'jwt' | 'api_key' | 'basic' | 'oauth2' | 'none';
  auth_env_var?: string;
  auth_header?: string;
  endpoints_to_test: EndpointTest[];
}

class ApiValidator {
  async validateEndpoints(config: ApiTestConfig): Promise<ApiTestResult> {
    // 1. Check server is running (health check)
    // 2. Get auth token from env or generate
    // 3. Test each endpoint with curl/fetch
    // 4. Validate response status and shape
  }

  async generatePostmanCollection(
    openApiPath: string,
    outputPath: string
  ): Promise<void>;

  async runPostmanCollection(
    collectionPath: string,
    envPath: string
  ): Promise<PostmanResult>;
}
```

### 5. Integration with Hooks

Add to `hooks.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "matcher_content": "\\.(tsx?|jsx?|vue|svelte)$",
        "hooks": [{
          "type": "command",
          "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/universal/dispatcher.mjs\" skill-validate frontend quick"
        }]
      },
      {
        "matcher": "Write",
        "matcher_content": "(controller|service|route|api)\\.(ts|js)$",
        "hooks": [{
          "type": "command",
          "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/universal/dispatcher.mjs\" skill-validate backend quick"
        }]
      }
    ]
  }
}
```

### 6. Agent SDK Integration for Validation

Use Haiku model to:
1. Analyze test failures and suggest fixes
2. Validate API response shapes match specs
3. Check code quality before validation runs

```typescript
interface ValidationAgent {
  // Pre-validation: Check if code looks correct
  async preValidate(
    changedFiles: string[],
    skillDomain: string
  ): Promise<{ shouldRun: boolean; concerns: string[] }>;

  // Post-validation: Analyze failures
  async analyzeFailure(
    testOutput: string,
    testType: string
  ): Promise<{ cause: string; suggestion: string }>;
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (1 week)
- [ ] Create `ValidationConfig` type and parser
- [ ] Create `SkillValidator` class
- [ ] Add VALIDATION.md to frontend skill as prototype
- [ ] Integrate with post-tool-use hook

### Phase 2: Domain Validators (2 weeks)
- [ ] Frontend: E2E (Playwright), component tests
- [ ] Backend: Unit, integration, Postman generation
- [ ] Mobile: Expo preview, Maestro
- [ ] Infrastructure: Terraform validate, plan

### Phase 3: API Testing (1 week)
- [ ] ApiValidator with curl/fetch
- [ ] Auth strategies (JWT, API key, OAuth2)
- [ ] Postman collection generation
- [ ] Endpoint testing with fixtures

### Phase 4: Agent SDK Integration (1 week)
- [ ] Pre-validation code check with Haiku
- [ ] Post-validation failure analysis
- [ ] Improvement suggestions

## Consequences

### Positive
- Skills become self-documenting with validation strategies
- Users get immediate feedback on work quality
- Catches errors before they compound
- Standardizes testing across domains

### Negative
- Additional complexity in skill structure
- Validation adds latency to workflow
- Requires test infrastructure to be set up

### Neutral
- Teams can opt-out by not including VALIDATION.md
- Quick validation is default (minimal overhead)

## References

- ADR-0072: Post-task hook simplification
- ADR-0156: Hook registration single source
- Agent SDK documentation
