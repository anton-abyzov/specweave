---
name: sw-tooling:skill-package
description: Package Claude Code skill for distribution via npm, GitHub, or direct sharing. Creates distributable archives with installation instructions and validation.
---

# Package Skill for Distribution

**Distribution-Ready Packaging**: Create shareable skill packages with installation scripts and documentation.

You are helping the user package a Claude Code skill for distribution to others.

## Distribution Methods

### 1. NPM Package
- Professional distribution
- Versioning and updates
- `npm install` workflow
- Best for public skills

### 2. GitHub Repository
- Source control integration
- Easy cloning and updates
- Issue tracking
- Best for collaborative skills

### 3. Direct Archive (.tar.gz)
- Self-contained package
- No dependencies
- Manual installation
- Best for private/internal sharing

### 4. Plugin Bundle
- Multiple skills in one package
- Shared dependencies
- Professional presentation
- Best for skill collections

## Steps

### Step 1: Validate Skill

**Before packaging, ensure skill is valid**:

```bash
validate_before_package() {
  local skill_path="$1"

  echo "Validating skill before packaging..."

  # Run validation (from skill-validate command)
  if ! validate_skill "$skill_path"; then
    echo "❌ Skill validation failed"
    echo "   Fix errors before packaging"
    return 1
  fi

  echo "✅ Skill validation passed"
  return 0
}
```

### Step 2: Gather Package Metadata

**Collect information for package**:

1. **Package Name**: npm-compatible name (e.g., `claude-skill-python-data-science`)
2. **Version**: Semantic versioning (e.g., `1.0.0`)
3. **Description**: Brief summary for package managers
4. **Author**: Name and email
5. **License**: MIT, Apache-2.0, etc.
6. **Repository**: GitHub URL (optional)
7. **Keywords**: For discoverability

**Example**:
```json
{
  "name": "claude-skill-python-data-science",
  "version": "1.0.0",
  "description": "Python data science expert skill for Claude Code",
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "repository": "https://github.com/username/claude-skill-python-data-science",
  "keywords": ["claude", "skill", "python", "data-science", "pandas", "numpy"]
}
```

### Step 3: Create Package Structure

**Standard package structure**:

```
package-name/
├── README.md                    # Installation and usage
├── LICENSE                      # License file
├── package.json                 # NPM metadata (if NPM)
├── install.sh                   # Installation script
├── uninstall.sh                 # Uninstall script
├── skill/                       # Skill files
│   └── SKILL.md                 # The actual skill
└── examples/                    # Usage examples (optional)
    └── example-conversation.md
```

**Create structure**:

```bash
create_package_structure() {
  local skill_path="$1"
  local package_name="$2"
  local package_dir="$3"

  # Create directories
  mkdir -p "$package_dir/skill"
  mkdir -p "$package_dir/examples"

  # Copy skill
  cp "$skill_path" "$package_dir/skill/SKILL.md"

  echo "✅ Package structure created"
}
```

### Step 4: Generate README.md

**Comprehensive README template**:

```markdown
# [Skill Name]

[Brief description of what the skill does]

## Installation

### Personal Skills (Recommended)

```bash
# Clone or download this repository
git clone [repository-url]

# Run installation script
cd [package-name]
bash install.sh
```

Or manually:

```bash
# Copy skill to personal skills directory
mkdir -p ~/.claude/skills/[skill-name]
cp skill/SKILL.md ~/.claude/skills/[skill-name]/SKILL.md
```

### Project Skills

```bash
# Copy skill to project skills directory
mkdir -p .claude/skills/[skill-name]
cp skill/SKILL.md .claude/skills/[skill-name]/SKILL.md
```

### NPM (if published)

```bash
npm install -g [package-name]
```

## Activation

This skill activates automatically when you mention:
- [Trigger keyword 1]
- [Trigger keyword 2]
- [Trigger phrase 1]

## Examples

### Example 1: [Use Case]

**You ask:**
> [Example question]

**Skill provides:**
[Description of response]

### Example 2: [Use Case]

**You ask:**
> [Example question]

**Skill provides:**
[Description of response]

## Features

- ✅ [Feature 1]
- ✅ [Feature 2]
- ✅ [Feature 3]

## What This Skill Knows

[Bullet list of expertise areas]

## Uninstallation

```bash
bash uninstall.sh
```

Or manually:

```bash
rm -rf ~/.claude/skills/[skill-name]
```

## License

[License name] - See LICENSE file for details

## Author

[Author name and contact]

## Contributing

[Contribution guidelines if applicable]

## Version History

### 1.0.0 (YYYY-MM-DD)
- Initial release
- [Feature 1]
- [Feature 2]
```

**Generate README**:

```bash
generate_readme() {
  local package_dir="$1"
  local skill_name="$2"
  local description="$3"
  local author="$4"
  local license="$5"

  cat > "$package_dir/README.md" <<EOF
# $skill_name

$description

## Installation

### Personal Skills (Recommended)

\`\`\`bash
# Clone or download this repository
git clone [repository-url]

# Run installation script
cd [package-name]
bash install.sh
\`\`\`

Or manually:

\`\`\`bash
# Copy skill to personal skills directory
mkdir -p ~/.claude/skills/$skill_name
cp skill/SKILL.md ~/.claude/skills/$skill_name/SKILL.md
\`\`\`

## Activation

This skill activates automatically when needed.

## License

$license

## Author

$author
EOF

  echo "✅ README.md generated"
}
```

### Step 5: Create Installation Script

**Universal installation script** (`install.sh`):

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Skill configuration
SKILL_NAME="[skill-name]"
SKILL_DISPLAY_NAME="[Skill Display Name]"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "INSTALLING: $SKILL_DISPLAY_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if skill already installed
if [ -d "$HOME/.claude/skills/$SKILL_NAME" ]; then
  echo -e "${YELLOW}⚠️  Skill already installed at: ~/.claude/skills/$SKILL_NAME${NC}"
  echo ""
  read -p "Overwrite existing installation? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
  fi
  rm -rf "$HOME/.claude/skills/$SKILL_NAME"
fi

# Create skills directory if needed
mkdir -p "$HOME/.claude/skills"

# Copy skill
echo "📦 Installing skill..."
mkdir -p "$HOME/.claude/skills/$SKILL_NAME"
cp skill/SKILL.md "$HOME/.claude/skills/$SKILL_NAME/SKILL.md"

# Validate installation
if [ -f "$HOME/.claude/skills/$SKILL_NAME/SKILL.md" ]; then
  echo -e "${GREEN}✅ Installation successful!${NC}"
  echo ""
  echo "📁 Installed to: ~/.claude/skills/$SKILL_NAME/"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "NEXT STEPS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. 🔄 Restart Claude Code to load the skill"
  echo "2. 🧪 Test the skill by asking a relevant question"
  echo "3. 📚 See README.md for usage examples"
  echo ""
  echo "To uninstall: bash uninstall.sh"
  echo ""
else
  echo -e "${RED}❌ Installation failed${NC}"
  exit 1
fi
```

**Generate install.sh**:

```bash
generate_install_script() {
  local package_dir="$1"
  local skill_name="$2"
  local skill_display_name="$3"

  cat > "$package_dir/install.sh" <<'INSTALL_SCRIPT'
#!/bin/bash
set -e

# [Installation script content from above]
INSTALL_SCRIPT

  # Make executable
  chmod +x "$package_dir/install.sh"

  echo "✅ install.sh generated"
}
```

### Step 6: Create Uninstallation Script

**Uninstallation script** (`uninstall.sh`):

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Skill configuration
SKILL_NAME="[skill-name]"
SKILL_DISPLAY_NAME="[Skill Display Name]"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "UNINSTALLING: $SKILL_DISPLAY_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if skill is installed
if [ ! -d "$HOME/.claude/skills/$SKILL_NAME" ]; then
  echo -e "${YELLOW}⚠️  Skill not found at: ~/.claude/skills/$SKILL_NAME${NC}"
  echo ""
  echo "Nothing to uninstall."
  exit 0
fi

# Confirm uninstallation
echo "This will remove: ~/.claude/skills/$SKILL_NAME/"
echo ""
read -p "Continue with uninstallation? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Uninstallation cancelled."
  exit 0
fi

# Remove skill
rm -rf "$HOME/.claude/skills/$SKILL_NAME"

# Verify removal
if [ ! -d "$HOME/.claude/skills/$SKILL_NAME" ]; then
  echo -e "${GREEN}✅ Uninstallation successful!${NC}"
  echo ""
  echo "Skill removed from: ~/.claude/skills/$SKILL_NAME/"
  echo ""
  echo "🔄 Restart Claude Code to complete uninstallation"
else
  echo -e "${RED}❌ Uninstallation failed${NC}"
  exit 1
fi
```

### Step 7: Add License File

**Common licenses**:

**MIT License** (most permissive):
```
MIT License

Copyright (c) [year] [author]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Step 8: Create package.json (NPM Only)

**NPM package.json**:

```json
{
  "name": "claude-skill-[skill-name]",
  "version": "1.0.0",
  "description": "[Skill description]",
  "main": "index.js",
  "scripts": {
    "postinstall": "bash install.sh",
    "preuninstall": "bash uninstall.sh"
  },
  "keywords": [
    "claude",
    "claude-code",
    "skill",
    "[domain]"
  ],
  "author": "[Author Name] <[email]>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/[username]/[repo].git"
  },
  "bugs": {
    "url": "https://github.com/[username]/[repo]/issues"
  },
  "homepage": "https://github.com/[username]/[repo]#readme",
  "files": [
    "skill/",
    "install.sh",
    "uninstall.sh",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### Step 9: Create Archive

**For direct distribution**:

```bash
create_archive() {
  local package_dir="$1"
  local package_name="$2"
  local version="$3"

  # Archive filename
  archive_name="${package_name}-${version}.tar.gz"

  # Create archive
  tar -czf "$archive_name" -C "$(dirname "$package_dir")" "$(basename "$package_dir")"

  # Verify archive
  if [ -f "$archive_name" ]; then
    echo "✅ Archive created: $archive_name"
    echo ""
    echo "Archive contents:"
    tar -tzf "$archive_name" | head -20
    echo ""
    echo "Distribution ready!"
  else
    echo "❌ Failed to create archive"
    return 1
  fi
}
```

### Step 10: Generate Distribution Instructions

**Include installation guide**:

```markdown
# Distribution Instructions

## For NPM

1. Publish to npm:
   ```bash
   npm publish
   ```

2. Users install with:
   ```bash
   npm install -g [package-name]
   ```

## For GitHub

1. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin [repository-url]
   git push -u origin main
   ```

2. Create release:
   - Go to GitHub → Releases → New Release
   - Tag: v1.0.0
   - Upload .tar.gz archive
   - Add release notes

3. Users install with:
   ```bash
   git clone [repository-url]
   cd [package-name]
   bash install.sh
   ```

## For Direct Sharing

1. Share the .tar.gz archive

2. Users install with:
   ```bash
   tar -xzf [package-name]-1.0.0.tar.gz
   cd [package-name]
   bash install.sh
   ```

## Verification

After installation, users should:
1. Restart Claude Code
2. Test skill activation
3. Report issues
```

## Packaging Examples

### Example 1: NPM Package

**Input**:
- Skill: `python-data-science`
- Distribution: NPM
- Version: 1.0.0
- License: MIT

**Output structure**:
```
claude-skill-python-data-science/
├── README.md
├── LICENSE
├── package.json
├── install.sh
├── uninstall.sh
├── skill/
│   └── SKILL.md
└── examples/
    └── example-conversation.md
```

**package.json**:
```json
{
  "name": "claude-skill-python-data-science",
  "version": "1.0.0",
  "description": "Python data science expert skill for Claude Code",
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "keywords": ["claude", "skill", "python", "data-science"]
}
```

**Publishing**:
```bash
npm publish
```

### Example 2: GitHub Repository

**Input**:
- Skill: `kubernetes-expert`
- Distribution: GitHub
- Repository: `github.com/username/claude-skill-k8s`

**Setup**:
```bash
# Initialize repo
git init
git add .
git commit -m "Initial commit: Kubernetes expert skill"

# Push to GitHub
git remote add origin https://github.com/username/claude-skill-k8s.git
git push -u origin main

# Create release
gh release create v1.0.0 --title "v1.0.0" --notes "Initial release"
```

**Users install**:
```bash
git clone https://github.com/username/claude-skill-k8s.git
cd claude-skill-k8s
bash install.sh
```

### Example 3: Direct Archive

**Input**:
- Skill: `project-docs-helper`
- Distribution: Internal sharing
- Archive: `project-docs-helper-1.0.0.tar.gz`

**Create archive**:
```bash
# Package structure already created
tar -czf project-docs-helper-1.0.0.tar.gz project-docs-helper/

# Share archive via email, shared drive, etc.
```

**Users install**:
```bash
tar -xzf project-docs-helper-1.0.0.tar.gz
cd project-docs-helper
bash install.sh
```

## Quality Checklist

**Before distributing, verify**:

- [ ] ✅ Skill validated successfully
- [ ] ✅ README.md includes installation instructions
- [ ] ✅ LICENSE file present
- [ ] ✅ install.sh script works correctly
- [ ] ✅ uninstall.sh script works correctly
- [ ] ✅ Examples included
- [ ] ✅ Version number set
- [ ] ✅ Author information complete
- [ ] ✅ Repository URL (if applicable)
- [ ] ✅ Keywords for discoverability
- [ ] ✅ Archive created (if direct distribution)
- [ ] ✅ Tested installation on clean system

## Publishing to NPM

**Step-by-step**:

```bash
# 1. Login to npm
npm login

# 2. Validate package.json
npm pack --dry-run

# 3. Publish
npm publish

# 4. Verify
npm view [package-name]
```

**Scope packages (recommended)**:
```json
{
  "name": "@your-username/claude-skill-python-data-science",
  ...
}
```

## Summary

**Package includes**:
1. ✅ Skill file (SKILL.md)
2. ✅ README with installation instructions
3. ✅ LICENSE file
4. ✅ install.sh script
5. ✅ uninstall.sh script
6. ✅ package.json (NPM only)
7. ✅ Examples (optional)
8. ✅ Archive file (direct distribution)

**Distribution methods**:
1. ✅ NPM (`npm install -g`)
2. ✅ GitHub (clone + install.sh)
3. ✅ Direct archive (.tar.gz)

**Remember**: Test installation on clean system before distributing!
