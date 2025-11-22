---
name: specweave-tooling:skill-create
description: Create new Claude Code skill with proper YAML frontmatter, directory structure, and activation triggers. Interactive wizard for skill creation with validation and best practices.
---

# Create New Skill

**Interactive Wizard**: From concept to production-ready skill with proper structure and validation.

You are helping the user create a new Claude Code skill following best practices and the required structure.

## Critical Structure Rules (Get This Right First!)

### 1. Directory Structure

**MANDATORY format**:
```
~/.claude/skills/           ← Personal skills
└── your-skill-name/        ← MUST be in subdirectory!
    └── SKILL.md            ← Must be named exactly SKILL.md

.claude/skills/             ← Project skills (in project root)
└── your-skill-name/        ← MUST be in subdirectory!
    └── SKILL.md            ← Must be named exactly SKILL.md
```

**Common mistake**: Putting `SKILL.md` directly in `~/.claude/skills/` ❌

### 2. SKILL.md Format (Mandatory YAML Frontmatter)

```yaml
---
name: your-skill-name
description: What it does AND when to use it. Include trigger keywords users might say.
---

# Your Skill Title

Rest of your markdown content here...
```

**Critical rules**:
- Opening `---` MUST be on line 1
- `name` field: lowercase, hyphens only, max 64 chars
- `description` field: max 1024 chars, MUST include activation triggers
- Closing `---` before any markdown content
- No YAML frontmatter = skill won't work!

## Steps

### Step 1: Gather Skill Information

Ask the user for the following information (use AskUserQuestion if appropriate):

1. **Skill Name**:
   - Lowercase, hyphens only
   - Max 64 characters
   - Example: `python-data-science`, `kubernetes-expert`, `react-hooks`

2. **Skill Purpose**:
   - What expertise does this skill provide?
   - What questions should it answer?
   - Example: "Python data science best practices"

3. **Activation Triggers**:
   - Keywords users might say
   - Commands or patterns to detect
   - Example: "pandas, numpy, matplotlib, jupyter notebooks, Python data analysis"

4. **Skill Location**:
   - Personal skill: `~/.claude/skills/`
   - Project skill: `.claude/skills/` (in project root)

5. **Optional Tool Restrictions**:
   - Should this skill be read-only?
   - Allowed tools: Read, Grep, Glob, WebSearch, etc.
   - Leave empty for no restrictions

### Step 2: Validate Skill Name

**Validation rules**:
```bash
# Check format (lowercase, hyphens only)
if [[ ! "$skill_name" =~ ^[a-z0-9-]+$ ]]; then
  echo "❌ Invalid name: must be lowercase with hyphens only"
  exit 1
fi

# Check length (max 64 chars)
if [ ${#skill_name} -gt 64 ]; then
  echo "❌ Invalid name: must be 64 characters or less"
  exit 1
fi

# Check no consecutive hyphens
if [[ "$skill_name" =~ -- ]]; then
  echo "❌ Invalid name: no consecutive hyphens allowed"
  exit 1
fi

# Check doesn't start/end with hyphen
if [[ "$skill_name" =~ ^- ]] || [[ "$skill_name" =~ -$ ]]; then
  echo "❌ Invalid name: cannot start or end with hyphen"
  exit 1
fi
```

### Step 3: Generate Skill Description

**Requirements**:
- Max 1024 characters
- Must include activation triggers
- Must explain when to use the skill
- Include keyword variations (e.g., "k8s, kubernetes, kubectl")

**Template**:
```
[What the skill does]. [When to use it]. Activates for: [keyword1], [keyword2], [keyword3], [phrase1], [phrase2].
```

**Examples**:

```yaml
# Command-based skill
description: Kubernetes expert. Explains kubectl commands, pod management, deployments. Activates for: kubectl, k8s, kubernetes, pods, deployments, services, namespaces.

# Framework skill
description: React expert for hooks, components, state management. Activates for: React, useState, useEffect, components, JSX, props, virtual DOM, React hooks.

# Project-specific skill
description: MyCompany API documentation. Explains endpoints, authentication, rate limits. Activates for: MyCompany API, /api/v1, authentication token, rate limit, API key.
```

### Step 4: Create Skill Content Structure

**Recommended sections**:

```markdown
---
name: your-skill-name
description: [Generated description with triggers]
---

# [Skill Title]

## What I Know

[Bullet list of expertise areas]
- Topic 1
- Topic 2
- Topic 3

## When to Use This Skill

Ask me about:
- "How do I [use case 1]..."
- "What's the best way to [use case 2]..."
- "[Topic] tips and best practices"

## Key Concepts

### [Concept 1]

[Explanation]

### [Concept 2]

[Explanation]

## Examples

### [Example 1: Common Task]

```[language]
[code example]
```

**Explanation**: [Why this works]

### [Example 2: Advanced Usage]

```[language]
[code example]
```

**Explanation**: [When to use this pattern]

## Best Practices

1. ✅ **[Practice 1]**: [Explanation]
2. ✅ **[Practice 2]**: [Explanation]
3. ⚠️ **[Anti-pattern to avoid]**: [Why to avoid]

## Common Patterns

### [Pattern 1]
[Implementation details]

### [Pattern 2]
[Implementation details]

## Resources

- [Documentation link]
- [Tutorial link]
- [Reference link]
```

### Step 5: Handle Optional Tool Restrictions

**If user wants read-only skill**:

```yaml
---
name: documentation-helper
description: Documentation expert for project docs
allowed-tools: Read, Grep, Glob, WebSearch
---
```

**Available tools**:
- `Read` - Read files
- `Write` - Create/overwrite files
- `Edit` - Edit existing files
- `Grep` - Search file contents
- `Glob` - Find files by pattern
- `Bash` - Execute bash commands
- `WebSearch` - Search the web
- `WebFetch` - Fetch web content
- `TodoWrite` - Manage todos
- `AskUserQuestion` - Ask user questions

**Tool restriction patterns**:

```yaml
# Read-only (no modifications)
allowed-tools: Read, Grep, Glob, WebSearch

# Documentation expert (can create docs)
allowed-tools: Read, Grep, Glob, Write, Edit

# Analysis expert (no file modifications)
allowed-tools: Read, Grep, Glob, Bash

# Full access (no restrictions)
# (omit allowed-tools field)
```

### Step 6: Create Skill Directory and File

**Implementation**:

```bash
# Determine full path
if [ "$location" = "personal" ]; then
  skill_dir="$HOME/.claude/skills/$skill_name"
else
  skill_dir="$PWD/.claude/skills/$skill_name"
fi

# Create directory
mkdir -p "$skill_dir"

# Create SKILL.md
cat > "$skill_dir/SKILL.md" <<'EOF'
---
name: $skill_name
description: $description
$allowed_tools_line
---

# $skill_title

$skill_content
EOF

echo "✅ Skill created at: $skill_dir/SKILL.md"
```

### Step 7: Validate Skill Structure

**Validation checklist**:

```bash
# 1. Check SKILL.md exists
if [ ! -f "$skill_dir/SKILL.md" ]; then
  echo "❌ SKILL.md not found"
  exit 1
fi

# 2. Check YAML frontmatter
if ! head -1 "$skill_dir/SKILL.md" | grep -q '^---$'; then
  echo "❌ SKILL.md must start with '---'"
  exit 1
fi

# 3. Check required fields
if ! grep -q '^name:' "$skill_dir/SKILL.md"; then
  echo "❌ Missing 'name' field in YAML frontmatter"
  exit 1
fi

if ! grep -q '^description:' "$skill_dir/SKILL.md"; then
  echo "❌ Missing 'description' field in YAML frontmatter"
  exit 1
fi

# 4. Check closing ---
if ! sed -n '2,10p' "$skill_dir/SKILL.md" | grep -q '^---$'; then
  echo "❌ Missing closing '---' in YAML frontmatter"
  exit 1
fi

# 5. Check description length
desc_length=$(grep '^description:' "$skill_dir/SKILL.md" | sed 's/^description: *//' | wc -c)
if [ "$desc_length" -gt 1024 ]; then
  echo "⚠️ Warning: Description is ${desc_length} characters (max 1024)"
fi

echo "✅ Skill structure validated successfully"
```

### Step 8: Provide Next Steps

**User instructions**:

```
✅ Skill created successfully!

📁 Location: $skill_dir/SKILL.md

📝 Next steps:

1. Review the skill content and customize as needed
2. Test the skill by asking a trigger question
3. Restart Claude Code to load the skill
4. Verify activation with a test question

🔄 To restart Claude Code:
   - Close and reopen the application
   - OR use /restart command (if available)

🧪 Test your skill:
   Ask: "[example trigger question based on description]"

📚 Documentation:
   - Skill format: ~/CLAUDE.md (your quick reference)
   - Activation patterns: Description keywords determine when skill loads
   - Tool restrictions: Optional 'allowed-tools' field limits capabilities

⚠️ Common issues:
   - Skill doesn't activate → Check description has clear triggers
   - YAML errors → Verify frontmatter format (opening/closing ---)
   - File not found → Ensure SKILL.md is in subdirectory
```

## Examples

### Example 1: Python Data Science Skill

**Input**:
- Name: `python-data-science`
- Purpose: "Python best practices for data science projects"
- Triggers: "pandas, numpy, matplotlib, jupyter notebooks, Python data analysis"
- Location: Personal
- Tool restrictions: None

**Output** (`~/.claude/skills/python-data-science/SKILL.md`):

```yaml
---
name: python-data-science
description: Python best practices for data science projects. Explains pandas DataFrame operations, NumPy arrays, matplotlib visualizations, and Jupyter notebook workflows. Activates for: pandas, numpy, matplotlib, jupyter notebooks, Python data analysis, data science, scientific computing.
---

# Python Data Science Skill

## What I Know

- Pandas DataFrame operations and transformations
- NumPy array manipulation and vectorization
- Matplotlib and Seaborn visualizations
- Jupyter notebook best practices
- Data cleaning and preprocessing
- Statistical analysis and modeling

## When to Use This Skill

Ask me about:
- "How do I use pandas to..."
- "What's the best way to visualize..."
- "Python data analysis tips"
- "NumPy array operations"
- "Jupyter notebook shortcuts"

## Key Concepts

### Pandas DataFrames

DataFrames are the core data structure for tabular data in Python:
- Rows and columns with labels
- Rich indexing and selection capabilities
- Built-in aggregation and transformation methods

### NumPy Arrays

Efficient numerical computing with multi-dimensional arrays:
- Vectorized operations (avoid loops!)
- Broadcasting for element-wise operations
- Linear algebra and statistical functions

## Examples

### Example 1: Loading and Exploring Data

```python
import pandas as pd

# Load CSV file
df = pd.read_csv('data.csv')

# Quick exploration
print(df.head())        # First 5 rows
print(df.info())        # Column types and nulls
print(df.describe())    # Statistical summary
```

**Explanation**: Always start with exploration to understand your data structure, types, and missing values.

### Example 2: Data Cleaning

```python
# Handle missing values
df_clean = df.dropna()              # Drop rows with any nulls
df_filled = df.fillna(0)            # Fill nulls with 0
df_ffill = df.fillna(method='ffill')  # Forward fill

# Remove duplicates
df_unique = df.drop_duplicates()
```

**Explanation**: Choose the right strategy based on your data and analysis goals.

## Best Practices

1. ✅ **Use vectorized operations**: Avoid Python loops, use pandas/numpy methods
2. ✅ **Chain operations**: `df.groupby('col').agg('mean').sort_values()`
3. ✅ **Copy data explicitly**: Use `.copy()` to avoid SettingWithCopyWarning
4. ⚠️ **Avoid iterrows()**: Extremely slow, use `.apply()` or vectorization instead

## Common Patterns

### Groupby-Aggregation
```python
df.groupby('category').agg({
    'sales': 'sum',
    'quantity': 'mean',
    'price': ['min', 'max']
})
```

### Time Series Resampling
```python
df.set_index('date').resample('M').mean()
```

## Resources

- [Pandas Documentation](https://pandas.pydata.org/docs/)
- [NumPy User Guide](https://numpy.org/doc/stable/user/)
- [Matplotlib Gallery](https://matplotlib.org/stable/gallery/index.html)
```

### Example 2: Read-Only Documentation Skill

**Input**:
- Name: `project-docs-helper`
- Purpose: "Project documentation expert"
- Triggers: "documentation, docs, readme, API reference"
- Location: Project (`.claude/skills/`)
- Tool restrictions: Read, Grep, Glob, WebSearch

**Output** (`.claude/skills/project-docs-helper/SKILL.md`):

```yaml
---
name: project-docs-helper
description: Project documentation expert. Helps find and explain documentation, API references, and README files. Read-only access for safe documentation browsing. Activates for: documentation, docs, readme, API reference, how to use, user guide.
allowed-tools: Read, Grep, Glob, WebSearch
---

# Project Documentation Helper

## What I Know

- Location of all project documentation
- API reference structure
- README and getting started guides
- Architecture documentation
- Contributing guidelines

## When to Use This Skill

Ask me about:
- "Where is the documentation for..."
- "How do I use [feature]..."
- "What APIs are available..."
- "Getting started with this project"

## Documentation Structure

This project follows standard documentation patterns:
- `/docs/` - Main documentation folder
- `README.md` - Getting started guide
- `API.md` - API reference
- `CONTRIBUTING.md` - Contribution guidelines
- `ARCHITECTURE.md` - System design

## How to Find Information

### Search by Topic
I can search through all documentation files to find information about specific topics.

### Navigate by Structure
I understand the documentation hierarchy and can guide you to the right files.

### Explain Concepts
I can read and explain complex documentation sections in simpler terms.

## Best Practices

1. ✅ **Check README first**: Start with README.md for project overview
2. ✅ **Use search**: Ask me to search docs instead of browsing manually
3. ✅ **Verify versions**: Documentation may be version-specific
4. ⚠️ **Read-only**: This skill cannot modify documentation
```

## Validation and Testing

### Post-Creation Validation

**Run these checks after creation**:

```bash
# 1. File exists in correct location
ls "$skill_dir/SKILL.md"

# 2. YAML frontmatter is valid
head -10 "$skill_dir/SKILL.md"

# Should see:
# ---
# name: your-skill-name
# description: ...
# ---

# 3. No syntax errors
node -e "
const fs = require('fs');
const yaml = require('js-yaml');
const content = fs.readFileSync('$skill_dir/SKILL.md', 'utf-8');
const match = content.match(/^---\\n([\\s\\S]*?)\\n---/);
if (!match) {
  console.error('❌ No YAML frontmatter found');
  process.exit(1);
}
try {
  const data = yaml.load(match[1]);
  console.log('✅ Valid YAML:', JSON.stringify(data, null, 2));
} catch (e) {
  console.error('❌ YAML parsing error:', e.message);
  process.exit(1);
}
"
```

### Testing Activation

**Steps**:
1. Create skill
2. Restart Claude Code
3. Ask a question with trigger keywords
4. Verify skill activates (should see skill content in context)

**Test questions based on examples**:
- Python Data Science: "How do I use pandas to read a CSV file?"
- Documentation Helper: "Where is the API documentation?"
- Kubernetes Expert: "How do I list all pods in a namespace?"

## Troubleshooting

### Skill Doesn't Activate

**Possible causes**:

1. **Claude Code not restarted**: Skills only load on startup
   - **Fix**: Restart Claude Code

2. **Missing trigger keywords**: Description doesn't match user's question
   - **Fix**: Add more keyword variations to description

3. **YAML syntax errors**: Frontmatter is invalid
   - **Fix**: Validate YAML format (use checker above)

4. **Wrong file location**: SKILL.md not in subdirectory
   - **Fix**: Move to `skills/skill-name/SKILL.md`

5. **Name mismatch**: YAML name doesn't match directory name
   - **Fix**: Ensure consistency (can be different, but confusing)

### YAML Parsing Errors

**Common mistakes**:

```yaml
# ❌ WRONG: Missing closing ---
---
name: my-skill
description: My skill description

# ✅ CORRECT: Closing --- present
---
name: my-skill
description: My skill description
---

# ❌ WRONG: Invalid characters in name
---
name: My Skill Name
---

# ✅ CORRECT: Lowercase with hyphens
---
name: my-skill-name
---

# ❌ WRONG: Description too long (>1024 chars)
---
name: skill
description: [2000 character description]
---

# ✅ CORRECT: Concise description (<1024 chars)
---
name: skill
description: Focused description with key triggers
---
```

## Best Practices

### Naming Conventions

1. **Be specific**: `react-hooks` not `react`
2. **Use domain language**: `kubernetes-expert` not `k8s-helper`
3. **Avoid redundancy**: `python-data-science` not `python-data-science-skill`
4. **Max 3 words**: Keep names concise

### Description Writing

1. **Front-load purpose**: Start with what the skill does
2. **List all variations**: Include abbreviations (k8s, kubernetes)
3. **Use action words**: "Explains", "Helps with", "Provides guidance"
4. **Include examples**: "React hooks (useState, useEffect, useContext)"

### Content Structure

1. **Start simple**: Basic examples before advanced patterns
2. **Use headings**: Clear section organization
3. **Include code**: Concrete examples over abstract explanations
4. **Anti-patterns**: Show what NOT to do (⚠️ warnings)

### Tool Restrictions

1. **Read-only by default**: Start restrictive, expand if needed
2. **Justify access**: Only grant Write/Edit if skill creates files
3. **Document reasons**: Explain why tools are needed

## Summary

**Key steps**:
1. ✅ Validate skill name (lowercase, hyphens, max 64 chars)
2. ✅ Create description with triggers (max 1024 chars)
3. ✅ Choose skill location (personal vs project)
4. ✅ Add tool restrictions if read-only
5. ✅ Generate SKILL.md with YAML frontmatter
6. ✅ Validate structure (frontmatter, fields, format)
7. ✅ Restart Claude Code
8. ✅ Test with trigger question

**Remember**: Restart Claude Code after creating or modifying skills!
