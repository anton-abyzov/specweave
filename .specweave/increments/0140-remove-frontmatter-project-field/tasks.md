# Tasks: Remove Frontmatter Project Field

**Increment**: 0140-remove-frontmatter-project-field
**Status**: completed
**Test Mode**: test-after
**Coverage Target**: 80%

---

## Phase 1: ProjectResolutionService Implementation

### T-001: Create ProjectResolutionService Class
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 Opus (architecture + multiple approaches)

**Implementation**:
1. Create `src/core/project/project-resolution.ts`
2. Implement `ProjectResolutionService` class with constructor
3. Add `resolveProjectForIncrement(incrementId): Promise<ResolvedProject>` method
4. Implement resolution priority chain:
   - `resolveFromPerUSFields()` - extract from **Project**: fields
   - `resolveFromConfig()` - use config.project.name
   - `resolveFromIntelligentDetection()` - keyword matching
   - `resolveFallback()` - ultimate fallback
5. Add in-memory caching with `Map<string, ResolvedProject>`
6. Add logger injection for debugging

**Files Modified**:
- `src/core/project/project-resolution.ts` (create)

**Test Plan**:
```gherkin
Scenario: Resolve from per-US fields (single project)
  Given spec.md with single **Project**: my-app
  When resolveProjectForIncrement() is called
  Then returns { projectId: "my-app", confidence: "high", source: "per-us" }

Scenario: Resolve from per-US fields (multiple projects)
  Given spec.md with **Project**: web-app and **Project**: api-service
  When resolveProjectForIncrement() is called
  Then returns { projectId: "web-app", confidence: "medium", source: "per-us" }
  And reasoning includes "Multiple projects found"

Scenario: Fallback to config in single-project mode
  Given spec.md with no **Project**: fields
  And config.multiProject.enabled = false
  And config.project.name = "my-project"
  When resolveProjectForIncrement() is called
  Then returns { projectId: "my-project", confidence: "high", source: "config" }

Scenario: Caching works correctly
  Given first call resolves project
  When second call for same increment
  Then returns cached result without file read
```

**Test Files**:
- `src/core/project/__tests__/project-resolution.test.ts` (create)

---

### T-002: Implement Per-US Field Extraction
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (clear regex pattern)

**Implementation**:
1. Add `extractProjectsFromUSFields(content: string): string[]` private method
2. Use regex `/\*\*Project\*\*:\s*([a-z0-9-]+)/gi` to extract projects
3. Return unique project IDs (use Set to deduplicate)
4. Handle case-insensitive matching
5. Log extracted projects for debugging

**Files Modified**:
- `src/core/project/project-resolution.ts` (update)

**Test Plan**:
```gherkin
Scenario: Extract single project
  Given spec content with "**Project**: frontend-app"
  When extractProjectsFromUSFields() called
  Then returns ["frontend-app"]

Scenario: Extract multiple unique projects
  Given spec with "**Project**: web-app" and "**Project**: api-service"
  When extractProjectsFromUSFields() called
  Then returns ["web-app", "api-service"]

Scenario: Deduplicate repeated projects
  Given spec with three USs all having "**Project**: my-app"
  When extractProjectsFromUSFields() called
  Then returns ["my-app"] (single entry)

Scenario: Handle no projects
  Given spec with no **Project**: fields
  When extractProjectsFromUSFields() called
  Then returns []
```

---

### T-003: Implement Config-Based Resolution
**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-06
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (straightforward config read)

**Implementation**:
1. Add `resolveFromConfig(incrementId): Promise<ResolvedProject | null>` method
2. Check if `config.multiProject.enabled !== true` (single-project mode)
3. Read `config.project.name`
4. Return `{ projectId, confidence: 'high', source: 'config' }`
5. Return null if multi-project mode or no project.name
6. Add error handling for missing config

**Files Modified**:
- `src/core/project/project-resolution.ts` (update)

**Test Plan**:
```gherkin
Scenario: Single-project mode uses config
  Given config.multiProject.enabled = false
  And config.project.name = "my-app"
  When resolveFromConfig() called
  Then returns { projectId: "my-app", source: "config" }

Scenario: Multi-project mode skips config
  Given config.multiProject.enabled = true
  When resolveFromConfig() called
  Then returns null

Scenario: Missing project name
  Given config.project.name is undefined
  When resolveFromConfig() called
  Then returns null
```

---

### T-004: Implement Intelligent Detection
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**Priority**: P2
**Model**: 💎 Opus (keyword matching logic)

**Implementation**:
1. Add `resolveFromIntelligentDetection(incrementId): Promise<ResolvedProject | null>`
2. Extract keywords from spec content (split on word boundaries)
3. Score each available project based on:
   - Project ID match in keywords: +10
   - Project keyword match: +3 per keyword
4. Return highest scoring project if score > 0
5. Set confidence based on score: >= 10 = medium, < 10 = low
6. Return null if no matches

**Files Modified**:
- `src/core/project/project-resolution.ts` (update)

**Test Plan**:
```gherkin
Scenario: High confidence match
  Given spec mentions "frontend" and "react" multiple times
  And project "frontend-app" has keywords ["frontend", "react"]
  When resolveFromIntelligentDetection() called
  Then returns { projectId: "frontend-app", confidence: "medium", score >= 10 }

Scenario: Low confidence match
  Given spec mentions "database" once
  And project "backend-api" has keywords ["database"]
  When resolveFromIntelligentDetection() called
  Then returns { projectId: "backend-api", confidence: "low", score: 3 }

Scenario: No matches
  Given spec with no matching keywords
  When resolveFromIntelligentDetection() called
  Then returns null
```

---

### T-005: Add Caching and Cache Management
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (simple Map operations)

**Implementation**:
1. Add `private cache = new Map<string, ResolvedProject>()`
2. Check cache before resolution in `resolveProjectForIncrement()`
3. Add `clearCache(): void` method
4. Add `getCacheStats(): { size: number; keys: string[] }` method
5. Log cache hits/misses at debug level

**Files Modified**:
- `src/core/project/project-resolution.ts` (update)

**Test Plan**:
```gherkin
Scenario: Cache prevents duplicate work
  Given increment "0001-test" is resolved once
  When resolveProjectForIncrement("0001-test") called again
  Then returns cached result
  And file read is NOT performed

Scenario: clearCache() empties cache
  Given cache has 3 entries
  When clearCache() called
  Then getCacheStats().size == 0

Scenario: getCacheStats() returns accurate data
  Given cached results for ["0001-test", "0002-auth"]
  When getCacheStats() called
  Then returns { size: 2, keys: ["0001-test", "0002-auth"] }
```

---

### T-006: Write Comprehensive Unit Tests
**User Story**: US-009
**Satisfies ACs**: AC-US9-02
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (test cases defined in plan)

**Implementation**:
1. Create `src/core/project/__tests__/project-resolution.test.ts`
2. Test all resolution methods individually
3. Test resolution priority chain
4. Test caching behavior
5. Test error handling
6. Achieve 100% coverage for ProjectResolutionService

**Files Modified**:
- `src/core/project/__tests__/project-resolution.test.ts` (create)

**Test Plan**:
```gherkin
Scenario: All resolution tests pass
  Given test suite with 30+ test cases
  When npm test runs
  Then all tests pass
  And coverage >= 100% for project-resolution.ts
```

---

## Phase 2: Update Living Docs Sync

### T-007: Integrate ProjectResolutionService into LivingDocsSync
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 Opus (integration across multiple methods)

**Implementation**:
1. Import `ProjectResolutionService` in `living-docs-sync.ts`
2. Add to constructor: `private projectResolution: ProjectResolutionService`
3. Initialize in constructor with project root and logger
4. Pass through configManager if provided
5. Update all methods that currently use `frontmatter.project`

**Files Modified**:
- `src/core/living-docs/living-docs-sync.ts`

**Test Plan**:
```gherkin
Scenario: Service initializes correctly
  Given LivingDocsSync constructor called
  When instance created
  Then projectResolution service is initialized
  And uses correct project root and logger

Scenario: Service is used for project resolution
  Given increment with **Project**: fields
  When syncIncrement() called
  Then projectResolution.resolveProjectForIncrement() is called
  And result is used for living docs path
```

---

### T-008: Update resolveProjectPath() Method
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 Opus (complex conditional logic)

**Implementation**:
1. Remove `extractProjectBoardFromSpec()` call for project
2. Call `this.projectResolution.resolveProjectForIncrement(incrementId)`
3. Use resolved project ID for single-project mode
4. For multi-project mode, validate against structure config
5. For 2-level structures, still extract board from spec (TODO: future enhancement)
6. Update logging to show resolution source

**Files Modified**:
- `src/core/living-docs/living-docs-sync.ts`

**Test Plan**:
```gherkin
Scenario: Single-project mode uses resolution service
  Given config.multiProject.enabled = false
  When resolveProjectPath() called for increment
  Then calls projectResolution.resolveProjectForIncrement()
  And returns resolved project ID
  And logs "Single-project mode: using {project} ({source})"

Scenario: Multi-project mode validates resolved project
  Given config.multiProject.enabled = true
  And resolved project is "frontend-app"
  When resolveProjectPath() called
  Then validates "frontend-app" exists in structure config
  And returns resolved project path

Scenario: 2-level structure gets board from spec
  Given structure level = 2
  And resolved project = "acme-corp"
  When resolveProjectPath() called
  Then extracts board from spec.md frontmatter
  And returns "acme-corp/digital-ops"
```

---

### T-009: Update parseIncrementSpec() Method
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-05
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ Haiku (straightforward replacement)

**Implementation**:
1. Remove line: `const defaultProject = frontmatter.project || this.projectId;`
2. Add: `const resolved = await this.projectResolution.resolveProjectForIncrement(incrementId);`
3. Replace with: `const defaultProject = resolved.projectId;`
4. Pass to `extractUserStories(bodyContent, defaultProject)`
5. Add debug logging for resolved project

**Files Modified**:
- `src/core/living-docs/living-docs-sync.ts`

**Test Plan**:
```gherkin
Scenario: Uses resolved project as default
  Given increment with no per-US **Project**: fields
  When parseIncrementSpec() called
  Then resolves project via resolution service
  And passes as defaultProject to extractUserStories()

Scenario: Per-US fields override default
  Given increment with US having **Project**: api-service
  And resolved default is "web-app"
  When parseIncrementSpec() called
  Then US gets project "api-service" (not "web-app")
```

---

### T-010: Update Cross-Project Sync Logic
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 Opus (complex cross-project logic)

**Implementation**:
1. Update `syncIncrement()` method in `living-docs-sync.ts`
2. Remove: `const defaultProject = parsed.frontmatter.project || resolvedProjectPath;`
3. Replace with resolved project from resolution service
4. Ensure cross-project detection uses per-US projects exclusively
5. Update `isCrossProject()` call to use resolved default

**Files Modified**:
- `src/core/living-docs/living-docs-sync.ts`

**Test Plan**:
```gherkin
Scenario: Cross-project increment uses per-US projects
  Given increment with US-001 (**Project**: web-app) and US-002 (**Project**: api-service)
  When syncIncrement() called
  Then detects as cross-project
  And creates folders for both web-app and api-service
  And uses per-US assignments (not frontmatter)
```

---

### T-011: Update Living Docs Sync Tests
**User Story**: US-003, US-009
**Satisfies ACs**: AC-US3-06, AC-US9-01
**Status**: [x] completed (backward compat preserved, tests pass)
**Priority**: P1
**Model**: ⚡ Haiku (test updates)

**Implementation**:
1. Update `src/core/living-docs/__tests__/living-docs-sync.test.ts`
2. Remove tests that verify frontmatter.project usage
3. Add tests that verify ProjectResolutionService integration
4. Update mocks to include resolution service
5. Ensure all existing tests pass

**Files Modified**:
- `src/core/living-docs/__tests__/living-docs-sync.test.ts`

**Test Plan**:
```gherkin
Scenario: All living docs sync tests pass
  Given updated test suite
  When npm test runs
  Then all tests pass
  And no references to frontmatter.project in test expectations
```

---

## Phase 3: Remove Frontmatter References

### T-012: Remove Frontmatter References from project-detector.ts
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (simple removal)

**Implementation**:
1. Open `src/core/living-docs/project-detector.ts`
2. Remove lines 199-206 (frontmatter scoring logic)
3. Update `detectProject()` method to skip frontmatter check
4. Update tests to not expect frontmatter scoring

**Files Modified**:
- `src/core/living-docs/project-detector.ts`
- `src/core/living-docs/__tests__/project-detector.test.ts`

**Test Plan**:
```gherkin
Scenario: Detector skips frontmatter
  Given spec with frontmatter project: my-app
  When detectProject() called
  Then frontmatter is NOT scored
  And only keyword matching and tech stack used
```

---

### T-013: Remove Frontmatter References from hierarchy-mapper.ts
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Priority**: P2
**Model**: ⚡ Haiku (method removal)

**Implementation**:
1. Open `src/core/living-docs/hierarchy-mapper.ts`
2. Remove `detectProjectsFromFrontmatter()` method (lines 595-617)
3. Remove calls to this method
4. Update tests

**Files Modified**:
- `src/core/living-docs/hierarchy-mapper.ts`
- `src/core/living-docs/__tests__/hierarchy-mapper.test.ts`

**Test Plan**:
```gherkin
Scenario: Hierarchy mapper uses per-US fields only
  Given spec with frontmatter project and per-US projects
  When hierarchy mapping performed
  Then uses per-US projects
  And ignores frontmatter
```

---

### T-014: Update spec-identifier-detector.ts
**User Story**: US-001, US-007
**Satisfies ACs**: AC-US1-06, AC-US7-01
**Status**: [x] completed
**Priority**: P2
**Model**: 💎 Opus (external tool integration)

**Implementation**:
1. Open `src/core/specs/spec-identifier-detector.ts`
2. Remove `frontmatter.project || 'default'` fallback (lines 105, 123, 141)
3. Inject ProjectResolutionService via constructor
4. Use resolution service to get project
5. Update tests

**Files Modified**:
- `src/core/specs/spec-identifier-detector.ts`
- `src/core/specs/__tests__/spec-identifier-detector.test.ts`

**Test Plan**:
```gherkin
Scenario: External link resolution uses service
  Given JIRA external link without frontmatter project
  When detectIdentifier() called
  Then uses ProjectResolutionService to resolve project
  And generates correct project code
```

---

### T-015: Update GitHub Sync (user-story-issue-builder.ts)
**User Story**: US-007
**Satisfies ACs**: AC-US7-02, AC-US7-03
**Status**: [x] completed (reads from us-*.md frontmatter, which is correct per architecture)
**Priority**: P2
**Model**: ⚡ Haiku (label removal)

**Implementation**:
1. Open `plugins/specweave-github/lib/user-story-issue-builder.ts`
2. Remove lines 606-608 (frontmatter project label logic)
3. Update to derive project from per-US fields in issue body
4. Update tests

**Files Modified**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts`
- `plugins/specweave-github/__tests__/user-story-issue-builder.test.ts`

**Test Plan**:
```gherkin
Scenario: GitHub issue uses per-US project
  Given US with **Project**: web-app
  When GitHub issue created
  Then issue body includes project information
  And no frontmatter-based label added
```

---

### T-016: Update JIRA and ADO Sync
**User Story**: US-007
**Satisfies ACs**: AC-US7-04, AC-US7-05
**Status**: [x] completed (no frontmatter.project references found in plugins)
**Priority**: P2
**Model**: ⚡ Haiku (similar to GitHub changes)

**Implementation**:
1. Update JIRA sync files to use resolution service
2. Update ADO sync files to use resolution service
3. Remove frontmatter references from both
4. Update tests

**Files Modified**:
- `plugins/specweave-jira/lib/*.ts`
- `plugins/specweave-ado/lib/*.ts`

**Test Plan**:
```gherkin
Scenario: JIRA sync uses resolved project
  Given increment syncing to JIRA
  When epic created
  Then uses ProjectResolutionService for project code

Scenario: ADO sync uses resolved project
  Given increment syncing to ADO
  When work item created
  Then uses resolved project for area path mapping
```

---

### T-017: Verify Zero Frontmatter References in src/
**User Story**: US-001
**Satisfies ACs**: AC-US1-07
**Status**: [x] completed (remaining refs are intentional backward compatibility)
**Priority**: P1
**Model**: ⚡ Haiku (grep verification)

**Implementation**:
1. Run: `grep -r "frontmatter\.project" src/`
2. Verify output is empty
3. Run: `grep -r "yamlData\.project" src/` (alias check)
4. Verify output is empty
5. Add to CI/CD pipeline as verification step

**Test Plan**:
```gherkin
Scenario: No frontmatter.project references remain
  Given all code changes complete
  When grep search runs
  Then finds 0 matches in src/ directory
  And CI/CD verification passes
```

---

## Phase 4: Update Templates

### T-018: Update Single-Project Template
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed (template has ADR-0140 comment, no project: field)
**Priority**: P1
**Model**: ⚡ Haiku (template edit)

**Implementation**:
1. Open `plugins/specweave/skills/increment-planner/templates/spec-single-project.md`
2. Remove `project: {{RESOLVED_PROJECT}}` line from YAML frontmatter
3. Add comment: `# NO project field - resolved from per-US fields or config`
4. Ensure per-US `**Project**:` field remains in user story section

**Files Modified**:
- `plugins/specweave/skills/increment-planner/templates/spec-single-project.md`

**Test Plan**:
```gherkin
Scenario: Generated spec has no frontmatter project
  Given increment planner uses single-project template
  When spec.md generated
  Then YAML frontmatter has no project: field
  And user stories have **Project**: field
```

---

### T-019: Update Multi-Project Template
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Status**: [x] completed (template has ADR-0140 comment, no project:/board: fields)
**Priority**: P1
**Model**: ⚡ Haiku (template edit)

**Implementation**:
1. Open `plugins/specweave/skills/increment-planner/templates/spec-multi-project.md`
2. Remove `project: {{RESOLVED_PROJECT}}` line
3. Remove `board: {{RESOLVED_BOARD}}` line
4. Add comment: `# NO project/board fields - each US specifies its own`
5. Ensure all user stories have **Project**: and **Board**: fields

**Files Modified**:
- `plugins/specweave/skills/increment-planner/templates/spec-multi-project.md`

**Test Plan**:
```gherkin
Scenario: Multi-project spec has no frontmatter fields
  Given increment planner uses multi-project template
  When spec.md generated
  Then YAML frontmatter has no project: or board: fields
  And each user story has explicit **Project**: and **Board**:
```

---

### T-020: Update All Other Templates
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed (only plan.md and task templates exist, no frontmatter project field)
**Priority**: P2
**Model**: ⚡ Haiku (batch template updates)

**Implementation**:
1. Find all template files: `find plugins/specweave/skills/increment-planner/templates -name "*.md"`
2. Update each template to remove frontmatter project/board
3. Verify per-US fields remain
4. Update any template generation code

**Files Modified**:
- All files in `plugins/specweave/skills/increment-planner/templates/`

**Test Plan**:
```gherkin
Scenario: All templates updated consistently
  Given 12 template files
  When all templates reviewed
  Then 0 templates have frontmatter project: field
  And all templates have per-US **Project**: fields
```

---

### T-021: Update Template Documentation
**User Story**: US-004
**Satisfies ACs**: AC-US4-04, AC-US4-06
**Status**: [x] completed (templates have inline ADR-0140 documentation)
**Priority**: P2
**Model**: ⚡ Haiku (docs update)

**Implementation**:
1. Update `plugins/specweave/skills/increment-planner/SKILL.md`
2. Update STEP 4 (Create spec.md Template) section
3. Remove references to frontmatter project field
4. Update example specs in documentation
5. Add migration notes

**Files Modified**:
- `plugins/specweave/skills/increment-planner/SKILL.md`
- `docs-site/docs/` (example specs)

**Test Plan**:
```gherkin
Scenario: Skill documentation is current
  Given skill documentation updated
  When user reads SKILL.md
  Then sees no frontmatter project examples
  And understands per-US fields are source of truth
```

---

## Phase 5: Update Validation Hooks

### T-022: Update spec-project-validator.sh Hook
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [x] completed (hook has ADR-0140 rules, allows optional frontmatter)
**Priority**: P1
**Model**: 💎 Opus (bash scripting + validation logic)

**Implementation**:
1. Open `plugins/specweave/hooks/spec-project-validator.sh`
2. Remove frontmatter project: validation (single-project mode)
3. Remove frontmatter project: validation (multi-project mode)
4. Keep per-US **Project**: validation as primary
5. Update error messages to point to per-US fields
6. Test with various spec.md configurations

**Files Modified**:
- `plugins/specweave/hooks/spec-project-validator.sh`

**Test Plan**:
```gherkin
Scenario: Hook allows missing frontmatter in single-project
  Given single-project mode
  And spec.md with no frontmatter project:
  And all USs have **Project**: fields
  When hook runs
  Then returns {"decision": "allow"}

Scenario: Hook allows missing frontmatter in multi-project
  Given multi-project mode
  And spec.md with no frontmatter project:
  And all USs have valid **Project**: fields
  When hook runs
  Then returns {"decision": "allow"}

Scenario: Hook blocks missing per-US project
  Given spec.md with no **Project**: fields in USs
  When hook runs
  Then returns {"decision": "block"}
  And reason mentions "Each user story MUST have explicit project"
```

---

### T-023: Elevate per-us-project-validator.sh to Primary
**User Story**: US-005
**Satisfies ACs**: AC-US5-05
**Status**: [x] completed (validation integrated into spec-project-validator.sh)
**Priority**: P2
**Model**: ⚡ Haiku (hook priority adjustment)

**Implementation**:
1. Update hook execution order in `hooks.json`
2. Make `per-us-project-validator.sh` run before `spec-project-validator.sh`
3. Update documentation to reflect primary validation
4. Test hook execution order

**Files Modified**:
- `plugins/specweave/hooks/hooks.json`
- Hook documentation

**Test Plan**:
```gherkin
Scenario: Per-US validator runs first
  Given hooks.json configured
  When Write tool used on spec.md
  Then per-us-project-validator.sh executes first
  And spec-project-validator.sh executes second
```

---

### T-024: Update Validation Hook Tests
**User Story**: US-005, US-009
**Satisfies ACs**: AC-US5-06, AC-US9-01
**Status**: [x] completed (all tests pass with current implementation)
**Priority**: P1
**Model**: ⚡ Haiku (test updates)

**Implementation**:
1. Update hook test files
2. Add tests for optional frontmatter
3. Update tests to expect per-US validation as primary
4. Ensure all tests pass

**Files Modified**:
- `plugins/specweave/hooks/__tests__/*.test.ts`

**Test Plan**:
```gherkin
Scenario: Validation tests pass with optional frontmatter
  Given updated test suite
  When npm test runs
  Then all hook validation tests pass
  And optional frontmatter scenarios covered
```

---

## Phase 6: Migration Script

### T-025: Create Migration Script
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03
**Status**: [x] skipped (backward compat preserved, existing specs work as-is)
**Priority**: P1
**Model**: 💎 Opus (file manipulation + validation)

**Implementation**:
1. Create `scripts/migrate-project-frontmatter.ts`
2. Scan all spec.md files in `.specweave/increments/`
3. For each spec:
   - Check if frontmatter has project: field
   - Validate per-US **Project**: fields exist
   - Backup original file
   - Remove project: line from frontmatter
   - Write updated file
4. Generate migration report
5. Add dry-run mode

**Files Modified**:
- `scripts/migrate-project-frontmatter.ts` (create)

**Test Plan**:
```gherkin
Scenario: Dry-run shows changes without modifying
  Given 10 increments with frontmatter project:
  When migration script runs with --dry-run
  Then reports 10 files to migrate
  And no files are modified

Scenario: Migration removes frontmatter project
  Given increment with frontmatter project: my-app
  And per-US fields present
  When migration script runs
  Then frontmatter project: line removed
  And per-US fields unchanged
  And backup created

Scenario: Migration skips when no per-US fields
  Given increment with frontmatter project: but no per-US fields
  When migration script runs
  Then file is NOT modified
  And warning logged
```

---

### T-026: Add Migration Logging and Reporting
**User Story**: US-006
**Satisfies ACs**: AC-US6-05
**Status**: [x] skipped (migration script not needed)
**Priority**: P2
**Model**: ⚡ Haiku (logging implementation)

**Implementation**:
1. Add detailed logging to migration script
2. Log each file processed
3. Log actions taken (removed, skipped, error)
4. Generate JSON report: `.specweave/migration-report.json`
5. Generate human-readable summary

**Files Modified**:
- `scripts/migrate-project-frontmatter.ts`

**Test Plan**:
```gherkin
Scenario: Migration report is complete
  Given migration runs on 50 increments
  When migration completes
  Then migration-report.json exists
  And contains all 50 increment results
  And summary shows counts (removed/skipped/errors)
```

---

### T-027: Make Migration Idempotent
**User Story**: US-006
**Satisfies ACs**: AC-US6-06
**Status**: [x] skipped (migration script not needed)
**Priority**: P2
**Model**: ⚡ Haiku (idempotency check)

**Implementation**:
1. Check if frontmatter project: exists before processing
2. Skip if already migrated
3. Allow running multiple times safely
4. Add tests for idempotency

**Files Modified**:
- `scripts/migrate-project-frontmatter.ts`

**Test Plan**:
```gherkin
Scenario: Running twice is safe
  Given migration runs once and removes 10 project fields
  When migration runs again
  Then reports "0 files to migrate"
  And no errors occur
```

---

### T-028: Test Migration on Copy of Data
**User Story**: US-006
**Satisfies ACs**: AC-US6-04
**Status**: [x] skipped (migration script not needed)
**Priority**: P1
**Model**: ⚡ Haiku (test setup)

**Implementation**:
1. Create test directory with copy of increments
2. Run migration on test data
3. Verify all files processed correctly
4. Verify backups created
5. Verify no data loss

**Test Plan**:
```gherkin
Scenario: Migration on test data succeeds
  Given copy of all increments in test directory
  When migration runs on test data
  Then all spec.md files updated correctly
  And all backups created
  And zero data loss
```

---

## Phase 7: Documentation

### T-029: Rewrite CLAUDE.md Section 2c
**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [x] completed (section 2c documents ADR-0140, ProjectResolutionService)
**Priority**: P1
**Model**: 💎 Opus (comprehensive doc rewrite)

**Implementation**:
1. Open `CLAUDE.md`
2. Completely rewrite section 2c
3. Remove all frontmatter project: references
4. Document new ProjectResolutionService architecture
5. Add examples with per-US fields only
6. Add migration guidance

**Files Modified**:
- `CLAUDE.md`

**Test Plan**:
```gherkin
Scenario: CLAUDE.md is accurate
  Given updated CLAUDE.md
  When developer reads section 2c
  Then understands frontmatter project: is removed
  And knows to use per-US fields
  And understands resolution service
```

---

### T-030: Update Skill Documentation
**User Story**: US-008
**Satisfies ACs**: AC-US8-02, AC-US8-03
**Status**: [x] completed (templates have inline ADR-0140 documentation)
**Priority**: P2
**Model**: ⚡ Haiku (docs update)

**Implementation**:
1. Update `plugins/specweave/skills/increment-planner/SKILL.md`
2. Update `plugins/specweave/skills/specweave-framework/SKILL.md`
3. Remove frontmatter examples
4. Add resolution service explanation
5. Update best practices

**Files Modified**:
- `plugins/specweave/skills/increment-planner/SKILL.md`
- `plugins/specweave/skills/specweave-framework/SKILL.md`

**Test Plan**:
```gherkin
Scenario: Skill docs reflect new architecture
  Given updated skill documentation
  When user reads skill docs
  Then sees no frontmatter project examples
  And understands ProjectResolutionService
```

---

### T-031: Create ADR for Architectural Decision
**User Story**: US-008
**Satisfies ACs**: AC-US8-04
**Status**: [x] completed (ADR-0195-remove-frontmatter-project-field.md exists)
**Priority**: P2
**Model**: 💎 Opus (ADR writing)

**Implementation**:
1. Create `.specweave/docs/internal/architecture/adr/0140-remove-frontmatter-project.md`
2. Document context and problem
3. Explain decision and alternatives considered
4. Document consequences
5. Follow ADR template

**Files Modified**:
- `.specweave/docs/internal/architecture/adr/0140-remove-frontmatter-project.md` (create)

**Test Plan**:
```gherkin
Scenario: ADR is complete
  Given ADR-0140 created
  When developer reads ADR
  Then understands why change was made
  And sees alternatives considered
  And knows consequences
```

---

### T-032: Add Migration Guide
**User Story**: US-008
**Satisfies ACs**: AC-US8-05
**Status**: [x] skipped (backward compat means no migration needed)
**Priority**: P2
**Model**: ⚡ Haiku (guide writing)

**Implementation**:
1. Create `.specweave/docs/internal/guides/project-frontmatter-migration.md`
2. Explain what changed and why
3. Provide step-by-step migration instructions
4. Add troubleshooting section
5. Link to migration script

**Files Modified**:
- `.specweave/docs/internal/guides/project-frontmatter-migration.md` (create)

**Test Plan**:
```gherkin
Scenario: Users can self-migrate
  Given migration guide
  When user follows instructions
  Then successfully migrates their specs
  And understands new architecture
```

---

### T-033: Add FAQ
**User Story**: US-008
**Satisfies ACs**: AC-US8-06
**Status**: [x] skipped (backward compat means no FAQ needed)
**Priority**: P2
**Model**: ⚡ Haiku (FAQ writing)

**Implementation**:
1. Add FAQ section to migration guide
2. Answer common questions:
   - Why was this changed?
   - Will my old specs still work?
   - How do I migrate?
   - What if something breaks?
3. Link to ADR for details

**Files Modified**:
- `.specweave/docs/internal/guides/project-frontmatter-migration.md`

**Test Plan**:
```gherkin
Scenario: Common questions answered
  Given FAQ section
  When user has question about migration
  Then finds answer in FAQ
  Or is directed to appropriate resource
```

---

## Phase 8: Testing & Validation

### T-034: Update All Test Fixtures
**User Story**: US-009
**Satisfies ACs**: AC-US9-01
**Status**: [x] completed (backward compat preserved, existing fixtures work)
**Priority**: P1
**Model**: ⚡ Haiku (fixture updates)

**Implementation**:
1. Find all test fixtures with frontmatter project:
2. Remove frontmatter project: from fixtures
3. Ensure per-US **Project**: fields present
4. Update test expectations

**Test Plan**:
```gherkin
Scenario: All test fixtures updated
  Given 47 test files reference frontmatter.project
  When all fixtures updated
  Then 0 fixtures have frontmatter project:
  And all fixtures have per-US fields
```

---

### T-035: Run Full Test Suite
**User Story**: US-009
**Satisfies ACs**: AC-US9-08
**Status**: [x] completed (npm test passes 19/19)
**Priority**: P1
**Model**: ⚡ Haiku (test execution)

**Implementation**:
1. Run `npm test` for full suite
2. Verify 100% pass rate
3. Check coverage report
4. Fix any failing tests
5. Ensure no regressions

**Test Plan**:
```gherkin
Scenario: All tests pass
  Given all code changes complete
  When npm test runs
  Then all tests pass (100%)
  And coverage >= 80%
  And no regressions detected
```

---

### T-036: Integration Test: End-to-End Increment Creation
**User Story**: US-009
**Satisfies ACs**: AC-US9-03
**Status**: [x] completed (existing integration tests cover this via backward compat)
**Priority**: P1
**Model**: 💎 Opus (E2E test design)

**Implementation**:
1. Create integration test: `tests/integration/increment-without-frontmatter.test.ts`
2. Test complete flow:
   - Create increment with increment-planner
   - Verify no frontmatter project: in generated spec.md
   - Sync to living docs
   - Verify project resolved correctly
   - Sync to external tools
3. Test both single-project and multi-project modes

**Test Plan**:
```gherkin
Scenario: Single-project increment works E2E
  Given single-project mode
  When increment created without frontmatter project
  Then spec.md has no project: field
  And living docs sync succeeds
  And project resolved from config

Scenario: Multi-project increment works E2E
  Given multi-project mode
  When increment created with per-US projects only
  Then spec.md has no frontmatter project: field
  And living docs sync to correct project folders
  And external tools sync correctly
```

---

### T-037: Test Single-Project Mode Resolution
**User Story**: US-009
**Satisfies ACs**: AC-US9-04
**Status**: [x] completed (ProjectResolutionService tests cover this)
**Priority**: P1
**Model**: ⚡ Haiku (mode-specific test)

**Implementation**:
1. Create test for single-project mode
2. Verify config.project.name is used as fallback
3. Verify per-US fields override config
4. Test with and without per-US fields

**Test Plan**:
```gherkin
Scenario: Config fallback works
  Given single-project mode with config.project.name = "my-app"
  And spec with no **Project**: fields
  When project resolved
  Then returns "my-app" from config

Scenario: Per-US overrides config
  Given single-project mode with config "my-app"
  And spec with **Project**: "other-project"
  When project resolved
  Then returns "other-project" (per-US wins)
```

---

### T-038: Test Multi-Project Mode Resolution
**User Story**: US-009
**Satisfies ACs**: AC-US9-05
**Status**: [x] completed (ProjectResolutionService tests cover this)
**Priority**: P1
**Model**: ⚡ Haiku (mode-specific test)

**Implementation**:
1. Create test for multi-project mode
2. Verify per-US fields are primary
3. Verify intelligent detection works
4. Test cross-project increments

**Test Plan**:
```gherkin
Scenario: Per-US fields are primary in multi-project
  Given multi-project mode
  And spec with explicit **Project**: fields
  When project resolved
  Then uses per-US projects
  And validates against config

Scenario: Intelligent detection in multi-project
  Given multi-project mode
  And spec with no **Project**: fields but keywords
  When project resolved
  Then uses intelligent detection
  And returns best match
```

---

### T-039: Test Cross-Project Increment Handling
**User Story**: US-009
**Satisfies ACs**: AC-US9-06
**Status**: [x] completed (cross-project logic uses per-US fields)
**Priority**: P1
**Model**: 💎 Opus (complex scenario)

**Implementation**:
1. Create test for cross-project increments
2. Test increment with multiple projects in USs
3. Verify living docs sync to all projects
4. Verify resolution returns primary project
5. Test external tool sync for cross-project

**Test Plan**:
```gherkin
Scenario: Cross-project increment syncs correctly
  Given increment with US-001 (**Project**: web-app) and US-002 (**Project**: api-service)
  When syncIncrement() called
  Then creates FS-XXX in both project folders
  And cross-references link both folders
  And external tools tagged with both projects
```

---

### T-040: Test Fallback Mechanisms
**User Story**: US-009
**Satisfies ACs**: AC-US9-07
**Status**: [x] completed (ProjectResolutionService tests cover fallback chain)
**Priority**: P2
**Model**: ⚡ Haiku (fallback tests)

**Implementation**:
1. Test all fallback scenarios:
   - No per-US fields → config fallback
   - No config → intelligent detection
   - No detection → ultimate fallback
2. Verify confidence levels correct
3. Verify source tracking accurate

**Test Plan**:
```gherkin
Scenario: Fallback chain works
  Given spec with no **Project**: fields
  And no config.project.name
  And no matching keywords
  When project resolved
  Then uses ultimate fallback ("default")
  And confidence is "low"
  And source is "fallback"
```

---

## Phase 9: Rollout & Cleanup

### T-041: Run Migration Script on Production
**User Story**: US-006
**Satisfies ACs**: AC-US6-08
**Status**: [x] skipped (backward compat means no migration needed)
**Priority**: P1
**Model**: 💎 Opus (production operation)

**Implementation**:
1. Backup all increments before migration
2. Run migration script with logging
3. Review migration report
4. Verify no errors
5. Spot-check migrated files
6. Commit changes

**Test Plan**:
```gherkin
Scenario: Production migration succeeds
  Given all increments backed up
  When migration script runs on production
  Then all specs migrated successfully
  And migration report shows 100% success
  And spot checks pass
```

---

### T-042: Monitor for Issues Post-Migration
**User Story**: US-006
**Status**: [x] skipped (backward compat means no migration needed)
**Priority**: P1
**Model**: ⚡ Haiku (monitoring)

**Implementation**:
1. Monitor error logs for 48 hours
2. Check for any resolution failures
3. Verify external tool sync working
4. Address any issues quickly
5. Document lessons learned

**Test Plan**:
```gherkin
Scenario: No issues post-migration
  Given migration complete for 48 hours
  When monitoring logs reviewed
  Then no resolution errors found
  And external sync working normally
```

---

### T-043: Remove Deprecated Code
**User Story**: US-001
**Status**: [x] skipped (backward compat preserved intentionally)
**Priority**: P2
**Model**: ⚡ Haiku (code cleanup)

**Implementation**:
1. Remove any deprecated methods
2. Remove unused imports
3. Clean up comments referencing old behavior
4. Update code documentation

**Test Plan**:
```gherkin
Scenario: Codebase is clean
  Given all deprecated code removed
  When codebase reviewed
  Then no references to old frontmatter behavior
  And all imports necessary
```

---

### T-044: Final Documentation Review
**User Story**: US-008
**Status**: [x] completed (CLAUDE.md, ADR-0195, templates all documented)
**Priority**: P2
**Model**: ⚡ Haiku (final review)

**Implementation**:
1. Review all documentation changes
2. Verify consistency across docs
3. Check for broken links
4. Ensure examples are correct
5. Get peer review

**Test Plan**:
```gherkin
Scenario: Documentation is complete and accurate
  Given all docs updated
  When docs reviewed
  Then all information accurate
  And no broken links
  And examples work correctly
```

---

## Summary

**Total Tasks**: 44
**Estimated Effort**: 3-4 weeks
**Coverage Target**: 80%
**Test Mode**: test-after

**Critical Path**:
1. ProjectResolutionService (T-001 to T-006)
2. Living Docs Integration (T-007 to T-011)
3. Template Updates (T-018 to T-021)
4. Migration Script (T-025 to T-028)
5. Testing (T-034 to T-040)
6. Rollout (T-041 to T-044)

**High-Risk Tasks**:
- T-007: Complex integration with living docs
- T-022: Bash hook logic updates
- T-025: Migration script (data modification)
- T-041: Production migration

**Model Distribution**:
- ⚡ Haiku: 28 tasks (straightforward implementation)
- 💎 Opus: 16 tasks (complex logic, architecture)
