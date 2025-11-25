---
sidebar_position: 1
title: "Module 06: Introduction to SpecWeave"
description: "The paradigm shift from 'AI writes code' to 'AI builds documented software'"
---

# Module 06: Introduction to SpecWeave

**Duration**: 3-4 hours | **Difficulty**: Beginner

This is the pivotal module where everything changes. You've built a project the traditional way — now see how SpecWeave transforms the entire development process.

---

## The Paradigm Shift

### Traditional AI Development

```
You: "Write a task tracker CLI"
AI: [Generates code]
You: "Add validation"
AI: [Generates more code]
You: "Now add tests"
AI: [Generates tests]

Result: Code works, but...
- No requirements documented
- No architecture decisions
- No traceability
- No quality assurance
- Context lost forever
```

### SpecWeave Development

```
You: "/specweave:increment Task Tracker CLI"
PM Agent: Creates spec.md (requirements, user stories, ACs)
Architect Agent: Creates plan.md (architecture, ADRs)
Tech Lead Agent: Creates tasks.md (implementation plan, test plans)

You: "/specweave:do"
[Code generated with FULL context]

You: "/specweave:done"
[Quality validated, docs updated, report generated]

Result: Code works AND...
✓ Requirements documented
✓ Architecture decisions recorded
✓ Full traceability
✓ Quality gates passed
✓ Context preserved forever
```

---

## What You'll Learn

- What SpecWeave is and why it matters
- The spec-driven development workflow
- Core commands and their purpose
- How AI agents work together
- Rebuilding the task tracker with SpecWeave

---

## Module Lessons

| Lesson | Topic | Duration |
|--------|-------|----------|
| [06.1 What is SpecWeave?](./01-what-is-specweave) | The philosophy and approach | 45 min |
| [06.2 Core Workflow](./02-core-workflow) | Increment → Do → Done | 60 min |
| [06.3 Your First Increment](./03-first-increment) | Hands-on with SpecWeave | 60 min |
| [06.4 Understanding the Artifacts](./04-artifacts) | spec.md, plan.md, tasks.md | 45 min |

---

## Prerequisites

Before starting:
- ✅ Completed Modules 01-05
- ✅ Built the Task Tracker CLI
- ✅ SpecWeave installed (`npm install -g specweave`)
- ✅ Claude Code installed and configured

---

## The Problem SpecWeave Solves

In Module 05, you built a task tracker. It works. But ask yourself:

| Question | Traditional Answer | SpecWeave Answer |
|----------|-------------------|------------------|
| What were the requirements? | "Uh, it tracks tasks?" | See spec.md |
| Why JSON instead of SQLite? | "It was easier" | ADR-001 in plan.md |
| What edge cases did we handle? | "Most of them, I think" | AC-US1-01 through AC-US1-05 |
| How do we know it's done? | "It works!" | All quality gates passed |
| What if we need to change it? | Start over? | Update spec, regenerate |

**SpecWeave makes software development reproducible, documented, and professional.**

---

## Quick Preview

Here's what rebuilding the task tracker looks like with SpecWeave:

```bash
# Initialize SpecWeave in project
specweave init .

# Create increment (planning phase)
/specweave:increment "Task Tracker CLI - add, list, complete, delete tasks"

# Review generated specs
cat .specweave/increments/0001-task-tracker-cli/spec.md
cat .specweave/increments/0001-task-tracker-cli/plan.md
cat .specweave/increments/0001-task-tracker-cli/tasks.md

# Execute the plan
/specweave:do

# Validate and complete
/specweave:done 0001
```

In one workflow, you get:
- Requirements documentation
- Architecture decisions
- Implementation plan with test scenarios
- Working code
- Quality validation
- Completion report

---

## Let's Begin

Ready to transform how you build software?

→ [Start Lesson 06.1: What is SpecWeave?](./01-what-is-specweave)
