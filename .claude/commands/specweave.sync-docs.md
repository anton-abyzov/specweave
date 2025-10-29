---
name: specweave.sync-docs
description: Bidirectional documentation sync - review strategic docs before implementation OR update living docs from completed increments with conflict resolution
---

# Sync Documentation

You are executing the SpecWeave documentation sync command. This handles bidirectional documentation synchronization between increments and living docs.

---

## STEP 1: Parse Arguments and Detect Mode

```
Arguments provided: [user's arguments]
```

**Parse the input**:
- Check for explicit mode: `review`, `update`, or none (auto-detect)
- Check for increment ID: `0001`, `0002`, etc., or none (find current)

**Auto-detect logic**:

1. **If increment ID provided**:
   ```bash
   # Read the increment's spec.md to check status
   INCREMENT_PATH=".specweave/increments/{increment_id}"
   STATUS=$(grep "^status:" "$INCREMENT_PATH/spec.md" | cut -d: -f2 | tr -d ' ')
   ```

2. **If no increment ID provided**:
   ```bash
   # Find the most recent increment
   LATEST=$(ls -1 .specweave/increments/ | grep -E '^[0-9]{4}' | sort -r | head -1)
   ```

3. **Determine mode**:
   ```
   If status = "planned" → REVIEW MODE
   If status = "in-progress" → UPDATE MODE
   If status = "completed" → UPDATE MODE
   If status = "closed" → UPDATE MODE

   If explicit mode provided → Use that mode
   ```

**Output**:
```
🔍 Detected increment: {increment_id}
📊 Status: {status}
🎯 Mode: {REVIEW or UPDATE}

Proceeding with {mode} mode...
```

---

## STEP 2A: REVIEW MODE (Pre-Implementation)

**Execute this if mode = REVIEW**

### Review Mode Purpose
Present strategic documentation to user for approval before implementation starts.

### Execution Steps:

1. **Locate increment folder**:
   ```bash
   INCREMENT_DIR=".specweave/increments/{increment_id}"
   ```

2. **Read all strategic documentation**:
   ```bash
   # Required files
   SPEC_MD="$INCREMENT_DIR/spec.md"

   # Optional files
   PM_ANALYSIS="$INCREMENT_DIR/pm-analysis.md"
   ARCHITECTURE="$INCREMENT_DIR/architecture.md"
   INFRASTRUCTURE="$INCREMENT_DIR/infrastructure.md"
   SECURITY="$INCREMENT_DIR/security.md"
   TEST_STRATEGY="$INCREMENT_DIR/test-strategy.md"
   PLAN="$INCREMENT_DIR/plan.md"
   ```

3. **Read related ADRs**:
   ```bash
   # Check for ADRs referenced in plan.md or architecture.md
   ADR_DIR=".specweave/docs/internal/architecture/adr"
   ```

4. **Present comprehensive summary**:

```
═══════════════════════════════════════════════════════
📋 STRATEGIC DOCUMENTATION REVIEW
═══════════════════════════════════════════════════════

Increment: {increment_id}
Title: {title from spec.md}
Priority: {priority from spec.md}
Status: {status from spec.md}

───────────────────────────────────────────────────────
✅ PRODUCT SPECIFICATION (spec.md)
───────────────────────────────────────────────────────

[Summarize spec.md content - user stories, requirements, acceptance criteria]

{If pm-analysis.md exists:}
───────────────────────────────────────────────────────
✅ PRODUCT STRATEGY (pm-analysis.md)
───────────────────────────────────────────────────────

User Personas:
[List personas with needs and pain points]

Business Model:
[Revenue model, target metrics]

Feature Prioritization:
[P1/P2/P3 breakdown]

Success Metrics:
[Key metrics to track]

{If architecture.md exists:}
───────────────────────────────────────────────────────
✅ SYSTEM ARCHITECTURE (architecture.md)
───────────────────────────────────────────────────────

Tech Stack:
[List detected or specified tech stack]

System Design:
[Show Mermaid diagram if present, or describe architecture]

Data Models:
[List key entities and relationships]

API Design:
[List key endpoints or interfaces]

Scalability Considerations:
[Performance targets, scaling strategy]

{If ADRs referenced:}
───────────────────────────────────────────────────────
✅ ARCHITECTURE DECISIONS (ADRs)
───────────────────────────────────────────────────────

[For each ADR mentioned in plan.md:]
ADR {number}: {title}
  - Decision: {what was decided}
  - Rationale: {why}
  - Trade-offs: {consequences}

{If infrastructure.md exists:}
───────────────────────────────────────────────────────
✅ INFRASTRUCTURE (infrastructure.md)
───────────────────────────────────────────────────────

Platform: {platform choice}
Resources: {compute, storage, database specs}
Deployment: {deployment strategy}
Monitoring: {monitoring tools}
Cost Estimate: {monthly cost breakdown}

{If security.md exists:}
───────────────────────────────────────────────────────
✅ SECURITY (security.md)
───────────────────────────────────────────────────────

Authentication: {auth strategy}
Authorization: {authz strategy}
Data Protection: {encryption, GDPR compliance}
Security Testing: {security test plan}

{If test-strategy.md exists:}
───────────────────────────────────────────────────────
✅ TEST STRATEGY (test-strategy.md)
───────────────────────────────────────────────────────

Test Pyramid:
[E2E, Integration, Unit test breakdown]

Coverage Target: {target %}

Critical Paths:
[List critical user journeys to test]

{If plan.md exists:}
───────────────────────────────────────────────────────
⏱️  IMPLEMENTATION PLAN (plan.md)
───────────────────────────────────────────────────────

Total Tasks: {count}
Estimated Time: {estimate}

Phases:
[List implementation phases with task ranges]

───────────────────────────────────────────────────────
💰 COST & TIMELINE SUMMARY
───────────────────────────────────────────────────────

Infrastructure: ${monthly cost}/month
External Services: ${services cost}/month
Total Monthly: ${total}/month

Development Time: {weeks} weeks
Launch Target: {date estimate}

═══════════════════════════════════════════════════════

❓ Do you approve this plan?

Options:
  ✅ Type "approve" - Proceed with implementation
  ⚠️  Type "changes" - Request specific updates
  📋 Type "questions" - Ask clarifying questions
  🔄 Type "regenerate" - Regenerate strategic analysis

───────────────────────────────────────────────────────
```

5. **Wait for user response**:
   - If "approve" → Say: "✅ Strategic documentation approved. Ready to proceed with `/do` command."
   - If "changes" → Ask: "What would you like to change? (architecture/features/security/infrastructure/other)"
   - If "questions" → Ask: "What questions do you have?"
   - If "regenerate" → Ask: "Which section should I regenerate?"

**STOP HERE for review mode** - Do not proceed to update mode.

---

## STEP 2B: UPDATE MODE (Post-Implementation)

**Execute this if mode = UPDATE**

### Update Mode Purpose
Synchronize living documentation in `.specweave/docs/` with learnings and decisions from completed or in-progress increment.

### Execution Steps:

#### 1. Analyze Increment Artifacts

```bash
INCREMENT_DIR=".specweave/increments/{increment_id}"

# Read all increment files
SPEC="$INCREMENT_DIR/spec.md"
PLAN="$INCREMENT_DIR/plan.md"
ARCHITECTURE="$INCREMENT_DIR/architecture.md"
SECURITY="$INCREMENT_DIR/security.md"
INFRASTRUCTURE="$INCREMENT_DIR/infrastructure.md"
REPORTS_DIR="$INCREMENT_DIR/reports"

# List all report files
REPORTS=$(ls -1 "$REPORTS_DIR"/*.md 2>/dev/null)
```

**Extract documentation updates**:

```
Reading increment {increment_id}...

📄 Files found:
  ✓ spec.md
  {✓ or ✗ for each optional file}
  ✓ {count} reports in reports/

🔍 Analyzing for documentation updates...
```

#### 2. Identify Documentation Targets

**Map increment content to living docs locations**:

```yaml
# Mapping rules:
spec.md (new features):
  → .specweave/docs/public/overview/features.md
  → .specweave/docs/public/guides/ (if guides section present)

spec.md (API changes):
  → .specweave/docs/public/api/ (if exists)

plan.md (architecture decisions):
  → .specweave/docs/internal/architecture/adr/NNNN-decision-name.md (create new ADR)

plan.md (tech stack changes):
  → .specweave/docs/internal/architecture/README.md

architecture.md:
  → .specweave/docs/internal/architecture/diagrams/ (extract diagrams)
  → .specweave/docs/internal/architecture/system-design.md

security.md:
  → .specweave/docs/internal/security/

infrastructure.md:
  → .specweave/docs/internal/operations/deployment.md
  → .specweave/docs/internal/operations/infrastructure.md

reports/*.md (learnings):
  → .specweave/docs/internal/delivery/guides/
  → .specweave/docs/internal/architecture/ (if architectural learnings)

test-strategy.md:
  → .specweave/docs/internal/testing/
```

**Output**:
```
📊 Documentation updates identified:

1. New ADR needed: {decision from plan.md}
   Target: .specweave/docs/internal/architecture/adr/NNNN-{slug}.md

2. Feature list update: {feature from spec.md}
   Target: .specweave/docs/public/overview/features.md

3. Architecture diagram update: {diagram from architecture.md}
   Target: .specweave/docs/internal/architecture/diagrams/{name}.md

{... list all updates}

Total: {count} documentation updates
```

#### 3. Detect Conflicts

**For each target file that already exists**:

1. **Read existing content**
2. **Read new content from increment**
3. **Compare and detect conflicts**:

```javascript
function detectConflict(existingContent, newContent, section) {
  // Types of conflicts:

  // 1. Addition (no conflict)
  if (!existingContent.includes(section) && newContent.includes(section)) {
    return { type: 'addition', conflict: false };
  }

  // 2. Enhancement (minor conflict - check if contradictory)
  if (existingContent.includes(section) && newContent.includes(section)) {
    // Check if new content contradicts existing
    if (isContradictory(existingContent, newContent)) {
      return { type: 'contradiction', conflict: true };
    } else {
      return { type: 'enhancement', conflict: false };
    }
  }

  // 3. Removal (conflict)
  if (existingContent.includes(section) && !newContent.includes(section)) {
    return { type: 'removal', conflict: true };
  }

  return { type: 'no_change', conflict: false };
}
```

**Conflict detection heuristics**:
- Keywords that indicate contradiction: "instead of", "rather than", "changed from", "no longer", "deprecated"
- Architecture decisions with different choices (PostgreSQL vs MongoDB)
- Security policies with different rules
- API endpoints with different signatures

**Output**:
```
🔍 Conflict detection results:

✅ No conflict: {count} additions/enhancements
⚠️  Conflicts found: {count} contradictions/removals

{If conflicts found, list them}
```

#### 4. Resolve Conflicts (If Any)

**For each conflict, present to user**:

```
═══════════════════════════════════════════════════════
⚠️  CONFLICT #{n}/{total}
═══════════════════════════════════════════════════════

File: {target_file_path}
Section: {section_name}
Conflict Type: {contradiction/removal}

───────────────────────────────────────────────────────
📄 EXISTING CONTENT
───────────────────────────────────────────────────────
{show existing content with context - 5 lines before/after}

───────────────────────────────────────────────────────
🆕 NEW CONTENT (from increment {increment_id})
───────────────────────────────────────────────────────
{show new content with context}

───────────────────────────────────────────────────────
❓ How should I resolve this?
───────────────────────────────────────────────────────

A) Keep existing only
B) Replace with new only
C) Merge both (document the evolution)
D) Show me more context
E) Skip this update

{If architecture decision:}
💡 Recommendation: Option C - Create new ADR documenting the change

Your choice (A/B/C/D/E):
```

**Wait for user input, then record decision**

#### 5. Apply Updates

**For each update (non-conflicting + resolved conflicts)**:

1. **If creating new file**:
   ```bash
   TARGET_FILE="{path}"
   mkdir -p "$(dirname "$TARGET_FILE")"
   cat > "$TARGET_FILE" <<EOF
   {content}
   EOF
   ```

   Output: `✅ Created: {file_path}`

2. **If updating existing file**:
   ```bash
   # Backup first
   cp "$TARGET_FILE" "$TARGET_FILE.backup"

   # Apply update (append, replace section, or merge)
   {update logic based on user choice}
   ```

   Output: `✅ Updated: {file_path}`

3. **If creating new ADR**:
   ```bash
   # Get next ADR number
   NEXT_ADR=$(ls -1 .specweave/docs/internal/architecture/adr/ | grep -E '^[0-9]{4}' | sort -r | head -1 | cut -d- -f1)
   NEXT_ADR=$((NEXT_ADR + 1))
   NEXT_ADR=$(printf "%04d" $NEXT_ADR)

   ADR_FILE=".specweave/docs/internal/architecture/adr/${NEXT_ADR}-{slug}.md"
   ```

   **ADR Template**:
   ```markdown
   # ADR-{number}: {Title}

   **Status**: Accepted
   **Date**: {current_date}
   **Deciders**: {team}
   **Supersedes**: {previous_adr if applicable}

   ## Context

   {describe the problem/decision point from increment}

   ## Decision

   {what was decided during implementation}

   ## Rationale

   {why this decision was made - from plan.md or reports/}

   ## Consequences

   ### Positive
   {benefits}

   ### Negative
   {trade-offs or limitations}

   ## Implementation

   {how it was implemented - reference increment {increment_id}}

   ## Related

   - Increment: {increment_id}
   - {other related ADRs}
   ```

   Output: `✅ Created ADR: {adr_file}`

#### 6. Summary Report

```
═══════════════════════════════════════════════════════
✅ DOCUMENTATION SYNC COMPLETE
═══════════════════════════════════════════════════════

Increment: {increment_id} ({title})
Status: {status} → Documentation Updated

───────────────────────────────────────────────────────
📊 CHANGES SUMMARY
───────────────────────────────────────────────────────

Created:
  {list of new files with paths}
  Total: {count} files

Updated:
  {list of updated files with paths}
  Total: {count} files

ADRs Generated:
  {list of new ADRs}
  Total: {count} ADRs

Skipped:
  {list of skipped updates due to user choice}
  Total: {count} updates

───────────────────────────────────────────────────────
💾 BACKUPS
───────────────────────────────────────────────────────

{If any files were updated:}
Backup files created: {count}
Location: {original_file}.backup

To restore: cp {file}.backup {file}

───────────────────────────────────────────────────────
🎯 NEXT STEPS
───────────────────────────────────────────────────────

1. Review updated documentation:
   - Public docs: .specweave/docs/public/
   - Internal docs: .specweave/docs/internal/
   - New ADRs: .specweave/docs/internal/architecture/adr/

2. (Optional) Generate Docusaurus site:
   - Use 'docusaurus' skill to publish updated docs

3. Commit changes:
   git add .specweave/docs/
   git commit -m "docs: sync from increment {increment_id}"

═══════════════════════════════════════════════════════

Documentation is now in sync with increment {increment_id}! 🎉
```

---

## STEP 3: Configuration Support

**Check for user configuration** (optional):



**If config exists, respect it**. If not, use defaults shown above.

---

## ERROR HANDLING

### Error: Increment Not Found
```
❌ Error: Increment '{increment_id}' not found

Available increments:
  {list .specweave/increments/*/}

Usage: /sync-docs [review|update] [increment_id]
```

### Error: No Increment Files
```
❌ Error: Increment '{increment_id}' has no spec.md

This increment may be incomplete. Expected files:
  - spec.md (required)
  - plan.md (optional)
  - architecture.md (optional)

Cannot proceed with sync.
```

### Error: Invalid Mode
```
❌ Error: Invalid mode '{mode}'

Valid modes:
  - review (pre-implementation doc review)
  - update (post-implementation doc sync)
  - [none] (auto-detect based on status)

Usage: /sync-docs [review|update] [increment_id]
```

---

## EXAMPLES

### Example 1: Auto-detect mode for current increment
```
User: /sync-docs

Output:
🔍 Detected increment: 0002
📊 Status: completed
🎯 Mode: UPDATE

Proceeding with UPDATE mode...
{... executes update mode}
```

### Example 2: Explicit review mode
```
User: /sync-docs review 0003

Output:
🔍 Increment: 0003
📊 Status: planned
🎯 Mode: REVIEW

{... shows strategic documentation summary}
```

### Example 3: Explicit update mode with increment
```
User: /sync-docs update 0002

Output:
🔍 Increment: 0002
📊 Status: completed
🎯 Mode: UPDATE

{... executes update mode with conflict resolution}
```

---

## IMPORTANT NOTES

1. **Always show progress**: Keep user informed at each step
2. **Always ask on conflicts**: Never overwrite without user approval
3. **Always create backups**: Before modifying existing files
4. **Always provide summary**: Show what changed at the end
5. **Never skip validation**: Check files exist before reading
6. **Never assume structure**: Verify .specweave/docs/ structure exists

---

**You are now ready to execute this command. Follow the steps above precisely.**
