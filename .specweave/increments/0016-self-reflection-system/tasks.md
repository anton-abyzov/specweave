---
increment: 0016-self-reflection-system
total_tasks: 30
completed_tasks: 0
test_mode: TDD
coverage_target: 85%
estimated_weeks: 6
phases:
  - name: "Phase 1: Core Engine"
    duration: "2 weeks"
    tasks: ["T-001", "T-002", "T-003", "T-004", "T-005", "T-006", "T-007", "T-008", "T-009", "T-010"]
  - name: "Phase 2: Analysis Capabilities"
    duration: "2 weeks"
    tasks: ["T-011", "T-012", "T-013", "T-014", "T-015", "T-016", "T-017", "T-018", "T-019", "T-020"]
  - name: "Phase 3: User Experience"
    duration: "1 week"
    tasks: ["T-021", "T-022", "T-023", "T-024", "T-025"]
  - name: "Phase 4: Advanced Features"
    duration: "1 week"
    tasks: ["T-026", "T-027", "T-028", "T-029", "T-030"]
---

# Implementation Tasks: AI Self-Reflection System

**Complete Specification**: See [SPEC-016](../../docs/internal/projects/default/specs/spec-016-self-reflection-system.md)
**Implementation Plan**: See [plan.md](./plan.md)

---

## Phase 1: Core Engine (Weeks 1-2)

### T-001: Create Reflection Configuration Schema

**User Story**: US-016-008
**Acceptance Criteria**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: None

**Test Plan**:
- **Given** a SpecWeave project with config.json
- **When** reflection configuration is added to schema
- **Then** config validates correctly with enabled/disabled states, depth levels, model selection, and category filters
- **And** defaults apply for missing values

**Test Cases**:
1. **Unit**: `tests/unit/reflection/config-schema.test.ts`
   - testSchemaValidation(): Valid config passes validation
   - testSchemaDefaults(): Missing values get defaults (enabled=true, model=haiku, depth=standard)
   - testSchemaInvalidValues(): Invalid values rejected (unknown model, invalid depth)
   - testCategoryFilters(): Categories can be enabled/disabled individually
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Open `src/core/schemas/specweave-config.schema.json`
2. Add `reflection` section to schema:
   ```json
   {
     "reflection": {
       "type": "object",
       "description": "Self-reflection configuration",
       "properties": {
         "enabled": {"type": "boolean", "default": true},
         "mode": {"type": "string", "enum": ["auto", "manual", "disabled"], "default": "auto"},
         "depth": {"type": "string", "enum": ["quick", "standard", "deep"], "default": "standard"},
         "model": {"type": "string", "enum": ["haiku", "sonnet", "opus"], "default": "haiku"},
         "categories": {
           "type": "object",
           "properties": {
             "security": {"type": "boolean", "default": true},
             "quality": {"type": "boolean", "default": true},
             "testing": {"type": "boolean", "default": true},
             "performance": {"type": "boolean", "default": true},
             "technicalDebt": {"type": "boolean", "default": true}
           }
         },
         "criticalThreshold": {"type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"], "default": "MEDIUM"},
         "storeReflections": {"type": "boolean", "default": true}
       }
     }
   }
   ```
3. Write unit tests in `tests/unit/reflection/config-schema.test.ts`
4. Run tests: `npm test config-schema.test` (should pass: 4/4)
5. Verify schema with Ajv validator
6. Commit: "feat: add reflection configuration schema"

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test config-schema.test` (0/4 passing)
3. ✅ Implement schema (steps 1-2)
4. 🟢 Run tests: `npm test config-schema.test` (4/4 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥90%

---

### T-002: Create Configuration Loader

**User Story**: US-016-008
**Acceptance Criteria**: AC-US8-01, AC-US8-02, AC-US8-03
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-001

**Test Plan**:
- **Given** a `.specweave/config.json` with reflection settings
- **When** configuration is loaded by reflection engine
- **Then** config is validated against schema and defaults applied
- **And** invalid config throws clear error

**Test Cases**:
1. **Unit**: `tests/unit/reflection/config-loader.test.ts`
   - testLoadValidConfig(): Loads and validates config successfully
   - testApplyDefaults(): Missing fields get default values
   - testInvalidConfig(): Invalid config throws validation error
   - testMissingConfigFile(): Gracefully handles missing config (uses defaults)
   - testReflectionDisabled(): Returns null if reflection.enabled=false
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. Create `src/hooks/lib/reflection-config-loader.ts`
2. Implement `loadReflectionConfig()` function:
   ```typescript
   import Ajv from 'ajv';
   import fs from 'fs/promises';
   import path from 'path';

   export interface ReflectionConfig {
     enabled: boolean;
     mode: 'auto' | 'manual' | 'disabled';
     depth: 'quick' | 'standard' | 'deep';
     model: 'haiku' | 'sonnet' | 'opus';
     categories: {
       security: boolean;
       quality: boolean;
       testing: boolean;
       performance: boolean;
       technicalDebt: boolean;
     };
     criticalThreshold: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
     storeReflections: boolean;
   }

   export async function loadReflectionConfig(): Promise<ReflectionConfig | null> {
     // Load config.json
     const configPath = path.join(process.cwd(), '.specweave/config.json');
     const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

     // Check if reflection enabled
     if (config.reflection?.enabled === false) return null;

     // Validate against schema
     const ajv = new Ajv();
     const schema = JSON.parse(await fs.readFile('src/core/schemas/specweave-config.schema.json', 'utf-8'));
     const validate = ajv.compile(schema.properties.reflection);

     if (!validate(config.reflection)) {
       throw new Error('Invalid reflection config');
     }

     // Apply defaults
     return {
       enabled: true,
       mode: 'auto',
       depth: 'standard',
       model: 'haiku',
       categories: {
         security: true,
         quality: true,
         testing: true,
         performance: true,
         technicalDebt: true
       },
       criticalThreshold: 'MEDIUM',
       storeReflections: true,
       ...config.reflection
     };
   }
   ```
3. Write unit tests (5 tests)
4. Run tests: `npm test config-loader.test` (should pass: 5/5)
5. Verify error handling for invalid config
6. Commit: "feat: add reflection configuration loader"

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test config-loader.test` (0/5 passing)
3. ✅ Implement config loader (steps 1-2)
4. 🟢 Run tests: `npm test config-loader.test` (5/5 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥92%

---

### T-003: Create Git Diff Analyzer

**User Story**: US-016-001, US-016-011
**Acceptance Criteria**: AC-US1-01, AC-US11-02, AC-US12-03
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: None

**Test Plan**:
- **Given** a git repository with recent commit
- **When** git diff analyzer extracts modified files
- **Then** returns list of files with content, line changes, and language detection
- **And** skips files larger than 100KB to avoid token limits

**Test Cases**:
1. **Unit**: `tests/unit/reflection/git-diff-analyzer.test.ts`
   - testExtractModifiedFiles(): Extracts files from git diff
   - testSkipLargeFiles(): Files >100KB are skipped
   - testDetectLanguage(): Correctly detects TypeScript, JavaScript, Python, etc.
   - testHandleGitError(): Gracefully handles git command failures
   - testEmptyDiff(): Returns empty array if no changes
   - **Coverage Target**: 88%

2. **Integration**: `tests/integration/reflection/git-analyzer.test.ts`
   - testRealGitDiff(): Works with actual git repository
   - testMultipleFiles(): Handles multiple modified files
   - **Coverage Target**: 85%

**Overall Coverage Target**: 87%

**Implementation**:
1. Create `src/hooks/lib/git-diff-analyzer.ts`
2. Install `simple-git` dependency: `npm install simple-git`
3. Implement `getModifiedFiles()` function:
   ```typescript
   import simpleGit from 'simple-git';
   import fs from 'fs/promises';

   export interface ModifiedFile {
     path: string;
     added: number;
     removed: number;
     content: string;
     language: string;
   }

   export async function getModifiedFiles(incrementId: string): Promise<ModifiedFile[]> {
     const git = simpleGit();
     const diff = await git.diff(['HEAD~1', '--name-status']);

     const modifiedPaths = diff
       .split('\n')
       .filter(line => line.startsWith('M') || line.startsWith('A'))
       .map(line => line.split('\t')[1]);

     const files: ModifiedFile[] = [];

     for (const filePath of modifiedPaths) {
       const stats = await fs.stat(filePath).catch(() => null);
       if (!stats || stats.size > 100_000) continue; // Skip large files

       const content = await fs.readFile(filePath, 'utf-8');
       const diffStat = await git.diffSummary(['HEAD~1', filePath]);

       files.push({
         path: filePath,
         added: diffStat.insertions,
         removed: diffStat.deletions,
         content,
         language: detectLanguage(filePath)
       });
     }

     return files;
   }

   function detectLanguage(path: string): string {
     const ext = path.split('.').pop()?.toLowerCase();
     const langMap: Record<string, string> = {
       ts: 'typescript',
       js: 'javascript',
       py: 'python',
       rs: 'rust',
       go: 'go',
       java: 'java',
       cpp: 'cpp',
       c: 'c'
     };
     return langMap[ext || ''] || 'text';
   }
   ```
4. Write unit tests (5 tests)
5. Write integration tests (2 tests)
6. Run tests: `npm test git-diff-analyzer.test` (should pass: 5/5)
7. Run integration tests: `npm run test:integration git-analyzer` (should pass: 2/2)
8. Commit: "feat: add git diff analyzer for reflection"

**TDD Workflow**:
1. 📝 Write all 7 tests above (should fail)
2. ❌ Run tests: `npm test` (0/7 passing)
3. ✅ Implement git diff analyzer (steps 1-3)
4. 🟢 Run tests: `npm test` (7/7 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥87%

---

### T-004: Create Reflective Reviewer Agent

**User Story**: US-016-002, US-016-003, US-016-004
**Acceptance Criteria**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US3-01, AC-US3-02, AC-US3-03, AC-US4-01, AC-US4-02, AC-US4-03
**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending
**Dependencies**: None

**Test Plan**:
- **Given** modified code files with potential issues
- **When** reflective-reviewer agent analyzes code
- **Then** returns structured feedback with security, quality, and testing issues
- **And** includes specific file/line references and fix recommendations

**Test Cases**:
1. **Integration**: `tests/integration/reflection/agent-invocation.test.ts`
   - testAgentInvocation(): Agent responds with structured markdown
   - testSecurityAnalysis(): Detects SQL injection in test code
   - testQualityAnalysis(): Identifies high complexity function
   - testTestingAnalysis(): Finds missing tests for new function
   - testAgentTimeout(): Handles 60s timeout gracefully
   - testAgentError(): Gracefully handles API errors
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create `plugins/specweave/agents/reflective-reviewer/AGENT.md`
2. Write agent definition with YAML frontmatter:
   ```yaml
   ---
   name: reflective-reviewer
   description: AI agent specialized in code review, security analysis, and quality assessment. Analyzes code changes for OWASP Top 10 vulnerabilities, testing gaps, code quality issues, and best practices violations. Provides actionable feedback with specific file/line references and concrete fixes.
   allowed_tools: [Read, Grep, Glob]
   ---
   ```
3. Add comprehensive analysis checklists:
   - Security (OWASP Top 10): SQL injection, XSS, secrets, auth, HTTPS
   - Code Quality: duplication, complexity, error handling, naming
   - Testing Gaps: edge cases, error paths, integration, E2E
   - Performance: N+1 queries, algorithm complexity, caching
   - Technical Debt: TODOs, deprecated APIs, magic numbers
4. Define structured output format:
   ```markdown
   ### ✅ Strengths
   - What was done well

   ### ⚠️ Issues Identified

   **{CATEGORY} ({SEVERITY} Risk)**
   - ❌ **Issue**: {Description}
     - **File**: `{path}:{line}`
     - **Impact**: {Why it matters}
     - **Recommendation**: {How to fix}
     - **Code**:
       ```{language}
       {problematic code snippet}
       ```
     - **Fix**:
       ```{language}
       {corrected code snippet}
       ```
   ```
5. Add examples of good feedback (SQL injection, missing tests, duplication)
6. Write integration tests (6 tests) - mock agent responses for testing
7. Run integration tests: `npm run test:integration agent-invocation` (should pass: 6/6)
8. Manual verification: Invoke agent with sample code
9. Commit: "feat: add reflective-reviewer agent"

**TDD Workflow**:
1. 📝 Write all 6 integration tests (should fail initially)
2. ❌ Run tests: `npm run test:integration agent-invocation` (0/6 passing)
3. ✅ Implement agent (steps 1-5)
4. 🟢 Run tests: `npm run test:integration agent-invocation` (6/6 passing)
5. ♻️ Refine agent prompts based on test results
6. ✅ Final check: Coverage ≥85%

---

### T-005: Create Reflection Prompt Builder

**User Story**: US-016-001, US-016-011
**Acceptance Criteria**: AC-US1-01, AC-US11-02
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-002, T-003, T-004

**Test Plan**:
- **Given** modified files and reflection config
- **When** prompt builder creates reflection prompt
- **Then** prompt includes file context, enabled categories, and clear instructions
- **And** prompt is optimized for token efficiency (<3000 tokens)

**Test Cases**:
1. **Unit**: `tests/unit/reflection/prompt-builder.test.ts`
   - testPromptStructure(): Generates valid prompt structure
   - testIncludesModifiedFiles(): Prompt contains file paths and code
   - testRespectsCategories(): Only includes enabled categories
   - testTruncatesLargeFiles(): Files >100 lines truncated with context
   - testTokenOptimization(): Prompt stays under 3000 tokens
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create `src/hooks/lib/reflection-prompt-builder.ts`
2. Implement `buildReflectionPrompt()` function:
   ```typescript
   import type { ModifiedFile } from './git-diff-analyzer';
   import type { ReflectionConfig } from './reflection-config-loader';

   export function buildReflectionPrompt(
     modifiedFiles: ModifiedFile[],
     config: ReflectionConfig
   ): string {
     const fileContext = formatFileContext(modifiedFiles);
     const enabledCategories = getEnabledCategories(config);

     return `# Code Reflection Task

   Analyze the following code changes for quality, security, and testing issues.

   ## Modified Files

   ${fileContext}

   ## Analysis Categories

   ${enabledCategories.map(cat => `- ${cat}`).join('\n')}

   ## Instructions

   1. Review each file for issues in enabled categories
   2. Prioritize by severity: CRITICAL > HIGH > MEDIUM > LOW
   3. Provide specific file:line references
   4. Include code snippets (max 10 lines)
   5. Suggest concrete fixes
   6. Identify what was done well

   ## Output Format

   Use structured markdown as defined in your agent instructions.

   Focus on actionable feedback (not vague warnings).
   `;
   }

   function formatFileContext(files: ModifiedFile[]): string {
     return files.map(file => `
   ### ${file.path}
   **Changes**: +${file.added} lines, -${file.removed} lines

   \`\`\`${file.language}
   ${truncateContent(file.content, 100)} // Max 100 lines
   \`\`\`
   `).join('\n');
   }

   function truncateContent(content: string, maxLines: number): string {
     const lines = content.split('\n');
     if (lines.length <= maxLines) return content;
     return lines.slice(0, maxLines).join('\n') + '\n... (truncated)';
   }

   function getEnabledCategories(config: ReflectionConfig): string[] {
     const categories: string[] = [];
     if (config.categories.security) categories.push('Security (OWASP Top 10)');
     if (config.categories.quality) categories.push('Code Quality');
     if (config.categories.testing) categories.push('Testing Gaps');
     if (config.categories.performance) categories.push('Performance');
     if (config.categories.technicalDebt) categories.push('Technical Debt');
     return categories;
   }
   ```
3. Write unit tests (5 tests)
4. Run tests: `npm test prompt-builder.test` (should pass: 5/5)
5. Verify token counting (<3000 tokens for typical case)
6. Commit: "feat: add reflection prompt builder"

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test prompt-builder.test` (0/5 passing)
3. ✅ Implement prompt builder (steps 1-2)
4. 🟢 Run tests: `npm test prompt-builder.test` (5/5 passing)
5. ♻️ Refactor for token optimization
6. ✅ Final check: Coverage ≥90%

---

### T-006: Create Reflection Response Parser

**User Story**: US-016-005
**Acceptance Criteria**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-004

**Test Plan**:
- **Given** agent response in structured markdown format
- **When** parser extracts issues and recommendations
- **Then** returns typed data structure with issues, severity, file references, and fixes
- **And** handles missing sections gracefully

**Test Cases**:
1. **Unit**: `tests/unit/reflection/response-parser.test.ts`
   - testParseIssues(): Extracts issues with all fields (category, severity, file, line, description, impact, recommendation)
   - testParseStrengths(): Extracts "What was done well" section
   - testParseSeverity(): Correctly categorizes CRITICAL/HIGH/MEDIUM/LOW
   - testParseCodeSnippets(): Extracts problematic and fix code snippets
   - testHandleMissingSections(): Returns empty arrays for missing sections
   - testInvalidFormat(): Throws clear error for malformed markdown
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. Create `src/hooks/lib/reflection-parser.ts`
2. Define interfaces:
   ```typescript
   export interface ParsedReflection {
     accomplishments: string[];
     strengths: string[];
     issues: Issue[];
     followUpActions: FollowUpAction[];
     lessonsLearned: LessonsLearned;
     metrics: ReflectionMetrics;
   }

   export interface Issue {
     category: 'security' | 'quality' | 'testing' | 'performance' | 'technical_debt';
     severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
     file: string;
     line?: number;
     description: string;
     impact: string;
     recommendation: string;
     codeSnippet?: string;
     fixSnippet?: string;
   }

   export interface FollowUpAction {
     priority: number;
     action: string;
   }

   export interface LessonsLearned {
     wentWell: string[];
     couldImprove: string[];
     forNextTime: string[];
   }

   export interface ReflectionMetrics {
     issueCount: number;
     criticalCount: number;
     highCount: number;
     mediumCount: number;
     lowCount: number;
   }
   ```
3. Implement `parseReflectionResponse()` function:
   ```typescript
   import marked from 'marked';

   export function parseReflectionResponse(markdown: string): ParsedReflection {
     const sections = parseMarkdownSections(markdown);

     return {
       accomplishments: extractAccomplishments(sections),
       strengths: extractStrengths(sections),
       issues: extractIssues(sections),
       followUpActions: extractFollowUpActions(sections),
       lessonsLearned: extractLessonsLearned(sections),
       metrics: calculateMetrics(sections)
     };
   }

   function extractIssues(sections: MarkdownSection[]): Issue[] {
     const issuesSection = sections.find(s => s.heading.includes('Issues Identified'));
     if (!issuesSection) return [];

     const issuePattern = /\*\*(\w+) \((\w+) Risk\)\*\*\n- ❌ \*\*Issue\*\*: (.+)\n  - \*\*File\*\*: `(.+):(\d+)`\n  - \*\*Impact\*\*: (.+)\n  - \*\*Recommendation\*\*: (.+)/g;

     const issues: Issue[] = [];
     let match;

     while ((match = issuePattern.exec(issuesSection.content)) !== null) {
       issues.push({
         category: match[1].toLowerCase() as Issue['category'],
         severity: match[2] as Issue['severity'],
         description: match[3],
         file: match[4],
         line: parseInt(match[5], 10),
         impact: match[6],
         recommendation: match[7]
       });
     }

     return issues;
   }

   // Similar functions for other sections...
   ```
4. Write unit tests (6 tests)
5. Run tests: `npm test response-parser.test` (should pass: 6/6)
6. Test with actual agent responses
7. Commit: "feat: add reflection response parser"

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test response-parser.test` (0/6 passing)
3. ✅ Implement parser (steps 1-3)
4. 🟢 Run tests: `npm test response-parser.test` (6/6 passing)
5. ♻️ Refactor regex patterns for robustness
6. ✅ Final check: Coverage ≥92%

---

### T-007: Create Reflection Storage Manager

**User Story**: US-016-006
**Acceptance Criteria**: AC-US6-01, AC-US6-02, AC-US6-03
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-006

**Test Plan**:
- **Given** parsed reflection data
- **When** storage manager saves reflection
- **Then** creates markdown file at correct path with structured sections
- **And** file is searchable via grep and includes lessons learned

**Test Cases**:
1. **Unit**: `tests/unit/reflection/storage-manager.test.ts`
   - testSaveReflection(): Creates file at correct path
   - testMarkdownFormat(): Generated markdown is valid and structured
   - testIncludesLessonsLearned(): Output contains "What went well" and "What to improve"
   - testHandleExistingFile(): Overwrites existing reflection (no duplicates)
   - testCreateDirectory(): Creates logs/reflections directory if missing
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/reflection/storage.test.ts`
   - testMultipleReflections(): Multiple reflections don't conflict
   - testSearchability(): Reflections searchable via grep
   - **Coverage Target**: 85%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create `src/hooks/lib/reflection-storage.ts`
2. Implement `ReflectionStorage` class:
   ```typescript
   import fs from 'fs/promises';
   import path from 'path';
   import type { ParsedReflection } from './reflection-parser';

   export class ReflectionStorage {
     constructor(private incrementId: string) {}

     async save(taskId: string, reflection: ParsedReflection): Promise<string> {
       const markdown = this.generateMarkdown({
         taskId,
         timestamp: new Date().toISOString(),
         ...reflection
       });

       const filename = this.getFilename(taskId);
       await fs.mkdir(path.dirname(filename), { recursive: true });
       await fs.writeFile(filename, markdown, 'utf-8');

       return filename;
     }

     private getFilename(taskId: string): string {
       const taskNumber = taskId.replace(/^T-/, '').padStart(3, '0');
       return `.specweave/increments/${this.incrementId}/logs/reflections/task-${taskNumber}-reflection.md`;
     }

     private generateMarkdown(data: any): string {
       return `# Self-Reflection: Task ${data.taskId}

   **Completed**: ${data.timestamp}
   **Files Modified**: ${data.metrics?.issueCount || 0} issues found

   ---

   ## ✅ What Was Accomplished

   ${data.accomplishments.map(a => `- ${a}`).join('\n')}

   ---

   ## 🎯 Quality Assessment

   ### ✅ Strengths
   ${data.strengths.map(s => `- ✅ ${s}`).join('\n')}

   ### ⚠️ Issues Identified

   ${data.issues.map(issue => `
   **${issue.category.toUpperCase()} (${issue.severity} Risk)**
   - ❌ **Issue**: ${issue.description}
     - **File**: \`${issue.file}:${issue.line}\`
     - **Impact**: ${issue.impact}
     - **Recommendation**: ${issue.recommendation}
   `).join('\n')}

   ---

   ## 🔧 Recommended Follow-Up Actions

   ${data.followUpActions.map(a => `${a.priority}. ${a.action}`).join('\n')}

   ---

   ## 📚 Lessons Learned

   **What went well**:
   ${data.lessonsLearned.wentWell.map(l => `- ${l}`).join('\n')}

   **What could improve**:
   ${data.lessonsLearned.couldImprove.map(l => `- ${l}`).join('\n')}

   **For next time**:
   ${data.lessonsLearned.forNextTime.map(l => `- ${l}`).join('\n')}
   `;
     }
   }
   ```
3. Write unit tests (5 tests)
4. Write integration tests (2 tests)
5. Run tests: `npm test storage-manager.test` (should pass: 5/5)
6. Run integration tests: `npm run test:integration storage` (should pass: 2/2)
7. Verify file creation with sample data
8. Commit: "feat: add reflection storage manager"

**TDD Workflow**:
1. 📝 Write all 7 tests above (should fail)
2. ❌ Run tests: `npm test` (0/7 passing)
3. ✅ Implement storage manager (steps 1-2)
4. 🟢 Run tests: `npm test` (7/7 passing)
5. ♻️ Refactor markdown generation
6. ✅ Final check: Coverage ≥88%

---

### T-008: Create Core Reflection Engine

**User Story**: US-016-001
**Acceptance Criteria**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending
**Dependencies**: T-002, T-003, T-005, T-006, T-007

**Test Plan**:
- **Given** a completed task with modified files
- **When** reflection engine runs
- **Then** orchestrates full workflow: load config → extract files → build prompt → invoke agent → parse response → store reflection
- **And** completes in <30 seconds with graceful error handling

**Test Cases**:
1. **Unit**: `tests/unit/hooks/run-self-reflection.test.ts`
   - testSkipIfDisabled(): No reflection if config.enabled=false
   - testSkipIfNoFiles(): No reflection if no files modified
   - testInvokeAgent(): Agent invoked with correct prompt
   - testStoreReflection(): Reflection saved to file on success
   - testGracefulError(): Logs error but doesn't throw on failure
   - testTimeout(): Aborts after 60s if stuck
   - **Coverage Target**: 88%

2. **Integration**: `tests/integration/reflection/end-to-end.test.ts`
   - testFullWorkflow(): Complete reflection workflow from start to finish
   - testPerformance(): Completes in <30s for typical task
   - **Coverage Target**: 85%

**Overall Coverage Target**: 87%

**Implementation**:
1. Create `src/hooks/lib/run-self-reflection.ts`
2. Implement main `runReflection()` function:
   ```typescript
   import { loadReflectionConfig } from './reflection-config-loader';
   import { getModifiedFiles } from './git-diff-analyzer';
   import { buildReflectionPrompt } from './reflection-prompt-builder';
   import { parseReflectionResponse } from './reflection-parser';
   import { ReflectionStorage } from './reflection-storage';
   import Anthropic from '@anthropic-ai/sdk';

   export async function runReflection(incrementId: string, taskId?: string): Promise<void> {
     try {
       const startTime = Date.now();

       // 1. Load config
       const config = await loadReflectionConfig();
       if (!config || !config.enabled) {
         console.log('[Reflection] Skipped: disabled in config');
         return;
       }

       // 2. Get modified files
       const modifiedFiles = await getModifiedFiles(incrementId);
       if (modifiedFiles.length === 0) {
         console.log('[Reflection] Skipped: no files modified');
         return;
       }

       // 3. Build prompt
       const prompt = buildReflectionPrompt(modifiedFiles, config);

       // 4. Invoke agent (with timeout)
       const reflection = await Promise.race([
         invokeReflectiveReviewer(prompt, config),
         timeout(60000, 'Reflection timed out after 60s')
       ]);

       // 5. Parse response
       const parsedReflection = parseReflectionResponse(reflection);

       // 6. Store reflection
       const storage = new ReflectionStorage(incrementId);
       await storage.save(taskId || 'T-001', parsedReflection);

       // 7. Display critical issues
       await displayCriticalIssues(parsedReflection, config);

       const duration = ((Date.now() - startTime) / 1000).toFixed(1);
       console.log(`[Reflection] Completed in ${duration}s`);

     } catch (error) {
       // Graceful degradation - log but don't fail
       console.error('[Reflection] Error:', error);
       await logReflectionError(error);
     }
   }

   async function invokeReflectiveReviewer(prompt: string, config: any): Promise<string> {
     const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

     const message = await client.messages.create({
       model: config.model === 'sonnet' ? 'claude-3-5-sonnet-20241022' :
              config.model === 'opus' ? 'claude-3-opus-20240229' :
              'claude-3-5-haiku-20241022', // Default: Haiku
       max_tokens: 4096,
       messages: [{
         role: 'user',
         content: prompt
       }]
     });

     return message.content[0].type === 'text' ? message.content[0].text : '';
   }

   function timeout(ms: number, message: string): Promise<never> {
     return new Promise((_, reject) =>
       setTimeout(() => reject(new Error(message)), ms)
     );
   }

   async function displayCriticalIssues(reflection: any, config: any): Promise<void> {
     const critical = reflection.issues.filter((i: any) =>
       i.severity === 'CRITICAL' || (config.criticalThreshold === 'HIGH' && i.severity === 'HIGH')
     );

     if (critical.length > 0) {
       console.log('\n⚠️  CRITICAL ISSUES FOUND:\n');
       critical.forEach((issue: any) => {
         console.log(`❌ ${issue.category.toUpperCase()}: ${issue.description}`);
         console.log(`   File: ${issue.file}:${issue.line}`);
         console.log(`   Fix: ${issue.recommendation}\n`);
       });
     }
   }

   async function logReflectionError(error: any): Promise<void> {
     // Log to debug log
     // TODO: Implement error logging
   }
   ```
3. Write unit tests (6 tests)
4. Write integration tests (2 tests)
5. Run tests: `npm test run-self-reflection.test` (should pass: 6/6)
6. Run integration tests: `npm run test:integration end-to-end` (should pass: 2/2)
7. Manual testing with real increment
8. Commit: "feat: add core reflection engine"

**TDD Workflow**:
1. 📝 Write all 8 tests above (should fail)
2. ❌ Run tests: `npm test` (0/8 passing)
3. ✅ Implement reflection engine (steps 1-2)
4. 🟢 Run tests: `npm test` (8/8 passing)
5. ♻️ Refactor error handling
6. ✅ Final check: Coverage ≥87%

---

### T-009: Integrate with Post-Task-Completion Hook

**User Story**: US-016-001
**Acceptance Criteria**: AC-US1-01, AC-US1-02, AC-US1-04
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-008

**Test Plan**:
- **Given** post-task-completion hook is fired
- **When** hook runs reflection step
- **Then** reflection executes asynchronously (non-blocking)
- **And** workflow continues even if reflection fails

**Test Cases**:
1. **Integration**: `tests/integration/reflection/hook-integration.test.ts`
   - testHookTriggersReflection(): Hook invokes reflection after task completion
   - testNonBlocking(): Workflow continues while reflection runs
   - testGracefulFailure(): Hook continues if reflection fails
   - testConfigRespected(): Hook skips reflection if disabled
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Open `plugins/specweave/hooks/post-task-completion.sh`
2. Add reflection step after line 365 (after translation step):
   ```bash
   # ============================================================================
   # SELF-REFLECTION (NEW in v0.12.0)
   # ============================================================================

   if command -v node &> /dev/null; then
     if [ -n "$CURRENT_INCREMENT" ]; then
       # Check if reflection is enabled
       REFLECTION_ENABLED=$(jq -r '.reflection.enabled // true' .specweave/config.json 2>/dev/null || echo "true")

       if [ "$REFLECTION_ENABLED" = "true" ]; then
         echo "[$(date)] 🔍 Running self-reflection for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

         # Run self-reflection (non-blocking, best-effort)
         node dist/hooks/lib/run-self-reflection.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
           echo "[$(date)] ⚠️  Self-reflection failed (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
         }
       else
         echo "[$(date)] ℹ️  Self-reflection disabled in config" >> "$DEBUG_LOG" 2>/dev/null || true
       fi
     fi
   fi
   ```
3. Write integration tests (4 tests)
4. Run integration tests: `npm run test:integration hook-integration` (should pass: 4/4)
5. Manual testing: Complete a task and verify reflection runs
6. Check `.specweave/logs/hooks-debug.log` for reflection execution
7. Commit: "feat: integrate reflection with post-task-completion hook"

**TDD Workflow**:
1. 📝 Write all 4 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration hook-integration` (0/4 passing)
3. ✅ Add hook integration (steps 1-2)
4. 🟢 Run tests: `npm run test:integration hook-integration` (4/4 passing)
5. ♻️ Refine error handling in hook
6. ✅ Final check: Coverage ≥85%

---

### T-010: E2E Test - First Reflection

**User Story**: US-016-001, US-016-006
**Acceptance Criteria**: AC-US1-01, AC-US6-01, AC-US6-02
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-009

**Test Plan**:
- **Given** a new SpecWeave project
- **When** user completes first task with code changes
- **Then** reflection runs automatically and creates log file
- **And** log file contains structured sections (accomplishments, issues, lessons learned)

**Test Cases**:
1. **E2E**: `tests/e2e/reflection/first-reflection.spec.ts`
   - testFirstReflectionWorkflow(): Complete first task → reflection created
   - testReflectionFileExists(): Log file created at correct path
   - testReflectionContent(): File contains required sections
   - **Coverage Target**: 100% (critical path)

**Overall Coverage Target**: 100%

**Implementation**:
1. Create `tests/e2e/reflection/first-reflection.spec.ts`
2. Write E2E test using Playwright (if applicable) or Node.js exec:
   ```typescript
   import { test, expect } from '@playwright/test';
   import { exec } from 'child_process';
   import { promisify } from 'util';
   import fs from 'fs/promises';

   const execAsync = promisify(exec);

   test('first reflection workflow', async () => {
     // 1. Setup: Initialize SpecWeave project
     await execAsync('cd /tmp && rm -rf test-reflection && mkdir test-reflection');
     await execAsync('cd /tmp/test-reflection && specweave init .');
     await execAsync('cd /tmp/test-reflection && specweave increment "Test Feature"');

     // 2. Execute: Create code change
     await fs.writeFile('/tmp/test-reflection/test.ts', 'console.log("test");\n');
     await execAsync('cd /tmp/test-reflection && git add . && git commit -m "test"');

     // 3. Trigger: Run reflection
     await execAsync('cd /tmp/test-reflection && node dist/hooks/lib/run-self-reflection.js 0001-test-feature');

     // 4. Verify: Check reflection file created
     const reflectionPath = '/tmp/test-reflection/.specweave/increments/0001-test-feature/logs/reflections/task-001-reflection.md';
     const exists = await fs.access(reflectionPath).then(() => true).catch(() => false);
     expect(exists).toBe(true);

     // 5. Verify: Check reflection content
     const content = await fs.readFile(reflectionPath, 'utf-8');
     expect(content).toContain('# Self-Reflection');
     expect(content).toContain('What Was Accomplished');
     expect(content).toContain('Quality Assessment');
     expect(content).toContain('Lessons Learned');

     // Cleanup
     await execAsync('cd /tmp && rm -rf test-reflection');
   });
   ```
3. Run E2E test: `npm run test:e2e first-reflection` (should pass: 1/1)
4. Verify test passes on clean system
5. Add to CI/CD pipeline
6. Commit: "test: add E2E test for first reflection"

**TDD Workflow**:
1. 📝 Write E2E test (should fail initially)
2. ❌ Run test: `npm run test:e2e first-reflection` (0/1 passing)
3. ✅ Fix any issues discovered (previous tasks)
4. 🟢 Run test: `npm run test:e2e first-reflection` (1/1 passing)
5. ♻️ Refine test for reliability
6. ✅ Final check: Test passes consistently

---

## Phase 2: Analysis Capabilities (Weeks 3-4)

### T-011: Implement SQL Injection Detection

**User Story**: US-016-002
**Acceptance Criteria**: AC-US2-01
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-004, T-008

**Test Plan**:
- **Given** code with SQL injection vulnerability (string concatenation in query)
- **When** reflective-reviewer agent analyzes code
- **Then** detects SQL injection and provides parameterized query fix
- **And** categorizes as HIGH or CRITICAL severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/security-analysis.test.ts`
   - testDetectSQLInjection(): Identifies string concatenation in SQL
   - testDetectNoSQLInjection(): Identifies template literals in NoSQL queries
   - testValidParameterizedQuery(): No warning for safe parameterized queries
   - testProvideFix(): Recommendation includes parameterized query example
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent (`plugins/specweave/agents/reflective-reviewer/AGENT.md`)
2. Add SQL injection detection examples to agent:
   ```markdown
   ### SQL Injection Detection

   **Vulnerable patterns**:
   - String concatenation: `"SELECT * FROM users WHERE id = " + userId`
   - Template literals: `SELECT * FROM users WHERE id = ${userId}`
   - Unparameterized queries in ORM: `.query(sqlString + userInput)`

   **Safe patterns**:
   - Parameterized queries: `db.query('SELECT * FROM users WHERE id = ?', [userId])`
   - ORM safe methods: `User.findByPk(userId)` (Sequelize)
   - Prepared statements: `connection.execute(sql, [params])`

   **Example output**:

   **SECURITY (HIGH Risk)**
   - ❌ **Issue**: SQL injection vulnerability in user query
     - **File**: `src/api/users.ts:45`
     - **Impact**: Attacker can execute arbitrary SQL queries, access sensitive data
     - **Recommendation**: Use parameterized queries or ORM safe methods
     - **Code**:
       ```typescript
       const query = `SELECT * FROM users WHERE id = ${userId}`; // Vulnerable
       ```
     - **Fix**:
       ```typescript
       const query = 'SELECT * FROM users WHERE id = ?';
       db.query(query, [userId]); // Safe
       ```
   ```
3. Write integration tests (4 tests) with sample vulnerable code
4. Run tests: `npm run test:integration security-analysis` (should pass: 4/4)
5. Manual verification with real SQL injection examples
6. Commit: "feat: add SQL injection detection to reflective-reviewer"

**TDD Workflow**:
1. 📝 Write all 4 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration security-analysis` (0/4 passing)
3. ✅ Enhance agent (steps 1-2)
4. 🟢 Run tests: `npm run test:integration security-analysis` (4/4 passing)
5. ♻️ Refine detection patterns
6. ✅ Final check: Coverage ≥85%

---

### T-012: Implement XSS Prevention Detection

**User Story**: US-016-002
**Acceptance Criteria**: AC-US2-02
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-004, T-011

**Test Plan**:
- **Given** code with unescaped user input in HTML/templates
- **When** reflective-reviewer agent analyzes code
- **Then** detects XSS vulnerability and provides escaping fix
- **And** categorizes as HIGH severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/xss-detection.test.ts`
   - testDetectInnerHTMLXSS(): Identifies `innerHTML = userInput`
   - testDetectReactDangerouslySetHTML(): Warns about dangerouslySetInnerHTML
   - testSafeEscaping(): No warning for properly escaped output
   - testProvideEscapingFix(): Recommendation includes escaping example
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent with XSS detection
2. Add XSS patterns to agent:
   ```markdown
   ### XSS Prevention

   **Vulnerable patterns**:
   - Direct innerHTML: `element.innerHTML = userInput`
   - Template interpolation: `<div>${userInput}</div>` (without escaping)
   - React dangerous HTML: `<div dangerouslySetInnerHTML={{__html: userInput}} />`
   - DOM manipulation: `document.write(userInput)`

   **Safe patterns**:
   - Escaped output: `<div>{escapeHtml(userInput)}</div>`
   - Text content: `element.textContent = userInput` (safe)
   - React safe: `<div>{userInput}</div>` (auto-escaped)
   - Sanitization: `DOMPurify.sanitize(userInput)`

   **Example output**:

   **SECURITY (HIGH Risk)**
   - ❌ **Issue**: XSS vulnerability in user content display
     - **File**: `src/components/UserProfile.tsx:23`
     - **Impact**: Attacker can inject malicious JavaScript, steal cookies/sessions
     - **Recommendation**: Use textContent or sanitize HTML with DOMPurify
     - **Code**:
       ```typescript
       element.innerHTML = user.bio; // Vulnerable
       ```
     - **Fix**:
       ```typescript
       import DOMPurify from 'dompurify';
       element.innerHTML = DOMPurify.sanitize(user.bio); // Safe
       ```
   ```
3. Write integration tests (4 tests)
4. Run tests: `npm run test:integration xss-detection` (should pass: 4/4)
5. Manual verification with XSS examples
6. Commit: "feat: add XSS detection to reflective-reviewer"

**TDD Workflow**:
1. 📝 Write all 4 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration xss-detection` (0/4 passing)
3. ✅ Enhance agent with XSS patterns
4. 🟢 Run tests: `npm run test:integration xss-detection` (4/4 passing)
5. ♻️ Refine detection patterns
6. ✅ Final check: Coverage ≥85%

---

### T-013: Implement Secrets Detection

**User Story**: US-016-002
**Acceptance Criteria**: AC-US2-03
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-004, T-012

**Test Plan**:
- **Given** code with hardcoded API keys, passwords, or tokens
- **When** reflective-reviewer agent analyzes code
- **Then** detects secrets and recommends environment variables
- **And** categorizes as CRITICAL severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/secrets-detection.test.ts`
   - testDetectAPIKey(): Identifies hardcoded API keys (pattern: API_KEY=...)
   - testDetectPassword(): Identifies hardcoded passwords (PASSWORD=...)
   - testDetectJWTSecret(): Identifies JWT secrets
   - testSafeEnvVariables(): No warning for process.env.API_KEY
   - testProvideEnvVarFix(): Recommendation includes .env example
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Enhance reflective-reviewer agent with secrets detection
2. Add secrets patterns to agent:
   ```markdown
   ### Secrets Detection

   **Vulnerable patterns**:
   - Hardcoded API keys: `const API_KEY = "sk-abc123"`
   - Passwords in code: `const PASSWORD = "mypassword"`
   - JWT secrets: `jwt.sign(payload, "secretkey")`
   - Database credentials: `mongodb://user:password@host`
   - AWS keys: `AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"`

   **Safe patterns**:
   - Environment variables: `process.env.API_KEY`
   - Config files (gitignored): Load from `.env` file
   - Secret managers: AWS Secrets Manager, HashiCorp Vault
   - Key rotation: Regular key rotation policy

   **Example output**:

   **SECURITY (CRITICAL Risk)**
   - ❌ **Issue**: Hardcoded API key in source code
     - **File**: `src/config/api.ts:12`
     - **Impact**: Credential leakage in git history, unauthorized API access
     - **Recommendation**: Move to environment variable, rotate key immediately
     - **Code**:
       ```typescript
       const ANTHROPIC_API_KEY = "sk-ant-abc123"; // Vulnerable
       ```
     - **Fix**:
       ```typescript
       // Load from .env file (add to .gitignore)
       const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
       if (!ANTHROPIC_API_KEY) throw new Error('Missing API key');
       ```
   ```
3. Add regex patterns for common secret types
4. Write integration tests (5 tests)
5. Run tests: `npm run test:integration secrets-detection` (should pass: 5/5)
6. Manual verification with real secrets
7. Commit: "feat: add secrets detection to reflective-reviewer"

**TDD Workflow**:
1. 📝 Write all 5 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration secrets-detection` (0/5 passing)
3. ✅ Enhance agent with secrets patterns
4. 🟢 Run tests: `npm run test:integration secrets-detection` (5/5 passing)
5. ♻️ Refine regex patterns for accuracy
6. ✅ Final check: Coverage ≥88%

---

### T-014: Implement Code Duplication Detection

**User Story**: US-016-003
**Acceptance Criteria**: AC-US3-01
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-004

**Test Plan**:
- **Given** code with duplicated blocks (>10 lines)
- **When** reflective-reviewer agent analyzes code
- **Then** detects duplication and recommends extraction to function/module
- **And** categorizes as MEDIUM severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/duplication-detection.test.ts`
   - testDetectDuplication(): Identifies copy-paste code blocks
   - testIgnoreSmallDuplication(): No warning for <10 lines
   - testProvideExtractionFix(): Recommends extracting to function
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent with duplication detection
2. Add duplication patterns to agent:
   ```markdown
   ### Code Duplication Detection

   **What to look for**:
   - Identical code blocks >10 lines in multiple places
   - Similar code with minor variations (variables, literals)
   - Repeated logic patterns across files

   **Recommendation**:
   - Extract to shared function
   - Create utility module
   - Use design patterns (Strategy, Template Method)

   **Example output**:

   **QUALITY (MEDIUM Risk)**
   - ❌ **Issue**: Duplicated validation logic across endpoints
     - **File**: `src/api/users.ts:45` and `src/api/orders.ts:67`
     - **Impact**: Maintenance burden, inconsistent behavior if one copy updated
     - **Recommendation**: Extract to shared validation function
     - **Code**:
       ```typescript
       // users.ts
       if (!email || !email.includes('@')) {
         throw new Error('Invalid email');
       }
       // Duplicated in orders.ts
       ```
     - **Fix**:
       ```typescript
       // utils/validation.ts
       export function validateEmail(email: string): void {
         if (!email || !email.includes('@')) {
           throw new Error('Invalid email');
         }
       }
       ```
   ```
3. Write integration tests (3 tests)
4. Run tests: `npm run test:integration duplication-detection` (should pass: 3/3)
5. Commit: "feat: add code duplication detection"

**TDD Workflow**:
1. 📝 Write all 3 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration duplication-detection` (0/3 passing)
3. ✅ Enhance agent with duplication guidance
4. 🟢 Run tests: `npm run test:integration duplication-detection` (3/3 passing)
5. ♻️ Refine detection heuristics
6. ✅ Final check: Coverage ≥85%

---

### T-015: Implement Complexity Detection

**User Story**: US-016-003
**Acceptance Criteria**: AC-US3-02
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-004

**Test Plan**:
- **Given** code with high complexity (>50 lines or cyclomatic >10)
- **When** reflective-reviewer agent analyzes code
- **Then** warns about complexity and recommends splitting
- **And** categorizes as MEDIUM severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/complexity-detection.test.ts`
   - testDetectLongFunction(): Warns about functions >50 lines
   - testDetectHighCyclomaticComplexity(): Warns about many if/else branches
   - testRecommendSplitting(): Suggests extracting logic to sub-functions
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent with complexity detection
2. Add complexity patterns to agent:
   ```markdown
   ### Complexity Detection

   **What to look for**:
   - Functions longer than 50 lines
   - Deeply nested conditionals (>3 levels)
   - Many conditional branches (cyclomatic complexity >10)
   - Switch statements with >10 cases

   **Recommendation**:
   - Split into smaller functions (Single Responsibility Principle)
   - Use early returns to reduce nesting
   - Extract complex conditions to named functions

   **Example output**:

   **QUALITY (MEDIUM Risk)**
   - ❌ **Issue**: Function too long and complex
     - **File**: `src/services/order-processor.ts:123`
     - **Impact**: Hard to understand, test, and maintain
     - **Recommendation**: Split into smaller functions (validateOrder, processPayment, updateInventory)
     - **Code**:
       ```typescript
       function processOrder(order: Order) {
         // 85 lines of logic with 7 levels of nesting
       }
       ```
     - **Fix**:
       ```typescript
       function processOrder(order: Order) {
         validateOrder(order);
         const payment = processPayment(order);
         updateInventory(order);
         return createOrderRecord(order, payment);
       }
       ```
   ```
3. Write integration tests (3 tests)
4. Run tests: `npm run test:integration complexity-detection` (should pass: 3/3)
5. Commit: "feat: add complexity detection"

**TDD Workflow**:
1. 📝 Write all 3 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration complexity-detection` (0/3 passing)
3. ✅ Enhance agent with complexity guidance
4. 🟢 Run tests: `npm run test:integration complexity-detection` (3/3 passing)
5. ♻️ Refine complexity heuristics
6. ✅ Final check: Coverage ≥85%

---

### T-016: Implement Error Handling Analysis

**User Story**: US-016-003
**Acceptance Criteria**: AC-US3-03
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-004

**Test Plan**:
- **Given** async code without try-catch blocks
- **When** reflective-reviewer agent analyzes code
- **Then** identifies missing error handling
- **And** categorizes as MEDIUM severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/error-handling-analysis.test.ts`
   - testDetectMissingTryCatch(): Warns about unhandled async operations
   - testDetectUnhandledPromises(): Warns about promises without .catch()
   - testValidErrorHandling(): No warning for proper try-catch
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent with error handling analysis
2. Add error handling patterns to agent:
   ```markdown
   ### Error Handling Analysis

   **What to look for**:
   - Async functions without try-catch
   - Promises without .catch() or .finally()
   - API calls without error handling
   - File operations without error handling

   **Recommendation**:
   - Wrap async code in try-catch
   - Add .catch() to promises
   - Handle specific error types appropriately
   - Log errors for debugging

   **Example output**:

   **QUALITY (MEDIUM Risk)**
   - ❌ **Issue**: Missing error handling in API call
     - **File**: `src/api/users.ts:89`
     - **Impact**: Unhandled errors crash application or return cryptic messages
     - **Recommendation**: Add try-catch with specific error types
     - **Code**:
       ```typescript
       async function fetchUser(id: string) {
         const response = await fetch(`/api/users/${id}`);
         return response.json(); // No error handling
       }
       ```
     - **Fix**:
       ```typescript
       async function fetchUser(id: string) {
         try {
           const response = await fetch(`/api/users/${id}`);
           if (!response.ok) throw new Error(`HTTP ${response.status}`);
           return response.json();
         } catch (error) {
           console.error('Failed to fetch user:', error);
           throw new UserFetchError(id, error);
         }
       }
       ```
   ```
3. Write integration tests (3 tests)
4. Run tests: `npm run test:integration error-handling-analysis` (should pass: 3/3)
5. Commit: "feat: add error handling analysis"

**TDD Workflow**:
1. 📝 Write all 3 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration error-handling-analysis` (0/3 passing)
3. ✅ Enhance agent with error handling guidance
4. 🟢 Run tests: `npm run test:integration error-handling-analysis` (3/3 passing)
5. ♻️ Refine detection patterns
6. ✅ Final check: Coverage ≥85%

---

### T-017: Implement Testing Gap Detection (Edge Cases)

**User Story**: US-016-004
**Acceptance Criteria**: AC-US4-01
**Priority**: P1
**Estimate**: 5 hours
**Status**: [ ] pending
**Dependencies**: T-004

**Test Plan**:
- **Given** new function without tests for null, empty, boundary values
- **When** reflective-reviewer agent analyzes code and tests
- **Then** identifies missing edge case tests
- **And** categorizes as MEDIUM severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/testing-gaps-analysis.test.ts`
   - testDetectMissingEdgeCaseTests(): Identifies functions without null/empty tests
   - testDetectMissingBoundaryTests(): Identifies missing boundary value tests
   - testValidTestCoverage(): No warning if edge cases tested
   - testRecommendTestCases(): Suggests specific edge cases to test
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent with testing gap detection
2. Add testing gap patterns to agent:
   ```markdown
   ### Testing Gap Detection (Edge Cases)

   **What to look for**:
   - Functions accepting strings without null/empty tests
   - Functions accepting arrays without empty array tests
   - Functions accepting numbers without 0, negative, max value tests
   - Functions accepting objects without undefined property tests
   - Date/time functions without timezone tests

   **Recommendation**:
   - Add null/undefined tests
   - Add empty string/array tests
   - Add boundary value tests (0, -1, MAX_INT)
   - Add invalid input tests

   **Example output**:

   **TESTING (MEDIUM Risk)**
   - ❌ **Issue**: Missing edge case tests for email validation
     - **File**: `src/utils/validation.ts:45` (no tests in validation.test.ts)
     - **Impact**: Function may crash or misbehave with edge cases
     - **Recommendation**: Add tests for null, empty string, invalid formats
     - **Suggested tests**:
       ```typescript
       test('validateEmail handles null', () => {
         expect(() => validateEmail(null)).toThrow();
       });
       test('validateEmail handles empty string', () => {
         expect(() => validateEmail('')).toThrow();
       });
       test('validateEmail handles no @ symbol', () => {
         expect(() => validateEmail('notanemail')).toThrow();
       });
       ```
   ```
3. Write integration tests (4 tests)
4. Run tests: `npm run test:integration testing-gaps-analysis` (should pass: 4/4)
5. Commit: "feat: add testing gap detection (edge cases)"

**TDD Workflow**:
1. 📝 Write all 4 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration testing-gaps-analysis` (0/4 passing)
3. ✅ Enhance agent with testing gap guidance
4. 🟢 Run tests: `npm run test:integration testing-gaps-analysis` (4/4 passing)
5. ♻️ Refine detection heuristics
6. ✅ Final check: Coverage ≥85%

---

### T-018: Implement Testing Gap Detection (Error Paths)

**User Story**: US-016-004
**Acceptance Criteria**: AC-US4-02
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-017

**Test Plan**:
- **Given** code with error handling (throw, reject) without corresponding tests
- **When** reflective-reviewer agent analyzes code and tests
- **Then** identifies missing error path tests
- **And** categorizes as MEDIUM severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/error-path-testing.test.ts`
   - testDetectUntestedThrows(): Identifies throw statements without tests
   - testDetectUntestedRejections(): Identifies Promise.reject without tests
   - testValidErrorPathCoverage(): No warning if error paths tested
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent with error path detection
2. Add error path testing patterns to agent:
   ```markdown
   ### Testing Gap Detection (Error Paths)

   **What to look for**:
   - `throw` statements without corresponding tests
   - `Promise.reject()` without tests
   - `if (error)` blocks without tests
   - Error classes without instantiation tests

   **Recommendation**:
   - Test every error path
   - Test error messages are correct
   - Test error types are correct
   - Test cleanup happens on errors

   **Example output**:

   **TESTING (MEDIUM Risk)**
   - ❌ **Issue**: Error path not tested in user creation
     - **File**: `src/services/user-service.ts:67` (throws DuplicateUserError)
     - **Impact**: Error handling may break without detection
     - **Recommendation**: Add test for duplicate user scenario
     - **Suggested test**:
       ```typescript
       test('createUser throws on duplicate email', async () => {
         await createUser({email: 'test@example.com'});
         await expect(createUser({email: 'test@example.com'}))
           .rejects.toThrow(DuplicateUserError);
       });
       ```
   ```
3. Write integration tests (3 tests)
4. Run tests: `npm run test:integration error-path-testing` (should pass: 3/3)
5. Commit: "feat: add error path testing gap detection"

**TDD Workflow**:
1. 📝 Write all 3 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration error-path-testing` (0/3 passing)
3. ✅ Enhance agent with error path guidance
4. 🟢 Run tests: `npm run test:integration error-path-testing` (3/3 passing)
5. ♻️ Refine detection patterns
6. ✅ Final check: Coverage ≥85%

---

### T-019: Implement Testing Gap Detection (Integration)

**User Story**: US-016-004
**Acceptance Criteria**: AC-US4-03
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-018

**Test Plan**:
- **Given** new API endpoints without integration tests
- **When** reflective-reviewer agent analyzes code and tests
- **Then** identifies missing integration test coverage
- **And** categorizes as MEDIUM severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/integration-testing-gaps.test.ts`
   - testDetectUntestedEndpoints(): Identifies API endpoints without integration tests
   - testDetectUntestedDatabaseOperations(): Identifies DB operations without tests
   - testValidIntegrationCoverage(): No warning if integration tests exist
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent with integration testing detection
2. Add integration testing patterns to agent:
   ```markdown
   ### Testing Gap Detection (Integration)

   **What to look for**:
   - New REST/GraphQL endpoints without integration tests
   - Database operations (CRUD) without integration tests
   - External API calls without mocked integration tests
   - File system operations without tests

   **Recommendation**:
   - Add integration tests for all API endpoints
   - Test database operations with test database
   - Mock external APIs in integration tests
   - Test complete request/response cycles

   **Example output**:

   **TESTING (MEDIUM Risk)**
   - ❌ **Issue**: New API endpoint without integration test
     - **File**: `src/api/orders.ts:123` (POST /api/orders endpoint)
     - **Impact**: Endpoint behavior not verified end-to-end
     - **Recommendation**: Add integration test with request/response validation
     - **Suggested test**:
       ```typescript
       test('POST /api/orders creates order', async () => {
         const response = await request(app)
           .post('/api/orders')
           .send({userId: 1, items: [{id: 123, qty: 2}]})
           .expect(201);

         expect(response.body).toMatchObject({
           orderId: expect.any(Number),
           status: 'pending'
         });
       });
       ```
   ```
3. Write integration tests (3 tests)
4. Run tests: `npm run test:integration integration-testing-gaps` (should pass: 3/3)
5. Commit: "feat: add integration testing gap detection"

**TDD Workflow**:
1. 📝 Write all 3 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration integration-testing-gaps` (0/3 passing)
3. ✅ Enhance agent with integration testing guidance
4. 🟢 Run tests: `npm run test:integration integration-testing-gaps` (3/3 passing)
5. ♻️ Refine detection heuristics
6. ✅ Final check: Coverage ≥85%

---

### T-020: Phase 2 Integration Test

**User Story**: US-016-002, US-016-003, US-016-004
**Acceptance Criteria**: All Phase 2 AC-IDs
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-011 through T-019

**Test Plan**:
- **Given** code with multiple issues (security, quality, testing gaps)
- **When** reflection runs end-to-end
- **Then** detects all issue categories correctly
- **And** provides actionable feedback for each

**Test Cases**:
1. **Integration**: `tests/integration/reflection/phase2-comprehensive.test.ts`
   - testDetectMultipleIssueCategories(): Finds security, quality, and testing issues in same file
   - testPrioritizesBySeverity(): Orders issues CRITICAL > HIGH > MEDIUM > LOW
   - testProvidesConcreteFixes(): Every issue has code snippet + fix
   - testCompletesUnder30s(): Full analysis completes in <30s
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create `tests/integration/reflection/phase2-comprehensive.test.ts`
2. Write comprehensive test with sample code containing:
   - SQL injection vulnerability
   - XSS vulnerability
   - Hardcoded secret
   - Code duplication
   - High complexity function
   - Missing error handling
   - Missing edge case tests
   - Missing integration tests
3. Run reflection on sample code
4. Verify all 8 issue types detected
5. Verify severity ordering
6. Verify fix suggestions present
7. Verify performance (<30s)
8. Run test: `npm run test:integration phase2-comprehensive` (should pass: 4/4)
9. Commit: "test: add Phase 2 comprehensive integration test"

**TDD Workflow**:
1. 📝 Write comprehensive test (should pass if all previous tasks complete)
2. ✅ Run test: `npm run test:integration phase2-comprehensive` (should pass: 4/4)
3. ♻️ Fix any issues discovered
4. 🟢 Re-run test: All passing
5. ✅ Final check: Coverage ≥85%

---

## Phase 3: User Experience (Week 5)

### T-021: Implement Critical Issue Warning System

**User Story**: US-016-007
**Acceptance Criteria**: AC-US7-01, AC-US7-04, AC-US7-05
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-008, T-020

**Test Plan**:
- **Given** reflection finds CRITICAL or HIGH severity issues
- **When** reflection completes
- **Then** displays warnings in terminal with ⚠️  prefix
- **And** shows summary statistics by severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/warning-system.test.ts`
   - testDisplayCriticalWarnings(): Critical issues shown in terminal
   - testRespectThreshold(): Only shows issues >= configured threshold
   - testSummaryStats(): Shows count by severity (3 CRITICAL, 5 HIGH, 2 MEDIUM)
   - testFormattedOutput(): Output is colored and readable
   - **Coverage Target**: 85%

2. **E2E**: `tests/e2e/reflection/critical-warning.spec.ts`
   - testWarningDisplayed(): User sees warning in terminal for critical issue
   - **Coverage Target**: 100% (critical path)

**Overall Coverage Target**: 88%

**Implementation**:
1. Enhance `displayCriticalIssues()` function in `src/hooks/lib/run-self-reflection.ts`
2. Add colored terminal output:
   ```typescript
   import chalk from 'chalk';

   async function displayCriticalIssues(
     reflection: ParsedReflection,
     config: ReflectionConfig
   ): Promise<void> {
     const thresholdMap = {
       CRITICAL: 4,
       HIGH: 3,
       MEDIUM: 2,
       LOW: 1
     };

     const threshold = thresholdMap[config.criticalThreshold];
     const critical = reflection.issues.filter(
       i => thresholdMap[i.severity] >= threshold
     );

     if (critical.length === 0) return;

     console.log('\n' + chalk.red.bold('⚠️  ISSUES FOUND:') + '\n');

     critical.forEach(issue => {
       const severityColor = {
         CRITICAL: chalk.red.bold,
         HIGH: chalk.red,
         MEDIUM: chalk.yellow,
         LOW: chalk.gray
       }[issue.severity];

       console.log(severityColor(`❌ ${issue.category.toUpperCase()}: ${issue.description}`));
       console.log(chalk.gray(`   File: ${issue.file}:${issue.line}`));
       console.log(chalk.cyan(`   Fix: ${issue.recommendation}\n`));
     });

     // Summary statistics
     const stats = {
       CRITICAL: reflection.issues.filter(i => i.severity === 'CRITICAL').length,
       HIGH: reflection.issues.filter(i => i.severity === 'HIGH').length,
       MEDIUM: reflection.issues.filter(i => i.severity === 'MEDIUM').length,
       LOW: reflection.issues.filter(i => i.severity === 'LOW').length
     };

     console.log(chalk.bold('📊 Summary:'));
     if (stats.CRITICAL > 0) console.log(chalk.red(`   CRITICAL: ${stats.CRITICAL}`));
     if (stats.HIGH > 0) console.log(chalk.red(`   HIGH: ${stats.HIGH}`));
     if (stats.MEDIUM > 0) console.log(chalk.yellow(`   MEDIUM: ${stats.MEDIUM}`));
     if (stats.LOW > 0) console.log(chalk.gray(`   LOW: ${stats.LOW}`));
     console.log('');
   }
   ```
3. Install chalk: `npm install chalk`
4. Write integration tests (4 tests)
5. Write E2E test (1 test)
6. Run tests: `npm run test:integration warning-system` (should pass: 4/4)
7. Run E2E test: `npm run test:e2e critical-warning` (should pass: 1/1)
8. Manual verification with sample issues
9. Commit: "feat: add critical issue warning system"

**TDD Workflow**:
1. 📝 Write all 5 tests (should fail)
2. ❌ Run tests: `npm test` (0/5 passing)
3. ✅ Implement warning system (steps 1-3)
4. 🟢 Run tests: `npm test` (5/5 passing)
5. ♻️ Refine output formatting
6. ✅ Final check: Coverage ≥88%

---

### T-022: Add Sound Notification (Optional)

**User Story**: US-016-007
**Acceptance Criteria**: AC-US7-02
**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-021

**Test Plan**:
- **Given** CRITICAL issue detected and sound notifications enabled
- **When** reflection completes
- **Then** plays alert sound (cross-platform)
- **And** respects config option to disable sound

**Test Cases**:
1. **Integration**: `tests/integration/reflection/sound-notification.test.ts`
   - testPlaysSoundForCritical(): Sound plays for CRITICAL issues
   - testNoSoundIfDisabled(): No sound if config.sound.enabled=false
   - testCrossPlatform(): Works on macOS, Linux, Windows (WSL)
   - **Coverage Target**: 80%

**Overall Coverage Target**: 80%

**Implementation**:
1. Add sound config to schema (`src/core/schemas/specweave-config.schema.json`):
   ```json
   {
     "reflection": {
       "sound": {
         "enabled": {"type": "boolean", "default": true},
         "criticalOnly": {"type": "boolean", "default": true}
       }
     }
   }
   ```
2. Create `src/hooks/lib/play-sound.ts`:
   ```typescript
   import { exec } from 'child_process';
   import { promisify } from 'util';

   const execAsync = promisify(exec);

   export async function playAlertSound(): Promise<void> {
     try {
       if (process.platform === 'darwin') {
         // macOS: Use afplay with system sound
         await execAsync('afplay /System/Library/Sounds/Funk.aiff');
       } else if (process.platform === 'linux') {
         // Linux: Use paplay (PulseAudio)
         await execAsync('paplay /usr/share/sounds/freedesktop/stereo/dialog-warning.oga');
       } else if (process.platform === 'win32') {
         // Windows: Use PowerShell
         await execAsync('powershell -c (New-Object Media.SoundPlayer "C:\\Windows\\Media\\Windows Notify.wav").PlaySync()');
       }
     } catch (error) {
       // Gracefully fail if sound not available
       console.debug('[Reflection] Sound notification failed:', error);
     }
   }
   ```
3. Integrate into `displayCriticalIssues()`:
   ```typescript
   if (config.sound?.enabled && critical.length > 0) {
     await playAlertSound();
   }
   ```
4. Write integration tests (3 tests)
5. Run tests: `npm run test:integration sound-notification` (should pass: 3/3)
6. Manual testing on each platform
7. Commit: "feat: add sound notification for critical issues"

**TDD Workflow**:
1. 📝 Write all 3 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration sound-notification` (0/3 passing)
3. ✅ Implement sound system (steps 1-3)
4. 🟢 Run tests: `npm run test:integration sound-notification` (3/3 passing)
5. ♻️ Test on multiple platforms
6. ✅ Final check: Coverage ≥80%

---

### T-023: Enhance Reflection Logs with Lessons Learned

**User Story**: US-016-006
**Acceptance Criteria**: AC-US6-03
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-007

**Test Plan**:
- **Given** reflection completes successfully
- **When** reflection log is saved
- **Then** includes "What went well" and "What could improve" sections
- **And** includes "For next time" recommendations

**Test Cases**:
1. **Integration**: `tests/integration/reflection/lessons-learned.test.ts`
   - testIncludesLessonsLearned(): Log contains all three sections
   - testExtractsFromResponse(): Parser extracts lessons from agent response
   - testEmptySectionsHandled(): Gracefully handles missing lessons
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance agent prompt in `src/hooks/lib/reflection-prompt-builder.ts`:
   ```typescript
   ## Instructions

   ...
   7. Conclude with lessons learned:
      - What went well (good practices followed)
      - What could improve (areas for refinement)
      - For next time (actionable takeaways)
   ```
2. Enhance parser in `src/hooks/lib/reflection-parser.ts`:
   ```typescript
   function extractLessonsLearned(sections: MarkdownSection[]): LessonsLearned {
     const lessonsSection = sections.find(s => s.heading.includes('Lessons Learned'));
     if (!lessonsSection) return { wentWell: [], couldImprove: [], forNextTime: [] };

     const wentWell = extractBulletList(lessonsSection, 'What went well');
     const couldImprove = extractBulletList(lessonsSection, 'What could improve');
     const forNextTime = extractBulletList(lessonsSection, 'For next time');

     return { wentWell, couldImprove, forNextTime };
   }
   ```
3. Verify storage includes lessons (already implemented in T-007)
4. Write integration tests (3 tests)
5. Run tests: `npm run test:integration lessons-learned` (should pass: 3/3)
6. Manual verification with sample reflection
7. Commit: "feat: enhance reflection logs with lessons learned"

**TDD Workflow**:
1. 📝 Write all 3 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration lessons-learned` (0/3 passing)
3. ✅ Enhance prompt and parser (steps 1-2)
4. 🟢 Run tests: `npm run test:integration lessons-learned` (3/3 passing)
5. ♻️ Refine lessons extraction
6. ✅ Final check: Coverage ≥85%

---

### T-024: Add Reflection Summary Command

**User Story**: US-016-006
**Acceptance Criteria**: AC-US6-05
**Priority**: P3
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-007, T-023

**Test Plan**: N/A (documentation task - nice to have feature)

**Validation**:
- Manual testing: Command runs and displays summary
- Output is readable and actionable
- Aggregates issues across multiple reflections

**Implementation**:
1. Create `plugins/specweave/commands/reflections-summary.md`:
   ```yaml
   ---
   name: specweave:reflections
   description: Display reflection summary and trends
   ---

   # Reflections Summary Command

   Shows aggregated reflection data for current increment.

   **Usage**:
   ```bash
   /specweave:reflections summary
   /specweave:reflections summary 0016-self-reflection-system
   ```

   **Output**:
   - Total reflections
   - Issue counts by category and severity
   - Most common issues
   - Cost summary
   - Lessons learned themes
   ```
2. Create `src/cli/commands/reflections-summary.ts`:
   ```typescript
   import fs from 'fs/promises';
   import path from 'path';
   import { parseReflectionResponse } from '../../hooks/lib/reflection-parser';

   export async function reflectionsSummary(incrementId?: string): Promise<void> {
     const increment = incrementId || await getCurrentIncrement();
     const reflectionsDir = `.specweave/increments/${increment}/logs/reflections`;

     const files = await fs.readdir(reflectionsDir);
     const reflections = await Promise.all(
       files.map(async file => {
         const content = await fs.readFile(path.join(reflectionsDir, file), 'utf-8');
         return parseReflectionResponse(content);
       })
     );

     // Aggregate data
     const totalIssues = reflections.reduce((sum, r) => sum + r.issues.length, 0);
     const bySeverity = {
       CRITICAL: 0,
       HIGH: 0,
       MEDIUM: 0,
       LOW: 0
     };

     reflections.forEach(r => {
       r.issues.forEach(i => {
         bySeverity[i.severity]++;
       });
     });

     // Display summary
     console.log(`\n📊 Reflection Summary: ${increment}\n`);
     console.log(`Total Reflections: ${reflections.length}`);
     console.log(`Total Issues: ${totalIssues}`);
     console.log(`\nBy Severity:`);
     console.log(`  CRITICAL: ${bySeverity.CRITICAL}`);
     console.log(`  HIGH: ${bySeverity.HIGH}`);
     console.log(`  MEDIUM: ${bySeverity.MEDIUM}`);
     console.log(`  LOW: ${bySeverity.LOW}`);
     console.log('');

     // Most common issues
     const categoryCount: Record<string, number> = {};
     reflections.forEach(r => {
       r.issues.forEach(i => {
         categoryCount[i.category] = (categoryCount[i.category] || 0) + 1;
       });
     });

     console.log('Most Common Issues:');
     Object.entries(categoryCount)
       .sort(([, a], [, b]) => b - a)
       .slice(0, 5)
       .forEach(([category, count]) => {
         console.log(`  ${category}: ${count}`);
       });
   }
   ```
3. Wire up command in CLI
4. Manual testing: Run command on increment with multiple reflections
5. Verify output is readable and accurate
6. Commit: "feat: add reflections summary command"

---

### T-025: Phase 3 E2E Test

**User Story**: US-016-007, US-016-006
**Acceptance Criteria**: AC-US7-01, AC-US6-03
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending
**Dependencies**: T-021, T-023

**Test Plan**:
- **Given** complete reflection system with all Phase 3 features
- **When** user completes task with critical issue
- **Then** sees warning immediately, can view lessons learned in log
- **And** workflow is smooth and non-intrusive

**Test Cases**:
1. **E2E**: `tests/e2e/reflection/phase3-ux.spec.ts`
   - testFullUXWorkflow(): Complete task → warning → view log → lessons learned
   - testNonIntrusive(): Reflection doesn't block next task
   - **Coverage Target**: 100% (critical path)

**Overall Coverage Target**: 100%

**Implementation**:
1. Create `tests/e2e/reflection/phase3-ux.spec.ts`
2. Write E2E test simulating user workflow:
   ```typescript
   test('Phase 3 UX workflow', async () => {
     // 1. Setup: Create project with reflection enabled
     await setupProject();

     // 2. Create code with critical issue (hardcoded secret)
     await createFileWithSecret('src/api.ts', 'const API_KEY = "sk-abc123";');

     // 3. Complete task
     await completeTask();

     // 4. Verify: Warning displayed
     const output = await getTerminalOutput();
     expect(output).toContain('⚠️  ISSUES FOUND');
     expect(output).toContain('SECURITY (CRITICAL)');
     expect(output).toContain('Hardcoded API key');

     // 5. Verify: Log file created with lessons learned
     const logPath = '.specweave/increments/0001/logs/reflections/task-001-reflection.md';
     const log = await fs.readFile(logPath, 'utf-8');
     expect(log).toContain('## 📚 Lessons Learned');
     expect(log).toContain('What went well');
     expect(log).toContain('What could improve');

     // 6. Verify: Can continue to next task (non-blocking)
     await startNextTask();
     expect(await getCurrentTask()).toBe('T-002');
   });
   ```
3. Run E2E test: `npm run test:e2e phase3-ux` (should pass: 1/1)
4. Commit: "test: add Phase 3 UX E2E test"

**TDD Workflow**:
1. 📝 Write E2E test (should pass if Phase 3 complete)
2. ✅ Run test: `npm run test:e2e phase3-ux` (should pass: 1/1)
3. ♻️ Fix any UX issues discovered
4. 🟢 Re-run test: All passing
5. ✅ Final check: Test passes consistently

---

## Phase 4: Advanced Features (Week 6)

### T-026: Implement N+1 Query Detection

**User Story**: US-016-009
**Acceptance Criteria**: AC-US9-01
**Priority**: P2
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-004

**Test Plan**:
- **Given** code with database queries inside loops
- **When** reflective-reviewer agent analyzes code
- **Then** detects N+1 query pattern and recommends batching
- **And** categorizes as MEDIUM or HIGH severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/n-plus-one-detection.test.ts`
   - testDetectQueryInLoop(): Identifies DB query in for/while loop
   - testDetectAsyncMapWithQuery(): Identifies Promise.all(items.map(query))
   - testRecommendBatching(): Suggests using IN clause or batch loading
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent with N+1 detection
2. Add N+1 patterns to agent:
   ```markdown
   ### N+1 Query Detection

   **What to look for**:
   - Database queries inside for/while loops
   - `items.map(async item => query(item.id))`
   - Sequential API calls in loops
   - Multiple queries that could be batched

   **Recommendation**:
   - Use IN clause: `SELECT * FROM users WHERE id IN (?)`
   - Use batch loading (DataLoader pattern)
   - Eager loading in ORM (Sequelize: `include`, TypeORM: `relations`)
   - Cache repeated queries

   **Example output**:

   **PERFORMANCE (MEDIUM Risk)**
   - ❌ **Issue**: N+1 query pattern in order loading
     - **File**: `src/services/order-service.ts:45`
     - **Impact**: 100 orders = 101 queries (slow, high DB load)
     - **Recommendation**: Use IN clause or batch loader
     - **Code**:
       ```typescript
       for (const orderId of orderIds) {
         const order = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
         orders.push(order);
       }
       ```
     - **Fix**:
       ```typescript
       const orders = await db.query('SELECT * FROM orders WHERE id IN (?)', [orderIds]);
       ```
   ```
3. Write integration tests (3 tests)
4. Run tests: `npm run test:integration n-plus-one-detection` (should pass: 3/3)
5. Commit: "feat: add N+1 query detection"

**TDD Workflow**:
1. 📝 Write all 3 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration n-plus-one-detection` (0/3 passing)
3. ✅ Enhance agent with N+1 patterns
4. 🟢 Run tests: `npm run test:integration n-plus-one-detection` (3/3 passing)
5. ♻️ Refine detection heuristics
6. ✅ Final check: Coverage ≥85%

---

### T-027: Implement Algorithm Complexity Detection

**User Story**: US-016-009
**Acceptance Criteria**: AC-US9-02
**Priority**: P2
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-026

**Test Plan**:
- **Given** code with O(n²) or worse algorithm complexity
- **When** reflective-reviewer agent analyzes code
- **Then** warns about complexity and suggests optimization
- **And** categorizes as MEDIUM severity

**Test Cases**:
1. **Integration**: `tests/integration/reflection/complexity-detection.test.ts`
   - testDetectNestedLoops(): Identifies O(n²) nested loops
   - testDetectTripleNested(): Warns about O(n³) or worse
   - testRecommendOptimization(): Suggests using hash maps, sorting
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Enhance reflective-reviewer agent with complexity detection
2. Add complexity patterns to agent:
   ```markdown
   ### Algorithm Complexity Detection

   **What to look for**:
   - Nested loops over same/related collections (O(n²))
   - Triple nested loops (O(n³))
   - Loop inside loop inside loop
   - Array.find() in loop (O(n²))

   **Recommendation**:
   - Use hash maps for O(1) lookup
   - Sort + two pointers (O(n log n))
   - Memoization for repeated computation
   - Early termination with break/return

   **Example output**:

   **PERFORMANCE (MEDIUM Risk)**
   - ❌ **Issue**: O(n²) complexity in user matching
     - **File**: `src/services/matching.ts:67`
     - **Impact**: 1000 users = 1M comparisons (slow for large datasets)
     - **Recommendation**: Use hash map for O(n) complexity
     - **Code**:
       ```typescript
       for (const user of users) {
         for (const friend of friends) {
           if (user.id === friend.userId) matches.push(friend);
         }
       }
       ```
     - **Fix**:
       ```typescript
       const friendMap = new Map(friends.map(f => [f.userId, f]));
       for (const user of users) {
         const friend = friendMap.get(user.id);
         if (friend) matches.push(friend);
       }
       ```
   ```
3. Write integration tests (3 tests)
4. Run tests: `npm run test:integration complexity-detection` (should pass: 3/3)
5. Commit: "feat: add algorithm complexity detection"

**TDD Workflow**:
1. 📝 Write all 3 integration tests (should fail)
2. ❌ Run tests: `npm run test:integration complexity-detection` (0/3 passing)
3. ✅ Enhance agent with complexity patterns
4. 🟢 Run tests: `npm run test:integration complexity-detection` (3/3 passing)
5. ♻️ Refine detection heuristics
6. ✅ Final check: Coverage ≥85%

---

### T-028: Implement Cost Tracking

**User Story**: US-016-011
**Acceptance Criteria**: AC-US11-03, AC-US11-04
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: T-008

**Test Plan**:
- **Given** reflection completes with token count
- **When** cost is calculated based on model pricing
- **Then** displays estimated cost after reflection
- **And** cumulative cost visible in summary

**Test Cases**:
1. **Unit**: `tests/unit/reflection/cost-tracker.test.ts`
   - testCalculateCost(): Correct cost for Haiku/Sonnet/Opus models
   - testTokenCounting(): Accurate token count estimation
   - testCumulativeCost(): Aggregates cost across reflections
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create `src/hooks/lib/cost-tracker.ts`:
   ```typescript
   export interface CostInfo {
     inputTokens: number;
     outputTokens: number;
     model: string;
     estimatedCost: number;
   }

   const PRICING = {
     haiku: { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
     sonnet: { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
     opus: { input: 15.0 / 1_000_000, output: 75.0 / 1_000_000 }
   };

   export function calculateCost(
     inputTokens: number,
     outputTokens: number,
     model: 'haiku' | 'sonnet' | 'opus'
   ): number {
     const pricing = PRICING[model];
     return (inputTokens * pricing.input) + (outputTokens * pricing.output);
   }

   export async function trackReflectionCost(
     incrementId: string,
     costInfo: CostInfo
   ): Promise<void> {
     const costLog = `.specweave/increments/${incrementId}/logs/reflection-costs.json`;

     let costs: CostInfo[] = [];
     try {
       costs = JSON.parse(await fs.readFile(costLog, 'utf-8'));
     } catch {
       // File doesn't exist yet
     }

     costs.push({
       ...costInfo,
       timestamp: new Date().toISOString()
     });

     await fs.writeFile(costLog, JSON.stringify(costs, null, 2));

     const totalCost = costs.reduce((sum, c) => sum + c.estimatedCost, 0);
     console.log(`[Reflection] Cost: $${costInfo.estimatedCost.toFixed(4)} (Total: $${totalCost.toFixed(4)})`);
   }
   ```
2. Integrate into `run-self-reflection.ts`:
   ```typescript
   // After agent invocation
   const costInfo: CostInfo = {
     inputTokens: message.usage.input_tokens,
     outputTokens: message.usage.output_tokens,
     model: config.model,
     estimatedCost: calculateCost(
       message.usage.input_tokens,
       message.usage.output_tokens,
       config.model
     )
   };

   await trackReflectionCost(incrementId, costInfo);
   ```
3. Write unit tests (3 tests)
4. Run tests: `npm test cost-tracker.test` (should pass: 3/3)
5. Manual verification with actual reflection
6. Commit: "feat: add cost tracking for reflections"

**TDD Workflow**:
1. 📝 Write all 3 unit tests (should fail)
2. ❌ Run tests: `npm test cost-tracker.test` (0/3 passing)
3. ✅ Implement cost tracking (steps 1-2)
4. 🟢 Run tests: `npm test cost-tracker.test` (3/3 passing)
5. ♻️ Refine cost calculation
6. ✅ Final check: Coverage ≥90%

---

### T-029: Update Documentation

**User Story**: US-016-001, US-016-008
**Acceptance Criteria**: AC-US1-01, AC-US8-01
**Priority**: P1
**Estimate**: 6 hours
**Status**: [ ] pending
**Dependencies**: All previous tasks

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Link checker: All links work
- Build check: Documentation builds without errors
- Screenshots updated (if applicable)

**Implementation**:
1. Update `CLAUDE.md` (contributor documentation):
   - Add self-reflection system to architecture overview
   - Document reflection workflow in hook system section
   - Add troubleshooting section for reflection failures
   - Include cost optimization tips
   - Update file structure to include reflection files
2. Update `README.md` (user-facing):
   - Add self-reflection to features list
   - Include quick configuration example
   - Add cost information (~$0.01/task)
   - Link to full documentation
3. Create `docs-site/docs/features/self-reflection.md` (new):
   - Complete feature documentation (what, why, how)
   - Configuration reference (all options explained)
   - Examples: SQL injection detection, missing tests, etc.
   - Troubleshooting guide
   - FAQ section
4. Update `.specweave/docs/internal/architecture/hld-system.md`:
   - Add reflection system to high-level design
   - Include component diagram (C4 Level 2)
   - Document integration points
5. Update `.specweave/docs/internal/architecture/hooks-system.md`:
   - Document reflection step in post-task-completion hook
   - Add execution flow diagram
   - Document error handling
6. Update `CHANGELOG.md`:
   - Add entry for v0.12.0
   - List key features (auto reflection, security analysis, cost tracking)
   - Include migration guide (none needed - new feature)
   - Note any configuration changes
7. Run link checker: `npm run check-links`
8. Build docs: `npm run build:docs` (should succeed)
9. Preview docs: `npm run serve:docs` (manual check)
10. Commit: "docs: add self-reflection system documentation"

---

### T-030: Final E2E Test - Complete Increment

**User Story**: All US-016-* stories
**Acceptance Criteria**: All 63 AC-IDs
**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending
**Dependencies**: All previous tasks (T-001 through T-029)

**Test Plan**:
- **Given** complete self-reflection system (all phases)
- **When** user completes an entire increment with reflections
- **Then** all features work end-to-end: security detection, quality checks, testing gaps, warnings, cost tracking, lessons learned
- **And** performance meets targets (<30s, <$0.01/task)

**Test Cases**:
1. **E2E**: `tests/e2e/reflection/complete-increment.spec.ts`
   - testCompleteIncrementWorkflow(): Full increment with 5 tasks, reflections for each
   - testSecurityDetection(): SQL injection, XSS, secrets detected
   - testQualityAnalysis(): Duplication, complexity, error handling checked
   - testTestingGaps(): Edge cases, error paths, integration gaps found
   - testPerformanceAnalysis(): N+1, algorithm complexity detected
   - testWarnings(): Critical issues shown in terminal
   - testCostTracking(): Total cost < $0.10 for increment
   - testLessonsLearned(): All reflections include lessons
   - **Coverage Target**: 100% (complete system)

**Overall Coverage Target**: 100%

**Implementation**:
1. Create `tests/e2e/reflection/complete-increment.spec.ts`
2. Write comprehensive E2E test:
   ```typescript
   test('Complete increment with reflections', async () => {
     // 1. Setup: Initialize project
     await setupProject('test-complete-increment');

     // 2. Create increment
     await runCommand('specweave increment "Test Self-Reflection"');

     // 3. Complete 5 tasks with various issues
     await completeTaskWithSQLInjection('T-001');
     await completeTaskWithXSS('T-002');
     await completeTaskWithSecret('T-003');
     await completeTaskWithDuplication('T-004');
     await completeTaskWithComplexity('T-005');

     // 4. Verify: 5 reflections created
     const reflections = await fs.readdir('.specweave/increments/0001/logs/reflections');
     expect(reflections).toHaveLength(5);

     // 5. Verify: Security issues detected
     const task1 = await loadReflection('T-001');
     expect(task1.issues).toContainEqual(
       expect.objectContaining({
         category: 'security',
         severity: 'HIGH',
         description: expect.stringContaining('SQL injection')
       })
     );

     // 6. Verify: Quality issues detected
     const task4 = await loadReflection('T-004');
     expect(task4.issues).toContainEqual(
       expect.objectContaining({
         category: 'quality',
         description: expect.stringContaining('duplication')
       })
     );

     // 7. Verify: Warnings displayed
     const terminalOutput = await getTerminalHistory();
     expect(terminalOutput).toContain('⚠️  ISSUES FOUND');

     // 8. Verify: Cost tracking
     const costs = JSON.parse(await fs.readFile('.specweave/increments/0001/logs/reflection-costs.json', 'utf-8'));
     const totalCost = costs.reduce((sum, c) => sum + c.estimatedCost, 0);
     expect(totalCost).toBeLessThan(0.10); // <$0.10 for 5 tasks

     // 9. Verify: Lessons learned
     const task5 = await loadReflection('T-005');
     expect(task5.lessonsLearned.wentWell).not.toHaveLength(0);
     expect(task5.lessonsLearned.couldImprove).not.toHaveLength(0);

     // 10. Verify: Performance
     const avgDuration = costs.reduce((sum, c) => sum + c.duration, 0) / costs.length;
     expect(avgDuration).toBeLessThan(30000); // <30s average
   });
   ```
3. Run E2E test: `npm run test:e2e complete-increment` (should pass: 1/1)
4. Fix any issues discovered
5. Re-run test until passing consistently
6. Add to CI/CD pipeline
7. Commit: "test: add complete increment E2E test"

**TDD Workflow**:
1. 📝 Write comprehensive E2E test (should pass if all tasks complete)
2. ✅ Run test: `npm run test:e2e complete-increment` (should pass: 1/1)
3. ♻️ Fix any issues discovered
4. 🟢 Re-run test: All passing
5. ✅ Final check: Test passes consistently (3 consecutive runs)

---

## Summary

**Total Tasks**: 30
**Estimated Effort**: 6 weeks
**Test Coverage Targets**:
- Unit tests: 85% coverage
- Integration tests: 80% coverage
- E2E tests: 100% coverage (critical paths)

**Key Milestones**:
- Week 2: Phase 1 complete (core engine working)
- Week 4: Phase 2 complete (comprehensive analysis)
- Week 5: Phase 3 complete (UX polished)
- Week 6: Phase 4 complete (advanced features + docs)

**Success Criteria**:
- ✅ All 63 acceptance criteria met
- ✅ Test coverage ≥85% overall
- ✅ Performance <30s per reflection
- ✅ Cost <$0.01 per task (Haiku mode)
- ✅ Documentation complete
- ✅ E2E tests passing

**Next Steps**:
1. Review tasks.md with team
2. Begin Phase 1 implementation (`/specweave:do`)
3. Complete T-001 through T-010 (core engine)
4. Run validation: `/specweave:check-tests 0016`
