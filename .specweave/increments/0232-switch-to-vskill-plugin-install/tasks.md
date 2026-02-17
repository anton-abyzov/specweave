# Tasks: Switch Plugin Installation to vskill

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[ ]`: Not started
- `[x]`: Completed
- Model hints: haiku (simple), opus (default)

## Phase 1: vskill CLI Enhancements

### US-005: Full Claude Code Plugin Directory Support (P1)

#### T-001: Extend vskill `add` for full plugin directories
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04 | **Status**: [ ] not started

**Description**: Extend the vskill CLI `add` command to support full Claude Code plugin directories (not just individual SKILL.md files). Add `--plugin <name>` option for installing a sub-plugin from a multi-plugin repository.

**Implementation Details**:
- Add `--plugin <name>` CLI option to `add` command
- Add `--plugin-dir` mode that copies entire plugin directory structure
- Copy to `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`
- Preserve full structure: skills/, hooks/, commands/, agents/, .claude-plugin/
- chmod +x for all .sh files in hooks/ and scripts/
- Expand security scanning to cover all plugin files (not just SKILL.md)

**Test Plan**:
- **File**: `vskill/packages/cli/tests/add-plugin.test.ts`
- **Tests**:
  - **TC-001**: Plugin directory installation
    - Given a multi-plugin repository with `plugins/specweave-frontend/`
    - When `vskill add <repo> --plugin sw-frontend`
    - Then full directory copied to `~/.claude/plugins/cache/specweave/sw-frontend/<version>/`
  - **TC-002**: Hook permissions fix
    - Given a plugin with shell hooks
    - When installed via vskill add
    - Then all .sh files have executable permission
  - **TC-003**: Full file scanning
    - Given a plugin with hooks containing dangerous patterns
    - When scanned by vskill
    - Then scan findings include hook file matches

**Dependencies**: None
**File**: `vskill/packages/cli/src/commands/add.ts`

---

#### T-002: Add marketplace.json parser to vskill [P]
**User Story**: US-001, US-002 | **Satisfies ACs**: AC-US1-01, AC-US2-01 | **Status**: [ ] not started

**Description**: Create a module that parses `.claude-plugin/marketplace.json` to discover available plugins, map names to source directories.

**Implementation Details**:
- Parse marketplace.json structure (name, plugins array with source paths)
- Map plugin names to source directories (e.g., `sw-frontend` -> `./plugins/specweave-frontend`)
- Export: `getAvailablePlugins()`, `getPluginSource(name)`, `getPluginVersion(name)`
- Handle both local filesystem path and cloned repo path

**Test Plan**:
- **File**: `vskill/packages/cli/tests/marketplace.test.ts`
- **Tests**:
  - **TC-004**: Parse marketplace.json
    - Given a valid marketplace.json with 21 plugins
    - When `getAvailablePlugins()` is called
    - Then returns array of 21 plugin entries with name, source, version
  - **TC-005**: Plugin source mapping
    - Given marketplace.json with `sw-frontend` -> `./plugins/specweave-frontend`
    - When `getPluginSource('sw-frontend')` is called
    - Then returns resolved path to the plugin directory

**Dependencies**: None
**File**: `vskill/packages/cli/src/marketplace.ts` (new)

---

#### T-003: Extend vskill lockfile for plugin metadata [P]
**User Story**: US-001, US-002 | **Satisfies ACs**: AC-US1-04, AC-US2-05 | **Status**: [ ] not started

**Description**: Extend the lockfile schema with additional fields needed for Claude Code plugin management.

**Implementation Details**:
- Add fields: `marketplace`, `pluginDir`, `scope` (user/project), `installedPath`
- Backward-compatible with existing lockfile entries
- Update read/write functions to handle new fields

**Test Plan**:
- **File**: `vskill/packages/cli/tests/lockfile.test.ts`
- **Tests**:
  - **TC-006**: Extended lockfile round-trip
    - Given a lockfile entry with marketplace and scope fields
    - When written and read back
    - Then all fields preserved correctly

**Dependencies**: None
**File**: `vskill/packages/cli/src/lockfile.ts`

---

#### T-004: Add settings.json management to vskill [P]
**User Story**: US-001 | **Satisfies ACs**: AC-US1-06 | **Status**: [ ] not started

**Description**: Create a module to manage `~/.claude/settings.json` `enabledPlugins` entries.

**Implementation Details**:
- Read `~/.claude/settings.json` (create if not exists)
- Set `enabledPlugins["<name>@<marketplace>"] = true`
- Support user scope (`~/.claude/settings.json`) vs project scope (`.claude/settings.json`)
- Replicate logic from SpecWeave's `claude-plugin-enabler.ts`

**Test Plan**:
- **File**: `vskill/packages/cli/tests/settings.test.ts`
- **Tests**:
  - **TC-007**: Enable plugin in settings
    - Given empty settings.json
    - When enabling `sw-frontend@specweave`
    - Then `enabledPlugins["sw-frontend@specweave"]` is true
  - **TC-008**: Project vs user scope
    - Given a project scope request
    - When enabling a plugin
    - Then writes to `.claude/settings.json` (not `~/.claude/`)

**Dependencies**: None
**File**: `vskill/packages/cli/src/settings.ts` (new)

---

#### T-005: Add Claude Code plugin cache installation logic [P]
**User Story**: US-005 | **Satisfies ACs**: AC-US5-02 | **Status**: [ ] not started

**Description**: Add Claude Code-specific plugin cache directory support to the agent registry.

**Implementation Details**:
- Add `pluginCacheDir: '~/.claude/plugins/cache'` to Claude Code agent definition
- Add installation logic that copies full plugin structure to cache dir
- Ensure version directory naming matches Claude Code expectations

**Test Plan**:
- **File**: `vskill/packages/scanner/tests/agents-registry.test.ts` (extend existing)
- **Tests**:
  - **TC-009**: Claude Code agent has pluginCacheDir
    - Given the agents registry
    - When looking up 'claude-code' agent
    - Then it has `pluginCacheDir` field pointing to `~/.claude/plugins/cache`

**Dependencies**: T-001
**File**: `vskill/packages/scanner/src/agents/agents-registry.ts`

---

## Phase 2: SpecWeave Integration

### US-002: Plugin Refresh via vskill (P1)

#### T-006: Create `specweave refresh-plugins` command
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04 | **Status**: [ ] not started

**Description**: New CLI command that delegates to vskill for all plugin management.

**Implementation Details**:
- Modes: lazy (core only), all, minimal, force (same as current refresh-marketplace)
- Invoke vskill programmatically (import or shell out to local monorepo)
- Read marketplace.json to get available plugins
- For each plugin: check lockfile -> if changed, scan + install
- Register in CLI command registry

**Test Plan**:
- **File**: `src/cli/commands/__tests__/refresh-plugins.test.ts`
- **Tests**:
  - **TC-010**: Lazy mode installs only core plugin
    - Given a fresh project
    - When `specweave refresh-plugins` runs (default lazy mode)
    - Then only `sw` plugin is installed via vskill
  - **TC-011**: All mode installs all plugins
    - Given `--all` flag
    - When `specweave refresh-plugins --all` runs
    - Then all 21+ plugins are installed

**Dependencies**: T-001, T-002, T-003, T-004
**File**: `src/cli/commands/refresh-plugins.ts` (new)

---

#### T-007: Deprecate `refresh-marketplace`
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [ ] not started

**Description**: Add deprecation warning to existing command and delegate to refresh-plugins.

**Implementation Details**:
- Print deprecation warning: "refresh-marketplace is deprecated, use refresh-plugins instead"
- Delegate to refresh-plugins with same arguments
- Keep command registered for backward compatibility

**Test Plan**:
- **File**: `src/cli/commands/__tests__/refresh-marketplace.test.ts` (extend existing)
- **Tests**:
  - **TC-012**: Deprecation warning shown
    - Given user runs `specweave refresh-marketplace`
    - When command executes
    - Then deprecation warning is printed to stderr

**Dependencies**: T-006
**File**: `src/cli/commands/refresh-marketplace.ts`

---

### US-001: New User Plugin Installation (P1)

#### T-008: Modify plugin-installer.ts for vskill
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03 | **Status**: [ ] not started

**Description**: Replace Claude marketplace registration and plugin install calls with vskill.

**Implementation Details**:
- Remove `claude plugin marketplace add` calls
- Replace `claude plugin install sw@specweave` with vskill `add` invocation
- Keep same public API (`installAllPlugins()`)
- Remove `refreshMarketplace()`, `ensureOfficialMarketplace()` functions
- Add vskill path resolution (local monorepo)

**Test Plan**:
- **File**: `src/cli/helpers/init/__tests__/plugin-installer.test.ts` (extend)
- **Tests**:
  - **TC-013**: Init uses vskill
    - Given a fresh project running `specweave init`
    - When plugin installation phase runs
    - Then vskill is invoked instead of `claude plugin install`

**Dependencies**: T-001, T-002, T-004
**File**: `src/cli/helpers/init/plugin-installer.ts`

---

### US-003: Lazy Loading via vskill (P1)

#### T-009: Modify lazy loading for vskill
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04 | **Status**: [ ] not started

**Description**: Replace `claude plugin install` in hook and LLM detector with vskill invocation.

**Implementation Details**:
- **Hook** (`user-prompt-submit.sh`): Replace `claude plugin install` with vskill add
- Add `vskill.lock` check: if plugin+version already in lockfile, skip entirely
- **LLM detector** (`llm-plugin-detector.ts`): Update `installPluginViaCli()` to call vskill
- Ensure latency stays under 5s (fast-path: lockfile check <1ms)

**Test Plan**:
- **File**: `src/core/lazy-loading/__tests__/llm-plugin-detector.test.ts`
- **Tests**:
  - **TC-014**: Detector uses vskill
    - Given plugin detection result with `["sw-frontend"]`
    - When `installPluginViaCli()` is called
    - Then vskill add is invoked (not `claude plugin install`)
  - **TC-015**: Fast-path skip for installed plugins
    - Given `sw-frontend` already in vskill.lock
    - When hook detects `sw-frontend` needed
    - Then installation is skipped

**Dependencies**: T-001, T-003, T-005
**Files**: `plugins/specweave/hooks/user-prompt-submit.sh`, `src/core/lazy-loading/llm-plugin-detector.ts`

---

### US-004: Migration (P2)

#### T-010: Create migration command
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04 | **Status**: [ ] not started

**Description**: One-time migration from Claude marketplace to vskill-based installation.

**Implementation Details**:
- Read `~/.claude/plugins/installed_plugins.json` for installed specweave plugins
- Compute content hashes for each installed plugin directory
- Write `vskill.lock` with all entries
- Optionally remove Claude marketplace registration (with user confirmation)
- Integrate into `specweave init` (auto-detect marketplace + no vskill.lock = offer migration)

**Test Plan**:
- **File**: `src/cli/commands/__tests__/migrate-to-vskill.test.ts`
- **Tests**:
  - **TC-016**: Lockfile creation from installed plugins
    - Given 5 plugins installed via Claude marketplace
    - When `specweave migrate-to-vskill` runs
    - Then vskill.lock contains 5 entries with correct hashes

**Dependencies**: T-003, T-004
**File**: `src/cli/commands/migrate-to-vskill.ts` (new)

---

#### T-011: Update remaining source files
**User Story**: US-001, US-003 | **Satisfies ACs**: AC-US1-01, AC-US3-01 | **Status**: [ ] not started

**Description**: Update all remaining source files that reference `claude plugin install`.

**Implementation Details**:
- `src/cli/commands/detect-intent.ts`: Update install path references
- `src/core/session/plugin-install-detector.ts`: Update detection logic
- `src/utils/cleanup-stale-plugins.ts`: Read from vskill.lock
- `src/cli/helpers/init/claude-plugin-enabler.ts`: Wire to vskill settings
- `plugins/specweave/hooks/v2/dispatchers/session-start.sh`: Update refs

**Dependencies**: T-004, T-009
**Files**: Multiple (see description)

---

## Phase 3: Documentation & Testing

#### T-012: Update CLAUDE.md and templates
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [ ] not started

**Description**: Replace marketplace references with vskill/refresh-plugins in project instructions.

**Implementation Details**:
- `CLAUDE.md`: Replace `claude plugin install sw-frontend@specweave` with vskill reference
- `CLAUDE.md`: Replace `specweave refresh-marketplace` with `specweave refresh-plugins`
- `src/templates/CLAUDE.md.template`: Same updates for new projects
- Update troubleshooting section

**Dependencies**: T-006
**Files**: `CLAUDE.md`, `src/templates/CLAUDE.md.template`

---

#### T-013: Update docs-site documentation
**User Story**: US-002, US-004 | **Satisfies ACs**: AC-US2-02, AC-US4-04 | **Status**: [ ] not started

**Description**: Update all user-facing documentation to reference vskill.

**Implementation Details**:
- `docs-site/docs/overview/plugins-ecosystem.md`: Installation instructions
- `docs-site/docs/guides/getting-started/installation.md`: Getting started flow
- `docs-site/docs/guides/lazy-plugin-loading.md`: Lazy loading docs
- Add migration guide section
- Update all other docs-site pages with marketplace references

**Dependencies**: T-010
**Files**: Multiple docs-site files

---

#### T-014: Update 34 PLUGIN.md files [P]
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 | **Status**: [ ] not started

**Description**: Replace `claude plugin install` examples in all PLUGIN.md files.

**Implementation Details**:
- Search-replace across all 34 PLUGIN.md files in `plugins/`
- Replace `claude plugin install <name>@specweave` with `vskill add` equivalent
- Verify consistent formatting

**Dependencies**: T-001
**Files**: 34 PLUGIN.md files in `plugins/`

---

#### T-015: Write tests for vskill extensions [P]
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-04 | **Status**: [ ] not started

**Description**: Unit tests for all new vskill modules.

**Implementation Details**:
- Full plugin directory installation tests
- Marketplace.json parsing tests
- Lockfile round-trip tests with new fields
- Settings.json management tests
- Integration with existing scanner tests

**Dependencies**: T-001, T-002, T-003, T-004
**Files**: `vskill/packages/cli/tests/` (multiple new test files)

---

#### T-016: Write integration tests
**User Story**: US-001, US-002, US-003, US-004 | **Satisfies ACs**: All | **Status**: [ ] not started

**Description**: End-to-end integration tests for the full migration pipeline.

**Implementation Details**:
- Test: `specweave refresh-plugins` end-to-end
- Test: `specweave init` with vskill
- Test: Lazy loading hook with vskill
- Test: Migration from marketplace to vskill

**Dependencies**: T-006, T-008, T-009, T-010
**Files**: New integration test files
