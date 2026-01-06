---
increment: 0156-per-skill-reflection-memory-override
status: planned
total_tasks: 42
completed_tasks: 0
priority: P1
type: refactor
phases:
  - phase-1-per-skill-memory
  - phase-2-smart-merge
  - phase-3-silent-reflection
  - phase-4-lsp-examples
  - phase-5-homepage
estimated_duration: 2-3 weeks
test_mode: test-after
coverage_target: 80
---

# Implementation Tasks: Per-Skill Reflection System

**Increment**: 0156-per-skill-reflection-memory-override
**Test Strategy**: Tests written after implementation (test-after mode)
**Coverage Target**: 80% minimum

---

## Phase 1: Add Per-Skill Memory (Non-Breaking)

### T-001: Create Learning data model and types
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [x] completed

**Implementation**:
- Create `src/core/reflection/types.ts`
- Define `Learning` interface with all fields (id, timestamp, type, confidence, content, context, triggers, source)
- Define `ConfidenceLevel` type ('high' | 'medium' | 'low')
- Define `LearningType` type ('correction' | 'rule' | 'approval')
- Define `Signal` interface for confidence calculation
- Export all types

**Acceptance**:
- [x] Learning interface has all 8 required fields
- [x] Types match plan.md data model
- [x] Interfaces exported correctly

**Test Plan** (to be written after):
```
Given a Learning record structure
When creating a new learning
Then all required fields are present and properly typed
```

---

### T-002: Implement MemoryManager class
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-05
**Priority**: P1
**Model**: 💎 Opus
**Status**: [x] completed
**Dependencies**: T-001

**Implementation**:
- Create `src/core/reflection/memory-manager.ts`
- Implement `readMemory(skill: string): Learning[]` - parse MEMORY.md
- Implement `writeMemory(skill: string, learnings: Learning[]): void` - format and write
- Implement `addLearning(skill: string, learning: Learning): void` - append single learning
- Implement `getSkillMemoryPath(skill: string): string` - resolve path based on environment
- Support both `~/.claude/skills/{skill}/MEMORY.md` (Claude Code) and `.specweave/plugins/specweave/skills/{skill}/MEMORY.md` (non-Claude)
- Fall back to centralized `.specweave/memory/*.md` if skill memory doesn't exist

**Acceptance**:
- [x] Can read existing MEMORY.md files
- [x] Can write new learnings in correct format
- [x] Handles both Claude Code and SpecWeave paths
- [x] Falls back to centralized memory
- [x] Validates MEMORY.md syntax

**Test Plan** (to be written after):
```
Given a skill with existing MEMORY.md
When reading memory
Then all learnings are parsed correctly

Given a new learning to add
When writing to MEMORY.md
Then learning is formatted per template (LRN-YYYYMMDD-XXXX format)

Given no skill-specific MEMORY.md
When reading memory
Then falls back to centralized memory files
```

---

### T-003: Implement ReflectionEngine skill detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Priority**: P1
**Model**: 💎 Opus
**Status**: [x] completed
**Dependencies**: T-001, T-002

**Implementation**:
- Create `src/core/reflection/reflection-engine.ts`
- Implement `detectSkill(content: string, context: string): string | null`
- Use keyword matching against skill descriptions
- Match triggers from skill SKILL.md files
- Return skill name if confidence >70%, null otherwise
- Handle multi-skill matches (pick highest confidence)

**Acceptance**:
- [x] Detects skill from learning content keywords
- [x] Returns null if no clear skill match
- [x] Handles multi-skill scenarios
- [x] Uses skill trigger lists from SKILL.md

**Test Plan** (to be written after):
```
Given learning content "Always use PM spec template"
When detecting skill
Then returns "pm" skill

Given learning content with no skill keywords
When detecting skill
Then returns null (routes to centralized)

Given learning matching multiple skills
When detecting skill
Then returns skill with highest confidence
```

---

### T-004: Implement confidence calculation
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Priority**: P1
**Model**: 💎 Opus
**Status**: [x] completed
**Dependencies**: T-001

**Implementation**:
- Create `calculateConfidence(signals: Signal[]): ConfidenceLevel` in ReflectionEngine
- HIGH (>80%): Explicit corrections ("No, use X instead", "Never do Y", "Always do Z")
- MEDIUM (50-80%): Approvals with context ("Perfect!", "That's exactly right")
- LOW (<50%): Observations, questions, vague feedback
- Weight signals: Corrections (1.0), Approvals (0.7), Observations (0.3)
- Aggregate score = sum(signal_weight × signal_confidence) / count

**Acceptance**:
- [x] Returns HIGH for explicit corrections
- [x] Returns MEDIUM for approvals
- [x] Returns LOW for vague feedback
- [x] Weighs signal types correctly

**Test Plan** (to be written after):
```
Given signals with explicit correction ("No, use X")
When calculating confidence
Then returns "high" (>80%)

Given signals with approval only ("Perfect!")
When calculating confidence
Then returns "medium" (50-80%)

Given signals with vague observation
When calculating confidence
Then returns "low" (<50%)
```

---

### T-005: Implement SpecWeave project detection
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [x] completed

**Implementation**:
- Add `isSpecWeaveProject(): boolean` to ReflectionEngine
- Read `package.json` in project root
- Check if `name` field equals "specweave"
- Return true if match, false otherwise
- Cache result (project doesn't change during session)

**Acceptance**:
- [x] Returns true when package.json name = "specweave"
- [x] Returns false for user projects
- [x] Handles missing package.json gracefully

**Test Plan** (to be written after):
```
Given package.json with name "specweave"
When checking if SpecWeave project
Then returns true

Given package.json with name "my-app"
When checking if SpecWeave project
Then returns false

Given missing package.json
When checking if SpecWeave project
Then returns false (graceful fallback)
```

---

### T-006: Route learnings to skill MEMORY.md or SKILL.md
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Priority**: P1
**Model**: 💎 Opus
**Status**: [x] completed
**Dependencies**: T-002, T-003, T-005

**Implementation**:
- Add `addLearning(skill: string, learning: Learning): void` to ReflectionEngine
- If `isSpecWeaveProject()` is true → update `plugins/specweave/skills/{skill}/SKILL.md` directly
- If false → update `~/.claude/skills/{skill}/MEMORY.md` (Claude Code) or `.specweave/plugins/specweave/skills/{skill}/MEMORY.md`
- Use MemoryManager.addLearning for MEMORY.md
- For SKILL.md updates: append to "## Learned Patterns" section
- Preserve existing SKILL.md content

**Acceptance**:
- [x] SpecWeave project → updates SKILL.md
- [x] User project → updates MEMORY.md
- [x] Preserves existing content
- [x] Appends to correct section

**Test Plan** (to be written after):
```
Given SpecWeave project (package.json name = "specweave")
When adding learning for "pm" skill
Then SKILL.md is updated in plugins/specweave/skills/pm/

Given user project (package.json name = "my-app")
When adding learning for "pm" skill
Then MEMORY.md is updated in user's skill directory

Given existing learnings in target file
When adding new learning
Then existing content is preserved
```

---

### T-007: Create MEMORY.md template
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [x] completed

**Implementation**:
- Create `src/templates/MEMORY-template.md`
- Follow structure from plan.md (lines 291-306)
- Include header with auto-generated note
- Include metadata (last updated, skill name)
- Include "## Learned Patterns" section
- Template for individual learning entries (LRN-ID, content, context, triggers, date, source)

**Acceptance**:
- [x] Template matches plan.md structure
- [x] Has placeholders for skill name, timestamp
- [x] Includes all required sections

**Test Plan** (to be written after):
```
Given MEMORY.md template
When populating with skill name and learnings
Then output matches expected format from plan.md
```

---

### T-008: Initialize MEMORY.md for existing skills
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [x] completed
**Dependencies**: T-007

**Implementation**:
- Create initialization script `scripts/init-skill-memory.ts`
- Scan `plugins/specweave/skills/` for all skills
- For each skill without MEMORY.md:
  - Create MEMORY.md from template
  - Set skill name
  - Leave "Learned Patterns" empty
- Skip skills that already have MEMORY.md

**Acceptance**:
- [x] Creates MEMORY.md for all skills without one
- [x] Skips existing MEMORY.md files
- [x] Uses correct template format

**Test Plan** (to be written after):
```
Given 24 skills in plugins/specweave/skills/
When running init script
Then each skill directory has MEMORY.md

Given skill with existing MEMORY.md
When running init script
Then existing MEMORY.md is not overwritten
```

---

### T-009: Update skills to load MEMORY.md on activation
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Priority**: P2
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-002

**Implementation**:
- Update skill loading mechanism in `src/cli/commands/skill-loader.ts`
- When loading a skill, check for MEMORY.md in skill directory
- If found, parse and inject into skill context
- Format as markdown list: "## Past Learnings\n\n{learnings}"
- Append to skill SKILL.md content before sending to Claude
- Handle both Claude Code paths (~/.claude/skills/) and SpecWeave paths

**Acceptance**:
- [ ] Skills load MEMORY.md on activation
- [ ] Learnings injected into skill context
- [ ] Works for both Claude Code and SpecWeave installations
- [ ] No errors if MEMORY.md missing

**Test Plan** (to be written after):
```
Given skill with MEMORY.md containing 3 learnings
When skill activates
Then skill context includes all 3 learnings

Given skill without MEMORY.md
When skill activates
Then skill loads normally without errors
```

---

### T-010: Unit tests for MemoryManager
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-002

**Implementation**:
- Create `tests/unit/reflection/memory-manager.test.ts`
- Test `readMemory()` with valid MEMORY.md
- Test `readMemory()` with malformed MEMORY.md
- Test `writeMemory()` creates valid format
- Test `addLearning()` appends correctly
- Test `getSkillMemoryPath()` resolution (Claude Code vs SpecWeave)
- Use temp directories for test files

**Acceptance**:
- [ ] All MemoryManager methods tested
- [ ] Edge cases covered (malformed, missing files)
- [ ] Tests use temp directories (no cwd pollution)
- [ ] Coverage >80%

**Test Plan**:
```
Given valid MEMORY.md with 2 learnings
When readMemory is called
Then returns array of 2 Learning objects

Given MEMORY.md with invalid syntax
When readMemory is called
Then returns empty array (graceful fallback)

Given new learning to write
When writeMemory is called
Then creates MEMORY.md with correct format
```

---

### T-011: Unit tests for ReflectionEngine
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-003, T-004, T-005

**Implementation**:
- Create `tests/unit/reflection/reflection-engine.test.ts`
- Test `detectSkill()` with various content patterns
- Test `calculateConfidence()` with different signal types
- Test `isSpecWeaveProject()` with different package.json configs
- Test `addLearning()` routing logic (SKILL.md vs MEMORY.md)
- Mock filesystem operations

**Acceptance**:
- [ ] Skill detection tested with 10+ patterns
- [ ] Confidence calculation tested for all levels (HIGH/MEDIUM/LOW)
- [ ] Project detection tested
- [ ] Coverage >80%

**Test Plan**:
```
Given content with PM keywords
When detectSkill is called
Then returns "pm"

Given HIGH confidence signals (explicit correction)
When calculateConfidence is called
Then returns "high"

Given package.json with name "specweave"
When isSpecWeaveProject is called
Then returns true
```

---

## Phase 2: Smart Merge (Non-Breaking)

### T-012: Create memory parser utility
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending

**Implementation**:
- Create `scripts/lib/memory-parser.ts`
- Implement `parseMemory(filePath: string): Learning[]`
- Parse MEMORY.md markdown structure
- Extract learning ID, type, confidence, content, context, triggers, date, source
- Handle malformed entries gracefully
- Return array of Learning objects

**Acceptance**:
- [ ] Parses valid MEMORY.md correctly
- [ ] Handles malformed entries without crashing
- [ ] Extracts all 8 Learning fields
- [ ] Returns empty array for invalid files

**Test Plan** (to be written after):
```
Given MEMORY.md with 3 valid learnings
When parsing file
Then returns array of 3 Learning objects with all fields

Given MEMORY.md with 1 malformed entry
When parsing file
Then skips malformed entry, returns other learnings
```

---

### T-013: Implement content similarity algorithm
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending

**Implementation**:
- Create `scripts/lib/similarity.ts`
- Implement `contentSimilarity(a: string, b: string): number`
- Use Levenshtein distance or cosine similarity
- Return score 0.0-1.0 (1.0 = identical)
- Normalize strings (lowercase, trim whitespace)
- Implement `triggerOverlap(a: string[], b: string[]): number`
- Calculate Jaccard similarity: intersection / union
- Return score 0.0-1.0

**Acceptance**:
- [ ] contentSimilarity returns 1.0 for identical strings
- [ ] contentSimilarity returns >0.5 for similar strings
- [ ] triggerOverlap calculates correctly
- [ ] Handles edge cases (empty strings, empty arrays)

**Test Plan** (to be written after):
```
Given identical strings
When calculating contentSimilarity
Then returns 1.0

Given similar strings ("use Button" vs "always use Button component")
When calculating contentSimilarity
Then returns >0.5

Given trigger arrays ["button", "ui"] and ["button", "component"]
When calculating triggerOverlap
Then returns 0.5 (1 shared / 2 total unique)
```

---

### T-014: Implement deduplication logic
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-013

**Implementation**:
- Create `scripts/lib/deduplicate.ts`
- Implement `isDuplicate(learning: Learning, existing: Learning[]): boolean`
- Check exact ID match first (fast path)
- Check content similarity >0.5
- Check trigger overlap >0.5
- Return true if any condition matches
- Implement `deduplicateLearnings(learnings: Learning[]): Learning[]`
- Remove duplicates, keep first occurrence

**Acceptance**:
- [ ] Detects exact ID duplicates
- [ ] Detects content similarity duplicates
- [ ] Detects trigger overlap duplicates
- [ ] Preserves first occurrence in list

**Test Plan** (to be written after):
```
Given learning with ID "LRN-001" and existing array containing "LRN-001"
When checking isDuplicate
Then returns true

Given learning with similar content to existing
When checking isDuplicate
Then returns true if similarity >0.5

Given array with 3 duplicate learnings
When deduplicating
Then returns array with 1 learning (first occurrence)
```

---

### T-015: Create merge script
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-012, T-014

**Implementation**:
- Create `scripts/merge-skill-memory.js`
- Accept 3 args: userMemoryPath, defaultsMemoryPath, outputPath
- Parse both MEMORY.md files using memory-parser
- Merge algorithm:
  1. Start with user learnings (always preserved)
  2. For each default learning, check if duplicate
  3. If not duplicate, append to merged list
- Write merged result to output path
- Handle errors gracefully (missing files, parse errors)

**Acceptance**:
- [ ] Parses user and defaults MEMORY.md
- [ ] Preserves all user learnings
- [ ] Adds non-duplicate defaults
- [ ] Writes merged output
- [ ] Handles errors without data loss

**Test Plan** (to be written after):
```
Given user MEMORY.md with 2 learnings
And defaults MEMORY.md with 3 learnings (1 duplicate)
When merging
Then output has 4 learnings (2 user + 2 new defaults)

Given user MEMORY.md parse error
When merging
Then preserves user file, skips merge, logs error
```

---

### T-016: Update bin/install-skills.sh with smart merge
**User Story**: US-004
**Satisfies ACs**: AC-US4-04, AC-US4-05
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-015

**Implementation**:
- Update `bin/install-skills.sh`
- Replace blind `cp -r "$skill"/*` with file-by-file loop
- For each file in source skill:
  - If filename is MEMORY.md AND target MEMORY.md exists:
    - Create backup in .memory-backups/ with timestamp
    - Call merge script with user, defaults, output paths
  - Else: Copy file normally
- Handle errors, preserve user data on failure

**Acceptance**:
- [ ] Detects existing MEMORY.md during install
- [ ] Creates timestamped backup before merge
- [ ] Calls merge script correctly
- [ ] Non-MEMORY.md files copied normally
- [ ] Rollback on error (restore from backup)

**Test Plan** (to be written after):
```
Given skill with existing MEMORY.md (user learnings)
When running install-skills.sh with updated marketplace version
Then user MEMORY.md is backed up
And merged with new defaults
And user learnings preserved

Given skill without MEMORY.md
When running install-skills.sh
Then new MEMORY.md is copied directly (no merge)
```

---

### T-017: Create backup mechanism
**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending

**Implementation**:
- Enhance merge script to create backups
- Before any write operation:
  - Check if target MEMORY.md exists
  - If yes, create backup in `.memory-backups/MEMORY-YYYYMMDD-HHMMSS.md`
  - Mkdir .memory-backups if doesn't exist
- Keep last 10 backups (prune older)

**Acceptance**:
- [ ] Creates backup before every merge
- [ ] Uses timestamp format YYYYMMDD-HHMMSS
- [ ] Keeps max 10 backups (FIFO)
- [ ] Handles missing .memory-backups directory

**Test Plan** (to be written after):
```
Given existing MEMORY.md
When merge script runs
Then backup created in .memory-backups/ with timestamp

Given 10 existing backups
When creating 11th backup
Then oldest backup is deleted
```

---

### T-018: Integration test for smart merge workflow
**User Story**: US-007
**Satisfies ACs**: AC-US7-03, AC-US7-04
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-016

**Implementation**:
- Create `tests/integration/reflection/smart-merge.test.ts`
- Test full marketplace update workflow:
  1. Create skill with MEMORY.md (user learnings)
  2. Simulate marketplace update (new MEMORY.md with defaults)
  3. Run install-skills.sh
  4. Verify user learnings preserved
  5. Verify new defaults added
  6. Verify backup created
- Use temp directories for test isolation

**Acceptance**:
- [ ] Full merge workflow tested end-to-end
- [ ] User learnings preserved
- [ ] New defaults added
- [ ] Backup created
- [ ] Test isolated (temp dirs)

**Test Plan**:
```
Given skill with user MEMORY.md containing custom correction
When marketplace update runs with new defaults
Then user correction is preserved in merged MEMORY.md
And new defaults from marketplace are added
And backup of original MEMORY.md exists
```

---

### T-019: Unit tests for deduplication logic
**User Story**: US-007
**Satisfies ACs**: AC-US7-01
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-014

**Implementation**:
- Create `tests/unit/reflection/deduplicate.test.ts`
- Test exact ID matching
- Test content similarity >50%
- Test trigger overlap >50%
- Test edge cases (empty arrays, identical content)
- Test deduplicateLearnings with various scenarios

**Acceptance**:
- [ ] All deduplication conditions tested
- [ ] Edge cases handled
- [ ] Coverage >80%

**Test Plan**:
```
Given learning with ID matching existing
When checking isDuplicate
Then returns true

Given learning with content similarity 0.6
When checking isDuplicate
Then returns true

Given learning with trigger overlap 0.7
When checking isDuplicate
Then returns true
```

---

## Phase 3: Silent Reflection (Opt-In)

### T-020: Create signal detection patterns
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending

**Implementation**:
- Create `plugins/specweave/lib/signal-patterns.ts`
- Define regex patterns for HIGH confidence:
  - "No, .* instead"
  - "Never .*"
  - "Always .*"
  - "Don't .*, use .*"
- Define patterns for MEDIUM confidence:
  - "Perfect!"
  - "Exactly right"
  - "Yes, that's correct"
- Define patterns for LOW confidence:
  - Questions, observations, vague feedback
- Export pattern arrays

**Acceptance**:
- [ ] HIGH patterns detect explicit corrections
- [ ] MEDIUM patterns detect approvals
- [ ] LOW patterns catch observations
- [ ] Patterns are case-insensitive

**Test Plan** (to be written after):
```
Given user message "No, use Button instead of button"
When matching against HIGH patterns
Then matches correction pattern

Given user message "Perfect! That's exactly what I wanted"
When matching against MEDIUM patterns
Then matches approval pattern
```

---

### T-021: Create confidence calculator
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-020

**Implementation**:
- Create `plugins/specweave/lib/calculate-confidence.js`
- Accept session log file path as argument
- Parse session log for user messages
- Match against signal patterns
- Calculate aggregate confidence:
  - HIGH signals: +1.0 each
  - MEDIUM signals: +0.7 each
  - LOW signals: +0.3 each
  - Score = total / message_count
- Output confidence level to stdout: "high" | "medium" | "low"
- Thresholds: >0.8 = high, 0.5-0.8 = medium, <0.5 = low

**Acceptance**:
- [ ] Parses session logs correctly
- [ ] Matches user messages against patterns
- [ ] Calculates confidence score
- [ ] Outputs correct level (high/medium/low)

**Test Plan** (to be written after):
```
Given session log with 2 HIGH signals
When calculating confidence
Then outputs "high"

Given session log with 1 MEDIUM signal, 1 LOW signal
When calculating confidence
Then outputs "medium"

Given session log with only LOW signals
When calculating confidence
Then outputs "low"
```

---

### T-022: Create auto-reflect script
**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-021, T-006

**Implementation**:
- Create `plugins/specweave/lib/auto-reflect.js`
- Accept session log file path
- Extract learnings from HIGH confidence signals
- For each learning:
  - Detect skill context
  - Create Learning record
  - Call ReflectionEngine.addLearning()
- Handle SpecWeave vs user project routing
- No user interaction (silent auto-commit)

**Acceptance**:
- [ ] Extracts learnings from session log
- [ ] Detects skill for each learning
- [ ] Creates valid Learning records
- [ ] Saves to correct location (SKILL.md or MEMORY.md)
- [ ] Runs silently without prompts

**Test Plan** (to be written after):
```
Given session log with 2 HIGH confidence corrections
When auto-reflect runs
Then 2 learnings are saved to appropriate MEMORY.md files

Given SpecWeave project session
When auto-reflect runs
Then learnings are saved to SKILL.md files
```

---

### T-023: Create learning queue
**User Story**: US-003
**Satisfies ACs**: AC-US3-06
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending

**Implementation**:
- Create `plugins/specweave/lib/queue-learning.js`
- Accept session log file path
- Extract learnings from MEDIUM/LOW confidence signals
- Save to queue file `.specweave/state/learning-queue.json`
- Format: array of { learning: Learning, confidence: string, timestamp: string }
- Append to existing queue

**Acceptance**:
- [ ] Extracts MEDIUM/LOW learnings
- [ ] Saves to queue file
- [ ] Appends to existing queue
- [ ] Creates queue file if missing

**Test Plan** (to be written after):
```
Given session log with MEDIUM confidence signals
When queuing learnings
Then learnings saved to .specweave/state/learning-queue.json

Given existing queue with 2 learnings
When queuing 1 more
Then queue has 3 learnings total
```

---

### T-024: Update stop-session hook
**User Story**: US-003
**Satisfies ACs**: AC-US3-07
**Priority**: P1
**Model**: 💎 Opus
**Status**: [ ] pending
**Dependencies**: T-021, T-022, T-023

**Implementation**:
- Update `plugins/specweave/hooks/stop-session.sh`
- After session ends, scan session log for reflection signals
- Count corrections and approvals
- If count > 0:
  - Calculate confidence level
  - If HIGH: run auto-reflect.js, output jq notification
  - Else: run queue-learning.js, output jq notification
- Notifications: '{"type":"system","content":"✅ Learned from session"}'

**Acceptance**:
- [ ] Detects reflection opportunities on session end
- [ ] Calculates confidence correctly
- [ ] Routes HIGH to auto-reflect
- [ ] Routes MEDIUM/LOW to queue
- [ ] Outputs jq system notifications
- [ ] Doesn't interrupt user workflow

**Test Plan** (to be written after):
```
Given session with HIGH confidence corrections
When session ends
Then auto-reflect runs silently
And jq notification displayed: "✅ Learned from session"

Given session with MEDIUM confidence signals
When session ends
Then learning queued for review
And jq notification: "💡 Learning queued for review"
```

---

### T-025: Create /sw:reflect-on command
**User Story**: US-003
**Satisfies ACs**: AC-US3-08
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending

**Implementation**:
- Create skill `plugins/specweave/skills/reflect-on/SKILL.md`
- Command enables automatic reflection on session end
- Sets flag in config `.specweave/config.json`: `"reflection": { "autoReflect": true }`
- Output confirmation message
- Activate for keywords: "reflect on", "enable reflect", "auto reflect"

**Acceptance**:
- [ ] Sets autoReflect flag in config
- [ ] Outputs confirmation
- [ ] Activates on correct keywords

**Test Plan** (to be written after):
```
Given /sw:reflect-on command
When executed
Then config.json has reflection.autoReflect = true

Given keywords "enable auto reflection"
When user types message
Then skill activates automatically
```

---

### T-026: Create /sw:reflect-status command
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-023

**Implementation**:
- Create skill `plugins/specweave/skills/reflect-status/SKILL.md`
- Show reflection configuration:
  - Auto-reflect enabled/disabled
  - Total learnings by skill
  - Queued learnings count
  - Last reflection timestamp
- Read from config, MEMORY.md files, and queue file
- Format output as table

**Acceptance**:
- [ ] Shows auto-reflect status
- [ ] Shows learning counts by skill
- [ ] Shows queued learnings
- [ ] Formats as readable table

**Test Plan** (to be written after):
```
Given auto-reflect enabled
And 5 learnings in pm MEMORY.md
And 2 queued learnings
When /sw:reflect-status runs
Then displays all stats correctly
```

---

### T-027: E2E test for silent reflection workflow
**User Story**: US-007
**Satisfies ACs**: AC-US7-05
**Priority**: P1
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-024

**Implementation**:
- Create `tests/e2e/reflection/silent-reflection.spec.ts`
- Simulate user session with corrections
- Trigger stop-session hook
- Verify learnings saved correctly
- Verify jq notification output
- Test both HIGH and MEDIUM/LOW paths

**Acceptance**:
- [ ] Full silent reflection workflow tested
- [ ] HIGH confidence path verified
- [ ] MEDIUM/LOW queue path verified
- [ ] Notifications tested

**Test Plan**:
```
Given simulated user session with explicit correction
When session ends and stop hook runs
Then learning is auto-saved to MEMORY.md
And jq notification displayed

Given session with approval (MEDIUM confidence)
When session ends
Then learning is queued for review
```

---

## Phase 4: LSP Integration Examples (Additive)

### T-028: Create LSP integration guide structure
**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending

**Implementation**:
- Create `docs-site/docs/guides/lsp-integration.md`
- Add overview section explaining LSP benefits
- Add prerequisites (LSP servers, setup)
- Create sections for each language (placeholders):
  - .NET (C#, F#)
  - Node.js/TypeScript
  - JavaScript
  - Python
  - Java
  - Scala
  - Swift
- Add best practices section
- Add troubleshooting section

**Acceptance**:
- [ ] File structure matches plan.md
- [ ] Has placeholder sections for all 7 languages
- [ ] Includes overview and prerequisites

**Test Plan** (to be written after):
```
Given LSP integration guide
When viewing in Docusaurus
Then all sections render correctly
And navigation links work
```

---

### T-029: Add .NET LSP examples
**User Story**: US-006
**Satisfies ACs**: AC-US6-02
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-028

**Implementation**:
- Fill .NET section in lsp-integration.md
- OmniSharp installation instructions
- Roslyn integration examples
- Common operations:
  - Go to definition
  - Find references
  - Hover for docs
  - Code completion
- Include code snippets

**Acceptance**:
- [ ] OmniSharp setup documented
- [ ] Common operations with examples
- [ ] Code snippets included

**Test Plan** (to be written after):
```
Given .NET LSP section
When user follows setup instructions
Then OmniSharp works correctly
```

---

### T-030: Add Node.js/TypeScript LSP examples
**User Story**: US-006
**Satisfies ACs**: AC-US6-03
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-028

**Implementation**:
- Fill Node.js/TypeScript section
- typescript-language-server installation
- Configuration (tsconfig.json integration)
- Common operations with examples
- Error handling patterns
- Performance tips

**Acceptance**:
- [ ] Installation documented
- [ ] Common operations covered
- [ ] Performance tips included

**Test Plan** (to be written after):
```
Given TypeScript LSP section
When user follows instructions
Then typescript-language-server works
```

---

### T-031: Add JavaScript LSP examples
**User Story**: US-006
**Satisfies ACs**: AC-US6-04
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-028

**Implementation**:
- Fill JavaScript section
- typescript-language-server with allowJs
- JSDoc support examples
- Common operations

**Acceptance**:
- [ ] allowJs configuration documented
- [ ] JSDoc examples included

---

### T-032: Add Python LSP examples
**User Story**: US-006
**Satisfies ACs**: AC-US6-05
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-028

**Implementation**:
- Fill Python section
- python-lsp-server installation
- Pylance alternative
- Common operations
- Virtual environment handling

**Acceptance**:
- [ ] Installation documented
- [ ] Pylance mentioned as alternative
- [ ] venv handling covered

---

### T-033: Add Java/Scala/Swift LSP examples
**User Story**: US-006
**Satisfies ACs**: AC-US6-06, AC-US6-07, AC-US6-08
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-028

**Implementation**:
- Fill Java section (Eclipse JDT Language Server)
- Fill Scala section (Metals + SBT)
- Fill Swift section (SourceKit-LSP + Xcode)
- Include setup and common operations for each

**Acceptance**:
- [ ] Java section complete
- [ ] Scala section complete
- [ ] Swift section complete

---

### T-034: Update CLAUDE.md with LSP instructions
**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-028

**Implementation**:
- Update `CLAUDE.md` LSP section
- Reference new LSP integration guide
- Add examples of when to use LSP
- Add link to docs-site guide

**Acceptance**:
- [ ] CLAUDE.md references new guide
- [ ] Examples of LSP usage included
- [ ] Link to docs works

---

## Phase 5: Homepage (Standalone)

### T-035: Design homepage hero section
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Priority**: P2
**Model**: 💎 Opus
**Status**: [ ] pending

**Implementation**:
- Update `docs-site/src/pages/index.tsx`
- Create hero section with:
  - Compelling headline (value proposition)
  - Subheading explaining SpecWeave
  - Primary CTA button (Get Started)
  - Secondary CTA (View Docs)
- Modern design with gradient background
- Responsive layout

**Acceptance**:
- [ ] Hero section visually appealing
- [ ] Value proposition clear
- [ ] CTAs functional
- [ ] Responsive (mobile, tablet, desktop)

**Test Plan** (to be written after):
```
Given homepage hero section
When viewed on mobile
Then layout is responsive and readable

Given CTA buttons
When clicked
Then navigate to correct pages
```

---

### T-036: Create features section with cards
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Priority**: P2
**Model**: 💎 Opus
**Status**: [ ] pending

**Implementation**:
- Add features section to index.tsx
- Create feature cards for:
  - Spec-Driven Development
  - Living Documentation
  - AI-Native Workflow
  - Multi-Language Support
  - External Tool Sync (GitHub/JIRA/ADO)
  - Self-Improving AI (Reflection)
- Each card: icon, title, description
- Grid layout (3 columns desktop, 1 column mobile)

**Acceptance**:
- [ ] 6 feature cards implemented
- [ ] Icons included
- [ ] Grid responsive
- [ ] Descriptions clear and concise

---

### T-037: Add quick start section
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending

**Implementation**:
- Add quick start section
- 3-step installation:
  1. `npm install -g specweave`
  2. `specweave init .`
  3. `/sw:increment "your feature"`
- Code blocks with syntax highlighting
- Copy button for commands

**Acceptance**:
- [ ] 3-step quick start clear
- [ ] Code blocks formatted
- [ ] Copy buttons work

---

### T-038: Create comparison section (before/after)
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Priority**: P2
**Model**: 💎 Opus
**Status**: [ ] pending

**Implementation**:
- Add comparison section
- Side-by-side layout:
  - Before SpecWeave (manual workflow)
  - After SpecWeave (automated workflow)
- Visual comparison with checkmarks/X marks
- Highlight benefits (speed, accuracy, traceability)

**Acceptance**:
- [ ] Before/after comparison clear
- [ ] Benefits highlighted
- [ ] Visually appealing

---

### T-039: Implement dark mode support
**User Story**: US-007
**Satisfies ACs**: AC-US7-07
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending

**Implementation**:
- Update CSS for dark mode compatibility
- Use Docusaurus theme variables
- Test all sections in dark mode
- Ensure contrast ratios meet WCAG AA

**Acceptance**:
- [ ] All sections support dark mode
- [ ] Contrast ratios WCAG AA compliant
- [ ] Theme toggle works

---

### T-040: Optimize homepage performance
**User Story**: US-007
**Satisfies ACs**: AC-US7-08
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-035, T-036, T-037, T-038

**Implementation**:
- Lazy load images
- Minify CSS/JS
- Optimize bundle size
- Run Lighthouse audit
- Target: <3s load time, >90 performance score

**Acceptance**:
- [ ] Load time <3s
- [ ] Lighthouse performance >90
- [ ] Images lazy loaded
- [ ] Bundle optimized

---

### T-041: Test homepage accessibility
**User Story**: US-007
**Satisfies ACs**: AC-US7-07
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-039

**Implementation**:
- Run axe accessibility checker
- Fix all WCAG AA violations
- Test keyboard navigation
- Test screen reader compatibility
- Add alt text to all images
- Ensure focus states visible

**Acceptance**:
- [ ] No WCAG AA violations
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] All images have alt text

---

### T-042: Deploy updated homepage to spec-weave.com
**User Story**: US-007
**Satisfies ACs**: AC-US7-06
**Priority**: P2
**Model**: ⚡ Haiku
**Status**: [ ] pending
**Dependencies**: T-035, T-036, T-037, T-038, T-039, T-040, T-041

**Implementation**:
- Build Docusaurus site: `npm run build`
- Test build locally
- Deploy to production (spec-weave.com)
- Verify deployment
- Test on multiple devices

**Acceptance**:
- [ ] Site builds successfully
- [ ] Deployment successful
- [ ] All features work in production
- [ ] Tested on mobile, tablet, desktop

---

## Testing Summary

**Total Tests**:
- Unit: 5 test files (T-010, T-011, T-019, and coverage in other tasks)
- Integration: 1 test file (T-018)
- E2E: 1 test file (T-027)

**Coverage Target**: 80% minimum (from config)
**Test Mode**: test-after (write tests after implementation)

**Test Execution**:
After completing each phase, run:
```bash
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # E2E tests
npm run test:coverage     # Coverage report
```

---

## Success Criteria

From plan.md:
- [ ] All 7 user stories accepted
- [ ] All 45 acceptance criteria validated
- [ ] All tests passing (unit, integration, E2E)
- [ ] Coverage >80%
- [ ] No regressions in existing features
- [ ] Documentation complete (LSP guide, updated CLAUDE.md)
- [ ] Code review approved
- [ ] Performance benchmarks met (<100ms merge, <3s homepage load)
- [ ] Security review passed (no sensitive data in MEMORY.md)
- [ ] Homepage deployed to spec-weave.com

---

**Next Step**: Run `/sw:do` to begin implementation
