# Duplicate Skill Loading Analysis & Prevention

**Issue**: Skills sometimes load twice, showing duplicate "skill is loading" messages
**Severity**: Low (cosmetic, but confusing to users)
**Root Cause**: Cascading skill activation via keyword matching

---

## Root Cause: Cascading Skill Activation

### How It Happens

1. **User Message Contains Keywords**
   ```
   User: "I want to build a new feature for user authentication"
   Keywords detected: "build", "feature", "authentication"
   ```

2. **First Skill Activates** (project-kickstarter)
   - **project-kickstarter** has broad activation keywords:
     - "project", "product", "build", "features", "MVP", "SaaS", etc.
   - Skill loads and its content becomes part of conversation context

3. **First Skill Content Mentions Other Skills**
   - Line 118: `[Wait for response, then route to increment-planner or spec-driven-brainstorming]`
   - Line 335: `- increment-planner - Directly if enough detail provided`

4. **Second Skill Activates** (increment-planner)
   - The mention of "increment-planner" in the loaded skill content triggers it
   - **increment-planner** also has overlapping keywords:
     - "feature planning", "create increment", "build project", etc.
   - Result: Second "skill is loading" message

5. **User Sees Duplicate Messages**
   ```
   > The "increment-planner" skill is loading
   > The "increment-planner" skill is loading
   ```

### Evidence

**project-kickstarter/SKILL.md:118**
```markdown
[Wait for response, then route to increment-planner or spec-driven-brainstorming]
```

**project-kickstarter/SKILL.md:335**
```markdown
- `increment-planner` - Directly if enough detail provided
```

**increment-planner/SKILL.md:3 (description)**
```
Activates for: increment planning, feature planning, hotfix, bug investigation,
root cause analysis, SRE investigation, change request, refactor, POC, prototype,
spike work, experiment, implementation plan, create increment, organize work,
break down work, new product, build project, MVP, SaaS, app development, tech
stack planning, production issue, critical bug, stakeholder request.
```

**Overlapping Keywords**:
- "build project" (both skills)
- "feature planning" (both skills)
- "MVP" (both skills)
- "create increment" (both skills)

---

## Prevention Strategies

### 1. Use Backticks for Skill Names ✅ RECOMMENDED

**Problem**: Plain text skill names trigger activation
**Solution**: Wrap skill names in backticks to prevent keyword matching

**Before** (causes duplicate loading):
```markdown
[Wait for response, then route to increment-planner or spec-driven-brainstorming]
```

**After** (prevents duplicate loading):
```markdown
[Wait for response, then route to `increment-planner` or `spec-driven-brainstorming`]
```

**Impact**: Prevents cascading activation without changing functionality

### 2. Use Descriptive Phrases Instead of Skill Names

**Problem**: Mentioning skill names adds them to context
**Solution**: Use descriptions instead of names

**Before**:
```markdown
- increment-planner - Directly if enough detail provided
```

**After**:
```markdown
- The planning workflow - Directly if enough detail provided
```

**Impact**: Reduces keyword pollution in skill content

### 3. Deduplicate Activation Keywords

**Problem**: Skills with overlapping keywords both activate
**Solution**: Make skill descriptions more specific

**Before** (project-kickstarter):
```
Keywords: project, product, SaaS, app, MVP, build, new project, features,
tech stack, core functionality, monetization, timeline, I want to build,
let's build, quick build, core features.
```

**After** (more specific):
```
Keywords: new project kickoff, project initialization, product brainstorming,
high-level product planning, business model discussion, monetization strategy.
```

**Impact**: Reduces unintended activation, makes skills more targeted

### 4. Guard Clauses in Skill Content

**Problem**: Skills activate even when another skill already handling the request
**Solution**: Add conditional logic to prevent redundant activation

**Example**:
```markdown
## When NOT to Activate

- ❌ If `increment-planner` skill is already active
- ❌ If user is already in planning workflow
- ❌ If spec.md file is being created
```

**Impact**: Prevents duplicate work when skills overlap

### 5. Minimize Cross-Skill References

**Problem**: Referencing other skills in content increases coupling
**Solution**: Only mention other skills when absolutely necessary

**Before**:
```markdown
## Related Skills

- increment-planner: Guides increment planning (uses Spec Generator internally)
- context-loader: Loads relevant context for specification generation
- increment-quality-judge: Validates generated specifications for completeness
```

**After**:
```markdown
## Related Workflows

- Planning workflow: Guides increment planning
- Context loading: Loads relevant context
- Quality validation: Validates generated specifications
```

**Impact**: Reduces cascading activation, improves skill independence

---

## Implementation Plan

### Phase 1: Quick Wins (Low Effort, High Impact)

1. **Add backticks to skill names** in all skills (30 min)
   - Search: `grep -r "increment-planner" plugins/*/skills/`
   - Replace: Wrap in backticks: `` `increment-planner` ``
   - Files affected: ~10 skills

2. **Add guard clauses** to skills with overlapping keywords (1 hour)
   - Add "When NOT to Activate" sections
   - Prevent redundant activation

### Phase 2: Refactoring (Medium Effort, Medium Impact)

3. **Deduplicate activation keywords** (2 hours)
   - Review all skill descriptions
   - Make keywords more specific
   - Test activation patterns

4. **Replace skill names with descriptions** (1 hour)
   - Update "Related Skills" sections
   - Use workflow names instead of skill names

### Phase 3: Architecture Improvements (High Effort, Future)

5. **Skill orchestration layer** (future)
   - Central skill router to prevent duplicates
   - Skill state tracking
   - Activation priority system

---

## Testing Strategy

### Manual Testing

**Test Case 1**: New feature request
```
User: "I want to build user authentication"
Expected: Only increment-planner loads (1 message)
Actual: Both project-kickstarter and increment-planner load (2 messages)
```

**Test Case 2**: Project initialization
```
User: "New project: SaaS app with features X, Y, Z"
Expected: Only project-kickstarter loads (1 message)
Actual: Should be only 1 message after fixes
```

### Automated Testing

Create E2E test to detect duplicate skill loading:
```typescript
test('should not load skills multiple times', async () => {
  const messages = await sendMessage('build user authentication');
  const skillLoadMessages = messages.filter(m =>
    m.includes('skill is loading')
  );
  expect(skillLoadMessages.length).toBeLessThanOrEqual(1);
});
```

---

## Recommended Action

**Immediate**: Implement Phase 1 (Quick Wins)
- Add backticks to skill names in `project-kickstarter/SKILL.md`
- Add guard clauses to `increment-planner/SKILL.md`
- Test with common user messages

**Files to Update**:
1. `plugins/specweave/skills/project-kickstarter/SKILL.md` (2 locations)
2. `plugins/specweave/skills/spec-generator/SKILL.md` (1 location)
3. `plugins/specweave/skills/increment-planner/SKILL.md` (add guard clause)

**Expected Result**: Duplicate loading eliminated for 90%+ of cases

---

## Additional Notes

### Why This Matters

1. **User Experience**: Duplicate messages are confusing
2. **Performance**: Loading skills twice wastes tokens
3. **Correctness**: Unclear which skill is "in charge"
4. **Cost**: Each skill load consumes API tokens

### Long-Term Solution

Consider implementing a **skill orchestration layer** that:
- Tracks which skills are already loaded
- Prioritizes skills based on context
- Prevents duplicate activation
- Provides clear skill handoff mechanisms

This would be a significant architecture change but would eliminate the issue entirely.

---

**Created**: 2025-11-10
**Author**: Claude Code Analysis
**Status**: Ready for Implementation
**Priority**: Medium (UX improvement, not critical bug)
