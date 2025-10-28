## Test Import Workflow

**Purpose**: Import existing tests from user's project or external repository to `.specweave/tests/` for centralized regression testing.

### Overview

SpecWeave provides a **test-importer** skill/agent that:
1. **Detects** test frameworks in user's project
2. **Imports** tests to `.specweave/tests/`
3. **Organizes** by framework (Playwright, Jest, JUnit, pytest)
4. **Tracks** import source via manifest
5. **Syncs** changes when requested

### Test Repository Structure

```
.specweave/tests/                   # Centralized test repository
├── README.md                       # Import guide and organization
├── _import-manifest.yaml           # Tracks import source and sync
├── playwright/                     # E2E tests (imported from user)
│   ├── auth.spec.ts
│   ├── checkout.spec.ts
│   └── payments.spec.ts
├── jest/                           # Unit/integration tests
│   ├── utils.test.ts
│   └── api.test.ts
├── junit/                          # Java tests (if applicable)
│   └── UserServiceTest.java
└── pytest/                         # Python tests (if applicable)
    └── test_api.py
```

### Import Manifest Format

```yaml
---
# .specweave/tests/_import-manifest.yaml

import_source:
  type: "local_folder"              # or "github_repo", "gitlab_repo"
  path: "tests/"                    # or URL: "https://github.com/user/test-repo"
  imported_at: "2025-10-26T14:00:00Z"
  last_sync: "2025-10-26T14:00:00Z"

frameworks_detected:
  - name: "playwright"
      config_file: "playwright.config.ts"
      source_path: "tests/e2e"
      imported_to: ".specweave/tests/playwright/"
      test_count: 15
      last_modified: "2025-10-25T10:30:00Z"

  - name: "jest"
      config_file: "jest.config.js"
      source_path: "src/**/*.test.ts"
      imported_to: ".specweave/tests/jest/"
      test_count: 47
      last_modified: "2025-10-24T16:20:00Z"

sync_strategy: "manual"             # or "auto" (with user confirmation)
sync_interval: "on_demand"          # or "daily", "weekly"

exclude_patterns:
  - "**/*.skip.ts"
  - "**/temp/**"
  - "**/__snapshots__/**"
---
```

### Import Workflow

#### 1. Detection Phase

**test-importer** skill automatically:
```bash
# Detect test frameworks
- playwright.config.ts  → Playwright detected
- jest.config.js        → Jest detected
- pytest.ini            → Pytest detected
- pom.xml (with JUnit)  → JUnit detected
```

#### 2. User Confirmation

**Questions asked**:
1. "We detected Playwright tests in `tests/e2e/`. Import to `.specweave/tests/playwright/`?"
2. "Do you have tests in a separate repository (e.g., GitHub)?"
3. "Sync strategy: manual (ask before re-import) or auto (sync on changes)?"

#### 3. Import Execution

**test-importer** performs:
```bash
# Copy tests to centralized location
cp -r tests/e2e/* .specweave/tests/playwright/

# Generate import manifest
cat > .specweave/tests/_import-manifest.yaml << EOF
...
EOF

# Create README
cat > .specweave/tests/README.md << EOF
# Test Repository

Imported from: tests/e2e/
Last sync: 2025-10-26T14:00:00Z
...
EOF
```

#### 4. Sync Phase (Ongoing)

**When source tests change**:
1. **Manual sync**: User runs `/sync-tests` or asks Claude to "sync tests"
2. **Auto sync**: Hook detects changes, asks user to confirm re-import
3. **Manifest updated**: Tracks last sync timestamp

### Usage Examples

**Import from local folder**:
```bash
# Ask Claude
"Import my tests from tests/ folder"

# Or use slash command
/import-tests --source tests/
```

**Import from external repository**:
```bash
# Ask Claude
"Import tests from https://github.com/mycompany/test-repo"

# Or use slash command
/import-tests --source https://github.com/mycompany/test-repo
```

**Sync after changes**:
```bash
# Ask Claude
"Sync my tests" or "Re-import tests from source"

# Or use slash command
/sync-tests
```

### Test Execution

**Running imported tests**:
```bash
# Run specific framework tests
npm run test:playwright:specweave    # Runs .specweave/tests/playwright/
npm run test:jest:specweave          # Runs .specweave/tests/jest/

# Run all imported tests
npm run test:specweave:all
```

### Important Notes

1. **User's `tests/` folder is NEVER modified** - SpecWeave only READS from it
2. **`.specweave/tests/` is a COPY** - Modifications don't affect user's original tests
3. **Sync is controlled by user** - Manual sync by default, auto requires confirmation
4. **Framework-specific configs preserved** - Playwright config, Jest config, etc. are copied too

### Skills & Agents Involved

| Component | Role |
|-----------|------|
| `test-importer` skill | Detects frameworks, imports tests, manages sync |
| `test-engineer` agent | Analyzes test coverage, suggests improvements |
| `qa-lead` agent | Reviews test strategy, validates regression coverage |

---

