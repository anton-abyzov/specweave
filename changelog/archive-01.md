## [1.0.439] - 2026-03-13

### Changes
- chore: update vendor build artifacts for pr-based metadata types
- add pr-based push strategy with sw:pr skill and branch automation

---



## [1.0.438] - 2026-03-12

### Changes
- feat(e2e): add e2e skill; update team-build, team-lead agents

---



## [1.0.437] - 2026-03-12

### Changes
- docs: update README and description

---



## [1.0.436] - 2026-03-12

### Changes
- chore: add e2e sync-verify tests
- chore: bump version to 1.0.435
- feat: add specweave sync-setup CLI command + detect misplaced repos on init

---



## [1.0.435] - 2026-03-12

### Changes
- feat: add specweave sync-setup CLI command + detect misplaced repos on init

---



## [1.0.434] - 2026-03-12

### Changes
- fix ADO/JIRA sync: process-aware states, parent linking, metadata fallback

---



## [1.0.433] - 2026-03-12

### Changes
- Patch release

---



## [1.0.432] - 2026-03-12

### Changes
- Patch release

---



## [1.0.431] - 2026-03-12

### Changes
- Patch release

---



## [1.0.430] - 2026-03-12

### Changes
- update clone command docs

---



## [1.0.429] - 2026-03-12

### Changes
- update clone skill definition

---



## [1.0.428] - 2026-03-12

### Changes
- fix test formatting
- update github repo cloning tests
- update github repo cloning
- update github repo cloning and url generator

---



## [1.0.427] - 2026-03-12

### Changes
- feat(sync): add sync resilience audit logging and dashboard integration
- fix: resolve CircuitBreakerState type in sync-status command

---



## [1.0.426] - 2026-03-12

### Changes
- feat(sync): add external sync resilience layer with circuit breakers and retry queue

---



## [1.0.425] - 2026-03-12

### Changes
- fix: update docs, living-docs sync, and image generator
- refactor init path resolution and extract buildUmbrellaConfig helper
- untrack backup images, originals, and plugin runtime state
- chore: bump version to 1.0.424
- update save command plugin
- chore: bump version to 1.0.418
- 1.0.417
- multi-mode team-lead: support review, brainstorm, analysis without increment

---



## [1.0.424] - 2026-03-11

### Changes
- update save command plugin

---



## [1.0.423] - 2026-03-11

### Changes
- Patch release

---



## [1.0.422] - 2026-03-11

### Changes
- Patch release

---



## [1.0.421] - 2026-03-11

### Added
- **sw:debug skill** — Systematic 4-phase debugging (root cause investigation → pattern analysis → hypothesis testing → implementation) with 3-attempt escalation protocol and anti-rationalization table
- **Per-task review gates in sw:do** — Opt-in (`quality.perTaskReview: true`) spec-compliance and code-quality sub-reviews after each task, catching drift before closure
- **Adversarial spec reviewer in sw:grill** — New Phase 0 runs AC-by-AC verification with adversarial framing before code quality review; adds `acCompliance` section to grill-report.json
- **Fresh verification discipline in sw:do** — Iron Law: "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE" — tasks cannot be marked complete without running their test command
- **Anti-rationalization tables** — Explicit excuse/rebuttal tables added to sw:tdd-cycle (8 entries) and sw:grill (6 entries) to counter common discipline-breaking rationalizations

---

## [1.0.420] - 2026-03-11

### Changes
- Patch release

---



## [1.0.419] - 2026-03-11

### Changes
- Patch release

---



## [1.0.418] - 2026-03-11

### Changes
- Patch release

---



## [1.0.417] - 2026-03-11

### Changes
- fix(team-lead): update SKILL.md
- fix: ADO org dropped from config, sync_living_docs contradiction, non-empty dir warning
- simplify init: reduce from 1242 to ~350 lines, remove external tool setup
- Revert "simplify init: reduce from 1242 to ~350 lines, remove external tool setup"
- simplify init: reduce from 1242 to ~350 lines, remove external tool setup
- skip already-cloned repos in clone job launcher
- docs: add npm E401 troubleshooting to docs site
- chore: bump version to 1.0.416
- fix: always bypass npm auth for self-update, add E401 troubleshooting docs
- fix: universal npm E401 auth bypass for specweave update

---



## [1.0.416] - 2026-03-10

### Changes
- fix: always bypass npm auth for self-update, add E401 troubleshooting docs
- fix: universal npm E401 auth bypass for specweave update

---



## [1.0.415] - 2026-03-10

### Changes
- Patch release

---



## [1.0.414] - 2026-03-10

### Changes
- fix: update CLI and installation health checker

---



## [1.0.413] - 2026-03-10

### Changes
- fix: populate externalLinks in auto-creator for JIRA/ADO metadata
- fix: backfill JIRA/ADO external links to increment metadata.json
- fix JIRA JQL syntax for /search/jql, ADF in updateStory
- chore: update jira plugin build artifact
- fix JIRA issue type fallback and story search query
- chore: bump version to 1.0.409

---



## [1.0.412] - 2026-03-10

### Changes
- fix: backfill JIRA/ADO external links to increment metadata.json
- fix JIRA JQL syntax for /search/jql, ADF in updateStory
- chore: update jira plugin build artifact
- fix JIRA issue type fallback and story search query
- chore: bump version to 1.0.409

---



## [1.0.411] - 2026-03-10

### Changes
- fix JIRA JQL syntax for /search/jql, ADF in updateStory
- chore: update jira plugin build artifact
- fix JIRA issue type fallback and story search query
- chore: bump version to 1.0.409

---



## [1.0.410] - 2026-03-10

### Changes
- chore: update jira plugin build artifact
- fix JIRA issue type fallback and story search query
- chore: bump version to 1.0.409

---



## [1.0.409] - 2026-03-10

### Changes
- Patch release

---



## [1.0.408] - 2026-03-10

### Changes
- fix: update eval llm module and tests
- fix: update init/update commands, jira sync, doctor checker
- fix JIRA POST /search/jql endpoint, ADO Content-Type and dynamic work item type

---



## [1.0.407] - 2026-03-10

### Changes
- Patch release

---



## [1.0.406] - 2026-03-10

### Changes
- Patch release

---



## [1.0.405] - 2026-03-10

### Changes
- deferred sync on activation, user story file loader, subagent strategy docs
- fix code indentation in Scene4 quality gates video
- replace fake auth code in video slide with real NextAuth v5 code

---



## [1.0.404] - 2026-03-10

### Changes
- docs: update skills docs and site content
- re-render video with bigger phone/fonts, trim integrations to 3
- fix homepage: static hero, inline SVG icons, revert demo video
- add Playwright e2e tests for hero section rendering
- fix invisible feature card text below Skill Studio section
- fix animation SSR hydration: prevent content stuck at opacity:0 on uncached machines
- remove buggy mega menu nav, revert to standard docusaurus navigation
- fix brand icons missing on uncached machines

---



## [1.0.403] - 2026-03-10

### Changes
- fix living-docs sync: preserve external tool links on FEATURE.md regeneration

---



## [1.0.402] - 2026-03-10

### Changes
- Patch release

---



## [1.0.401] - 2026-03-10

### Changes
- update docs-site sections and template-creator
- fix sync-specs: wire post-increment sync to external tools
- add Skill Studio teaser section to landing page
- chore: bump version to 1.0.400
- fix umbrella JIRA sync: inherit projectKey for child repos
- fix mega-menu: viewport-clamped fixed positioning, hover stability
- update StatsSection test to match new real stat labels
- fix homepage mega menu hover, stats numbers, section contrast
- chore: bump version to 1.0.399
- fix(ci): update tests to match current update command implementation (#1516)
- fix hero ghost button visibility and redesign capabilities to card grid
- fix mega menu hover: mutual exclusion, solid backdrop, dynamic columns
- fix /sw:save nested repo scan to handle org/repo directory depth
- chore: bump version to 1.0.398
- chore(deps)(deps-dev): bump memfs in the development-dependencies group (#1520)

---



## [1.0.400] - 2026-03-10

### Changes
- fix umbrella JIRA sync: inherit projectKey for child repos
- fix mega-menu: viewport-clamped fixed positioning, hover stability
- update StatsSection test to match new real stat labels
- fix homepage mega menu hover, stats numbers, section contrast
- chore: bump version to 1.0.399
- fix(ci): update tests to match current update command implementation (#1516)
- fix hero ghost button visibility and redesign capabilities to card grid
- fix mega menu hover: mutual exclusion, solid backdrop, dynamic columns
- fix /sw:save nested repo scan to handle org/repo directory depth
- chore: bump version to 1.0.398
- chore(deps)(deps-dev): bump memfs in the development-dependencies group (#1520)
- chore(deps)(deps): bump fs-extra in the production-dependencies group (#1519)
- chore(deps)(deps-dev): bump @types/node in the typescript-tooling group (#1518)

---



## [1.0.399] - 2026-03-09

### Changes
- fix hero ghost button visibility and redesign capabilities to card grid
- fix mega menu hover: mutual exclusion, solid backdrop, dynamic columns
- fix /sw:save nested repo scan to handle org/repo directory depth
- chore: bump version to 1.0.398
- chore(deps)(deps-dev): bump memfs in the development-dependencies group (#1520)
- chore(deps)(deps): bump fs-extra in the production-dependencies group (#1519)
- chore(deps)(deps-dev): bump @types/node in the typescript-tooling group (#1518)

---



## [1.0.398] - 2026-03-09

### Changes
- Patch release

---



## [1.0.397] - 2026-03-09

### Changes
- consent-first plugin installation: suggestOnly defaults to true

---



## [1.0.396] - 2026-03-08

### Changes
- sync specweave changes

---



## [1.0.395] - 2026-03-07

### Changes
- Patch release

---



## [1.0.394] - 2026-03-07

### Changes
- Patch release

---



## [1.0.393] - 2026-03-07

### Changes
- update docs and skill value content
- add brainstorm skill tests (81 tests) and condense SKILL.md to 559 lines

---



## [1.0.392] - 2026-03-07

### Changes
- Patch release

---



## [1.0.391] - 2026-03-07

### Changes
- docs: update overview and workflow documentation
- fix 27 test failures: mock gaps, regex bug, assertion mismatches
- chore: bump version to 1.0.390
- add evals for github-sync skill: 4 test cases with assertions
- add skill evals section to discovery and evaluation guide

---



## [1.0.390] - 2026-03-06

### Changes
- add skill evals section to discovery and evaluation guide

---



## [1.0.389] - 2026-03-05

### Changes
- fix external import titles: preserve original, no [FS-XXX] prefix; fix ADO browser URLs
- fix ADO state transition: try Done before Closed for Basic process
- fix JIRA/ADO AC progress sync: load .env credentials, init JIRA client
- fix hero height, mega-menu z-index, render and wire new Remotion video
- fix grill findings: poster path, hooks order, dead assets, social links, clipboard
- add 10 landing page sections, replace monolithic index.tsx
- add rendered hero videos at 1920x1080 (MP4 + WebM)
- add mega-menu navbar, custom footer, and remotion 1080p theme
- add component library: Button, Badge, Icon, CodeBlock, Divider, Section, SectionHeader, FeatureCard, StatCard, ContentCard, IntegrationCard, PricingCard
- add design system foundation: 356 tokens, animations, hooks, components
- add test infrastructure: vitest, playwright, lucide-react

---



## [1.0.388] - 2026-03-05

### Changes
- fix ADO state transition: try Done before Closed for Basic process
- fix JIRA/ADO AC progress sync: load .env credentials, init JIRA client
- fix hero height, mega-menu z-index, render and wire new Remotion video
- fix grill findings: poster path, hooks order, dead assets, social links, clipboard
- add 10 landing page sections, replace monolithic index.tsx
- add rendered hero videos at 1920x1080 (MP4 + WebM)
- add mega-menu navbar, custom footer, and remotion 1080p theme
- add component library: Button, Badge, Icon, CodeBlock, Divider, Section, SectionHeader, FeatureCard, StatCard, ContentCard, IntegrationCard, PricingCard
- add design system foundation: 356 tokens, animations, hooks, components
- add test infrastructure: vitest, playwright, lucide-react

---



## [1.0.387] - 2026-03-05

### Changes
- fix ADO state transition: try Done before Closed for Basic process
- fix JIRA/ADO AC progress sync: load .env credentials, init JIRA client
- fix hero height, mega-menu z-index, render and wire new Remotion video
- fix grill findings: poster path, hooks order, dead assets, social links, clipboard
- add 10 landing page sections, replace monolithic index.tsx
- add rendered hero videos at 1920x1080 (MP4 + WebM)
- add mega-menu navbar, custom footer, and remotion 1080p theme
- add component library: Button, Badge, Icon, CodeBlock, Divider, Section, SectionHeader, FeatureCard, StatCard, ContentCard, IntegrationCard, PricingCard
- add design system foundation: 356 tokens, animations, hooks, components
- add test infrastructure: vitest, playwright, lucide-react

---



## [1.0.386] - 2026-03-05

### Changes
- fix JIRA/ADO AC progress sync: load .env credentials, init JIRA client
- fix hero height, mega-menu z-index, render and wire new Remotion video
- fix grill findings: poster path, hooks order, dead assets, social links, clipboard
- add 10 landing page sections, replace monolithic index.tsx
- add rendered hero videos at 1920x1080 (MP4 + WebM)
- add mega-menu navbar, custom footer, and remotion 1080p theme
- add component library: Button, Badge, Icon, CodeBlock, Divider, Section, SectionHeader, FeatureCard, StatCard, ContentCard, IntegrationCard, PricingCard
- add design system foundation: 356 tokens, animations, hooks, components
- add test infrastructure: vitest, playwright, lucide-react

---



## [1.0.385] - 2026-03-05

### Changes
- fix hero height, mega-menu z-index, render and wire new Remotion video
- fix grill findings: poster path, hooks order, dead assets, social links, clipboard
- add 10 landing page sections, replace monolithic index.tsx
- add rendered hero videos at 1920x1080 (MP4 + WebM)
- add mega-menu navbar, custom footer, and remotion 1080p theme
- add component library: Button, Badge, Icon, CodeBlock, Divider, Section, SectionHeader, FeatureCard, StatCard, ContentCard, IntegrationCard, PricingCard
- add design system foundation: 356 tokens, animations, hooks, components
- add test infrastructure: vitest, playwright, lucide-react

---



## [1.0.384] - 2026-03-05

### Changes
- Patch release

---



## [1.0.383] - 2026-03-05

### Changes
- fix: ADO spec-sync and living-docs generator updates
- fix: add -R repo flag to all gh issue commands for cross-repo targeting
- fix: compound AC-ID parsing in issue body generator and completion calculator (v1.0.378)
- fix: cross-project AC checkbox sync with per-repo clients and external field mapping (v1.0.377)
- fix: cross-project US loading in AC checkbox sync (v1.0.376)
- fix: compound US-ID parsing in github-us-auto-closer (v1.0.375)
- fix: compound US-ID AC sync, ADO status transition, template false positive, spec folder path (v1.0.374)
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode

---



## [1.0.382] - 2026-03-05

### Changes
- fix: add -R repo flag to all gh issue commands for cross-repo targeting
- fix: compound AC-ID parsing in issue body generator and completion calculator (v1.0.378)
- fix: cross-project AC checkbox sync with per-repo clients and external field mapping (v1.0.377)
- fix: cross-project US loading in AC checkbox sync (v1.0.376)
- fix: compound US-ID parsing in github-us-auto-closer (v1.0.375)
- fix: compound US-ID AC sync, ADO status transition, template false positive, spec folder path (v1.0.374)
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup

---



## [1.0.381] - 2026-03-05

### Changes
- fix: add -R repo flag to all gh issue commands for cross-repo targeting
- fix: compound AC-ID parsing in issue body generator and completion calculator (v1.0.378)
- fix: cross-project AC checkbox sync with per-repo clients and external field mapping (v1.0.377)
- fix: cross-project US loading in AC checkbox sync (v1.0.376)
- fix: compound US-ID parsing in github-us-auto-closer (v1.0.375)
- fix: compound US-ID AC sync, ADO status transition, template false positive, spec folder path (v1.0.374)
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup

---



## [1.0.380] - 2026-03-05

### Changes
- fix: compound AC-ID parsing in issue body generator and completion calculator (v1.0.378)
- fix: cross-project AC checkbox sync with per-repo clients and external field mapping (v1.0.377)
- fix: cross-project US loading in AC checkbox sync (v1.0.376)
- fix: compound US-ID parsing in github-us-auto-closer (v1.0.375)
- fix: compound US-ID AC sync, ADO status transition, template false positive, spec folder path (v1.0.374)
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync

---



## [1.0.379] - 2026-03-05

### Changes
- fix: compound AC-ID parsing in issue body generator and completion calculator (v1.0.378)
- fix: cross-project AC checkbox sync with per-repo clients and external field mapping (v1.0.377)
- fix: cross-project US loading in AC checkbox sync (v1.0.376)
- fix: compound US-ID parsing in github-us-auto-closer (v1.0.375)
- fix: compound US-ID AC sync, ADO status transition, template false positive, spec folder path (v1.0.374)
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync

---



## [1.0.378] - 2026-03-05

### Changes
- fix: cross-project AC checkbox sync with per-repo clients and external field mapping (v1.0.377)
- fix: cross-project US loading in AC checkbox sync (v1.0.376)
- fix: compound US-ID parsing in github-us-auto-closer (v1.0.375)
- fix: compound US-ID AC sync, ADO status transition, template false positive, spec folder path (v1.0.374)
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.377] - 2026-03-05

### Changes
- fix: cross-project US loading in AC checkbox sync (v1.0.376)
- fix: compound US-ID parsing in github-us-auto-closer (v1.0.375)
- fix: compound US-ID AC sync, ADO status transition, template false positive, spec folder path (v1.0.374)
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.376] - 2026-03-05

### Changes
- fix: compound US-ID parsing in github-us-auto-closer (v1.0.375)
- fix: compound US-ID AC sync, ADO status transition, template false positive, spec folder path (v1.0.374)
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.375] - 2026-03-05

### Changes
- fix: compound US-ID AC sync, ADO status transition, template false positive, spec folder path (v1.0.374)
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.374] - 2026-03-05

### Changes
- fix compound US-ID regex across sync pipeline
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.373] - 2026-03-05

### Changes
- fix cross-repo GitHub issue closure in reconciler
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.372] - 2026-03-05

### Changes
- fix: ADO work item type fallback for Basic process template
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.371] - 2026-03-05

### Changes
- fix: wire JIRA/ADO distributed sync routing for umbrella mode
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.370] - 2026-03-05

### Changes
- fix: exclude feature/story IDs from template placeholder detection
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.369] - 2026-03-05

### Changes
- v1.0.368: cross-project sync routing, prefixed US IDs, ADO support
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.368] - 2026-03-05

### Changes
- fix: support prefixed US IDs and paginate milestone detection
- fix: scope GitHubFeatureSync to target project in cross-project mode
- fix: include owner/repo in sync lock key for cross-project dedup
- fix: pass projectName to syncToExternalTools in cross-project sync
- add ADO organization to sync routing and E2E umbrella tests

---



## [1.0.367] - 2026-03-04

### Changes
- send source=session metadata in plugin load tracking, add session dedup
- fix skill template example to match actual frontmatter
- update skills-vs-agents docs and add subagent architecture tests
- add extensibility overview, fix planner model and PM context docs
- make PM/increment skills umbrella-aware for cross-cutting specs
- add sw:brainstorm skill with cognitive lenses, public docs, and v2 improvements
- v1.0.366
- add umbrella sync routing docs page
- remove syncStrategy, umbrella.enabled controls routing via Project field
- fix: track installs on vskill.lock fast-path
- release: specweave 1.0.365
- fix: check umbrella.enabled in sync routing, fix JIRA per-project routing
- release: specweave 1.0.364
- fix: test fixes and umbrella migration genericity

---



## [1.0.366] - 2026-03-04

### Changes
- add umbrella sync routing docs page
- remove syncStrategy, umbrella.enabled controls routing via Project field
- fix: track installs on vskill.lock fast-path
- release: specweave 1.0.365
- fix: check umbrella.enabled in sync routing, fix JIRA per-project routing
- release: specweave 1.0.364
- fix: test fixes and umbrella migration genericity

---



## [1.0.365] - 2026-03-04

### Changes
- fix: check umbrella.enabled in sync routing, fix JIRA per-project routing
- release: specweave 1.0.364
- fix: test fixes and umbrella migration genericity

---



## [1.0.364] - 2026-03-04

### Changes
- fix: test fixes and umbrella migration genericity

---



## [1.0.363] - 2026-03-03

### Changes
- fix: route umbrella project sync to umbrella repo via umbrella.sync config

---



## [1.0.362] - 2026-03-03

### Changes
- fix: resolve incrementId from path in sync-progress for short-form IDs

---



## [1.0.361] - 2026-03-03

### Changes
- fix: resolve incrementId early in syncIncrement for short-form IDs

---



## [1.0.360] - 2026-03-03

### Changes
- fix: resolve increment dir names in auto-creator and living-docs-sync

---



## [1.0.359] - 2026-03-03

### Changes
- feat: umbrella project awareness for living docs and project validation

---



## [1.0.358] - 2026-03-03

### Changes
- fix: standardize JIRA/ADO title format to match GitHub [FS-XXX][US-YYY]

---



## [1.0.357] - 2026-03-03

### Changes
- fix: convert JIRA descriptions to proper ADF with bold, lists, rules
- fix: grill findings for distributed sync implementation
- fix: umbrella project validation and label auto-creation for distributed sync
- add Cloudflare Web Analytics beacon to docs-site
- fix: distributed sync routing, consolidation CLI, and platform suffix regex
- fix: multi-repo root resolution and JIRA/ADO bidirectional sync

---



## [1.0.356] - 2026-03-03

### Changes
- remove claude-plugin-cli, simplify plugin copier and health checker
- chore(ci): bump upload-artifact to v7 and download-artifact to v8
- chore: update DORA metrics - Mar 02, 2026 [skip ci] (#1464)
- fix(ci): deduplicate DORA metrics PRs
- fix test mocks for patchIssueBodyCheckboxes and ensureLabelExists

---



## [1.0.355] - 2026-03-03

### Changes
- update team-lead agents and instruction templates

---



## [1.0.354] - 2026-03-03

### Changes
- update plugins and lifecycle hook dispatcher
- fix duplicate comments: skip progress post when auto-closer handles 100% completion
- skip progress comment when all ACs complete (dedup with auto-closer)

---



## [1.0.353] - 2026-03-02

### Changes
- update plugin hooks, skill-chain guard, and increment skill
- fix AC sync: patch issue body checkboxes directly, fix AC regex
- fix AC sync: support plain AC format and search closed issues

---



## [1.0.352] - 2026-03-02

### Changes
- sync pipeline reliability fixes and jira plugin improvements
- remove non-existent sw:security-patterns skill reference from security agent
- add Skills-First Architecture docs page to Core Concepts
- make sync failures visible in /sw:done output (T-010, T-011)
- dual-write externalLinks.github in backfillIncrementMetadata

---



## [1.0.351] - 2026-03-02

### Changes
- docs-site rework, team-lead agents, sync fixes, init improvements
- fix commentOnlySync error reporting and fullSync TODO stub removal
- fix sync integration: 17 critical bugs across all providers
- chore(deps)(deps): bump axios in the production-dependencies group (#1462)
- chore(deps)(deps-dev): bump @types/node in the typescript-tooling group (#1461)

---



## [1.0.350] - 2026-03-02

### Changes
- update sync skills and github feature sync
- fix e2e tests for CI: skip init-dependent tests, make skill-matching vskill-aware
- update package-lock.json
- fix unit tests for plugin scope changes

---



## [1.0.349] - 2026-03-02

### Changes
- fix flaky timing test, update templates with simplify/batch docs
- v1.0.348
- fix import guard, pricing constants, test stability improvements
- v1.0.347
- fix grill findings: YAML injection, || vs ??, rename overwrite, regex
- fix testMode default: test-after → TDD everywhere (v1.0.346)
- fix living docs sync: template guard, slug cleanup, safe rename (v1.0.345)
- 1.0.344: fix reconciler archive scanning, init guard rails, skill updates
- fix stale comment referencing --plugin-dir in install_plugin_via_vskill
- unify plugin install via --repo, remove local marketplace dependency

---



## [1.0.348] - 2026-03-02

### Changes
- fix import guard, pricing constants, test stability improvements
- v1.0.347
- fix grill findings: YAML injection, || vs ??, rename overwrite, regex
- fix testMode default: test-after → TDD everywhere (v1.0.346)
- fix living docs sync: template guard, slug cleanup, safe rename (v1.0.345)
- 1.0.344: fix reconciler archive scanning, init guard rails, skill updates
- fix stale comment referencing --plugin-dir in install_plugin_via_vskill
- unify plugin install via --repo, remove local marketplace dependency

---



## [1.0.347] - 2026-03-02

### Changes
- fix grill findings: YAML injection, || vs ??, rename overwrite, regex
- fix testMode default: test-after → TDD everywhere (v1.0.346)
- fix living docs sync: template guard, slug cleanup, safe rename (v1.0.345)
- 1.0.344: fix reconciler archive scanning, init guard rails, skill updates
- fix stale comment referencing --plugin-dir in install_plugin_via_vskill
- unify plugin install via --repo, remove local marketplace dependency

---



## [1.0.346] - 2026-03-02

### Changes
- fix living docs sync: template guard, slug cleanup, safe rename (v1.0.345)
- 1.0.344: fix reconciler archive scanning, init guard rails, skill updates
- fix stale comment referencing --plugin-dir in install_plugin_via_vskill
- unify plugin install via --repo, remove local marketplace dependency

---



## [1.0.345] - 2026-03-02

### Changes
- 1.0.344: fix reconciler archive scanning, init guard rails, skill updates
- fix stale comment referencing --plugin-dir in install_plugin_via_vskill
- unify plugin install via --repo, remove local marketplace dependency

---



## [1.0.344] - 2026-03-02

### Changes
- fix stale comment referencing --plugin-dir in install_plugin_via_vskill
- unify plugin install via --repo, remove local marketplace dependency

---



## [1.0.343] - 2026-03-01

### Changes
- update docs, LLM providers, model selection, and plugin hooks
- 1.0.342: init multi-repo resolve, team-lead improvements, increment hooks

---



## [1.0.342] - 2026-02-28

### Changes
- Patch release

---



## [1.0.341] - 2026-02-28

### Changes
- bump version to 1.0.340
- fix github issue auto-closure on increment completion
- fix: skip vskill trigger tests when sibling repo absent in CI
- chore(deps)(deps-dev): bump @types/node in the typescript-tooling group (#1170)
- chore(deps)(deps-dev): bump the development-dependencies group across 1 directory with 5 updates (#1406)
- chore(deps)(deps): bump the production-dependencies group across 1 directory with 3 updates (#1300)
- fix: resolve 75 unit test failures on develop branch
- v1.0.339
- quality gates, github batch sync, skill judge report, parsers
- sync specweave changes

---



## [1.0.340] - 2026-02-27

### Changes
- fix github issue auto-closure on increment completion
- fix: skip vskill trigger tests when sibling repo absent in CI
- chore(deps)(deps-dev): bump @types/node in the typescript-tooling group (#1170)
- chore(deps)(deps-dev): bump the development-dependencies group across 1 directory with 5 updates (#1406)
- chore(deps)(deps): bump the production-dependencies group across 1 directory with 3 updates (#1300)
- fix: resolve 75 unit test failures on develop branch
- v1.0.339
- quality gates, github batch sync, skill judge report, parsers
- sync specweave changes

---



## [1.0.339] - 2026-02-27

### Changes
- quality gates, github batch sync, skill judge report, parsers
- sync specweave changes

---



