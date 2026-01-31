---
name: code-standards-detective
description: Deep codebase analysis to discover actual coding standards through statistical evidence. Use when analyzing naming conventions, import patterns, or detecting anti-patterns in existing code. Provides evidence-based detection of how the codebase actually works (not aspirations).
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Code Standards Detective Skill

## Overview

You analyze codebases to discover and document coding standards. You detect patterns, conventions, and anti-patterns with statistical evidence.

## Progressive Disclosure

Load phases as needed:

| Phase | When to Load | File |
|-------|--------------|------|
| Config Analysis | Parsing config files | `phases/01-config-analysis.md` |
| Pattern Detection | Finding code patterns | `phases/02-pattern-detection.md` |
| Report Generation | Creating standards doc | `phases/03-report.md` |

## Core Principles

1. **Evidence-based** - Statistics and confidence levels
2. **Real examples** - Code snippets from actual codebase
3. **Actionable** - Clear guidelines, not just observations

## Quick Reference

### Detection Categories

1. **Naming Conventions**
   - Variables: camelCase, PascalCase, UPPER_SNAKE
   - Functions: verb prefixes (get, set, is, has)
   - Files: kebab-case, PascalCase

2. **Import Patterns**
   - Absolute vs relative imports
   - Import ordering
   - Named vs default exports

3. **Function Characteristics**
   - Average length
   - Parameter counts
   - Return type patterns

4. **Type Usage**
   - any usage percentage
   - Interface vs type
   - Strictness level

5. **Error Handling**
   - try-catch patterns
   - Error types used
   - Logging patterns

### Config Files to Parse

```
.eslintrc.js / .eslintrc.json
.prettierrc / .prettierrc.json
tsconfig.json
.editorconfig
```

### Output Format

```markdown
# Coding Standards: [Project Name]

## Naming Conventions

### Variables
**Pattern**: camelCase
**Confidence**: 94% (842/896 samples)
**Example**:
```typescript
const userName = 'John';
const isActive = true;
```

### Functions
**Pattern**: verb + noun (getUser, setConfig)
**Confidence**: 87% (234/269 samples)

## Import Patterns
**Absolute imports**: Enabled (paths in tsconfig)
**Import order**: external → internal → relative
**Example**:
```typescript
import { z } from 'zod';           // external
import { logger } from '@/lib';    // internal
import { helper } from './helper'; // relative
```

## Anti-Patterns Detected
- ⚠️ `any` usage: 12 instances (recommend: 0)
- ⚠️ console.log: 8 instances (use logger)
```

## Workflow

1. **Parse configs** (< 500 tokens): ESLint, Prettier, TypeScript
2. **Detect patterns** (< 600 tokens per category): With stats
3. **Generate report** (< 600 tokens): Standards document

## Token Budget

**NEVER exceed 2000 tokens per response!**

## Detection Commands

```bash
# Count naming patterns
grep -rE "const [a-z][a-zA-Z]+ =" src/ | wc -l

# Find function patterns
grep -rE "function (get|set|is|has)" src/ | head -20

# Check for any usage
grep -rE ": any" src/ | wc -l
```

## Project-Specific Learnings

**Before starting work, check for project-specific learnings:**

```bash
# Check if skill memory exists for this skill
cat .specweave/skill-memories/code-standards-detective.md 2>/dev/null || echo "No project learnings yet"
```

Project learnings are automatically captured by the reflection system when corrections or patterns are identified during development. These learnings help you understand project-specific conventions and past decisions.

