---
increment: 0157-skill-routing-optimization
title: "Skill Routing Optimization - Technical Plan"
status: planning
---

# Technical Plan: Skill Routing Optimization and Self-Awareness Guards

## Architecture Overview

This refactor improves SpecWeave's command routing and adds safety guards for development workflows.

**Key Components**:
1. **Repository Detector** - Detect when running in SpecWeave repo itself
2. **Skill Router** - Fix `/sw:increment` → `increment-planner` flow
3. **Increment Validator** - Validate increment numbers
4. **Skill Visibility** - Control internal vs public skills
5. **Error Message Formatter** - Consistent, helpful errors

## Component Design

### 1. Repository Detector

**Purpose**: Detect SpecWeave repo to provide contextual warnings

**Location**: `src/utils/repository-detector.ts`

**Implementation**:
```typescript
export interface RepositoryInfo {
  isSpecWeaveRepo: boolean;
  detectionSignals: string[];
  confidence: 'high' | 'medium' | 'low';
}

export function detectSpecWeaveRepository(cwd: string = process.cwd()): RepositoryInfo {
  const signals: string[] = [];

  // Signal 1: package.json name
  const packagePath = path.join(cwd, 'package.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (pkg.name === 'specweave') {
      signals.push('package.json:name=specweave');
    }
  }

  // Signal 2: src/cli/commands directory
  if (fs.existsSync(path.join(cwd, 'src/cli/commands'))) {
    signals.push('src/cli/commands exists');
  }

  // Signal 3: plugins/specweave directory
  if (fs.existsSync(path.join(cwd, 'plugins/specweave'))) {
    signals.push('plugins/specweave exists');
  }

  // Confidence based on signal count
  const isSpecWeaveRepo = signals.length >= 2;
  const confidence = signals.length >= 3 ? 'high'
                   : signals.length === 2 ? 'medium'
                   : 'low';

  return { isSpecWeaveRepo, detectionSignals: signals, confidence };
}
```

**Integration Points**:
- Called at start of `/sw:increment` command
- Called in `increment-planner` skill (Step 0)
- Cached for session duration

### 2. Skill Routing Fix

**Problem**: `/sw:increment` command doc says "invoke increment-planner" but I called `/sw:plan`

**Files to Modify**:
- `plugins/specweave/commands/increment.md` (documentation)
- Skills should invoke `Skill(command: "increment-planner")` not `/sw:plan`

**Correct Flow**:
```
User: /sw:increment "Add feature X"
  ↓
Claude executes: increment.md prompt
  ↓
Prompt says: Invoke increment-planner skill
  ↓
Claude: Skill(command: "increment-planner")
  ↓
increment-planner skill:
  - Creates metadata.json
  - Creates spec.md template
  - Creates plan.md template (optional)
  - Creates tasks.md template
  - Returns guidance to complete in main conversation
```

**vs WRONG Flow**:
```
User: /sw:increment "Add feature X"
  ↓
Claude executes: increment.md prompt
  ↓
Prompt says: Invoke increment-planner skill
  ↓
Claude INCORRECTLY: Skill(command: "sw:plan")  ← BUG!
  ↓
/sw:plan expects EXISTING increment with spec.md
  ↓
ERROR: increment not found!
```

**Fix**:
- Clarify in `increment.md` documentation: "You MUST invoke increment-planner skill"
- Add example: `Skill(command: "increment-planner", args: "...")`
- `/sw:plan` should validate increment exists BEFORE doing anything

### 3. Increment Number Validator

**Location**: `src/core/increment-validator.ts`

**Implementation**:
```typescript
export interface IncrementNumberValidation {
  isSequential: boolean;
  requested: string;
  nextAvailable: string;
  recommendation: 'use-next' | 'force-requested' | 'cancel';
  warning?: string;
}

export function validateIncrementNumber(
  requested: string,
  projectRoot: string
): IncrementNumberValidation {
  // Get next available number
  const incrementsDir = path.join(projectRoot, '.specweave/increments');
  const entries = fs.readdirSync(incrementsDir);
  const numbers = entries
    .filter(e => /^\d{4}/.test(e))
    .map(e => parseInt(e.substring(0, 4), 10));

  const highest = Math.max(0, ...numbers);
  const nextAvailable = String(highest + 1).padStart(4, '0');
  const requestedNum = requested.substring(0, 4);

  const isSequential = requestedNum === nextAvailable;

  if (isSequential) {
    return {
      isSequential: true,
      requested: requestedNum,
      nextAvailable,
      recommendation: 'use-next'
    };
  }

  // Non-sequential
  return {
    isSequential: false,
    requested: requestedNum,
    nextAvailable,
    recommendation: 'use-next',
    warning: `Requested ${requestedNum} but next available is ${nextAvailable}. Non-sequential numbers should only be used for examples/tests.`
  };
}
```

**Integration**:
- Called in `increment-planner` skill before creating directory
- If non-sequential, prompt user with options

### 4. Skill Visibility Controls

**Manifest Schema Extension**:
```json
{
  "name": "increment-planner",
  "description": "...",
  "visibility": "internal",
  "invocableBy": ["sw:increment"],
  "triggers": []
}
```

**Fields**:
- `visibility`: "public" (default) | "internal"
- `invocableBy`: string[] - skills that can invoke this (["*"] = any)

**Enforcement Location**: `src/cli/skill-invoker.ts`

**Logic**:
```typescript
function canInvokeSkill(skillName: string, invokedBy: string): boolean {
  const skill = getSkillManifest(skillName);

  // Public skills can be invoked by anyone
  if (skill.visibility === 'public' || !skill.visibility) {
    return true;
  }

  // Internal skills check invocableBy list
  if (skill.visibility === 'internal') {
    const allowed = skill.invocableBy || ['*'];
    return allowed.includes('*') || allowed.includes(invokedBy);
  }

  return false;
}
```

**Error Message**:
```
❌ Cannot invoke 'increment-planner' directly (internal skill)

💡 This skill is internal and can only be called by:
   • /sw:increment

Use /sw:increment to create a new increment instead.
```

### 5. Error Message Formatter

**Location**: `src/utils/error-formatter.ts`

**Standard Format**:
```typescript
export interface FormattedError {
  emoji: string;
  title: string;
  description: string;
  suggestions: string[];
  examples?: string[];
}

export function formatCommandError(
  command: string,
  error: Error,
  context: Record<string, any>
): FormattedError {
  // Command-specific formatting
  if (command === 'sw:plan') {
    if (error.message.includes('not found')) {
      return {
        emoji: '❌',
        title: 'Increment not found',
        description: `/sw:plan is for EXISTING increments in PLANNING status.`,
        suggestions: [
          'To CREATE a new increment, use: /sw:increment "feature description"',
          'To plan an existing increment: /sw:plan 0042'
        ],
        examples: [
          '/sw:increment "Add user authentication"',
          '/sw:plan 0042  # where 0042 already exists'
        ]
      };
    }
  }

  // Generic fallback
  return {
    emoji: '❌',
    title: 'Command failed',
    description: error.message,
    suggestions: ['Check the command syntax', 'Run /sw:help for usage']
  };
}
```

## Implementation Phases

### Phase 1: Repository Detection (US-001)
1. Create `src/utils/repository-detector.ts`
2. Write unit tests with fixtures
3. Integrate into `/sw:increment` command
4. Add confirmation prompt when detected

**Files**:
- `src/utils/repository-detector.ts` (NEW)
- `tests/unit/repository-detector.test.ts` (NEW)
- `plugins/specweave/commands/increment.md` (MODIFY)

### Phase 2: Skill Routing Fix (US-002)
1. Update `/sw:increment` documentation to clarify routing
2. Add validation in `/sw:plan` to check increment exists
3. Improve error message when increment not found
4. Add examples to documentation

**Files**:
- `plugins/specweave/commands/increment.md` (MODIFY - doc only)
- `plugins/specweave/commands/plan.md` (MODIFY - add validation)
- `src/cli/commands/plan.ts` (MODIFY - add existence check)

### Phase 3: Increment Validation (US-003)
1. Create `src/core/increment-validator.ts`
2. Write unit tests
3. Integrate into `increment-planner` skill
4. Add prompt for non-sequential numbers

**Files**:
- `src/core/increment-validator.ts` (NEW)
- `tests/unit/increment-validator.test.ts` (NEW)
- `plugins/specweave/skills/increment-planner/index.md` (MODIFY)

### Phase 4: Skill Visibility (US-004)
1. Extend skill manifest schema
2. Update skill loader to parse visibility fields
3. Add enforcement in skill invoker
4. Mark `increment-planner` as internal
5. Update `/plugin list` to filter internal skills

**Files**:
- `src/types/skill-manifest.ts` (MODIFY - add fields)
- `src/cli/skill-loader.ts` (MODIFY - parse fields)
- `src/cli/skill-invoker.ts` (MODIFY - enforce restrictions)
- `src/cli/commands/plugin.ts` (MODIFY - filter list)
- `plugins/specweave/skills/increment-planner/manifest.json` (MODIFY)

### Phase 5: Error Messages (US-005)
1. Create `src/utils/error-formatter.ts`
2. Update all command error handlers
3. Ensure consistent format across commands
4. Add tests for error message generation

**Files**:
- `src/utils/error-formatter.ts` (NEW)
- `tests/unit/error-formatter.test.ts` (NEW)
- `src/cli/commands/plan.ts` (MODIFY)
- `src/cli/commands/increment.ts` (if exists)

### Phase 6: Documentation (US-006)
1. Update `/sw:increment` command docs
2. Update `/sw:plan` command docs
3. Add workflow diagram to CLAUDE.md
4. Document increment-planner skill

**Files**:
- `plugins/specweave/commands/increment.md` (MODIFY)
- `plugins/specweave/commands/plan.md` (MODIFY)
- `CLAUDE.md` (MODIFY)
- `plugins/specweave/skills/increment-planner/README.md` (MODIFY)

## Testing Strategy

### Unit Tests
- Repository detector with various directory structures
- Increment number validator with edge cases
- Skill visibility enforcement logic
- Error message formatter for all commands

### Integration Tests
- Full `/sw:increment` → increment-planner flow
- `/sw:plan` validation and error handling
- Skill invocation with visibility controls

### E2E Tests
- Create increment in SpecWeave repo (with warning)
- Create increment in user project (no warning)
- Non-sequential number handling
- Internal skill invocation attempt

## Error Handling

### Repository Detection Failures
- If uncertain (< 2 signals), proceed without warning
- Log detection attempts for debugging
- Never block workflow, only warn

### Skill Routing Failures
- Clear error when wrong skill called
- Suggest correct command
- Provide examples

### Validation Failures
- Non-sequential: Warn but allow with confirmation
- Missing increment: Clear error with next steps
- Duplicate: Block with error

## Rollback Strategy

- All changes are additive (no breaking changes)
- Can disable features via environment variables:
  - `SPECWEAVE_DISABLE_REPO_DETECTION=1`
  - `SPECWEAVE_DISABLE_SKILL_VISIBILITY=1`
- Documentation changes can be reverted
- No database migrations or data changes

## Performance Considerations

- Repository detection: < 5ms (filesystem checks only)
- Increment validation: < 10ms (directory scan)
- Skill visibility: < 1ms (manifest lookup)
- No impact on normal increment creation speed

## Security Considerations

- No security implications (internal refactor)
- Skill visibility prevents accidental internal skill exposure
- Repository detection uses filesystem only (no network)

## Monitoring & Logging

- Log repository detection results (debug level)
- Log skill invocation attempts (info level)
- Log increment validation warnings (warn level)
- Track error message display (analytics)

## Success Metrics

- SpecWeave repo detection accuracy: 100%
- `/sw:increment` → `/sw:plan` routing errors: 0
- User confusion about non-sequential numbers: < 10% (survey)
- Internal skill exposure: 0 instances
- Error message helpfulness rating: > 4/5 (user feedback)
