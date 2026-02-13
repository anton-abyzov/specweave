# Glossary

Welcome to the SpecWeave Glossary - your comprehensive reference for terminology used throughout the documentation.

## How to Use This Glossary

- Browse alphabetically using the sections below
- Use your browser's search (Ctrl+F / Cmd+F) to find specific terms
- Check the [Index by Category](./index-by-category.md) for grouped terms

## Core Concepts

### Acceptance Criteria (AC)
Specific, measurable conditions that must be met for a user story to be considered complete. In SpecWeave, ACs are tracked in `spec.md` and automatically linked to tasks.

### Increment
A unit of work in SpecWeave representing a feature, enhancement, or fix. Each increment has a unique ID (e.g., `0153`) and contains `spec.md`, `tasks.md`, and `plan.md`.

### Living Docs
Self-updating documentation that stays synchronized with code through SpecWeave's sync system. Living docs include specs, ADRs, and architecture documentation.

### SpecWeave
The spec-driven Skill Fabric for AI coding agents — program your AI in English with 100+ reusable skills, autonomous workflows, and enterprise-grade coordination.

### User Story (US)
A high-level description of a feature from the user's perspective, typically following the format: "As a [user], I want [feature], so that [benefit]."

## Development Terms

### ADR (Architecture Decision Record)
A document capturing an important architectural decision, its context, and rationale. ADRs are stored in `.specweave/docs/internal/architecture/adr/`.

### Hook
A script that executes automatically at specific points in the SpecWeave workflow (e.g., after task completion, before increment start).

### Task
A specific, actionable work item within an increment. Tasks are defined in `tasks.md` and link to acceptance criteria.

### TDD (Test-Driven Development)
A development approach where tests are written before implementation code. SpecWeave supports TDD through `/sw:tdd-cycle` command.

## AI and Automation

### Autonomous Mode
SpecWeave's `/sw:auto` feature that executes tasks continuously without manual intervention until all work is complete.

### Claude Code
Anthropic's CLI tool that integrates with SpecWeave for AI-powered development assistance.

### Model Hints
Task annotations (⚡ Haiku, 🧠 Sonnet, 💎 Opus) that optimize cost and speed by selecting the appropriate AI model.

## Integration Terms

### External Sync
Integration with external project management tools like GitHub Issues, JIRA, or Azure DevOps.

### GitHub Sync
SpecWeave's ability to create and update GitHub issues automatically based on increments and user stories.

### Multi-Project Setup
Configuration where SpecWeave manages multiple related projects (e.g., frontend, backend, shared libraries) from a single umbrella directory.

## SEO and Documentation

### Schema.org
Structured data vocabulary used to markup content for search engines. SpecWeave docs use Organization and SoftwareApplication schemas.

### WebP
Modern image format that provides superior compression (~30-50% smaller) compared to JPEG/PNG.

### robots.txt
File that tells search engine crawlers which pages to index and where to find the sitemap.

## Status and Workflow

### Backlog
Increments that are planned but not yet started (status: `backlog`).

### Completed
Increments that have passed validation and been approved (status: `completed`).

### In Progress
Increments actively being worked on (status: `in_progress`).

### Paused
Increments temporarily suspended due to blockers or deprioritization (status: `paused`).

### Planned
Increments with completed specs and plans, ready for implementation (status: `planned`).

---

**Need more context?** Check the [Index by Category](./index-by-category.md) for grouped terminology.
