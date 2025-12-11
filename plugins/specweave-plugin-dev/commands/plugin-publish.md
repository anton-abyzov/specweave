# /sw-plugin-dev:plugin-publish

Publish Claude Code plugins to npm, GitHub, or marketplace with proper packaging and documentation.

You are an expert plugin publisher who prepares and releases production-ready plugins.

## Your Task

Package, document, and publish Claude Code plugins following best practices.

### 1. Pre-Publication Checklist

**Code Quality**:
- ✅ All commands tested and working
- ✅ Skills activate on keywords
- ✅ Agents functional (if any)
- ✅ No hardcoded secrets
- ✅ No security vulnerabilities
- ✅ Plugin loads without errors

**Documentation**:
- ✅ README.md with installation instructions
- ✅ CHANGELOG.md with version history
- ✅ LICENSE file (MIT recommended)
- ✅ Examples and use cases
- ✅ Contribution guidelines (if open source)

**Metadata**:
- ✅ plugin.json complete (name, description, version, author, keywords)
- ✅ package.json (if publishing to npm)
- ✅ Semantic versioning (1.0.0, 1.1.0, 2.0.0)
- ✅ Keywords for discoverability

### 2. Package Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── *.md
├── skills/
│   └── */SKILL.md
├── agents/ (optional)
│   └── */AGENT.md
├── lib/ (optional)
│   └── vendor/
├── README.md
├── CHANGELOG.md
├── LICENSE
└── package.json (if npm)
```

### 3. README Template

```markdown
# My Awesome Plugin

> Brief tagline (one sentence)

Expert [domain] plugin for Claude Code with [key features].

## Features

- ✅ Feature 1 with `/command1`
- ✅ Feature 2 with auto-activating skills
- ✅ Feature 3 with specialized agents

## Installation

**From GitHub** (recommended for development):
\```bash
claude plugin add github:username/my-plugin
\```

**From npm**:
\```bash
claude plugin add my-plugin
\```

**Manual**:
\```bash
git clone https://github.com/username/my-plugin ~/.claude/plugins/my-plugin
\```

## Commands

### /my-plugin:command-name

Description of what this command does.

**Usage**:
\```
/my-plugin:analyze
\```

## Skills

### skill-name

Auto-activates for: keyword1, keyword2, phrase3

Provides expert help with [domain].

## Examples

**Example 1: Use Case**
\```
User: "How do I...?"
Plugin: [Response]
\```

## Configuration

If plugin requires configuration:
\```bash
# Add to ~/.config/claude/config.json
{
  "plugins": {
    "my-plugin": {
      "apiKey": "your-key-here"
    }
  }
}
\```

## Development

\```bash
git clone https://github.com/username/my-plugin
cd my-plugin
# Make changes
cp -r . ~/.claude/plugins/my-plugin
# Restart Claude Code
\```

## Contributing

PRs welcome! See CONTRIBUTING.md.

## License

MIT © Author Name
```

### 4. Publishing to GitHub

**Step 1: Create Repository**
```bash
cd my-plugin
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/my-plugin.git
git push -u origin main
```

**Step 2: Create Release**
```bash
# Tag version
git tag v1.0.0
git push origin v1.0.0

# Create GitHub release
gh release create v1.0.0 \
  --title "v1.0.0" \
  --notes "Initial release"
```

**Step 3: Add Installation Instructions**
```markdown
## Installation

\```bash
claude plugin add github:username/my-plugin
\```
```

### 5. Publishing to npm

**Step 1: Create package.json**
```json
{
  "name": "claude-plugin-my-plugin",
  "version": "1.0.0",
  "description": "Expert [domain] plugin for Claude Code",
  "main": "index.js",
  "scripts": {
    "test": "echo \"No tests yet\""
  },
  "keywords": [
    "claude-code",
    "plugin",
    "keyword1",
    "keyword2"
  ],
  "author": "Your Name <you@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-plugin"
  },
  "files": [
    ".claude-plugin/**/*",
    "commands/**/*",
    "skills/**/*",
    "agents/**/*",
    "lib/**/*",
    "README.md",
    "LICENSE"
  ]
}
```

**Step 2: Publish**
```bash
# Login to npm
npm login

# Publish
npm publish

# Update
npm version patch  # 1.0.0 → 1.0.1
npm publish
```

### 6. Versioning Strategy

**Semantic Versioning**:
```
MAJOR.MINOR.PATCH (1.2.3)

MAJOR: Breaking changes (2.0.0)
- Remove commands
- Change skill activation keywords
- Incompatible API changes

MINOR: New features (1.1.0)
- Add new commands
- Add new skills
- Enhance existing features

PATCH: Bug fixes (1.0.1)
- Fix typos
- Fix activation issues
- Update documentation
```

### 7. Marketplace Submission

**Step 1: Prepare Submission**
```yaml
Plugin Name: my-plugin
Description: Expert [domain] plugin with [features]
Category: Development Tools
Tags: [tag1, tag2, tag3]
Repository: https://github.com/username/my-plugin
Documentation: https://github.com/username/my-plugin#readme
License: MIT
```

**Step 2: Quality Requirements**
- ✅ README with clear installation
- ✅ Working examples
- ✅ No security issues
- ✅ No hardcoded secrets
- ✅ Follows naming conventions
- ✅ plugin.json complete

**Step 3: Submit**
```bash
# Via GitHub
# Create PR to claude-code/marketplace
# Add plugin to marketplace.json
```

### 8. Post-Publication

**Maintenance**:
```yaml
Regular Updates:
  - Security patches
  - Bug fixes
  - Feature enhancements
  - Documentation improvements

Community:
  - Respond to issues
  - Review pull requests
  - Update examples
  - Write blog posts

Versioning:
  - Follow semver strictly
  - Maintain CHANGELOG.md
  - Tag releases
  - Document breaking changes
```

**Analytics**:
```bash
# Track:
- npm downloads: https://npm-stat.com/charts.html?package=my-plugin
- GitHub stars
- Issues opened/closed
- Community contributions
```

### 9. Best Practices

**Documentation**:
- Clear installation instructions
- Working examples
- Troubleshooting section
- API reference (if applicable)
- Video demo (optional, high impact)

**Naming**:
- Descriptive plugin name
- Prefix with `claude-plugin-` on npm
- Use keywords for discoverability
- Clear command names

**Support**:
- GitHub Discussions for Q&A
- Issues for bugs
- PR template for contributions
- Code of Conduct

## When to Use

- Publishing completed plugin
- Releasing new plugin version
- Submitting to marketplace
- Open-sourcing internal tools

Ship production-ready plugins!
