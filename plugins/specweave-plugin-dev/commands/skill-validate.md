# /sw-plugin-dev:skill-validate

Validate Claude Code skill structure, YAML frontmatter, and activation triggers. Comprehensive validation with detailed error reporting and auto-fix suggestions.

**Comprehensive Validation**: Detect and fix skill structure issues, YAML errors, and activation problems.

You are helping the user validate an existing Claude Code skill to ensure it follows best practices and will activate correctly.

## What Gets Validated

### 1. Directory Structure
- ✅ SKILL.md exists in subdirectory (not root)
- ✅ File named exactly `SKILL.md` (case-sensitive)
- ✅ Only one SKILL.md per directory

### 2. YAML Frontmatter
- ✅ Starts with `---` on line 1
- ✅ Contains required fields (`name`, `description`)
- ✅ Has closing `---` before content
- ✅ Valid YAML syntax
- ✅ Field value constraints (length, format)

### 3. Content Quality
- ✅ Description includes trigger keywords
- ✅ Content has clear structure
- ✅ Examples are present
- ✅ Best practices documented

### 4. Activation Patterns
- ✅ Description has sufficient triggers
- ✅ Keyword variations included
- ✅ Domain-specific terms present

## Steps

### Step 1: Locate Skill

**Ask user for skill path or name**:

```bash
# Option 1: Full path
skill_path="/path/to/skill/SKILL.md"

# Option 2: Skill name (search common locations)
skill_name="python-data-science"

# Search order:
# 1. ~/.claude/skills/$skill_name/SKILL.md
# 2. .claude/skills/$skill_name/SKILL.md  (project skills)
```

**Auto-detection**:

```bash
# Find skill by name
find_skill() {
  local skill_name="$1"

  # Check personal skills
  if [ -f "$HOME/.claude/skills/$skill_name/SKILL.md" ]; then
    echo "$HOME/.claude/skills/$skill_name/SKILL.md"
    return 0
  fi

  # Check project skills
  if [ -f ".claude/skills/$skill_name/SKILL.md" ]; then
    echo ".claude/skills/$skill_name/SKILL.md"
    return 0
  fi

  echo "❌ Skill not found: $skill_name" >&2
  return 1
}
```

### Step 2: Validate Directory Structure

**Checks**:

```bash
validate_directory_structure() {
  local skill_path="$1"
  local errors=0

  # 1. Check file exists
  if [ ! -f "$skill_path" ]; then
    echo "❌ ERROR: File not found: $skill_path"
    ((errors++))
    return $errors
  fi

  # 2. Check file is named SKILL.md (case-sensitive)
  filename=$(basename "$skill_path")
  if [ "$filename" != "SKILL.md" ]; then
    echo "❌ ERROR: File must be named 'SKILL.md' (case-sensitive)"
    echo "   Found: $filename"
    echo "   Fix: mv '$skill_path' '$(dirname "$skill_path")/SKILL.md'"
    ((errors++))
  fi

  # 3. Check file is in subdirectory (not root of skills/)
  skill_dir=$(dirname "$skill_path")
  parent_dir=$(dirname "$skill_dir")
  parent_name=$(basename "$parent_dir")

  if [[ "$parent_name" != "skills" ]]; then
    echo "⚠️  WARNING: Expected parent directory 'skills/'"
    echo "   Found: $parent_name"
  fi

  # 4. Check directory name format (lowercase, hyphens)
  dir_name=$(basename "$skill_dir")
  if [[ ! "$dir_name" =~ ^[a-z0-9-]+$ ]]; then
    echo "⚠️  WARNING: Directory name should be lowercase with hyphens"
    echo "   Found: $dir_name"
    echo "   Suggested: $(echo "$dir_name" | tr '[:upper:]' '[:lower:]' | tr '_' '-')"
  fi

  # 5. Check for multiple SKILL.md files (only one allowed)
  skill_count=$(find "$skill_dir" -name "SKILL.md" | wc -l)
  if [ "$skill_count" -gt 1 ]; then
    echo "❌ ERROR: Multiple SKILL.md files found in directory"
    echo "   Only one SKILL.md allowed per directory"
    ((errors++))
  fi

  if [ $errors -eq 0 ]; then
    echo "✅ Directory structure: PASSED"
  else
    echo "❌ Directory structure: FAILED ($errors errors)"
  fi

  return $errors
}
```

### Step 3: Validate YAML Frontmatter

**Checks**:

```bash
validate_yaml_frontmatter() {
  local skill_path="$1"
  local errors=0

  # 1. Check starts with ---
  first_line=$(head -1 "$skill_path")
  if [ "$first_line" != "---" ]; then
    echo "❌ ERROR: File must start with '---' (YAML frontmatter)"
    echo "   Found: $first_line"
    echo "   Fix: Add '---' as first line"
    ((errors++))
    return $errors
  fi

  # 2. Extract YAML frontmatter
  yaml_content=$(sed -n '2,/^---$/p' "$skill_path" | sed '$d')

  if [ -z "$yaml_content" ]; then
    echo "❌ ERROR: Empty YAML frontmatter"
    echo "   Fix: Add 'name:' and 'description:' fields"
    ((errors++))
    return $errors
  fi

  # 3. Check closing ---
  closing_line=$(sed -n '2,20p' "$skill_path" | grep -n '^---$' | head -1 | cut -d: -f1)
  if [ -z "$closing_line" ]; then
    echo "❌ ERROR: Missing closing '---' in YAML frontmatter"
    echo "   Fix: Add '---' after YAML fields"
    ((errors++))
  fi

  # 4. Validate YAML syntax (using Node.js)
  yaml_check=$(node -e "
    const fs = require('fs');
    const yaml = require('js-yaml');
    const content = fs.readFileSync('$skill_path', 'utf-8');
    const match = content.match(/^---\\n([\\s\\S]*?)\\n---/);
    if (!match) {
      console.log('ERROR: No YAML frontmatter found');
      process.exit(1);
    }
    try {
      const data = yaml.load(match[1]);
      console.log(JSON.stringify(data));
      process.exit(0);
    } catch (e) {
      console.log('ERROR: ' + e.message);
      process.exit(1);
    }
  " 2>&1)

  if [[ "$yaml_check" =~ ^ERROR: ]]; then
    echo "❌ ERROR: YAML syntax error"
    echo "   $yaml_check"
    ((errors++))
    return $errors
  fi

  if [ $errors -eq 0 ]; then
    echo "✅ YAML frontmatter structure: PASSED"
  else
    echo "❌ YAML frontmatter structure: FAILED ($errors errors)"
  fi

  return $errors
}
```

### Step 4: Validate Required Fields

**Checks**:

```bash
validate_required_fields() {
  local skill_path="$1"
  local errors=0

  # Parse YAML frontmatter
  yaml_data=$(node -e "
    const fs = require('fs');
    const yaml = require('js-yaml');
    const content = fs.readFileSync('$skill_path', 'utf-8');
    const match = content.match(/^---\\n([\\s\\S]*?)\\n---/);
    if (match) {
      const data = yaml.load(match[1]);
      console.log(JSON.stringify(data));
    }
  ")

  # 1. Check 'name' field
  name=$(echo "$yaml_data" | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(data.name || '');
  ")

  if [ -z "$name" ]; then
    echo "❌ ERROR: Missing required field 'name'"
    echo "   Fix: Add 'name: your-skill-name' to YAML frontmatter"
    ((errors++))
  else
    # Validate name format
    if [[ ! "$name" =~ ^[a-z0-9-]+$ ]]; then
      echo "❌ ERROR: Invalid 'name' format: $name"
      echo "   Must be lowercase with hyphens only"
      echo "   Fix: name: $(echo "$name" | tr '[:upper:]' '[:lower:]' | tr '_' '-')"
      ((errors++))
    fi

    # Validate name length
    if [ ${#name} -gt 64 ]; then
      echo "❌ ERROR: 'name' too long: ${#name} characters (max 64)"
      echo "   Fix: Shorten name to 64 characters or less"
      ((errors++))
    fi

    # Check no consecutive hyphens
    if [[ "$name" =~ -- ]]; then
      echo "⚠️  WARNING: 'name' has consecutive hyphens: $name"
    fi

    # Check doesn't start/end with hyphen
    if [[ "$name" =~ ^- ]] || [[ "$name" =~ -$ ]]; then
      echo "❌ ERROR: 'name' cannot start or end with hyphen: $name"
      ((errors++))
    fi
  fi

  # 2. Check 'description' field
  description=$(echo "$yaml_data" | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(data.description || '');
  ")

  if [ -z "$description" ]; then
    echo "❌ ERROR: Missing required field 'description'"
    echo "   Fix: Add 'description: [what skill does]' to YAML frontmatter"
    ((errors++))
  else
    # Validate description length
    desc_length=${#description}
    if [ $desc_length -gt 1024 ]; then
      echo "❌ ERROR: 'description' too long: $desc_length characters (max 1024)"
      echo "   Fix: Shorten description to 1024 characters or less"
      ((errors++))
    fi

    # Check description has trigger keywords
    if [[ ! "$description" =~ [Aa]ctivates|[Tt]riggers|[Kk]eywords ]]; then
      echo "⚠️  WARNING: 'description' should include activation triggers"
      echo "   Recommended: Add 'Activates for: keyword1, keyword2, ...'"
    fi
  fi

  # 3. Check optional 'allowed-tools' field
  allowed_tools=$(echo "$yaml_data" | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(data['allowed-tools'] || '');
  ")

  if [ -n "$allowed_tools" ]; then
    # Validate tool names
    valid_tools="Read Write Edit Grep Glob Bash WebSearch WebFetch TodoWrite AskUserQuestion"

    # Split and validate each tool
    echo "$allowed_tools" | tr ',' '\n' | while read -r tool; do
      tool=$(echo "$tool" | xargs)  # trim whitespace
      if [[ ! " $valid_tools " =~ " $tool " ]]; then
        echo "⚠️  WARNING: Unknown tool in allowed-tools: $tool"
        echo "   Valid tools: $valid_tools"
      fi
    done
  fi

  if [ $errors -eq 0 ]; then
    echo "✅ Required fields: PASSED"
    echo "   name: $name"
    echo "   description: ${description:0:80}..."
    [ -n "$allowed_tools" ] && echo "   allowed-tools: $allowed_tools"
  else
    echo "❌ Required fields: FAILED ($errors errors)"
  fi

  return $errors
}
```

### Step 5: Validate Content Quality

**Checks**:

```bash
validate_content_quality() {
  local skill_path="$1"
  local warnings=0

  # Extract content (everything after closing ---)
  content=$(sed -n '/^---$/,/^---$/p' "$skill_path" | sed '1,2d')
  content_after=$(sed -n '/^---$/,/^---$/p' "$skill_path" | tail -n +3)

  # 1. Check content exists
  if [ -z "$content_after" ]; then
    echo "⚠️  WARNING: No content after YAML frontmatter"
    echo "   Add skill documentation, examples, and best practices"
    ((warnings++))
  fi

  # 2. Check for main heading
  if ! echo "$content_after" | grep -q '^# '; then
    echo "⚠️  WARNING: No main heading (# Title) found"
    echo "   Add a descriptive title after YAML frontmatter"
    ((warnings++))
  fi

  # 3. Check for sections
  section_count=$(echo "$content_after" | grep -c '^## ')
  if [ $section_count -eq 0 ]; then
    echo "⚠️  WARNING: No sections (## Heading) found"
    echo "   Recommended sections: What I Know, When to Use, Examples, Best Practices"
    ((warnings++))
  elif [ $section_count -lt 3 ]; then
    echo "⚠️  WARNING: Only $section_count sections found"
    echo "   Consider adding more structure for clarity"
    ((warnings++))
  fi

  # 4. Check for code examples
  if ! echo "$content_after" | grep -q '```'; then
    echo "⚠️  WARNING: No code examples found"
    echo "   Add concrete examples to illustrate concepts"
    ((warnings++))
  fi

  # 5. Check for lists
  list_count=$(echo "$content_after" | grep -c '^- \|^[0-9]\. ')
  if [ $list_count -eq 0 ]; then
    echo "⚠️  WARNING: No lists found"
    echo "   Use bullet points and numbered lists for clarity"
    ((warnings++))
  fi

  # 6. Check content length
  content_length=$(echo "$content_after" | wc -c)
  if [ $content_length -lt 500 ]; then
    echo "⚠️  WARNING: Content is very short ($content_length characters)"
    echo "   Consider adding more detail, examples, and best practices"
    ((warnings++))
  fi

  # 7. Check for recommended sections
  recommended_sections=(
    "What I Know"
    "When to Use"
    "Examples"
    "Best Practices"
    "Common Patterns"
  )

  missing_sections=()
  for section in "${recommended_sections[@]}"; do
    if ! echo "$content_after" | grep -iq "## $section"; then
      missing_sections+=("$section")
    fi
  done

  if [ ${#missing_sections[@]} -gt 0 ]; then
    echo "⚠️  WARNING: Missing recommended sections:"
    for section in "${missing_sections[@]}"; do
      echo "   - ## $section"
    done
    ((warnings++))
  fi

  if [ $warnings -eq 0 ]; then
    echo "✅ Content quality: PASSED"
    echo "   Sections: $section_count"
    echo "   Content length: $content_length characters"
  else
    echo "⚠️  Content quality: $warnings warnings"
  fi

  return 0  # Warnings don't cause failure
}
```

### Step 6: Validate Activation Patterns

**Checks**:

```bash
validate_activation_patterns() {
  local skill_path="$1"
  local warnings=0

  # Parse description
  description=$(node -e "
    const fs = require('fs');
    const yaml = require('js-yaml');
    const content = fs.readFileSync('$skill_path', 'utf-8');
    const match = content.match(/^---\\n([\\s\\S]*?)\\n---/);
    if (match) {
      const data = yaml.load(match[1]);
      console.log(data.description || '');
    }
  ")

  if [ -z "$description" ]; then
    echo "⚠️  WARNING: No description to validate"
    return 1
  fi

  # 1. Check for trigger section
  if [[ ! "$description" =~ [Aa]ctivates\ for:|[Tt]riggers:|[Kk]eywords: ]]; then
    echo "⚠️  WARNING: No explicit activation triggers in description"
    echo "   Recommended: Add 'Activates for: keyword1, keyword2, ...'"
    ((warnings++))
  fi

  # 2. Count keywords (approximate)
  keyword_count=$(echo "$description" | tr ',' '\n' | grep -v '^[[:space:]]*$' | wc -l)
  if [ $keyword_count -lt 5 ]; then
    echo "⚠️  WARNING: Only $keyword_count potential triggers found"
    echo "   Recommended: Include 5-10 keywords for better activation"
    ((warnings++))
  fi

  # 3. Check for keyword variations
  # Common patterns: abbreviations, full names, plurals
  if [[ "$description" =~ k8s ]] && [[ ! "$description" =~ kubernetes ]]; then
    echo "⚠️  WARNING: Include both abbreviation and full name"
    echo "   Found: k8s"
    echo "   Missing: kubernetes"
    ((warnings++))
  fi

  # 4. Check description clarity
  if [ ${#description} -lt 50 ]; then
    echo "⚠️  WARNING: Description is very short (${#description} chars)"
    echo "   Add more context about what skill does and when to use it"
    ((warnings++))
  fi

  # 5. Check for action words
  action_words="explains|helps|provides|guides|assists|demonstrates|shows"
  if [[ ! "$description" =~ $action_words ]]; then
    echo "⚠️  WARNING: Description lacks action words"
    echo "   Recommended: Use verbs like 'Explains', 'Helps with', 'Provides'"
    ((warnings++))
  fi

  if [ $warnings -eq 0 ]; then
    echo "✅ Activation patterns: PASSED"
    echo "   Trigger count: ~$keyword_count"
  else
    echo "⚠️  Activation patterns: $warnings warnings"
  fi

  return 0  # Warnings don't cause failure
}
```

### Step 7: Generate Validation Report

**Report format**:

```bash
generate_validation_report() {
  local skill_path="$1"
  local total_errors=0
  local total_warnings=0

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SKILL VALIDATION REPORT"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📁 File: $skill_path"
  echo "📅 Validated: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "VALIDATION RESULTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Run all validations
  echo "1️⃣  Directory Structure"
  validate_directory_structure "$skill_path"
  total_errors=$((total_errors + $?))
  echo ""

  echo "2️⃣  YAML Frontmatter"
  validate_yaml_frontmatter "$skill_path"
  total_errors=$((total_errors + $?))
  echo ""

  echo "3️⃣  Required Fields"
  validate_required_fields "$skill_path"
  total_errors=$((total_errors + $?))
  echo ""

  echo "4️⃣  Content Quality"
  validate_content_quality "$skill_path"
  # Warnings only, don't count as errors
  echo ""

  echo "5️⃣  Activation Patterns"
  validate_activation_patterns "$skill_path"
  # Warnings only, don't count as errors
  echo ""

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SUMMARY"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if [ $total_errors -eq 0 ]; then
    echo "✅ VALIDATION PASSED!"
    echo ""
    echo "Your skill is properly structured and ready to use."
    echo ""
    echo "Next steps:"
    echo "  1. Restart Claude Code to load the skill"
    echo "  2. Test with a trigger question"
    echo "  3. Verify skill activates correctly"
  else
    echo "❌ VALIDATION FAILED!"
    echo ""
    echo "Total errors: $total_errors"
    echo ""
    echo "Please fix the errors above and re-run validation."
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  return $total_errors
}
```

### Step 8: Provide Auto-Fix Suggestions

**For common issues**:

```bash
provide_autofix_suggestions() {
  local skill_path="$1"
  local errors="$2"

  if [ "$errors" -eq 0 ]; then
    return 0
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "AUTO-FIX SUGGESTIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Missing YAML frontmatter
  if ! head -1 "$skill_path" | grep -q '^---$'; then
    echo "🔧 FIX: Add YAML frontmatter"
    echo ""
    echo "Run this command:"
    echo ""
    echo "cat > '$skill_path' <<'EOF'"
    echo "---"
    echo "name: $(basename $(dirname "$skill_path"))"
    echo "description: [Add description with activation triggers]"
    echo "---"
    echo ""
    echo "$(cat "$skill_path")"
    echo "EOF"
    echo ""
  fi

  # Invalid name format
  name=$(grep '^name:' "$skill_path" | sed 's/^name: *//')
  if [ -n "$name" ] && [[ ! "$name" =~ ^[a-z0-9-]+$ ]]; then
    fixed_name=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
    echo "🔧 FIX: Update name format"
    echo ""
    echo "Run this command:"
    echo ""
    echo "sed -i '' 's/^name: .*/name: $fixed_name/' '$skill_path'"
    echo ""
  fi

  # Missing description triggers
  description=$(grep '^description:' "$skill_path" | sed 's/^description: *//')
  if [ -n "$description" ] && [[ ! "$description" =~ [Aa]ctivates ]]; then
    echo "🔧 FIX: Add activation triggers to description"
    echo ""
    echo "Edit the description to include:"
    echo ""
    echo "description: $description Activates for: [keyword1], [keyword2], [keyword3]."
    echo ""
  fi

  # File in wrong location
  if [ "$(basename "$skill_path")" != "SKILL.md" ]; then
    echo "🔧 FIX: Rename file to SKILL.md"
    echo ""
    echo "Run this command:"
    echo ""
    echo "mv '$skill_path' '$(dirname "$skill_path")/SKILL.md'"
    echo ""
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}
```

## Validation Examples

### Example 1: Valid Skill

**Input**: `~/.claude/skills/python-data-science/SKILL.md`

**Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL VALIDATION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 File: ~/.claude/skills/python-data-science/SKILL.md
📅 Validated: 2025-01-15 14:30:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Directory Structure
✅ Directory structure: PASSED

2️⃣  YAML Frontmatter
✅ YAML frontmatter structure: PASSED

3️⃣  Required Fields
✅ Required fields: PASSED
   name: python-data-science
   description: Python best practices for data science projects. Explains pandas DataFrame...

4️⃣  Content Quality
✅ Content quality: PASSED
   Sections: 6
   Content length: 3245 characters

5️⃣  Activation Patterns
✅ Activation patterns: PASSED
   Trigger count: ~12

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VALIDATION PASSED!

Your skill is properly structured and ready to use.

Next steps:
  1. Restart Claude Code to load the skill
  2. Test with a trigger question
  3. Verify skill activates correctly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example 2: Invalid Skill (Multiple Errors)

**Input**: `~/.claude/skills/MySkill/skill.md`

**Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL VALIDATION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 File: ~/.claude/skills/MySkill/skill.md
📅 Validated: 2025-01-15 14:30:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Directory Structure
❌ ERROR: File must be named 'SKILL.md' (case-sensitive)
   Found: skill.md
   Fix: mv '~/.claude/skills/MySkill/skill.md' '~/.claude/skills/MySkill/SKILL.md'
⚠️  WARNING: Directory name should be lowercase with hyphens
   Found: MySkill
   Suggested: myskill
❌ Directory structure: FAILED (1 errors)

2️⃣  YAML Frontmatter
❌ ERROR: File must start with '---' (YAML frontmatter)
   Found: # My Skill
   Fix: Add '---' as first line
❌ YAML frontmatter structure: FAILED (1 errors)

3️⃣  Required Fields
❌ ERROR: Missing required field 'name'
   Fix: Add 'name: your-skill-name' to YAML frontmatter
❌ ERROR: Missing required field 'description'
   Fix: Add 'description: [what skill does]' to YAML frontmatter
❌ Required fields: FAILED (2 errors)

4️⃣  Content Quality
⚠️  WARNING: No content after YAML frontmatter
   Add skill documentation, examples, and best practices

5️⃣  Activation Patterns
⚠️  WARNING: No description to validate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ VALIDATION FAILED!

Total errors: 4

Please fix the errors above and re-run validation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTO-FIX SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 FIX: Add YAML frontmatter

Run this command:

cat > '~/.claude/skills/MySkill/skill.md' <<'EOF'
---
name: myskill
description: [Add description with activation triggers]
---

# My Skill
EOF

🔧 FIX: Rename file to SKILL.md

Run this command:

mv '~/.claude/skills/MySkill/skill.md' '~/.claude/skills/MySkill/SKILL.md'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Batch Validation

**Validate all skills in a directory**:

```bash
validate_all_skills() {
  local skills_dir="$1"
  local total_skills=0
  local passed_skills=0
  local failed_skills=0

  echo "Scanning for skills in: $skills_dir"
  echo ""

  # Find all SKILL.md files
  while IFS= read -r skill_file; do
    ((total_skills++))

    echo "Validating: $skill_file"

    if generate_validation_report "$skill_file"; then
      ((passed_skills++))
    else
      ((failed_skills++))
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
  done < <(find "$skills_dir" -name "SKILL.md" -type f)

  echo "BATCH VALIDATION SUMMARY"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Total skills: $total_skills"
  echo "✅ Passed: $passed_skills"
  echo "❌ Failed: $failed_skills"
  echo ""

  if [ $failed_skills -eq 0 ]; then
    echo "✅ All skills validated successfully!"
  else
    echo "⚠️  $failed_skills skill(s) need attention"
  fi
}
```

## Summary

**Validation covers**:
1. ✅ Directory structure (subdirectory, filename)
2. ✅ YAML frontmatter (format, syntax)
3. ✅ Required fields (name, description)
4. ✅ Field constraints (length, format)
5. ✅ Content quality (structure, examples)
6. ✅ Activation patterns (triggers, keywords)

**Report includes**:
- ✅ Pass/fail status for each check
- ✅ Error messages with line numbers
- ✅ Auto-fix suggestions for common issues
- ✅ Overall summary and next steps

**Remember**: Fix all errors before using the skill. Restart Claude Code after fixes!
