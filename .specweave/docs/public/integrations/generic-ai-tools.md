# SpecWeave Integration Guide for Non-Claude AI Tools

SpecWeave is designed to be AI-tool agnostic. While it has first-class support for Claude Code with plugins and hooks, the core framework works with **any AI coding assistant**.

## Core Principle

SpecWeave uses **file-based tracking**:
- `spec.md` - Requirements and acceptance criteria
- `tasks.md` - Work items with checkboxes
- `metadata.json` - Status and timestamps

Any AI that can read and write files can use SpecWeave.

---

## Quick Start for Any AI Tool

### 1. Install SpecWeave CLI

```bash
npm install -g specweave
```

### 2. Initialize Your Project

```bash
cd your-project
specweave init .
```

### 3. Install Skills/Plugins (Optional)

```bash
# Bash (macOS, Linux, Windows Git Bash/WSL)
bash ~/.specweave/scripts/install-plugins.sh --target generic

# PowerShell (Windows native)
~\.specweave\scripts\install-plugins.ps1 -Target generic
```

### 4. Include Context in Your AI

Provide your AI tool with:
1. `CLAUDE.md` - The workflow rules
2. Current `spec.md` - Requirements
3. Current `tasks.md` - Work items

---

## Tool-Specific Setup

### Cursor IDE

**Option 1: Project Rules**
Add to `.cursorrules`:
```
# SpecWeave Workflow Rules

Read CLAUDE.md for complete framework documentation.

Key behaviors:
1. Check .specweave/increments/ for current work
2. Update tasks.md [ ] → [x] when completing tasks
3. Update spec.md [ ] AC- → [x] AC- for acceptance criteria
4. Run tests after each task
5. Keep files in .specweave/increments/####/reports/ not project root
```

**Option 2: Context Files**
Use `@file CLAUDE.md` and `@file .specweave/increments/*/tasks.md` in prompts.

---

### Windsurf

Add to cascade settings:
```yaml
rules:
  - name: specweave
    content: |
      Follow SpecWeave workflow:
      - Source of truth: spec.md + tasks.md
      - Update checkboxes when completing work
      - Run tests after each task
      - Files go in .specweave/increments/####/ folders
```

Reference files with `/file` command.

---

### Aider

Add to `.aider.conf.yml`:
```yaml
# SpecWeave context
read:
  - CLAUDE.md
  - .specweave/increments/*/spec.md
  - .specweave/increments/*/tasks.md
  - .specweave/memory/*.md

# Auto-commit settings (compatible with SpecWeave)
auto-commits: true
commit-prompt: |
  Write a concise commit message for the changes.
  Do NOT include AI/Claude references.
```

---

### Continue.dev (VS Code)

Add to `.continue/config.json`:
```json
{
  "contextProviders": [
    {
      "name": "file",
      "params": { "path": "CLAUDE.md" }
    },
    {
      "name": "folder",
      "params": { "path": ".specweave/increments" }
    }
  ],
  "customCommands": [
    {
      "name": "specweave-status",
      "prompt": "Read tasks.md and show completion status"
    },
    {
      "name": "specweave-next",
      "prompt": "Find the next pending task in tasks.md and work on it"
    }
  ]
}
```

---

### GitHub Copilot

Add to `.github/copilot-instructions.md`:
```markdown
# SpecWeave Integration

This project uses SpecWeave for spec-driven development.

## Key Files
- `CLAUDE.md` - Framework rules (read this first)
- `.specweave/increments/####-name/spec.md` - Requirements
- `.specweave/increments/####-name/tasks.md` - Work items

## Workflow
1. Check tasks.md for pending [ ] tasks
2. Implement the task
3. Update task status: [ ] → [x]
4. Update acceptance criteria in spec.md
5. Run tests before marking complete

## File Organization
- Reports → `.specweave/increments/####/reports/`
- Logs → `.specweave/increments/####/logs/`
- NEVER create files in project root
```

---

### Codeium

Add to project configuration:
```json
{
  "codeium.contextFiles": [
    "CLAUDE.md",
    ".specweave/increments/*/tasks.md"
  ]
}
```

---

### OpenAI API / GPT-4

Include in system prompt:
```
You are working on a project using SpecWeave spec-driven development.

RULES:
1. Read tasks.md for current work items
2. When completing a task, update its status from [ ] to [x]
3. Update corresponding ACs in spec.md
4. Run tests after each task
5. Never create files in project root - use .specweave/increments/####/ folders

TASK FORMAT:
### T-001: Task Title
**Status**: [ ] pending
**Acceptance**: Given X, When Y, Then Z

Mark complete by changing: [ ] pending → [x] completed
```

---

### Claude API (Direct)

If using Claude API directly (not Claude Code):

```python
import anthropic

client = anthropic.Anthropic()

# Load context files
with open("CLAUDE.md") as f:
    rules = f.read()
with open(".specweave/increments/0001-feature/tasks.md") as f:
    tasks = f.read()

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system=f"""You are working with SpecWeave framework.

RULES:
{rules}

CURRENT TASKS:
{tasks}

When you complete a task, output the updated tasks.md content with [x] for completed items.
""",
    messages=[{"role": "user", "content": "Work on the next pending task"}]
)
```

---

## Autonomous Mode (Stop Hook Feedback Loop) for Any AI

The stop hook feedback loop pattern enables autonomous task completion:

### Python Implementation

```python
import os
import re
import subprocess
from pathlib import Path

def get_pending_tasks(tasks_file: str) -> list:
    """Extract pending tasks from tasks.md"""
    content = Path(tasks_file).read_text()
    pattern = r'### (T-\d+):.*?\n\*\*Status\*\*: \[ \] pending'
    return re.findall(pattern, content, re.DOTALL)

def mark_task_complete(tasks_file: str, task_id: str):
    """Update task status to completed"""
    content = Path(tasks_file).read_text()
    # Replace [ ] pending with [x] completed for this task
    pattern = rf'(### {task_id}:.*?\n\*\*Status\*\*: )\[ \] pending'
    updated = re.sub(pattern, r'\1[x] completed', content, flags=re.DOTALL)
    Path(tasks_file).write_text(updated)

def run_tests() -> bool:
    """Run project tests"""
    result = subprocess.run(['npm', 'test'], capture_output=True)
    return result.returncode == 0

def ai_complete_task(task_content: str) -> str:
    """Have AI work on the task (implement with your AI API)"""
    # Call your AI API here
    pass

def autonomous_loop(tasks_file: str, max_iterations: int = 100):
    """Main autonomous execution loop"""
    for i in range(max_iterations):
        pending = get_pending_tasks(tasks_file)
        if not pending:
            print("All tasks complete!")
            return True

        task_id = pending[0]
        print(f"Working on {task_id}...")

        # AI works on task
        ai_complete_task(task_id)

        # Run tests
        if not run_tests():
            print("Tests failed, fixing...")
            ai_complete_task("Fix failing tests")
            if not run_tests():
                print("Still failing after fix attempt")
                continue

        # Mark complete
        mark_task_complete(tasks_file, task_id)
        print(f"Completed {task_id}")

    return False

# Run it
autonomous_loop(".specweave/increments/0001-feature/tasks.md")
```

### Shell Script Implementation

```bash
#!/bin/bash
# auto-loop.sh - Autonomous task completion

TASKS_FILE=".specweave/increments/0001-feature/tasks.md"
MAX_ITER=100
ITER=0

while [ $ITER -lt $MAX_ITER ]; do
    # Check for pending tasks
    PENDING=$(grep -c '\[ \] pending' "$TASKS_FILE")
    if [ "$PENDING" -eq 0 ]; then
        echo "All tasks complete!"
        exit 0
    fi

    # Get first pending task
    TASK=$(grep -m1 '\[ \] pending' "$TASKS_FILE" | head -1)
    echo "Working on: $TASK"

    # Call your AI tool here
    # aider --message "Complete this task: $TASK"

    # Run tests
    npm test
    if [ $? -ne 0 ]; then
        echo "Tests failed, retrying..."
        continue
    fi

    ((ITER++))
done

echo "Max iterations reached"
exit 1
```

---

## Replicating SpecWeave Commands

| Command | Description | Manual Equivalent |
|---------|-------------|-------------------|
| `/sw:increment "X"` | Plan new feature | Create spec.md and tasks.md files manually |
| `/sw:do` | Work on tasks | Read tasks.md, implement, update checkboxes |
| `/sw:progress` | Check status | `grep -c '\[x\]' tasks.md` vs total tasks |
| `/sw:done` | Close increment | Verify all [x], update metadata.json status |
| `/sw:validate` | Quality check | Run tests, check coverage, lint |
| `/sw:reflect` | Extract learnings | Save patterns to .specweave/memory/*.md |

---

## File Templates

### spec.md Template
```markdown
---
increment: 0001-feature-name
title: "Feature Title"
---

# Feature: Feature Title

## Overview
Brief description of the feature.

## User Stories

### US-001: User Story Title
**As a** user
**I want** to do something
**So that** I can achieve a goal

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Given X, When Y, Then Z
- [ ] **AC-US1-02**: Given A, When B, Then C
```

### tasks.md Template
```markdown
---
increment: 0001-feature-name
---

# Tasks: Feature Title

### T-001: First Task
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

Description of what needs to be done.

**Acceptance**:
- [ ] Criteria 1
- [ ] Criteria 2

---

### T-002: Second Task
**User Story**: US-001
**Satisfies ACs**: AC-US1-02
**Status**: [ ] pending
```

---

## Best Practices

1. **Always include CLAUDE.md in context** - It contains the rules
2. **Update tasks.md immediately** - Mark tasks [x] right after completing
3. **Run tests after each task** - Don't batch task completions
4. **Keep files organized** - Use .specweave/increments/####/ folders
5. **Check memory files** - Load .specweave/memory/*.md for learned patterns

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| AI doesn't follow workflow | Include CLAUDE.md in every prompt |
| Tasks not updating | Verify file path, check for syntax errors |
| Tests not running | Ensure test command is correct for your project |
| Files in wrong location | Move to .specweave/increments/####/reports/ |

---

## Resources

- [SpecWeave Documentation](https://spec-weave.com)
- [GitHub Repository](https://github.com/anton-abyzov/specweave)
- [Auto Mode Documentation](https://spec-weave.com/docs/commands/auto)
