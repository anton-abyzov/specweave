---
description: Real-time security pattern detector based on Anthropic's official security-guidance plugin. Use proactively when writing code to detect command injection, XSS, unsafe deserialization, and dynamic code execution risks. Identifies dangerous patterns BEFORE they're committed.
allowed-tools: Read, Grep, Glob
user-invocable: false
---

# Security Pattern Detector Skill

## Project Overrides

!`s="security-patterns"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Overview

This skill provides real-time security pattern detection based on Anthropic's official security-guidance plugin. It identifies potentially dangerous coding patterns BEFORE they're committed.

## Scope Boundaries

This skill is a **REAL-TIME DETECTOR**. Activates proactively when writing code. Detects: command injection, XSS, unsafe deserialization, dynamic code execution.

- For comprehensive security audits → use `/sw:security`

## Detection Categories

### 1. Command Injection Risks

**GitHub Actions Workflow Injection**
```yaml
# DANGEROUS - User input directly in run command
run: echo "${{ github.event.issue.title }}"

# SAFE - Use environment variable
env:
  TITLE: ${{ github.event.issue.title }}
run: echo "$TITLE"
```

**Node.js Child Process Execution**

Dangerous: passing unsanitized user input to shell commands via `child_process` methods with string arguments.

```typescript
// SAFE - Array arguments, no shell
execFile('ls', [sanitizedPath]);
spawn('ls', [sanitizedPath], { shell: false });
```

**Python OS Commands**

Dangerous: `os.system()` or `subprocess.call()` with `shell=True` and user-controlled strings.

```python
# SAFE
subprocess.run(['grep', sanitized_input, 'file.txt'], shell=False)
```

### 2. Dynamic Code Execution

**JavaScript eval-like Patterns**

Dangerous: passing user-controlled strings to `eval()`, `new Function()`, `setTimeout(string)`, or `setInterval(string)` — all execute arbitrary code.

```typescript
// SAFE - Use parsed data, not code
const config = JSON.parse(configString);
```

### 3. DOM-based XSS Risks

**React dangerouslySetInnerHTML**
```tsx
// DANGEROUS - Renders arbitrary HTML
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// SAFE - Use proper sanitization
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

**Direct DOM Manipulation**
```typescript
// DANGEROUS
element.innerHTML = userInput;
document.write(userInput);

// SAFE
element.textContent = userInput;
element.innerText = userInput;
```

### 4. Unsafe Deserialization

**Python Pickle**
```python
# DANGEROUS - Pickle can execute arbitrary code
import pickle
data = pickle.loads(user_provided_bytes)

# SAFE - Use JSON for untrusted data
import json
data = json.loads(user_provided_string)
```

**JavaScript unsafe deserialization**

Dangerous: using `eval('(' + jsonString + ')')` to parse JSON — executes arbitrary code.

```typescript
// SAFE
const obj = JSON.parse(jsonString);
```

### 5. SQL Injection

**String Interpolation in Queries**
```typescript
// DANGEROUS
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(`SELECT * FROM users WHERE name = '${userName}'`);

// SAFE - Parameterized queries
const query = 'SELECT * FROM users WHERE id = $1';
db.query(query, [userId]);
```

### 6. Path Traversal

**Unsanitized File Paths**
```typescript
// DANGEROUS
const filePath = `./uploads/${userFilename}`;
fs.readFile(filePath); // User could pass "../../../etc/passwd"

// SAFE
const safePath = path.join('./uploads', path.basename(userFilename));
if (!safePath.startsWith('./uploads/')) throw new Error('Invalid path');
```

## Pattern Detection Rules

| Pattern | Category | Severity | Action |
|---------|----------|----------|--------|
| eval with user input | Code Execution | CRITICAL | Block |
| Function constructor with user input | Code Execution | CRITICAL | Block |
| dangerouslySetInnerHTML | XSS | HIGH | Warn |
| innerHTML assignment | XSS | HIGH | Warn |
| document.write with user input | XSS | HIGH | Warn |
| child_process exec with string concat | Command Injection | CRITICAL | Block |
| spawn with shell:true | Command Injection | HIGH | Warn |
| pickle.loads with untrusted data | Deserialization | CRITICAL | Warn |
| github.event context in run | GH Actions Injection | CRITICAL | Warn |
| Template literal in SQL | SQL Injection | CRITICAL | Block |

## Response Format

When detecting a pattern:

```markdown
⚠️ **Security Warning**: [Pattern Category]

**File**: `path/to/file.ts:123`
**Pattern Detected**: [description of the dangerous pattern]
**Risk**: Remote Code Execution - Attacker-controlled input can execute arbitrary JavaScript

**Recommendation**:
1. Never use dynamic code execution with user input
2. Use JSON.parse() for data parsing
3. Use safe alternatives for dynamic behavior

**Safe Alternative**:
```typescript
// Use JSON.parse instead of dynamic execution:
const data = JSON.parse(userInput);
```
```

## Integration with Code Review

This skill should be invoked:
1. During PR reviews when new code is written
2. As part of security audits
3. When flagged by the code-reviewer skill

## False Positive Handling

Some patterns may be false positives:
- dangerouslySetInnerHTML with DOMPurify is safe
- Dynamic code execution in build tools (not user input) may be acceptable
- Child process execution with hardcoded commands is lower risk

Always check the context before blocking.


