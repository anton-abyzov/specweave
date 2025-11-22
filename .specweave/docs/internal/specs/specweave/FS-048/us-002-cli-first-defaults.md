---
id: US-002
feature: FS-048
title: "CLI-First Defaults (Select All by Default)"
status: proposed
priority: P1
created: 2025-11-21
---

# US-002: CLI-First Defaults (Select All by Default)

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/704

**Feature**: [FS-048 - Enhanced External Tool Import](../../../_features/FS-048/FEATURE.md)

## User Story

**As a** CLI power user setting up SpecWeave
**I want** projects selected by default (deselect unwanted)
**So that** I can configure 45/50 projects with 5 keystrokes instead of 45

## Business Value

- **Efficiency**: 80% fewer keystrokes for typical use case (import most projects)
- **UX Alignment**: Matches Unix philosophy (do obvious thing, allow customization)
- **Onboarding**: Faster setup = lower barrier to adoption

## Acceptance Criteria

### AC-US2-01: "Import All" as Default Choice
- **Priority**: P1
- **Testable**: Yes (E2E test)
- **Description**: Import strategy prompt defaults to "Import all" option
- **Validation**: Pressing Enter without selection chooses "Import all"

### AC-US2-02: All Projects Checked in Checkbox Mode
- **Priority**: P1
- **Testable**: Yes (integration test)
- **Description**: When user chooses "Select specific", all projects checked by default
- **Behavior**: User deselects unwanted projects (Space on checked items)
- **Validation**: Checkbox UI shows all items `[x]` initially

### AC-US2-03: Clear Deselection Instructions
- **Priority**: P2
- **Testable**: Yes (visual validation)
- **Description**: Prompt message explains deselection workflow
- **Message**: "Select projects (all selected by default - deselect unwanted):"
- **Validation**: Message visible, users understand intent

### AC-US2-04: Easy Override for "Select None"
- **Priority**: P2
- **Testable**: Yes (E2E test)
- **Description**: Keyboard shortcut to deselect all (`<a>` toggle)
- **Behavior**: Press `<a>` → all unchecked → user selects wanted items
- **Validation**: Toggle works, instructions shown in help text

## Technical Implementation

### Files to Modify

1. **`src/cli/helpers/issue-tracker/jira.ts`**
   - Change `default` in import strategy prompt to `'all'`
   - Modify checkbox `checked` field to `true` (current: `false`)

2. **`plugins/specweave-jira/lib/project-selector.ts`**
   - Already has "Select All" option (reuse existing infrastructure)
   - Make "Select All" the default in list prompt

### Code Changes

```typescript
// src/cli/helpers/issue-tracker/jira.ts (Updated)

async function promptImportStrategy(projectCount: number): Promise<string> {
  const { importStrategy } = await inquirer.prompt({
    type: 'list',
    name: 'importStrategy',
    message: `Found ${projectCount} accessible projects. How would you like to import?`,
    choices: [
      {
        name: `✨ Import all ${projectCount} projects (recommended)`,  // ← DEFAULT!
        value: 'all',
        short: 'Import all'
      },
      {
        name: '📋 Select specific projects',
        value: 'specific',
        short: 'Select specific'
      },
      {
        name: '✏️ Enter project keys manually',
        value: 'manual',
        short: 'Manual entry'
      }
    ],
    default: 'all'  // ← CLI-first default (not 'specific')
  });

  return importStrategy;
}

async function selectSpecificProjects(credentials: JiraCredentials): Promise<string[]> {
  const allProjects = await fetchAllProjects(credentials);

  console.log('💡 All projects selected by default. Deselect unwanted with <space>, toggle all with <a>\n');

  const { selectedProjects } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedProjects',
    message: 'Select projects (all selected by default - deselect unwanted):',
    choices: allProjects.map(p => ({
      name: `${p.key} - ${p.name}`,
      value: p.key,
      checked: true  // ← ALL CHECKED BY DEFAULT (CLI philosophy)
    })),
    validate: (selected) => selected.length > 0 || 'Select at least one project'
  });

  return selectedProjects;
}
```

## Test Cases

### TC-US2-01: Default to "Import All" (E2E Test)
```typescript
test('should default to "Import all" option', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Initialize' }).click();

  // Mock 100 projects
  await mockJiraProjects(page, 100);

  // Verify "Import all" is selected by default
  const defaultOption = page.getByText('Import all 100 projects');
  await expect(defaultOption).toHaveAttribute('selected', 'true');

  // Press Enter (accept default)
  await page.keyboard.press('Enter');

  // Verify all 100 projects imported
  const summary = page.getByText('Imported 100 projects');
  await expect(summary).toBeVisible();
});
```

### TC-US2-02: All Checked in Checkbox (Integration Test)
```typescript
test('should check all projects by default in checkbox mode', async () => {
  const mockClient = createMockJiraClient(50);

  // User chooses "Select specific"
  const result = await selectSpecificProjects(mockClient.credentials);

  // Checkbox should show all 50 checked initially
  const checkboxState = getCheckboxState();  // Mock Inquirer state
  expect(checkboxState.every(item => item.checked)).toBe(true);
});
```

### TC-US2-03: Deselection Workflow (E2E Test)
```typescript
test('should allow easy deselection of unwanted projects', async ({ page }) => {
  await page.goto('/');
  await initializeJira(page);

  // Choose "Select specific"
  await page.getByText('Select specific projects').click();
  await page.keyboard.press('Enter');

  // Verify all checked
  const checkedCount = await page.locator('input[type="checkbox"]:checked').count();
  expect(checkedCount).toBe(50);  // All 50 checked

  // Deselect 5 projects (Space×5)
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
  }

  // Verify 45 remaining checked
  const remainingChecked = await page.locator('input[type="checkbox"]:checked').count();
  expect(remainingChecked).toBe(45);
});
```

## Dependencies

- **US-001**: Smart Pagination (import strategy prompt)
- **Existing**: `plugins/specweave-jira/lib/project-selector.ts` (checkbox UI)

## Risks & Mitigations

### Risk: Accidental "Import All" (User Didn't Read Prompt)
- **Problem**: User presses Enter without reading, imports 500 projects
- **Mitigation**:
  - Confirmation prompt if > 100 projects: "Import all 500 projects? (y/N)"
  - Safe default: "Import all" only if < 100 projects, else "Select specific"
  - User can always cancel (Ctrl+C) and restart

---

**Implementation Tasks**: See increment plan
**Related User Stories**: US-001 (Smart Pagination), US-008 (Smart Filtering)
