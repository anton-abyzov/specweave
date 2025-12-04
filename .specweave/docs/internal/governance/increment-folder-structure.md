# Increment Folder Structure - Official Standard

**Status**: Enforced
**Created**: 2025-11-24
**Last Updated**: 2025-11-24

## Purpose

This document defines the **ONLY allowed** structure for `.specweave/increments/` directory. Violations of this standard cause:
- Hook failures (hooks expect specific structure)
- Status line desync (can't find increment files)
- Archive/restore failures (breaks increment lifecycle)
- Confusion about where files belong

## The Standard

### Root Level (`.specweave/increments/`)

**ONLY 3 things allowed**:

1. **Numbered increment folders**: `####-increment-name/` (e.g., `0001-feature-name/`, `0053-safe-feature-deletion/`)
2. **Archive folder**: `_archive/` (for archived increments)
3. **README.md** (optional, documents the folder structure)

**❌ NOT ALLOWED**:
- `_working/` folders
- `reports/` folders at root
- `logs/` folders at root
- `scripts/` folders at root
- Any other directories or files

### Increment Folder Structure (`.specweave/increments/####-increment-name/`)

**ONLY 4 files at root**:
1. `spec.md` (specification)
2. `plan.md` (implementation plan)
3. `tasks.md` (task breakdown with embedded tests)
4. `metadata.json` (increment metadata)

**Everything else goes in subfolders**:
- `reports/` - Analysis reports, implementation summaries, incident reports
- `logs/` - Increment-specific logs
- `scripts/` - Increment-specific helper scripts

**✅ CORRECT Example**:
```
.specweave/increments/
├── 0001-feature-name/
│   ├── spec.md                              ✅ Root
│   ├── plan.md                              ✅ Root
│   ├── tasks.md                             ✅ Root
│   ├── metadata.json                        ✅ Root
│   ├── reports/                             ✅ Subfolder
│   │   ├── analysis-report.md
│   │   └── implementation-summary.md
│   ├── logs/                                ✅ Subfolder
│   │   └── execution.log
│   └── scripts/                             ✅ Subfolder
│       └── helper.sh
├── 0002-another-feature/
│   ├── spec.md
│   ├── plan.md
│   ├── tasks.md
│   └── metadata.json
├── _archive/                                ✅ Archive folder
│   └── 0000-old-increment/
└── README.md                                ✅ Documentation
```

**❌ WRONG Examples**:

```
.specweave/increments/
├── _working/                                ❌ No _working folders!
│   └── repository-hosting-fix/
├── reports/                                 ❌ Reports at root!
│   └── some-analysis.md
├── 0001-feature-name/
│   ├── spec.md                              ✅ Correct
│   ├── plan.md                              ✅ Correct
│   ├── tasks.md                             ✅ Correct
│   ├── metadata.json                        ✅ Correct
│   └── analysis-report.md                   ❌ Should be in reports/!
└── some-notes.txt                           ❌ No files at root!
```

## Rationale

### Why These Rules?

1. **Hooks expect this structure**: Status line hooks scan for `tasks.md`, AC sync hooks look for `spec.md`. Wrong structure = broken hooks.

2. **Archive/restore relies on it**: Archive moves `####-increment-name/` to `_archive/`. Extra folders break this.

3. **Status line parsing**: The status line parses increment folders by pattern `####-increment-name/`. Violations confuse the parser.

4. **Clean organization**: Clear rules prevent "junk drawer" syndrome where files accumulate in wrong places.

5. **Git cleanliness**: Pre-commit hooks validate structure. Violations block commits.

## Enforcement

### Automated Validation

**Pre-commit hook** (coming soon): Blocks commits with structure violations

**Manual validation**:
```bash
# Check for violations at root
ls -1 .specweave/increments/ | grep -v "^[0-9]" | grep -v "^_archive" | grep -v "^README.md"
# Should output NOTHING

# Check for violations inside increment folders
find .specweave/increments/_archive/0053-* -maxdepth 1 -type f | grep -v -E "(spec|plan|tasks|metadata)"
# Should output NOTHING (all files should be in spec.md, plan.md, tasks.md, metadata.json)
```

### Recovery from Violations

**If you find violations** (e.g., `_working/`, `reports/` at root):

1. **Identify the correct increment**: Search for related content
   ```bash
   grep -r "keyword" .specweave/increments/*/spec.md
   ```

2. **Move to correct location**:
   ```bash
   mv .specweave/increments/reports/file.md \
      .specweave/increments/_archive/0053-increment-name/reports/file.md
   ```

3. **Delete empty violations**:
   ```bash
   rm -rf .specweave/increments/_working
   ```

4. **Verify cleanup**:
   ```bash
   ls -1 .specweave/increments/ | grep -v "^[0-9]" | grep -v "^_archive" | grep -v "^README.md"
   ```

## Related Documentation

- **CLAUDE.md Section 2**: "Increment Folder Structure"
- **CLAUDE.md Section 7**: "Source of Truth: tasks.md + spec.md"
- **ADR-0061**: "No Increment-to-Increment References"
- **Hook Safety**: `.specweave/docs/internal/../operations/hook-crash-recovery.md`

## Change History

| Date | Change | Reason |
|------|--------|--------|
| 2025-11-24 | Initial standard created | User discovered `_working/` and `reports/` violations |
| 2025-11-24 | Cleaned up 3 violations | Moved files to correct increments, removed non-standard folders |

## FAQ

**Q: Can I have a `temp/` folder at the root?**
A: ❌ No. Use `.specweave/increments/####-increment-name/scripts/temp/` instead.

**Q: Where do multi-increment reports go?**
A: Pick the primary increment and put reports there. Cross-reference from other increments if needed.

**Q: Can I have a `docs/` folder inside an increment?**
A: ✅ Yes, as long as it's inside a numbered increment folder (not at root). But prefer `reports/` for consistency.

**Q: What about `node_modules/` or build artifacts?**
A: These should NEVER be in `.specweave/increments/`. Use `.gitignore` to exclude them.

**Q: Can I have subdirectories inside `reports/`?**
A: ✅ Yes! Example: `reports/analysis/`, `reports/incidents/`, etc.

---

**Remember**: When in doubt, keep it simple. 4 files at root, everything else in subfolders.
