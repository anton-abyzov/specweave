# Folder Naming: specifications/ vs specs/, documentation/ vs docs/

## Current Structure

```
specweave/
├── specs/          # Business requirements
└── docs/           # All other knowledge
```

## Proposed

```
specweave/
├── specifications/     # Business requirements
└── documentation/      # All other knowledge
```

---

## Detailed Analysis

### Option 1: Current (`specs/` + `docs/`)

**Pros**:
- ✅ Concise, shorter paths
- ✅ Common in open source (most use `docs/`)
- ✅ Faster to type
- ✅ Familiar to developers

**Cons**:
- ❌ Less explicit/clear
- ❌ Abbreviations less professional
- ❌ "specs" could mean "specifications" or "spec files"
- ❌ Inconsistent levels of abbreviation

**Industry Examples**:
- React, Vue, TypeScript, Kubernetes: All use `docs/`
- Most don't have separate specs folder
- Those that do: `specs/`, `spec/`, or `requirements/`

---

### Option 2: Full Names (`specifications/` + `documentation/`)

**Pros**:
- ✅ Explicit and unambiguous
- ✅ Professional/formal
- ✅ Self-documenting
- ✅ Consistent (both full words)
- ✅ Clear what each folder contains
- ✅ Better for SpecWeave (spec-focused framework)

**Cons**:
- ❌ Longer paths
- ❌ More typing
- ❌ Less common (breaks convention)
- ❌ Verbose in file paths

**Example Paths**:
```
# Short
specs/modules/payments/stripe/spec.md
docs/architecture/payments.md

# Full
specifications/modules/payments/stripe/spec.md
documentation/architecture/payments.md
```

---

### Option 3: Hybrid (`specifications/` + `docs/`)

Keep industry standard `docs/`, but use full `specifications/` to emphasize SpecWeave's focus.

**Pros**:
- ✅ `docs/` is industry standard (familiar)
- ✅ `specifications/` emphasizes core concept
- ✅ Clear that specs are special in SpecWeave
- ✅ Reduces some verbosity

**Cons**:
- ❌ Inconsistent (one abbrev, one full)
- ❌ May feel unbalanced

---

## Recommendation: **Full Names** ✅

### Why Use `specifications/` and `documentation/`

1. **SpecWeave is spec-focused**
   - The framework is ABOUT specifications
   - `specifications/` emphasizes this core concept
   - Makes it crystal clear what the folder contains

2. **Professional & Explicit**
   - Enterprise-ready (sounds more professional)
   - No ambiguity
   - Self-documenting project structure

3. **Consistency**
   - Both full words
   - Same level of formality
   - Predictable naming pattern

4. **Better for Intent-Driven Development**
   - Clarity > Brevity
   - Explicit is better than implicit
   - Matches framework philosophy

5. **Unique Identity**
   - Sets SpecWeave apart from other frameworks
   - Not just another "docs/" project
   - Reinforces spec-first approach

---

## What Changes

### Directory Renaming

```bash
# Rename specs/ to specifications/
mv specs specifications

# Keep docs/ as documentation/ for consistency
mv docs documentation
```

### File Path Updates

**Before**:
```yaml
spec_sections:
  - specs/modules/payments/stripe/spec.md
docs:
  - docs/architecture/payments.md
  - docs/decisions/001-tech-stack.md
```

**After**:
```yaml
spec_sections:
  - specifications/modules/payments/stripe/spec.md
documentation:
  - documentation/architecture/payments.md
  - documentation/decisions/001-tech-stack.md
```

### Files to Update

1. **CLAUDE.md** - Directory structure examples
2. **README.md** - All references
3. **mkdocs.yml** - `docs_dir: documentation`
4. **All feature context-manifest.yaml** files
5. **.specweave/config.yaml** - Path configs
6. **All documentation** that references paths

---

## Counter-Argument: Keep `docs/`

### Why `docs/` is Standard

**Every major project uses `docs/`**:
- React, Vue, Angular, Svelte
- Python, Go, Rust, Ruby
- Kubernetes, Docker, Terraform
- TypeScript, Babel, Webpack

**Benefits of standard**:
- Developers know where to look
- Tools expect `docs/` (GitHub Pages, MkDocs, Docusaurus)
- Familiar structure

### Compromise: `specifications/` + `docs/`

Use full name for specs (SpecWeave's core concept), keep standard `docs/`:

```
specweave/
├── specifications/     # Full name (emphasizes core concept)
└── docs/               # Standard (familiar to all developers)
```

**Rationale**:
- `specifications/` is special to SpecWeave (our innovation)
- `docs/` is universal (don't reinvent the wheel)
- Balances clarity with familiarity

---

## Final Recommendation

### **Option: Both Full Names** 🏆

```
specweave/
├── specifications/     # Business requirements (WHAT, WHY)
└── documentation/      # All knowledge (HOW, architecture, decisions)
```

**Why**:
1. ✅ Consistent (both full words)
2. ✅ Professional
3. ✅ Clear and explicit
4. ✅ Emphasizes SpecWeave's spec-first philosophy
5. ✅ No abbreviation ambiguity

**Trade-off Accepted**:
- Longer paths (worth it for clarity)
- Less common (but SpecWeave IS different)

---

## Implementation

### 1. Rename Directories

```bash
cd /Users/antonabyzov/Projects/github/specweave

# Rename specs/ to specifications/
mv specs specifications

# Rename docs/ to documentation/
mv docs documentation
```

### 2. Update .specweave/config.yaml

```yaml
# Before
specs:
  root: "specs/"
  modules: "specs/modules/"

docs:
  root: "docs/"

# After
specifications:
  root: "specifications/"
  modules: "specifications/modules/"

documentation:
  root: "documentation/"
```

### 3. Update Context Manifests

```yaml
# New format (clearer!)
spec_sections:
  - specifications/modules/core/context-loading.md

documentation:
  - documentation/architecture/context-loading.md
  - documentation/decisions/004-context-loading.md
  - documentation/principles.md
```

### 4. Update mkdocs.yml

```yaml
# Before
docs_dir: docs

# After
docs_dir: documentation
```

### 5. Update All Documentation References

- CLAUDE.md
- README.md
- All feature plans
- All guides

---

## Alternative: Singular vs Plural

Another consideration:

**Singular**:
```
specification/      # "The specification folder"
documentation/      # "The documentation folder"
```

**Plural**:
```
specifications/     # "Multiple specifications"
documentation/      # "Multiple documents"
```

**Recommendation**: Plural (`specifications/`)
- Multiple modules, multiple specs
- Matches "features/", "tests/", etc.
- More accurate (contains many specs)

---

## Summary Table

| Aspect | `specs/` + `docs/` | `specifications/` + `documentation/` |
|--------|-------------------|-------------------------------------|
| **Clarity** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Brevity** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Professional** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Standard** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **SpecWeave Identity** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Consistency** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Decision

**Use `specifications/` and `documentation/`** ✅

**Reasoning**:
1. SpecWeave is ABOUT specifications - full name emphasizes this
2. Consistency (both full words)
3. Professional and explicit
4. Clear intent-driven philosophy
5. Worth the trade-off of longer paths

**When to Use**:
- In all file paths
- In all documentation
- In CLI commands: `specweave spec create` (still short!)
- In context manifests

**Brand Consistency**:
- **SpecWeave** - Brand name (CamelCase)
- **specifications/** - Folder (full word)
- **documentation/** - Folder (full word)
- **specweave** - Package/command (lowercase, no spaces)

---

**Implement?** Yes, let's rename both folders for consistency and clarity!
