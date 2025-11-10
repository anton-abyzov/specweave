# Self-Reflection System for SpecWeave

**Proposal for Future Increment** | **Inspired by**: Kimi Model (Nov 2025)
**Created**: 2025-11-10 | **Status**: PROPOSAL (Not Implemented)

## Executive Summary

Add **self-reflection capabilities** to SpecWeave's increment workflow, allowing the AI to evaluate its own work at critical checkpoints, catch issues earlier, and continuously improve code quality.

**Key Insight**: SpecWeave already has natural reflection checkpoints built into its lifecycle. We just need to add the reflection logic.

---

## What is Self-Reflection?

Self-reflection in AI models (like Kimi) means:
- ✅ Evaluating own outputs before finalizing
- ✅ Catching logical errors or inconsistencies
- ✅ Improving reasoning by meta-cognitive analysis
- ✅ Learning from mistakes within same conversation

**Applied to SpecWeave**:
- Reflect on plan quality before implementation
- Reflect on code quality after each task
- Reflect on increment completeness before closing
- Build institutional knowledge (lessons learned)

---

## Integration Points in SpecWeave

### Current Workflow
```
/specweave:increment → Generate spec/plan/tasks
    ↓
/specweave:do → Execute tasks
    ↓
[Task completes] → Hook fires → Sync docs
    ↓
/specweave:done → Close increment
```

### With Self-Reflection (4 Checkpoints)
```
/specweave:increment → Generate spec/plan/tasks
    ↓
[CHECKPOINT 1: Post-Planning Reflection]
    • Are tasks well-defined?
    • Risks identified?
    • Dependencies clear?
    • Test coverage sufficient?
    ↓
/specweave:do → Execute task
    ↓
[CHECKPOINT 2: Pre-Task Reflection]
    • Is approach sound?
    • Are dependencies satisfied?
    • Any known pitfalls?
    ↓
[Implement code]
    ↓
[CHECKPOINT 3: Post-Task Reflection] ⭐ HIGHEST IMPACT
    • Code quality issues?
    • Security vulnerabilities?
    • Missing error handling?
    • Technical debt created?
    • Lessons learned?
    ↓
[Hook fires] → Sync docs + STORE REFLECTION
    ↓
/specweave:done
    ↓
[CHECKPOINT 4: Pre-Close Reflection]
    • All requirements met?
    • Quality acceptable?
    • Documentation complete?
    • Ready for production?
```

---

## Checkpoint 3: Post-Task Reflection (MVP)

**Why start here?**
- ✅ Already have hook infrastructure (`post-task-completion.sh`)
- ✅ Natural reflection point (work just completed)
- ✅ Immediate impact (catch issues before next task)
- ✅ Non-blocking (doesn't slow down planning)

### What Gets Reflected On

After each task completion, automatically analyze:

| Category | What to Check | Examples |
|----------|---------------|----------|
| **Code Quality** | Best practices, readability, maintainability | Missing documentation, complex logic, duplicated code |
| **Security** | OWASP Top 10, common vulnerabilities | SQL injection, XSS, hardcoded secrets |
| **Error Handling** | Edge cases, failure modes | No timeout handling, missing validation |
| **Testing** | Coverage, quality, missing tests | Integration tests missing, edge cases not covered |
| **Performance** | Obvious bottlenecks | N+1 queries, memory leaks |
| **Technical Debt** | Shortcuts taken, TODOs created | Hardcoded values, temporary hacks |
| **Dependencies** | Breaking changes, version conflicts | Deprecated APIs used |

### Example Reflection Output

**Stored in**: `.specweave/increments/0008-user-auth/logs/reflections/task-005-reflection.md`

```markdown
# Self-Reflection: Task T-005 - Implement Authentication Service

**Completed**: 2025-11-10 14:30 UTC
**Duration**: 45 minutes
**Files Modified**: 3 files, +287 lines

---

## ✅ What Was Accomplished

- Implemented `AuthService.ts` with JWT token generation
- Added bcrypt password hashing (work factor: 12)
- Created unit tests (87% coverage)
- Integrated with existing user service

---

## 🎯 Quality Assessment

### ✅ Strengths
- ✅ Password hashing follows best practices (bcrypt, salt rounds: 12)
- ✅ Unit tests cover main flows (login, logout, token validation)
- ✅ Type safety with TypeScript interfaces
- ✅ Clean separation of concerns (service layer)

### ⚠️ Issues Identified

**SECURITY (MEDIUM Risk)**
- ❌ JWT secret is hardcoded in `auth-config.ts:12`
  - **Impact**: Secret leaked if code repository compromised
  - **Recommendation**: Move to environment variable (`JWT_SECRET`)
  - **File**: `src/services/auth/auth-config.ts:12`

**RELIABILITY (LOW Risk)**
- ⚠️ No timeout handling for token validation
  - **Impact**: Potential hanging requests if auth service slow
  - **Recommendation**: Add 5s timeout to `validateToken()` method
  - **File**: `src/services/auth/AuthService.ts:87`

**TESTING (LOW Risk)**
- ⚠️ Missing integration test for token expiration flow
  - **Impact**: Expired tokens might not be handled correctly in production
  - **Recommendation**: Add E2E test in `tests/integration/auth/`

---

## 🔧 Recommended Follow-Up Actions

**Priority 1 (MUST FIX before closing increment)**:
1. Move JWT secret to environment variable
   - Create `.env.example` with `JWT_SECRET=your-secret-here`
   - Update `auth-config.ts` to read from `process.env.JWT_SECRET`
   - Update README.md with setup instructions

**Priority 2 (SHOULD FIX this increment)**:
2. Add timeout handling to `validateToken()`
   - Use `Promise.race()` with 5s timeout
   - Return error if timeout exceeded

**Priority 3 (NICE TO HAVE)**:
3. Add integration test for token expiration
   - Test file: `tests/integration/auth/token-expiration.test.ts`

---

## 📚 Lessons Learned

**What went well:**
- Using bcrypt was straightforward
- TypeScript types caught 2 bugs during development
- Unit tests were easy to write

**What could be improved:**
- Should have checked for hardcoded secrets BEFORE committing
- Could have designed API contract earlier (had to refactor once)
- Integration tests should be written alongside implementation

**For next time:**
- Use `.env` from the start (don't hardcode config)
- Write integration tests FIRST (TDD approach)
- Review security checklist before marking task complete

---

## 📊 Metrics

- **Code Quality**: 8/10 (good structure, minor issues)
- **Security**: 6/10 (hardcoded secret is critical issue)
- **Test Coverage**: 87% (good, but missing integration tests)
- **Technical Debt**: LOW (1 TODO added for future refactoring)

---

## 🔗 Related Tasks

- **T-006**: Session management (depends on this task)
- **T-007**: Login API endpoint (uses this service)
- **T-008**: Security audit (should review these findings)

---

**Auto-generated by**: SpecWeave Self-Reflection System
**Model**: Claude 3.5 Sonnet (Haiku for cost efficiency)
**Reflection Time**: ~15 seconds
**Estimated Cost**: ~$0.01
```

---

## Implementation Architecture

### Option A: Enhanced Hook (Recommended for MVP)

**Modify**: `plugins/specweave/hooks/post-task-completion.sh`

**Add new step** (after living docs sync, before external tracker sync):

```bash
# ============================================================================
# SELF-REFLECTION (NEW in v0.x.0)
# ============================================================================

if [ -n "$CURRENT_INCREMENT" ] && [ "$ALL_COMPLETED" = "true" ]; then
  echo "[$(date)] 🧠 Running self-reflection on completed work" >> "$DEBUG_LOG" 2>/dev/null || true

  # Run reflection script
  if command -v node &> /dev/null; then
    node dist/hooks/lib/run-self-reflection.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
      echo "[$(date)] ⚠️  Failed to run self-reflection (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
    }
  fi
fi
```

**New file**: `src/hooks/lib/run-self-reflection.ts`

```typescript
/**
 * Self-Reflection System for SpecWeave
 * Analyzes completed work and identifies quality/security issues
 */

import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

interface ReflectionResult {
  taskId: string;
  timestamp: string;
  filesModified: string[];
  strengths: string[];
  issues: Array<{
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'SECURITY' | 'RELIABILITY' | 'TESTING' | 'QUALITY';
    description: string;
    location?: string;
    recommendation: string;
  }>;
  followUpActions: Array<{
    priority: number;
    description: string;
  }>;
  lessonsLearned: {
    whatWentWell: string[];
    whatCouldImprove: string[];
    forNextTime: string[];
  };
  metrics: {
    codeQuality: number;
    security: number;
    testCoverage: number;
    technicalDebt: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export async function runSelfReflection(incrementId: string): Promise<void> {
  const incrementPath = path.join('.specweave/increments', incrementId);
  const tasksFile = path.join(incrementPath, 'tasks.md');
  const reflectionsDir = path.join(incrementPath, 'logs/reflections');

  // Ensure reflections directory exists
  await fs.ensureDir(reflectionsDir);

  // Get recently modified files (git status)
  const modifiedFiles = await getModifiedFiles();

  // Build reflection prompt
  const reflectionPrompt = buildReflectionPrompt(incrementId, modifiedFiles);

  // Run Claude via CLI to get reflection
  const reflection = await runClaudeReflection(reflectionPrompt);

  // Parse and store reflection
  const reflectionFile = path.join(
    reflectionsDir,
    `task-${getLastCompletedTask(tasksFile)}-reflection.md`
  );

  await fs.writeFile(reflectionFile, reflection);

  // Extract critical issues and warn user if needed
  const criticalIssues = extractCriticalIssues(reflection);
  if (criticalIssues.length > 0) {
    console.warn(`\n⚠️  Self-reflection found ${criticalIssues.length} critical issue(s):`);
    criticalIssues.forEach(issue => {
      console.warn(`   • ${issue}`);
    });
    console.warn(`\n📄 Full reflection: ${reflectionFile}\n`);
  } else {
    console.log(`✅ Self-reflection complete. No critical issues found.`);
  }
}

function buildReflectionPrompt(incrementId: string, modifiedFiles: string[]): string {
  return `
You are a senior software engineer performing a self-reflection on recently completed work.

**Context:**
- Increment: ${incrementId}
- Files modified: ${modifiedFiles.join(', ')}

**Your task:**
Analyze the code changes and identify:
1. What was accomplished (summary)
2. Code quality issues (best practices, readability, maintainability)
3. Security vulnerabilities (OWASP Top 10, common issues)
4. Missing error handling or edge cases
5. Test coverage gaps
6. Technical debt introduced
7. Lessons learned (what went well, what could improve)

**Format your response as markdown** with sections:
- ✅ What Was Accomplished
- 🎯 Quality Assessment (Strengths + Issues)
- 🔧 Recommended Follow-Up Actions
- 📚 Lessons Learned
- 📊 Metrics

**Be specific**: Reference file paths and line numbers when identifying issues.
**Be constructive**: Suggest concrete fixes, not just problems.
**Be honest**: Don't sugarcoat issues, but also acknowledge what went well.

Please analyze the following files:
${modifiedFiles.map(f => `\n---\nFile: ${f}\n${fs.readFileSync(f, 'utf-8')}`).join('\n')}
`;
}

async function runClaudeReflection(prompt: string): Promise<string> {
  // Use Claude CLI to run reflection
  // Alternative: Use Anthropic API directly
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', ['-m', 'haiku', '--prompt', prompt]);
    let output = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Claude exited with code ${code}`));
      }
    });
  });
}

// Helper functions...
```

### Option B: New Agent (More Powerful, Higher Cost)

**Create**: `plugins/specweave/agents/reflective-reviewer/AGENT.md`

```yaml
---
name: reflective-reviewer
description: |
  Self-reflection specialist that analyzes completed work for quality issues,
  security vulnerabilities, and improvement opportunities. Activates after task
  completion to provide constructive feedback and catch issues early.
allowed-tools: Read, Grep, Glob
---

# Reflective Reviewer Agent

You are a senior software engineer performing self-reflection on recently completed work.

## Your Role

After each task completion, you analyze the code changes and provide:

1. **Quality Assessment**
   - Code quality (best practices, readability, maintainability)
   - Security vulnerabilities (OWASP Top 10)
   - Error handling gaps
   - Test coverage

2. **Actionable Feedback**
   - Specific issues with file paths and line numbers
   - Concrete recommendations for fixes
   - Priority levels (CRITICAL, HIGH, MEDIUM, LOW)

3. **Learning**
   - What went well
   - What could be improved
   - Lessons for next time

## Analysis Framework

### Security Checklist
- [ ] No hardcoded secrets or credentials
- [ ] Input validation present
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output escaping)
- [ ] Authentication/authorization proper
- [ ] HTTPS/TLS configured
- [ ] Rate limiting implemented
- [ ] CSRF protection

### Quality Checklist
- [ ] Code follows project conventions
- [ ] Functions are single-purpose
- [ ] No obvious performance issues (N+1 queries, etc.)
- [ ] Error handling comprehensive
- [ ] Logging appropriate
- [ ] Configuration externalized (not hardcoded)

### Testing Checklist
- [ ] Unit tests for critical paths
- [ ] Integration tests for API endpoints
- [ ] Edge cases covered
- [ ] Error cases tested
- [ ] Test coverage >80%

## Output Format

Use this markdown structure:

```markdown
# Self-Reflection: [Task Name]

## ✅ What Was Accomplished
[Brief summary]

## 🎯 Quality Assessment

### Strengths
- ✅ [What went well]

### Issues
- ❌ [CRITICAL/HIGH/MEDIUM/LOW] [Issue description]
  - **Impact**: [Why this matters]
  - **Recommendation**: [How to fix]
  - **Location**: `file.ts:123`

## 🔧 Recommended Follow-Up Actions
1. [Priority 1 - MUST FIX]
2. [Priority 2 - SHOULD FIX]
3. [Priority 3 - NICE TO HAVE]

## 📚 Lessons Learned
**What went well**: [List]
**What could improve**: [List]
**For next time**: [List]

## 📊 Metrics
- Code Quality: X/10
- Security: X/10
- Test Coverage: X%
- Technical Debt: LOW/MEDIUM/HIGH
```

## Example Invocation

The agent is invoked automatically via the `post-task-completion` hook:

```bash
# After task T-005 completes
→ Hook detects completion
→ Invokes reflective-reviewer agent
→ Agent analyzes modified files
→ Generates reflection report
→ Stores in logs/reflections/task-005-reflection.md
→ Warns user if critical issues found
```

## Configuration

Self-reflection can be configured in `.specweave/config.json`:

```json
{
  "reflection": {
    "enabled": true,
    "mode": "auto",  // "auto" | "manual" | "disabled"
    "depth": "standard",  // "quick" | "standard" | "deep"
    "model": "haiku",  // "haiku" | "sonnet" | "opus"
    "criticalThreshold": "MEDIUM",  // Warn user if issues >= this severity
    "storeReflections": true,
    "autoCreateFollowUpTasks": false  // Future: create tasks for fixes
  }
}
```

---

## Cost and Performance

### Estimated Cost (per task reflection)

| Model | Speed | Cost | Use When |
|-------|-------|------|----------|
| **Haiku** | ~15s | ~$0.01 | Default (best balance) |
| **Sonnet** | ~30s | ~$0.05 | Complex code, security-critical |
| **Opus** | ~60s | ~$0.15 | Mission-critical review |

**Typical increment** (10 tasks):
- Haiku: ~$0.10 total (✅ Recommended)
- Sonnet: ~$0.50 total
- Opus: ~$1.50 total

### Performance Impact

**Quick mode** (~10s per task):
- Scans only modified files
- Basic security checks
- No deep analysis

**Standard mode** (~30s per task):
- Scans modified + related files
- Comprehensive security scan
- Best practices check
- Test coverage analysis

**Deep mode** (~60s per task):
- Full codebase context
- Architecture review
- Dependency analysis
- Performance profiling

---

## Configuration Options

**In `.specweave/config.json`:**

```json
{
  "reflection": {
    "enabled": true,
    "checkpoints": {
      "postPlanning": false,      // Phase 1 (future)
      "preTask": false,            // Phase 2 (future)
      "postTask": true,            // Phase 3 (MVP) ✅
      "preClose": false            // Phase 4 (future)
    },
    "depth": "standard",
    "model": "haiku",
    "criticalThreshold": "MEDIUM",
    "storeReflections": true,
    "autoCreateFollowUpTasks": false,
    "categories": {
      "security": true,
      "quality": true,
      "testing": true,
      "performance": true,
      "technicalDebt": true
    }
  }
}
```

**User can disable** if they find it too slow or costly:

```bash
# Disable reflection
specweave config set reflection.enabled false

# Or adjust depth
specweave config set reflection.depth quick
```

---

## Rollout Plan

### Phase 1: MVP - Post-Task Reflection Only
- ✅ Integrate into `post-task-completion` hook
- ✅ Use Haiku model (cost-effective)
- ✅ Store reflections in `logs/reflections/`
- ✅ Warn user if critical issues found
- ⏳ No auto-creation of follow-up tasks (manual for now)

**Estimated effort**: 2-3 days
**Files to create**:
- `src/hooks/lib/run-self-reflection.ts` (~300 lines)
- `plugins/specweave/agents/reflective-reviewer/AGENT.md` (~200 lines)
- `tests/integration/reflection/post-task.test.ts` (~150 lines)
- Update `post-task-completion.sh` (~20 lines added)
- Update `.specweave/config.schema.json` (add reflection config)

### Phase 2: Pre-Close Reflection
- Add reflection before `/specweave:done`
- Validate all recommendations addressed
- Block closing if critical issues unresolved

### Phase 3: Pre-Task Reflection
- Review plan before starting each task
- Identify risks early
- Suggest alternative approaches

### Phase 4: Post-Planning Reflection
- Review spec/plan/tasks after generation
- Catch issues before implementation starts
- Suggest improvements to plan

---

## Success Metrics

How do we know this is working?

1. **Issues Caught Earlier**
   - Measure: # of security issues found in reflection vs. code review
   - Target: 50%+ caught by reflection

2. **Code Quality Improvement**
   - Measure: Code review feedback volume (before/after)
   - Target: 30% reduction in code review comments

3. **User Adoption**
   - Measure: % of users who keep reflection enabled
   - Target: >80% adoption

4. **Cost Effectiveness**
   - Measure: Cost per issue found (reflection vs. manual review)
   - Target: <$0.10 per issue found

---

## Examples from Other Projects

**Kimi Model** (inspiration):
- Self-reflects on reasoning steps
- Catches logical errors mid-response
- Improves answer quality without user intervention

**GitHub Copilot Workspace** (similar concept):
- Reviews own code suggestions
- Identifies potential bugs
- Suggests improvements

**Cursor AI** (agent-based):
- Lint + security scan after generation
- Shows issues inline
- Auto-fixes some categories

**SpecWeave's Unique Advantage**:
- ✅ Already have task boundaries (natural checkpoints)
- ✅ Already have living docs (context for analysis)
- ✅ Already have hooks (integration point ready)
- ✅ Already track increment history (can learn from past mistakes)

---

## Risks and Mitigations

### Risk 1: Cost Escalation
**Mitigation**:
- Default to Haiku (cheap)
- Allow users to disable per-increment
- Only run on critical increments (security, payments, etc.)

### Risk 2: Slower Workflow
**Mitigation**:
- Run asynchronously (non-blocking)
- Quick mode for rapid iteration
- Skip reflection on simple tasks (configurable threshold)

### Risk 3: False Positives
**Mitigation**:
- Clear severity levels (don't cry wolf)
- Learn from user feedback (which warnings ignored?)
- Improve prompts over time

### Risk 4: Over-Thinking (Analysis Paralysis)
**Mitigation**:
- Reflection is advisory, not blocking
- User can skip recommendations
- Focus on actionable feedback only

---

## Next Steps

1. **Gather feedback**: Does this concept resonate with users?
2. **Prototype**: Build MVP (Phase 1) in 2-3 days
3. **Dogfood**: Use on SpecWeave's own development
4. **Iterate**: Improve prompts based on real reflections
5. **Release**: Ship as optional feature (v0.x.0)

---

## Questions for Discussion

1. **Should reflection be enabled by default?**
   - Pro: Catches issues out-of-box
   - Con: Slower workflow, costs money

2. **Which model for default?**
   - Haiku: Fast, cheap, good enough?
   - Sonnet: Better quality, worth the cost?

3. **How to present reflections to user?**
   - Silent (just log file)?
   - Warn only if critical issues?
   - Show summary in terminal?
   - Interactive review?

4. **Auto-create follow-up tasks?**
   - Pro: Issues don't get lost
   - Con: Task list pollution

5. **Integration with `/specweave:qa`?**
   - Reflection = real-time, per-task
   - QA = batch, pre-close validation
   - Should they be separate or unified?

---

**Status**: PROPOSAL (awaiting feedback)
**Complexity**: MEDIUM (hook integration + agent creation)
**Effort**: 2-3 days for MVP
**Impact**: HIGH (quality improvement, earlier issue detection)
**Cost**: ~$0.10 per increment (Haiku model)

---

Would you like to proceed with this feature? If so, I recommend:
1. Create increment: `/specweave:increment "0016-self-reflection-system"`
2. Use this proposal as the spec
3. Implement Phase 1 (Post-Task Reflection) as MVP
4. Dogfood on SpecWeave development
5. Gather user feedback
6. Iterate on prompts and configuration

Let me know your thoughts!
