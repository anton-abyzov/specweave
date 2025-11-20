# Remaining Tasks Implementation Plan

**Date**: 2025-11-20
**Increment**: 0047-us-task-linkage
**Status**: 36/52 tasks completed (69%), 16 tasks remaining

---

## Summary

This document provides a detailed implementation plan for the 16 remaining tasks in increment 0047. Each task includes:
- Implementation approach
- Key files to modify
- Code patterns to follow
- Test strategy
- Estimated effort

---

## Completed (T-034)

✅ **T-034: Add origin badges to living docs US files**
- Modified: `plugins/specweave/lib/hooks/sync-us-tasks.js`
- Added: `updateOriginBadge()`, `extractExistingOrigin()`, `detectExternalSource()`, `getExternalOriginBadge()`
- Tests: `tests/integration/living-docs/origin-badges.test.ts` (6 test cases)
- Status: COMPLETE

---

## US-009A: External Item Format Preservation (6 tasks)

### T-034A: Implement format preservation metadata in living docs

**Goal**: Add format_preservation, external_title, external_source fields to living docs US frontmatter

**Implementation**:

1. **Extend LivingDocsUSFile interface** (`src/types/living-docs.ts`):
   ```typescript
   export interface LivingDocsUSFile {
     // ... existing fields
     format_preservation?: boolean;        // true for external items
     external_title?: string;              // original title for validation
     external_source?: 'github' | 'jira' | 'ado';  // source platform
   }
   ```

2. **Update living docs generator** (`src/core/living-docs/task-project-specific-generator.ts`):
   ```typescript
   private generateUSFrontmatter(us: UserStory): string {
     const isExternal = us.id.endsWith('E');

     return `---
id: ${us.id}
title: ${us.title}
format_preservation: ${isExternal}
${isExternal ? `external_title: "${us.title}"` : ''}
${isExternal ? `external_source: ${detectSource(us)}` : ''}
---`;
   }
   ```

3. **Update sync-us-tasks.js** to read and preserve these fields

**Files to modify**:
- `src/types/living-docs.ts` (add interface fields)
- `src/core/living-docs/task-project-specific-generator.ts` (frontmatter generation)
- `plugins/specweave/lib/hooks/sync-us-tasks.js` (read format_preservation flag)

**Tests**:
- `tests/unit/living-docs/format-preservation-metadata.test.ts`
- Verify external US has `format_preservation: true`
- Verify internal US has `format_preservation: false`
- Verify external_title preservation

**Effort**: 4 hours

---

### T-034B: Implement comment-based sync service for external items

**Goal**: Create sync service that posts completion updates as comments (not body updates) for external items

**Implementation**:

1. **Create ExternalItemSyncService** (`src/sync/external-item-sync-service.ts`):
   ```typescript
   export class ExternalItemSyncService {
     async syncTaskCompletion(
       usId: string,
       taskId: string,
       completionData: TaskCompletionData,
       options: SyncOptions
     ): Promise<SyncResult> {
       // Read format_preservation from living docs
       const formatPreservation = await this.getFormatPreservation(usId);

       if (formatPreservation) {
         // Comment-only mode
         return await this.postCompletionComment(usId, taskId, completionData);
       } else {
         // Full sync mode (update title, description, etc.)
         return await this.fullSync(usId, taskId, completionData);
       }
     }

     private async postCompletionComment(usId, taskId, data) {
       const comment = this.formatCompletionComment(taskId, data);
       await this.postComment(usId, comment);
     }

     private formatCompletionComment(taskId, data) {
       return `✅ **[${data.featureId}][${taskId}]** Task completed

**Acceptance Criteria Satisfied**: ${data.satisfiesACs.join(', ')}
**Progress**: ${data.completedTasks}/${data.totalTasks} tasks (${data.percentage}%)
**Living Docs**: [View spec](${data.livingDocsUrl})`;
     }
   }
   ```

2. **Integrate with existing sync hooks**:
   - Update `plugins/specweave/lib/hooks/sync-living-docs.js`
   - Call `ExternalItemSyncService` instead of direct GitHub API calls
   - Route based on `format_preservation` flag

**Files to create**:
- `src/sync/external-item-sync-service.ts` (new)

**Files to modify**:
- `plugins/specweave/lib/hooks/sync-living-docs.js` (integrate service)
- `src/core/living-docs/living-docs-sync.ts` (pass format_preservation)

**Tests**:
- `tests/integration/sync/external-item-sync.test.ts`
- Verify comment posted for external items
- Verify no title/description update for external items
- Verify full sync for internal items

**Effort**: 5 hours

---

### T-034C: Add format preservation validation

**Goal**: Validate that external items don't get title/description updates (only comments)

**Implementation**:

1. **Create FormatPreservationValidator** (`src/validators/format-preservation-validator.ts`):
   ```typescript
   export class FormatPreservationValidator {
     validate(syncOperation: SyncOperation): ValidationResult {
       if (syncOperation.formatPreservation && syncOperation.updates.includes('title')) {
         return {
           valid: false,
           error: 'Cannot update title for external item (format preservation enabled)'
         };
       }

       if (syncOperation.formatPreservation && syncOperation.updates.includes('description')) {
         return {
           valid: false,
           error: 'Cannot update description for external item (format preservation enabled)'
         };
       }

       return { valid: true };
     }
   }
   ```

2. **Integrate with sync service**:
   - Call validator before any sync operation
   - Block sync if validation fails
   - Log warning to user

**Files to create**:
- `src/validators/format-preservation-validator.ts` (new)

**Files to modify**:
- `src/sync/external-item-sync-service.ts` (call validator)

**Tests**:
- `tests/unit/validators/format-preservation-validator.test.ts`
- Verify title update blocked for external items
- Verify description update blocked for external items
- Verify comment-only updates allowed

**Effort**: 3 hours

---

### T-034D: Implement sync routing based on origin

**Goal**: Route sync operations to correct handler based on origin (internal vs external)

**Implementation**:

1. **Create SyncRouter** (`src/sync/sync-router.ts`):
   ```typescript
   export class SyncRouter {
     async route(usId: string, operation: SyncOperation): Promise<SyncResult> {
       const origin = await this.detectOrigin(usId);

       switch (origin) {
         case 'internal':
           return await this.internalSyncService.sync(usId, operation);
         case 'github':
           return await this.githubSyncService.sync(usId, operation);
         case 'jira':
           return await this.jiraSyncService.sync(usId, operation);
         case 'ado':
           return await this.adoSyncService.sync(usId, operation);
         default:
           throw new Error(`Unknown origin: ${origin}`);
       }
     }

     private async detectOrigin(usId: string): Promise<string> {
       // Read from living docs frontmatter
       const metadata = await this.readLivingDocsMetadata(usId);
       return metadata.origin || (usId.endsWith('E') ? 'external' : 'internal');
     }
   }
   ```

2. **Update sync hooks to use router**:
   - Replace direct sync calls with router
   - Router delegates to appropriate service

**Files to create**:
- `src/sync/sync-router.ts` (new)

**Files to modify**:
- `plugins/specweave/lib/hooks/sync-living-docs.js` (use router)
- `plugins/specweave/lib/hooks/post-task-completion.sh` (use router)

**Tests**:
- `tests/integration/sync/sync-routing.test.ts`
- Verify internal items use InternalSyncService
- Verify external items use ExternalItemSyncService
- Verify routing based on origin metadata

**Effort**: 4 hours

---

### T-034E: Add external title validation post-sync

**Goal**: After sync, validate that external item title hasn't changed

**Implementation**:

1. **Create PostSyncValidator** (`src/validators/post-sync-validator.ts`):
   ```typescript
   export class PostSyncValidator {
     async validateExternalTitlePreservation(
       usId: string,
       preSync: ExternalItemSnapshot,
       postSync: ExternalItemSnapshot
     ): Promise<ValidationResult> {
       if (preSync.title !== postSync.title) {
         return {
           valid: false,
           error: `External title changed during sync! Expected: "${preSync.title}", Got: "${postSync.title}"`,
           recovery: 'Rollback sync and investigate'
         };
       }

       return { valid: true };
     }
   }
   ```

2. **Integrate with sync service**:
   - Snapshot title before sync
   - Snapshot title after sync
   - Compare and validate
   - Alert if mismatch

**Files to create**:
- `src/validators/post-sync-validator.ts` (new)

**Files to modify**:
- `src/sync/external-item-sync-service.ts` (call post-sync validator)

**Tests**:
- `tests/integration/sync/post-sync-validation.test.ts`
- Verify title preservation validation
- Verify rollback on title change
- Verify alert on validation failure

**Effort**: 3 hours

---

### T-034F: Integration tests for format preservation

**Goal**: Comprehensive E2E tests for entire format preservation workflow

**Implementation**:

1. **Create comprehensive test suite** (`tests/integration/format-preservation/full-workflow.test.ts`):
   ```typescript
   describe('Format Preservation Full Workflow', () => {
     it('should preserve external GitHub issue format during sync', async () => {
       // 1. Import external GitHub issue (US-001E)
       // 2. Create increment with tasks
       // 3. Complete task
       // 4. Sync to living docs
       // 5. Verify GitHub issue title unchanged
       // 6. Verify GitHub issue description unchanged
       // 7. Verify completion comment posted
       // 8. Verify progress updated in comment
     });

     it('should allow full sync for internal items', async () => {
       // 1. Create internal US (US-001)
       // 2. Complete task
       // 3. Sync to living docs
       // 4. Verify title updated
       // 5. Verify description updated
       // 6. Verify ACs updated
     });
   });
   ```

**Files to create**:
- `tests/integration/format-preservation/full-workflow.test.ts` (new)

**Tests**:
- End-to-end format preservation
- External item comment-only sync
- Internal item full sync
- Validation and rollback scenarios

**Effort**: 5 hours

---

## US-010: External Import Slash Command (2 tasks)

### T-035: Create /specweave:import-external slash command

**Goal**: Create dedicated command for ongoing external item imports (post-init)

**Implementation**:

1. **Create slash command file** (`.claude/commands/specweave-import-external.md`):
   ```markdown
   # Import External Items

   Import work items from external tools (GitHub, JIRA, Azure DevOps) into SpecWeave living docs.

   ## Usage

   ```bash
   /specweave:import-external
   /specweave:import-external --since=1m
   /specweave:import-external --github-only
   /specweave:import-external --dry-run
   ```

   ## Arguments

   - `--since=<timerange>`: Import items created since (1m, 3m, 1y, or date)
   - `--github-only`, `--jira-only`, `--ado-only`: Filter by platform
   - `--dry-run`: Preview what would be imported

   ## How It Works

   1. Detect configured external tools (GitHub remote, JIRA env vars, ADO env vars)
   2. Fetch items from external APIs
   3. Filter by time range (default: since last import)
   4. Create living docs US files with E suffix
   5. Update sync metadata with last import timestamp
   6. Display summary report
   ```

2. **Create command handler** (`src/cli/commands/import-external.ts`):
   ```typescript
   export async function importExternalCommand(options: ImportOptions) {
     // 1. Load sync metadata (last import timestamps)
     // 2. Detect available external tools
     // 3. Prompt user for platform selection
     // 4. Call ExternalImportCoordinator
     // 5. Update sync metadata
     // 6. Display summary
   }
   ```

**Files to create**:
- `.claude/commands/specweave-import-external.md` (new)
- `src/cli/commands/import-external.ts` (new)

**Files to modify**:
- `plugins/specweave/commands/specweave-commands.md` (add command reference)

**Effort**: 3 hours

---

### T-036: Implement external import coordinator

**Goal**: Orchestrate import from multiple external tools with pagination, deduplication, and progress tracking

**Implementation**:

1. **Create ExternalImportCoordinator** (`src/importers/external-import-coordinator.ts`):
   ```typescript
   export class ExternalImportCoordinator {
     async importFromAllSources(options: ImportOptions): Promise<ImportResult> {
       const results = [];

       // GitHub import
       if (this.isGitHubAvailable()) {
         const github = await this.importFromGitHub(options);
         results.push(github);
       }

       // JIRA import
       if (this.isJIRAAvailable()) {
         const jira = await this.importFromJIRA(options);
         results.push(jira);
       }

       // ADO import
       if (this.isADOAvailable()) {
         const ado = await this.importFromADO(options);
         results.push(ado);
       }

       // Deduplicate across sources
       const deduplicated = this.deduplicateItems(results);

       // Create living docs
       await this.createLivingDocs(deduplicated);

       return this.generateSummary(results);
     }

     private async importFromGitHub(options) {
       const client = new GitHubClient();
       const items = await client.fetchIssues(options.since, options.timeRange);

       // Paginate (handle 100+ issues)
       const allItems = [];
       for await (const page of items) {
         allItems.push(...page);
         this.showProgress(allItems.length);
       }

       return allItems;
     }
   }
   ```

2. **Handle pagination** for each platform:
   - GitHub: 100 items per page (Link header)
   - JIRA: 50 items per page (startAt parameter)
   - ADO: continuationToken

3. **Deduplication logic**:
   - Check if US-ID already exists in living docs
   - Skip duplicates, log skipped count

**Files to create**:
- `src/importers/external-import-coordinator.ts` (new)
- `src/importers/github-importer.ts` (new)
- `src/importers/jira-importer.ts` (new)
- `src/importers/ado-importer.ts` (new)

**Effort**: 6 hours

---

## US-011: Multi-Repo Selection Strategy (4 tasks)

### T-037: Implement multi-repo detection in init

**Goal**: During `specweave init`, detect if user has access to multiple GitHub organizations/repos

**Implementation**:

1. **Extend init command** (`src/cli/commands/init.ts`):
   ```typescript
   async function detectGitHubRepos(): Promise<RepoDetectionResult> {
     const client = new GitHubClient();

     // 1. Detect user's organizations
     const orgs = await client.getUserOrganizations();

     // 2. Detect personal repos
     const personalRepos = await client.getUserRepos();

     // 3. Return summary
     return {
       organizations: orgs,
       personalRepos: personalRepos,
       total: orgs.reduce((sum, org) => sum + org.repoCount, 0) + personalRepos.length
     };
   }
   ```

2. **Query GitHub API**:
   - `/user/orgs` - Get organizations
   - `/orgs/{org}/repos` - Get repos per org
   - `/user/repos?affiliation=owner` - Get personal repos

**Files to modify**:
- `src/cli/commands/init.ts` (add multi-repo detection)

**Files to create**:
- `src/github/multi-repo-detector.ts` (new)

**Effort**: 3 hours

---

### T-038: Add interactive repository selection UI

**Goal**: Prompt user with 4 selection strategies (all org, all personal, pattern, explicit list)

**Implementation**:

1. **Create interactive prompt** using `inquirer` or `prompts`:
   ```typescript
   async function promptRepoSelection(detection: RepoDetectionResult) {
     const { strategy } = await inquirer.prompt([
       {
         type: 'list',
         name: 'strategy',
         message: 'How do you want to select repositories?',
         choices: [
           { name: 'All repos from an organization', value: 'org' },
           { name: 'All my personal repos', value: 'personal' },
           { name: 'Pattern matching (e.g., ec-*)', value: 'pattern' },
           { name: 'Explicit list', value: 'explicit' }
         ]
       }
     ]);

     switch (strategy) {
       case 'org':
         return await promptOrgSelection(detection.organizations);
       case 'personal':
         return { strategy: 'personal', repos: detection.personalRepos };
       case 'pattern':
         return await promptPatternMatching(detection);
       case 'explicit':
         return await promptExplicitList();
     }
   }
   ```

2. **Show preview before confirmation**:
   ```typescript
   async function showPreview(repos: Repository[]) {
     console.log('\n📋 Selected Repositories:\n');
     console.table(repos.map(r => ({
       Name: r.name,
       Owner: r.owner,
       Visibility: r.private ? 'Private' : 'Public',
       'Last Updated': r.lastUpdated
     })));

     const { confirm } = await inquirer.prompt([
       {
         type: 'confirm',
         name: 'confirm',
         message: `Connect these ${repos.length} repositories?`
       }
     ]);

     return confirm;
   }
   ```

**Files to modify**:
- `src/cli/commands/init.ts` (add interactive prompts)

**Dependencies**:
- `inquirer` or `prompts` package

**Effort**: 4 hours

---

### T-039: Implement repository pattern matching

**Goal**: Support glob patterns (ec-*, *-backend) and regex for repo selection

**Implementation**:

1. **Create PatternMatcher** (`src/github/pattern-matcher.ts`):
   ```typescript
   import minimatch from 'minimatch';

   export class PatternMatcher {
     matchRepos(repos: Repository[], pattern: string): Repository[] {
       // Try glob first
       if (this.isGlobPattern(pattern)) {
         return repos.filter(r => minimatch(r.name, pattern));
       }

       // Try regex
       if (this.isRegexPattern(pattern)) {
         const regex = new RegExp(pattern);
         return repos.filter(r => regex.test(r.name));
       }

       // Exact match
       return repos.filter(r => r.name === pattern);
     }

     private isGlobPattern(pattern: string): boolean {
       return pattern.includes('*') || pattern.includes('?');
     }

     private isRegexPattern(pattern: string): boolean {
       return pattern.startsWith('/') && pattern.endsWith('/');
     }
   }
   ```

2. **Integrate with prompt**:
   ```typescript
   async function promptPatternMatching(detection) {
     const { pattern } = await inquirer.prompt([
       {
         type: 'input',
         name: 'pattern',
         message: 'Enter pattern (glob or regex):',
         default: 'ec-*'
       }
     ]);

     const matcher = new PatternMatcher();
     const matched = matcher.matchRepos(detection.allRepos, pattern);

     console.log(`\n✓ Matched ${matched.length} repositories\n`);
     return { strategy: 'pattern', pattern, repos: matched };
   }
   ```

**Files to create**:
- `src/github/pattern-matcher.ts` (new)

**Dependencies**:
- `minimatch` package

**Effort**: 3 hours

---

### T-040: Save repository selection to config

**Goal**: Persist selected repos to `.specweave/config.json` under `github.repositories`

**Implementation**:

1. **Update config.json schema** (`src/types/config.ts`):
   ```typescript
   export interface SpecWeaveConfig {
     // ... existing fields
     github?: {
       repositories: string[];          // ['owner/repo1', 'owner/repo2']
       selectionStrategy: 'org' | 'personal' | 'pattern' | 'explicit';
       pattern?: string;                // Only for pattern strategy
       lastUpdated: string;             // ISO timestamp
     };
   }
   ```

2. **Save to config** (`src/cli/commands/init.ts`):
   ```typescript
   async function saveRepoSelection(repos: Repository[], strategy: string, pattern?: string) {
     const config = await loadConfig();

     config.github = {
       repositories: repos.map(r => `${r.owner}/${r.name}`),
       selectionStrategy: strategy,
       pattern: pattern,
       lastUpdated: new Date().toISOString()
     };

     await saveConfig(config);
     console.log(`\n✓ Saved ${repos.length} repositories to config.json\n`);
   }
   ```

**Files to modify**:
- `src/types/config.ts` (extend schema)
- `src/cli/commands/init.ts` (save selection)

**Effort**: 2 hours

---

## US-012: Intelligent FS-XXX Folder Creation (1 task)

### T-043: Update feature sync to use chronological allocation

**Goal**: Use existing chronological ID allocator (from T-041) in feature sync workflow

**Implementation**:

1. **Integrate chronological allocator** (`src/core/living-docs/living-docs-sync.ts`):
   ```typescript
   private async allocateFeatureId(
     incrementId: string,
     workItemCreatedAt?: Date
   ): Promise<string> {
     const allocator = new FSIDAllocator(this.projectRoot);

     if (workItemCreatedAt) {
       // Chronological allocation
       return await allocator.allocateChronologically(workItemCreatedAt);
     } else {
       // Append mode (new increment)
       return await allocator.allocateNext();
     }
   }
   ```

2. **Pass creation date from import** (`src/importers/external-import-coordinator.ts`):
   ```typescript
   async createLivingDocsForExternalItem(item: ExternalItem) {
     const featureId = await this.allocateFeatureId(item.createdAt);
     // ... create living docs with allocated FS-ID
   }
   ```

**Files to modify**:
- `src/core/living-docs/living-docs-sync.ts` (use allocator)
- `src/importers/external-import-coordinator.ts` (pass creation date)

**Effort**: 2 hours

---

## US-013: Archive Command (3 tasks)

### T-044: Create /specweave:archive command

**Goal**: Create slash command to archive features and epics

**Implementation**:

1. **Create slash command file** (`.claude/commands/specweave-archive.md`):
   ```markdown
   # Archive Feature or Epic

   Move completed or obsolete features/epics to archive folder.

   ## Usage

   ```bash
   /specweave:archive feature FS-042
   /specweave:archive epic SP-FS-047-US-003
   /specweave:archive feature FS-042 --reason="Obsolete after pivot"
   /specweave:archive feature FS-042 --dry-run
   ```
   ```

2. **Create command handler** (`src/cli/commands/archive.ts`):
   ```typescript
   export async function archiveCommand(
     type: 'feature' | 'epic',
     id: string,
     options: ArchiveOptions
   ) {
     // 1. Validate no active increments reference this item
     // 2. Show preview of what will be archived
     // 3. Prompt for confirmation
     // 4. Call ArchiveService
     // 5. Display summary
   }
   ```

**Files to create**:
- `.claude/commands/specweave-archive.md` (new)
- `src/cli/commands/archive.ts` (new)

**Effort**: 3 hours

---

### T-045: Implement archive service with cascading

**Goal**: Move features/epics to archive while maintaining folder structure

**Implementation**:

1. **Create ArchiveService** (`src/core/archive-service.ts`):
   ```typescript
   export class ArchiveService {
     async archiveFeature(featureId: string, reason?: string): Promise<ArchiveResult> {
       // 1. Validate no active increments
       const activeRefs = await this.findActiveReferences(featureId);
       if (activeRefs.length > 0) {
         throw new Error(`Cannot archive: ${activeRefs.length} active increments reference this feature`);
       }

       // 2. Move entire FS-XXX folder
       const sourcePath = `.specweave/docs/internal/specs/${featureId}`;
       const targetPath = `.specweave/docs/_archive/specs/${featureId}`;

       await fs.move(sourcePath, targetPath);

       // 3. Add archive metadata
       await this.addArchiveMetadata(targetPath, reason);

       // 4. Update ID registry (mark as archived)
       await this.idRegistry.markAsArchived(featureId);

       return { archived: true, location: targetPath };
     }

     async archiveEpic(epicId: string, reason?: string): Promise<ArchiveResult> {
       // Similar to archiveFeature but only move specific US folder
     }

     private async addArchiveMetadata(path: string, reason?: string) {
       const metadata = {
         archived_at: new Date().toISOString(),
         archived_by: process.env.USER || 'unknown',
         reason: reason || 'No reason provided'
       };

       await fs.writeJSON(path + '/.archive-metadata.json', metadata);
     }
   }
   ```

**Files to create**:
- `src/core/archive-service.ts` (new)

**Effort**: 4 hours

---

### T-046: Create /specweave:restore command

**Goal**: Restore archived features/epics back to active folder

**Implementation**:

1. **Create slash command file** (`.claude/commands/specweave-restore.md`):
   ```markdown
   # Restore Archived Feature or Epic

   Move archived features/epics back to active folder.

   ## Usage

   ```bash
   /specweave:restore feature FS-042
   /specweave:restore epic SP-FS-047-US-003
   ```
   ```

2. **Extend ArchiveService** (`src/core/archive-service.ts`):
   ```typescript
   async restoreFeature(featureId: string): Promise<RestoreResult> {
     // 1. Validate archive exists
     const archivePath = `.specweave/docs/_archive/specs/${featureId}`;
     if (!await fs.pathExists(archivePath)) {
       throw new Error(`Archive not found: ${featureId}`);
     }

     // 2. Move back to active
     const targetPath = `.specweave/docs/internal/specs/${featureId}`;
     await fs.move(archivePath, targetPath);

     // 3. Update ID registry (mark as active)
     await this.idRegistry.markAsActive(featureId);

     // 4. Remove archive metadata
     await fs.remove(targetPath + '/.archive-metadata.json');

     return { restored: true, location: targetPath };
   }
   ```

**Files to modify**:
- `src/core/archive-service.ts` (add restore methods)

**Files to create**:
- `.claude/commands/specweave-restore.md` (new)

**Effort**: 2 hours

---

## Implementation Summary

### Total Effort Estimate
- US-009A (Format Preservation): 24 hours
- US-010 (Import Command): 9 hours
- US-011 (Multi-Repo): 12 hours
- US-012 (Chronological Allocation): 2 hours
- US-013 (Archive): 9 hours

**Total**: ~56 hours (7-8 working days)

### Priority Order
1. **T-034A through T-034F** (Format Preservation) - Critical for external item sync integrity
2. **T-043** (Chronological Allocation) - Quick win, integrates existing work
3. **T-035, T-036** (Import Command) - Enable ongoing brownfield migration
4. **T-044, T-045, T-046** (Archive/Restore) - Maintenance features
5. **T-037 through T-040** (Multi-Repo) - Enhancement for large orgs

### Testing Strategy
- Unit tests for each service/validator
- Integration tests for workflows
- E2E test for full user journeys
- Manual testing in real repositories

### Risk Mitigation
- **External API rate limits**: Implement retry logic with exponential backoff
- **Large imports**: Progress indicators, batch processing
- **Data integrity**: Validation gates before destructive operations
- **Backward compatibility**: Feature flags for gradual rollout

---

## Next Steps

1. **Immediate** (today):
   - Implement T-034A (format preservation metadata)
   - Implement T-034B (comment-based sync)
   - Create comprehensive tests

2. **Short-term** (this week):
   - Complete US-009A (format preservation)
   - Implement T-043 (chronological allocation)
   - Implement T-035, T-036 (import command)

3. **Medium-term** (next week):
   - Implement US-011 (multi-repo)
   - Implement US-013 (archive)
   - Full E2E testing
   - Documentation updates

4. **Before closure**:
   - Run full test suite (target: 90%+ coverage)
   - Update CLAUDE.md with new features
   - Update living docs
   - Create comprehensive completion report

---

**Document Status**: Implementation plan ready for execution
**Last Updated**: 2025-11-20
**Author**: Claude (Increment 0047)
