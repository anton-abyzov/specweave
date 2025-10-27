---
increment: 0002-multi-tool-support
title: "Implementation Tasks"
created: 2025-10-27
updated: 2025-10-27
total_tasks: 45
completed_tasks: 0
completion_rate: 0
---

# Implementation Tasks: Multi-Tool Compatibility

## Phase 1: Core Adapter System (P1) - Day 1

### T001: Create adapter infrastructure
- [ ] Create `src/adapters/` directory structure
- [ ] Create `src/adapters/registry.yaml`
- [ ] Create `src/adapters/adapter-interface.ts`
- [ ] Create `src/adapters/adapter-base.ts`
- [ ] Create `src/adapters/README.md`

### T002: Rename CLAUDE.md → SPECWEAVE.md
- [ ] Rename `CLAUDE.md` to `SPECWEAVE.md`
- [ ] Update all internal references to SPECWEAVE.md
- [ ] Create symlink `CLAUDE.md` → `SPECWEAVE.md` (backward compat)
- [ ] Update package.json files list

---

## Phase 2: Claude Adapter (Baseline) - Day 1

### T003: Create Claude adapter structure
- [ ] Create `src/adapters/claude/` directory
- [ ] Create `src/adapters/claude/README.md`
- [ ] Create `src/adapters/claude/adapter.ts`
- [ ] Move `.claude/` content to `src/adapters/claude/.claude/`

### T004: Implement Claude adapter class
- [ ] Implement `ClaudeAdapter` class
- [ ] Implement `detect()` method
- [ ] Implement `checkRequirements()` method
- [ ] Implement `getFiles()` method
- [ ] Implement `postInstall()` method
- [ ] Implement `getInstructions()` method

### T005: Test Claude adapter
- [ ] Create `test-cases/test-1-install.yaml`
- [ ] Create `test-cases/test-2-detection.yaml`
- [ ] Create `test-cases/test-3-workflow.yaml`
- [ ] Test installation manually
- [ ] Verify backward compatibility with beta.1

---

## Phase 3: Cursor Adapter - Day 2

### T006: Create Cursor adapter structure
- [ ] Create `src/adapters/cursor/` directory
- [ ] Create `src/adapters/cursor/README.md`
- [ ] Create `src/adapters/cursor/adapter.ts`
- [ ] Create `src/adapters/cursor/.cursorrules` template

### T007: Create Cursor context shortcuts
- [ ] Create `.cursor/context/increments-context.md`
- [ ] Create `.cursor/context/docs-context.md`
- [ ] Create `.cursor/context/strategy-context.md`
- [ ] Create `.cursor/context/tests-context.md`

### T008: Implement Cursor adapter class
- [ ] Implement `CursorAdapter` class
- [ ] Implement detection, requirements, files methods
- [ ] Test Cursor adapter installation
- [ ] Verify `.cursorrules` content is correct

### T009: Test Cursor adapter
- [ ] Create test cases (minimum 3)
- [ ] Test in Cursor editor (if available)
- [ ] Verify @ shortcuts work
- [ ] Verify Composer integration

---

## Phase 4: Copilot Adapter - Day 3

### T010: Create Copilot adapter structure
- [ ] Create `src/adapters/copilot/` directory
- [ ] Create `src/adapters/copilot/README.md`
- [ ] Create `src/adapters/copilot/adapter.ts`
- [ ] Create `.github/copilot/instructions.md` template

### T011: Implement Copilot adapter class
- [ ] Implement `CopilotAdapter` class
- [ ] Implement all required methods
- [ ] Test Copilot adapter installation

### T012: Test Copilot adapter
- [ ] Create test cases (minimum 3)
- [ ] Test in VS Code with Copilot (if available)
- [ ] Verify workspace instructions work

---

## Phase 5: Generic Adapter - Day 3

### T013: Create Generic adapter structure
- [ ] Create `src/adapters/generic/` directory
- [ ] Create `src/adapters/generic/README.md`
- [ ] Create `src/adapters/generic/adapter.ts`
- [ ] Create `SPECWEAVE.md` workflow guide template

### T014: Write comprehensive SPECWEAVE.md guide
- [ ] Section: What is SpecWeave
- [ ] Section: Directory structure
- [ ] Section: Creating a feature (step-by-step)
- [ ] Section: Context manifests (manual loading)
- [ ] Section: Testing workflow
- [ ] Section: Works with ANY AI

### T015: Implement Generic adapter class
- [ ] Implement `GenericAdapter` class
- [ ] Implement all required methods
- [ ] Test Generic adapter installation

### T016: Test Generic adapter
- [ ] Create test cases (minimum 3)
- [ ] Test with ChatGPT (web)
- [ ] Test with Claude web
- [ ] Verify manual workflow is clear

---

## Phase 6: CLI Integration - Day 4

### T017: Update CLI for adapter support
- [ ] Add `--adapter` flag to `init` command
- [ ] Implement adapter auto-detection logic
- [ ] Update `src/cli/commands/init.ts`
- [ ] Add adapter parameter validation

### T018: Create new CLI commands
- [ ] Create `src/cli/commands/list-adapters.ts`
- [ ] Create `src/cli/commands/add-adapter.ts`
- [ ] Update `bin/specweave.js` with new commands

### T019: Test CLI adapter integration
- [ ] Test `specweave init --adapter claude`
- [ ] Test `specweave init --adapter cursor`
- [ ] Test `specweave init --adapter copilot`
- [ ] Test `specweave init --adapter generic`
- [ ] Test auto-detection (no --adapter flag)

---

## Phase 7: Documentation Updates - Day 5

### T020: Update main documentation
- [ ] Update README.md (add adapter section)
- [ ] Update INSTALL.md (add adapter installation)
- [ ] Update CHANGELOG.md (v0.2.0 multi-tool support)

### T021: Create adapter-specific docs
- [ ] Create `docs/adapters/claude.md`
- [ ] Create `docs/adapters/cursor.md`
- [ ] Create `docs/adapters/copilot.md`
- [ ] Create `docs/adapters/generic.md`
- [ ] Create `docs/adapters/comparison.md`

### T022: Update public docs
- [ ] Update `.specweave/docs/public/overview/introduction.md`
- [ ] Update `.specweave/docs/public/guides/getting-started.md`
- [ ] Add `.specweave/docs/public/guides/adapters.md`

---

## Phase 8: Testing & Quality - Day 4-5

### T023: Integration testing
- [ ] Test all 4 adapters install correctly
- [ ] Test adapter switching (add adapter to existing project)
- [ ] Test backward compatibility (beta.1 → beta.2 upgrade)
- [ ] Test multiple adapters simultaneously

### T024: Quality checks
- [ ] All adapters have ≥3 test cases
- [ ] All adapters have README.md
- [ ] All adapter code follows TypeScript conventions
- [ ] Lint all new code (`npm run lint`)

---

## Phase 9: Release Preparation - Day 5

### T025: Update version & changelog
- [ ] Update `package.json` version to `0.2.0-beta.1`
- [ ] Complete CHANGELOG.md for v0.2.0-beta.1
- [ ] Create migration guide (beta.1 → beta.2)

### T026: Build & test
- [ ] Build TypeScript (`npm run build`)
- [ ] Test CLI locally (`npm link`)
- [ ] Run all tests (`npm test` when available)
- [ ] Smoke test all adapters

### T027: Create PR
- [ ] Commit all changes
- [ ] Push to `features/002-multi-tool-support`
- [ ] Create PR to `develop`
- [ ] Add PR description with testing instructions

---

## Priorities

**P1 (MUST HAVE)**:
- T001-T005: Core adapter system + Claude adapter (baseline)
- T006-T009: Cursor adapter (30% market)
- T017-T019: CLI integration (required for adapters to work)
- T020-T022: Documentation updates (users need guidance)

**P2 (SHOULD HAVE)**:
- T010-T012: Copilot adapter (40% market - huge!)
- T013-T016: Generic adapter (100% compatibility)
- T023-T024: Testing & quality
- T025-T027: Release preparation

**P3 (NICE TO HAVE)**:
- Additional adapters (Windsurf, Gemini) - future increments

---

## Dependencies

**Blocks**:
- None

**Depends on**:
- 0001-core-framework (must be stable)

**Related**:
- 0001-core-framework (uses adapter system)

---

## Success Criteria

- ✅ All 4 adapters installed and working
- ✅ CLI supports `--adapter` flag
- ✅ Backward compatibility maintained (beta.1 projects work)
- ✅ Documentation complete for all adapters
- ✅ 100% market coverage (works with ANY AI tool)

---

**Total Tasks**: 45
**Estimated Time**: 5 days
**Status**: Ready to start implementation
