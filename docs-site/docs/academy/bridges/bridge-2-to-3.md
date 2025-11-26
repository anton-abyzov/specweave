---
sidebar_position: 3
title: "Part 2 → Part 3"
description: "From code to tested code"
---

# Bridge: First Application → Testing

**You can build. Now let's prove it works.**

---

## What You Mastered in Part 2

| Skill | What You Built |
|-------|----------------|
| Node.js basics | Working JavaScript runtime |
| ES Modules | Import/export code |
| File I/O | Reading and writing data |
| CLI parsing | Handling user commands |
| Error handling | Graceful failure recovery |
| SpecWeave basics | Spec-driven development |

---

## What's Coming in Part 3

```
Part 2: "My code works (I think)"
    ↓
Part 3: "My code works (I can prove it)"
```

You'll add automated tests that verify your code is correct.

---

## Why Testing Matters Now

### The Problem

Your task tracker works... until it doesn't:

```javascript
// This worked yesterday
addTask("Buy groceries");  // ✓

// Today's change broke it
addTask("");  // Should error, but doesn't?
```

**Manual testing doesn't scale.**

### The Solution

Automated tests catch regressions:

```javascript
it('should reject empty task title', () => {
  expect(() => addTask('')).toThrow('Title required');
});
```

Run once, confidence forever.

---

## Connection Points

### Functions → Testable Units

In Part 2, you wrote functions:
```javascript
export async function addTask(title) {
  // ...
}
```

In Part 3, you'll test them:
```javascript
import { addTask } from './tasks.js';

it('should create task with unique ID', async () => {
  const task = await addTask('Test');
  expect(task.id).toBeDefined();
});
```

**Same functions, now verified.**

### Error Handling → Error Testing

In Part 2, you threw errors:
```javascript
if (!title) {
  throw new Error('Title required');
}
```

In Part 3, you'll verify error handling:
```javascript
it('should throw for empty title', () => {
  expect(() => addTask('')).toThrow('Title required');
});
```

**Same errors, now validated.**

### SpecWeave → Test Integration

In Part 2, you used SpecWeave:
```bash
/specweave:increment "Add task feature"
```

In Part 3, you'll add tests to your workflow:
```markdown
### T-001: Implement add task
**Tests**:
- should create task with unique ID
- should reject empty title
- should save to storage
```

**Same workflow, now with test specs.**

---

## Self-Assessment

Before Part 3, you should be comfortable with:

- [ ] Writing and running JavaScript functions
- [ ] Using async/await for file operations
- [ ] Understanding what a function should return
- [ ] Knowing when code should throw errors
- [ ] Using ES module imports/exports

**Unsure about any of these?** Review Part 2.

---

## Bridge Exercise

**Before starting Part 3, analyze your code:**

Take `addTask` from your project and answer:

1. **What are the inputs?** (title, priority, etc.)
2. **What are the outputs?** (task object)
3. **What should happen with bad inputs?**
   - Empty title? → Error
   - Title too long? → Error
   - Missing required fields? → Error
4. **What side effects occur?** (file writes)

Write these answers down — they become your test cases.

---

## What Changes in Part 3

| Part 2 | Part 3 |
|--------|--------|
| "It works on my machine" | "It works everywhere" |
| Manual verification | Automated verification |
| Hope it works | Know it works |
| Fix bugs when found | Prevent bugs before shipping |
| Code first | Tests first (TDD) |

---

## Preview: The Testing Pyramid

```
           /\
          /  \         E2E Tests
         /----\        (Full application)
        /      \
       /--------\      Integration Tests
      /          \     (Components together)
     /------------\
    /              \   Unit Tests
   /----------------\  (Individual functions)
```

In Part 3, you'll implement all three levels.

---

## The ROI of Testing

```
Without tests:
Day 1:   Ship feature (10 min)
Day 30:  Bug report (????)
Day 31:  Debug (2 hours)
Day 32:  Fix + deploy (1 hour)
Day 45:  Another bug... repeat

With tests:
Day 1:   Write tests (30 min)
Day 1:   Ship feature (10 min)
Day 30:  Tests catch regression (instant)
Day 30:  Fix before shipping (30 min)
```

Tests are an investment that pays dividends.

---

## Ready?

→ [Start Part 3: Testing](/docs/academy/part-3-testing/)
