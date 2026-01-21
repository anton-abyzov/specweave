# ADR-0127: Agent Chunking Pattern for Crash Prevention

**Status**: Accepted
**Date**: 2025-11-24
**Incident**: Multiple Claude Code crashes (2025-11-24)
**Affected Agents**: test-aware-planner, architect (fixed in ADR-0070)
**Version**: v0.26.0

---

## Context

### The Problem

Claude Code crashed multiple times when agents attempted to generate large amounts of content in a single response:

**Incident Timeline**:
- **2025-11-24 (Increment 0052)**: Architect agent crashed trying to generate 6 ADRs in one response (2,600 lines, 8,000+ tokens)
- **2025-11-24 (Increment 0052)**: Test-aware-planner agent crashed trying to generate 40+ tasks across 6 user stories in one response (8,000+ lines, 12,000+ tokens)

**Root Cause**:
Agents were attempting to generate all content at once without considering:
1. Token limits (Claude has max response token limits)
2. Memory constraints (large responses cause buffer overflows)
3. User experience (no progress visibility during long operations)
4. Error recovery (if crash occurs, all work is lost)

**Symptoms**:
- Claude Code unresponsive/frozen
- Process crashes with no error message
- Lost work (agent doesn't save partial progress)
- Poor UX (user sees nothing until crash)

---

## Decision

We adopt a **mandatory chunking pattern** for all agents that generate large amounts of content.

### Core Principle

**NEVER generate more content than can fit in a single response** (~2000 tokens).

If a task requires generating large amounts of content:
1. Break it into chunks (e.g., one ADR at a time, one user story at a time)
2. Generate ONE chunk per response
3. Ask user for confirmation before proceeding to next chunk
4. Use progressive disclosure (show what's planned, then execute incrementally)

---

## Chunking Pattern

### 1. YAML Frontmatter Configuration

All agents that generate large content MUST set `max_response_tokens`:

```yaml
---
name: my-agent
description: Agent description
tools: Read, Write, Edit
model: opus
max_response_tokens: 2000  # ← MANDATORY for large-content agents
---
```

**Token Budget Per Response**:
- **Analysis phase**: 300-500 tokens
- **Single chunk generation**: 600-800 tokens
- **Progress reporting**: 100-200 tokens
- **Total**: < 2000 tokens

### 2. Progressive Disclosure Pattern

**Phase 1: Analysis & Planning** (< 500 tokens)
```
User: "Generate tasks for increment 0052"
    ↓
Agent Response 1:
  "I've analyzed spec.md and plan.md. Found 6 user stories:
   - US-001: Command Interface (5 tasks estimated)
   - US-002: Git Integration (6 tasks estimated)
   - US-003: GitHub Integration (7 tasks estimated)
   - US-004: Validation Engine (8 tasks estimated)
   - US-005: Audit Logging (4 tasks estimated)
   - US-006: Orchestration (6 tasks estimated)

   Total: 36 tasks estimated

   Which user story should I start with?"
```

**Phase 2: First Chunk** (< 800 tokens)
```
User: "Start with US-001"
    ↓
Agent Response 2:
  [Generate ONLY US-001 tasks: T-001 through T-005]
  Write(tasks.md) with frontmatter + US-001 section

  "✅ US-001 complete (5 tasks generated)

   Progress: 5/36 tasks (14%)

   Ready for US-002 (Git Integration - 6 tasks estimated)?"
```

**Phase 3: Subsequent Chunks** (< 800 tokens each)
```
User: "Yes, continue"
    ↓
Agent Response 3:
  [Generate ONLY US-002 tasks: T-006 through T-011]
  Edit(tasks.md) to append US-002 section

  "✅ US-002 complete (6 tasks generated)

   Progress: 11/36 tasks (31%)

   Ready for US-003 (GitHub Integration - 7 tasks estimated)?"
```

**Phase 4: Completion** (< 300 tokens)
```
User: "Yes, continue"
    ↓
[... repeat for US-003, US-004, US-005, US-006 ...]
    ↓
Agent Final Response:
  "✅ All user stories complete!

   Summary:
   - Total tasks: 36
   - User stories: 6
   - Average tasks/US: 6
   - Coverage target: 85%

   File: .specweave/increments/_archive/0052-safe-feature-deletion/tasks.md

   Next steps:
   1. Review tasks.md for completeness
   2. Run: /specweave:validate 0052
   3. Start implementation: /specweave:do 0052"
```

### 3. File Operations Pattern

**First Chunk** (Write):
```typescript
Write("tasks.md", frontmatter + firstChunkContent)
```

**Subsequent Chunks** (Edit - Append):
```typescript
// Find last line of file
const lastLine = readLastLine("tasks.md")

// Append new chunk
Edit("tasks.md", lastLine, lastLine + "\n\n---\n\n" + nextChunkContent)
```

**Alternative** (Edit - Replace):
```typescript
// If you know the exact insertion point
Edit("tasks.md",
  "## User Story: US-001...",
  "## User Story: US-001...\n\n---\n\n## User Story: US-002..."
)
```

### 4. Self-Check Checklist

Before sending ANY response, agent MUST verify:

- [ ] Am I generating more than 1 chunk? **→ STOP! One chunk per response**
- [ ] Is my response > 2000 tokens? **→ STOP! This is too large**
- [ ] Did I ask which chunk to do next? **→ REQUIRED after each chunk**
- [ ] Am I waiting for user confirmation? **→ YES! Never assume "continue"**
- [ ] Did I report progress? **→ REQUIRED (e.g., "11/36 tasks, 31%")**

---

## Implementation Details

### Agents Requiring Chunking

**High Priority** (generates 1000+ lines):
- ✅ **architect** - Fixed in ADR-0070 (one ADR per response)
- ✅ **test-aware-planner** - Fixed in this ADR (one US per response)
- ⚠️ **pm** - May need chunking for large specs (6+ user stories)
- ⚠️ **docs-writer** - May need chunking for large documentation

**Medium Priority** (generates 500-1000 lines):
- **tech-lead** - May need chunking for large implementations
- **qa-lead** - May need chunking for large test suites

**Low Priority** (generates < 500 lines):
- Most other agents are fine (generate small, focused outputs)

### Documentation Requirements

Every agent that implements chunking MUST:

1. **Add `max_response_tokens: 2000` to YAML frontmatter**
2. **Add "MANDATORY CHUNKING DISCIPLINE" section** at top of AGENT.md
3. **Document chunk boundaries** (e.g., "one ADR", "one user story")
4. **Provide examples** of correct chunking workflow
5. **Add self-check checklist** for agent to verify before responding

### Example: test-aware-planner AGENT.md

```markdown
---
name: test-aware-planner
max_response_tokens: 2000  # ← Added
---

## ⚠️🚨 MANDATORY CHUNKING DISCIPLINE 🚨⚠️  # ← Added section

**CRITICAL META-RULE**: Generate tasks ONE USER STORY AT A TIME

### 🛑 THE #1 RULE: ONE CHUNK PER RESPONSE

**VIOLATION CAUSES CRASHES!**

1. Analyze spec.md/plan.md, list user stories (< 500 tokens)
2. Generate tasks for ONE user story (< 800 tokens)
3. Ask "Ready for next US?" (< 100 tokens)
4. Repeat until all done

[... detailed examples and patterns ...]
```

---

## Benefits

### 1. Crash Prevention
- ✅ No more token limit violations
- ✅ No more memory buffer overflows
- ✅ No more unresponsive Claude Code

### 2. Better UX
- ✅ User sees progress in real-time
- ✅ User can pause/resume at any chunk
- ✅ User can redirect if agent goes off-track

### 3. Error Recovery
- ✅ Partial work is saved (not lost on crash)
- ✅ Agent can resume from last chunk
- ✅ Easier to debug issues (smaller units of work)

### 4. Flexibility
- ✅ User can skip chunks if not needed
- ✅ User can prioritize certain chunks
- ✅ Agent can adapt to user feedback mid-generation

### 5. Quality Maintenance
- ✅ Chunking does NOT reduce quality
- ✅ Each chunk is still comprehensive
- ✅ Total output is the same, just delivered incrementally

---

## Consequences

### Positive

1. **Crash prevention**: No more large-response crashes
2. **Progressive disclosure**: Claude's native strength (load context only when needed)
3. **Better UX**: Users see progress, can interact mid-generation
4. **Scalability**: Works for arbitrarily large generations (100+ tasks, 50+ ADRs)
5. **Error recovery**: Partial work saved, easy to resume

### Negative

1. **More interactions**: User must confirm each chunk (vs one-shot generation)
2. **Slower perception**: Feels slower due to multiple responses (but safer!)
3. **Agent complexity**: Agents must implement chunking logic
4. **Documentation burden**: Each agent needs detailed chunking docs

### Mitigation Strategies

**For "more interactions" concern**:
- Allow user to say "continue all" to auto-confirm all chunks
- Provide progress indicators (e.g., "5/36 tasks, 14%")
- Show estimated remaining time

**For "slower perception" concern**:
- Emphasize safety benefits (no crashes!)
- Show progress bars/indicators
- Allow parallel chunking for independent sections (future enhancement)

**For "agent complexity" concern**:
- Provide reusable chunking patterns (this ADR!)
- Create shared utilities for chunk management
- Document best practices clearly

---

## Examples

### Example 1: Architect Agent (ADRs)

**Before** (crashed):
```
User: "Design safe feature deletion"
Agent: [Generates ADR-0118, 0119, 0120, 0121, 0122, 0123 all at once]
Result: 2,600 lines, 8,000 tokens → CRASH! 💥
```

**After** (safe):
```
User: "Design safe feature deletion"
Agent: "I need 6 ADRs. Which first?"
User: "ADR-0118"
Agent: [Generates ONLY ADR-0118, ~400 lines] "Ready for 0119?"
User: "Yes"
Agent: [Generates ONLY ADR-0119, ~400 lines] "Ready for 0120?"
[... continues safely ...]
```

### Example 2: Test-Aware Planner (Tasks)

**Before** (crashed):
```
User: "Generate tasks for 0052"
Agent: [Generates T-001 to T-045 for all 6 US]
Result: 8,000 lines, 12,000 tokens → CRASH! 💥
```

**After** (safe):
```
User: "Generate tasks for 0052"
Agent: "Found 6 user stories, 36 tasks estimated. Start with US-001?"
User: "Yes"
Agent: [Generates T-001 to T-005] "US-001 done (5/36 tasks). Ready for US-002?"
User: "Yes"
Agent: [Generates T-006 to T-011] "US-002 done (11/36 tasks). Ready for US-003?"
[... continues safely ...]
```

---

## Testing

### Manual Testing

**Test 1: Large Increment**
1. Create increment with 6+ user stories (36+ tasks expected)
2. Invoke test-aware-planner
3. Verify agent asks which US to start with
4. Confirm agent generates ONE US at a time
5. Verify agent asks before each subsequent US
6. Confirm no crashes occur

**Test 2: Token Limit**
1. Monitor agent response sizes
2. Verify no response exceeds 2000 tokens
3. Verify chunking happens at appropriate boundaries

**Test 3: Error Recovery**
1. Interrupt agent mid-generation (after 2nd chunk)
2. Restart agent
3. Verify agent can resume from where it left off

### Automated Testing

```typescript
// Test: Agent respects max_response_tokens
test('agent chunks large generations', async () => {
  const agent = new TestAwarePlanner({ maxResponseTokens: 2000 });
  const spec = createLargeSpec(6); // 6 user stories

  const responses = await agent.generateTasks(spec);

  // Should have multiple responses (one per US)
  expect(responses.length).toBeGreaterThan(1);

  // Each response should be < 2000 tokens
  responses.forEach(response => {
    expect(countTokens(response)).toBeLessThan(2000);
  });

  // Final output should have all 6 user stories
  const finalFile = readFile('tasks.md');
  expect(finalFile).toContain('## User Story: US-001');
  expect(finalFile).toContain('## User Story: US-006');
});
```

---

## Migration Path

### Phase 1: Fix Critical Agents (DONE)
- ✅ architect (ADR-0070)
- ✅ test-aware-planner (this ADR)

### Phase 2: Audit Other Agents (TODO)
- [ ] Review all agents for large-content generation
- [ ] Identify agents that need chunking
- [ ] Add `max_response_tokens` to agent YAML

### Phase 3: Standardize Pattern (TODO)
- [ ] Create shared chunking utilities
- [ ] Document chunking pattern in CONTRIBUTING.md
- [ ] Add chunking validation to agent tests

### Phase 4: Monitoring (TODO)
- [ ] Add telemetry for agent response sizes
- [ ] Alert if agent exceeds 2000 tokens
- [ ] Track crash rate before/after chunking

---

## Related

- **ADR-0070**: Hook Consolidation (addresses hook crashes)
- **ADR-0060**: Three-tier optimization architecture (hook performance)
- **Incident Report**: CLAUDE-CODE-CRASH-ROOT-CAUSE-2025-11-23.md
- **Incident Report**: PROJECT-ROOT-ORDER-BUG-2025-11-24.md

---

## Notes

- This pattern leverages Claude's native strength: progressive disclosure
- Chunking is NOT about reducing quality, it's about safety and UX
- All agents should prefer chunking over one-shot generation for large outputs
- This pattern is generalizable to any agent that generates large content

---

**Author**: Claude Code (via autonomous improvement)
**Approved By**: Anton Abyzov (SpecWeave Maintainer)
**Implemented**: 2025-11-24 (test-aware-planner agent)
