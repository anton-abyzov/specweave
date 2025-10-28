---
name: specweave-create-project
description: Bootstrap SpecWeave in new or existing project with backup/merge logic for brownfield safety
---

# Create SpecWeave Project

**Brownfield Safe**: Automatically detects existing .claude/ directories and backs up your files before installation.

This command bootstraps SpecWeave in your project with intelligent conflict resolution.

---

## Usage

```bash
/specweave create-project
```

**No arguments needed** - automatically detects greenfield vs. brownfield project.

---

## What This Does

### Detection Logic

1. **Checks for existing .claude/ or .specweave/ directories**
2. **Classifies project type**:
   - **Greenfield**: No existing directories → Clean install
   - **Brownfield**: Existing directories → Backup + merge install

### Greenfield Installation (Clean Slate)

If no existing `.claude/` or `.specweave/` directories:

```
📊 Analyzing project...
✅ Greenfield project detected
   Safe to install without conflicts

📥 Installing SpecWeave...
   ✅ Directory structure created
   ✅ Installed 11 SpecWeave commands
   ✅ Installed 24 SpecWeave skills
   ✅ Configuration created

✅ SpecWeave Installation Complete!
```

**Installed Structure**:
```
project/
├── .claude/
│   ├── commands/
│   │   ├── specweave.md              (master router)
│   │   ├── specweave-inc.md          (create increment)
│   │   ├── specweave-build.md        (execute tasks)
│   │   ├── specweave-next.md         (smart transition)
│   │   └── ... (other commands)
│   ├── skills/
│   │   ├── specweave-detector/
│   │   ├── context-loader/
│   │   └── ... (other skills)
│   └── hooks/
│       └── specweave-post-task-completion.sh
│
└── .specweave/
    ├── config.yaml
    ├── increments/
    │   └── _backlog/
    └── docs/
        ├── internal/
        └── public/
```

### Brownfield Installation (Safe Merge)

If existing `.claude/` or `.specweave/` directories found:

```
📊 Analyzing project...
⚠️  Brownfield project detected
   Will backup existing files before installation

📦 Backing up existing directories...
   ⚠️  Existing directory found: .claude/commands
      Creating backup: .claude/commands.backup-1698765432
   ✅ Backup created

   ⚠️  Existing directory found: .claude/skills
      Creating backup: .claude/skills.backup-1698765432
   ✅ Backup created

✅ Created 2 backup(s) with timestamp: 1698765432

📥 Installing SpecWeave...
   ✅ Directory structure created
   ✅ Installed 11 SpecWeave commands
   ✅ Installed 24 SpecWeave skills
   ✅ Configuration created

🔄 Restoring user files...
   Merging user commands...
     ✓ Preserved: build.md
     ✓ Preserved: test.md
     ✓ Preserved: custom-command.md

   Merging user skills...
     ✓ Preserved: my-skill/SKILL.md

✅ User files restored (SpecWeave files not overwritten)

✅ SpecWeave Installation Complete!

📦 Backups Created:
   .claude/commands.backup-1698765432
   .claude/skills.backup-1698765432

✅ Your original files are preserved!
```

**Merged Structure**:
```
project/
├── .claude/
│   ├── commands/
│   │   ├── build.md                  (YOUR original - preserved)
│   │   ├── test.md                   (YOUR original - preserved)
│   │   ├── custom-command.md         (YOUR original - preserved)
│   │   ├── specweave.md              (SpecWeave - new)
│   │   ├── specweave-inc.md          (SpecWeave - new)
│   │   ├── specweave-build.md        (SpecWeave - new)
│   │   └── ... (other SpecWeave commands)
│   │
│   ├── commands.backup-1698765432/   (Timestamped backup)
│   │   ├── build.md                  (Original backup)
│   │   └── test.md                   (Original backup)
│   │
│   └── skills/
│       ├── my-skill/                 (YOUR original - preserved)
│       ├── specweave-detector/       (SpecWeave - new)
│       └── ... (other SpecWeave skills)
│
└── .specweave/
    └── ... (SpecWeave structure)
```

---

## Key Features

### 1. No Collisions

**Problem** (without namespacing):
```
User's project: .claude/commands/build.md
SpecWeave:      .claude/commands/build.md
Result: ❌ User's file overwritten!
```

**Solution** (with namespacing):
```
User's project: .claude/commands/build.md       (preserved)
SpecWeave:      .claude/commands/specweave-build.md  (new)
Result: ✅ Both coexist!
```

### 2. Automatic Backups

**Every installation in brownfield project**:
- Backs up `.claude/commands/` → `.claude/commands.backup-<timestamp>/`
- Backs up `.claude/skills/` → `.claude/skills.backup-<timestamp>/`
- Backs up `.claude/hooks/` → `.claude/hooks.backup-<timestamp>/`
- Timestamp format: Unix epoch (e.g., `1698765432`)

**Rollback**:
```bash
# If something goes wrong, restore from backup
mv .claude/commands.backup-1698765432 .claude/commands
```

### 3. Smart Merging

After installing SpecWeave files, the script:
1. Copies user's original files back
2. Skips files that would overwrite SpecWeave files
3. Preserves user's custom commands/skills/hooks
4. Reports which files were preserved

**Example**:
```
Merging user commands...
  ✓ Preserved: build.md         (your custom build)
  ✓ Preserved: deploy.md        (your custom deploy)
  ✗ Skipped: specweave-inc.md   (would overwrite SpecWeave)
```

### 4. Configuration

Creates `.specweave/config.yaml` with installation metadata:

```yaml
# SpecWeave Configuration
version: 0.2.0

project:
  name: my-project
  description: "Project managed with SpecWeave"
  created: 2025-10-28

workflow:
  wip_limit: 2
  auto_close:
    enabled: true
    strict_mode: true

commands:
  # SpecWeave commands are namespaced
  prefix: "specweave-"

  # Optional: Create aliases (uncomment to enable)
  # aliases:
  #   /inc: /specweave inc
  #   /build: /specweave build

installation:
  type: brownfield        # or greenfield
  installed_at: 2025-10-28 11:45:30
  backup_timestamp: 1698765432
```

---

## Implementation

This command executes the installation script:

```bash
# Location: scripts/install-brownfield.sh
bash scripts/install-brownfield.sh
```

### Installation Script Flow

```
1. Detect project type (greenfield vs. brownfield)
     ↓
2. If brownfield: Backup existing directories
     ↓
3. Install SpecWeave structure
     - Create directories
     - Copy commands (specweave-*.md)
     - Copy skills (with namespacing)
     - Copy hooks (specweave-*.sh)
     - Create config.yaml
     ↓
4. If brownfield: Merge user files back
     - Copy non-conflicting files
     - Preserve user's custom files
     - Report preserved files
     ↓
5. Report installation summary
     - Installed files
     - Backups created
     - Next steps
```

---

## Examples

### Example 1: Fresh Project (Greenfield)

**Project structure before**:
```
my-new-project/
├── src/
├── package.json
└── README.md
```

**Run**:
```bash
/specweave create-project
```

**Output**:
```
✅ Greenfield project detected
   Safe to install without conflicts

📥 Installing SpecWeave...
   ✅ Installed 11 commands
   ✅ Installed 24 skills
   ✅ Configuration created

✅ Installation Complete!

🚀 Next Steps:
   1. Create first increment:
      /specweave inc "User authentication"

   2. Check status:
      /specweave progress
```

### Example 2: Existing Project (Brownfield)

**Project structure before**:
```
my-existing-project/
├── .claude/
│   ├── commands/
│   │   ├── build.md       (user's custom)
│   │   └── deploy.md      (user's custom)
│   └── skills/
│       └── my-skill/
├── src/
└── package.json
```

**Run**:
```bash
/specweave create-project
```

**Output**:
```
⚠️  Brownfield project detected

📦 Backing up:
   .claude/commands/ → .claude/commands.backup-1698765432/
   .claude/skills/ → .claude/skills.backup-1698765432/

📥 Installing SpecWeave...
   ✅ Installed 11 commands
   ✅ Installed 24 skills

🔄 Merging user files:
   ✓ Preserved: build.md
   ✓ Preserved: deploy.md
   ✓ Preserved: my-skill/

✅ Installation Complete!

📦 Backups:
   .claude/commands.backup-1698765432
   .claude/skills.backup-1698765432

💡 Your custom commands still work!
   - /build (your custom)
   - /deploy (your custom)
   - /specweave build (SpecWeave's)
```

**Project structure after**:
```
my-existing-project/
├── .claude/
│   ├── commands/
│   │   ├── build.md              (YOURS - preserved)
│   │   ├── deploy.md             (YOURS - preserved)
│   │   ├── specweave.md          (SpecWeave)
│   │   ├── specweave-build.md    (SpecWeave)
│   │   └── ... (other SpecWeave commands)
│   │
│   ├── commands.backup-1698765432/  (Backup)
│   │   ├── build.md
│   │   └── deploy.md
│   │
│   ├── skills/
│   │   ├── my-skill/             (YOURS - preserved)
│   │   ├── specweave-detector/   (SpecWeave)
│   │   └── ... (other SpecWeave skills)
│   │
│   └── skills.backup-1698765432/    (Backup)
│       └── my-skill/
│
├── .specweave/                    (NEW)
│   ├── config.yaml
│   ├── increments/
│   └── docs/
│
├── src/
└── package.json
```

---

## Error Handling

### Script Not Found

```
❌ Error: Could not find installation script

Please ensure:
  1. SpecWeave is properly cloned/installed
  2. scripts/install-brownfield.sh exists
  3. You're in a project directory

Installation path:
  /path/to/specweave/scripts/install-brownfield.sh
```

### Permission Denied

```
❌ Error: Permission denied

Run with appropriate permissions:
  chmod +x scripts/install-brownfield.sh
  /specweave create-project
```

### Existing .specweave/

```
⚠️  Warning: .specweave/ already exists

Options:
  A. Backup and reinstall (recommended)
  B. Skip installation (keep existing)
  C. Merge new files only

Your choice? [A/B/C]
```

---

## Rollback

### If Installation Goes Wrong

**Option 1: Restore from backup**
```bash
# Restore commands
rm -rf .claude/commands
mv .claude/commands.backup-1698765432 .claude/commands

# Restore skills
rm -rf .claude/skills
mv .claude/skills.backup-1698765432 .claude/skills
```

**Option 2: Remove SpecWeave files only**
```bash
# Remove SpecWeave commands (keep yours)
rm .claude/commands/specweave*.md

# Remove SpecWeave skills (keep yours)
rm -rf .claude/skills/specweave-*

# Remove SpecWeave directory
rm -rf .specweave
```

---

## Related Commands

- `/specweave inc` - Create first increment after installation
- `/specweave progress` - Check status
- `/specweave` - Show help

---

## Configuration Options

### Enable Command Aliases (Optional)

Edit `.specweave/config.yaml`:

```yaml
commands:
  prefix: "specweave-"

  # Uncomment to enable short aliases
  aliases:
    /inc: /specweave inc
    /build: /specweave build
    /next: /specweave next
    /done: /specweave done
    /progress: /specweave progress
```

**After enabling**:
```bash
/inc "User auth"      # → routes to /specweave inc
/build                # → routes to /specweave build
```

**⚠️ Warning**: Only enable aliases if you're sure they won't conflict with existing commands!

---

## Best Practices

1. **Always use namespaced commands** in brownfield projects
   - `/specweave build` (safe)
   - `/build` (might conflict)

2. **Review backups before deleting**
   - Check `.claude/*.backup-*/` directories
   - Keep backups for at least one release cycle

3. **Document custom commands**
   - Add README to `.claude/commands/` explaining your commands
   - Prevents confusion between SpecWeave and custom commands

4. **Test in development first**
   - Try installation in test branch
   - Verify no conflicts
   - Then install in main branch

---

## FAQ

### Q: Will this overwrite my existing commands?

**A**: No! SpecWeave commands use `specweave-` prefix. Your commands are preserved.

### Q: What if I have a command named `specweave-something`?

**A**: The installation script will detect the conflict and:
1. Backup your file
2. Install SpecWeave's version
3. Report the conflict
4. You can manually merge if needed

### Q: Can I uninstall SpecWeave?

**A**: Yes!
```bash
# Remove SpecWeave files
rm .claude/commands/specweave*.md
rm -rf .claude/skills/specweave-*
rm -rf .specweave

# Optionally restore from backup
mv .claude/commands.backup-<timestamp> .claude/commands
```

### Q: Do I need to run this for every project?

**A**: Yes, SpecWeave is installed per-project (not globally) for isolation.

### Q: Can I customize SpecWeave commands?

**A**: Yes! Edit `.claude/commands/specweave-*.md` files. But note:
- Updates will overwrite customizations
- Consider creating separate custom commands instead

---

**💡 Remember**: SpecWeave is brownfield-safe by design. Your existing project structure and commands are always preserved!
