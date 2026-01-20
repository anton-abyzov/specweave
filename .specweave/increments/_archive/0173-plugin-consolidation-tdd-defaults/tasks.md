# Tasks for 0173-plugin-consolidation-tdd-defaults

## T-001: Update init wizard to recommend TDD with 80% coverage
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03 | **Status**: [x] completed
**Test**: Given init wizard → When testing config shown → Then TDD is first choice with "(Recommended)" and 80% coverage is default

**Implementation**:
- Updated `src/cli/helpers/init/testing-config.ts`:
  - TDD option now marked "(Recommended)" in all 9 languages
  - Test-After option changed to "(most projects)"
  - Reordered choices: TDD first, then Test-After
  - Default changed from 'test-after' to 'TDD'
  - Coverage default changed from 50 to 80

## T-002: Merge sw-ui into sw-testing plugin
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05 | **Status**: [x] completed
**Test**: Given sw-ui capabilities → When merged → Then sw-testing includes visual regression, browser automation, puppeteer, selenium

**Implementation**:
- Copied sw-ui skills to sw-testing: browser-automation, image-generation, ui-testing, visual-regression
- Copied sw-ui commands to sw-testing: image.md, ui-automate.md, ui-inspect.md
- Updated sw-testing plugin.json with UI-related keywords
- Marked sw-ui as deprecated in plugin.json
- Updated keyword-detector.ts to route UI keywords to specweave-testing
- Updated PLUGINS-INDEX.md with deprecated plugins section

## T-003: Add hosting recommendations to sw-infrastructure
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04 | **Status**: [x] completed
**Test**: Given infrastructure skill → When user asks about hosting → Then intelligent recommendations based on SEO, enterprise, cost

**Implementation**:
- Enhanced `plugins/specweave-infrastructure/skills/deploy-router/SKILL.md`:
  - Added Enterprise Considerations section with tier triggers
  - Added Remix-specific guidance for Cloudflare vs Vercel
  - Added Backend Services section (Railway, Render, Fly.io for cron)
  - Added Hybrid Architecture recommendations
  - Added Cost Optimization Tips

## T-004: Verify plugin-dev has working tests
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [x] completed
**Test**: Given plugin-dev plugin → When tests run → Then all pass and coverage adequate

**Verification**:
- Plugin Loader Tests: 12 passing (loading, validation, metadata, error handling, visibility)
- Plugin Installer Tests: 21 passing (marketplace protection, cleanup, HTTPS URLs)
- Plugin Keywords Validation: 5 passing (keyword detection, marketplace coverage)
- **Total: 38 plugin-related tests all passing**
