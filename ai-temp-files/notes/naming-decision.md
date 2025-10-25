# SpecWeave Naming Decision

## Question

Should the GitHub slug be `specweave` or `spec-weave`?

Current: `https://github.com/anton-abyzov/specweave`

---

## Analysis

### Option 1: `specweave` (Single Word)

**Pros**:
- ✅ Simpler, cleaner
- ✅ Easier to type (no hyphen to remember)
- ✅ Better for package names: `npm install specweave`
- ✅ Follows dev tool convention: webpack, vitepress, docusaurus, typescript
- ✅ URL-friendly: specweave.dev, docs.specweave.com
- ✅ Consistent everywhere (repo, package, brand)

**Cons**:
- ❌ Less immediately clear it's "spec" + "weave"
- ❌ Could be misread as "spec-we-ave" or "specw-eave"

**Similar Tools**:
- webpack (not web-pack)
- typescript (not type-script)
- javascript (not java-script)
- docusaurus (not docu-saurus)

---

### Option 2: `spec-weave` (Hyphenated)

**Pros**:
- ✅ Clearer it's "spec" + "weave"
- ✅ More readable at first glance
- ✅ Less ambiguous pronunciation

**Cons**:
- ❌ Must remember hyphen when typing
- ❌ Package names awkward: `@spec-weave/cli` or `spec-weave`
- ❌ Less common in dev tools ecosystem
- ❌ Potential confusion: `spec-weave` vs `specweave` vs `spec_weave`

---

## Recommendation: Keep `specweave` ✅

**Reasoning**:
1. **Established convention** - Dev tools use single words (webpack, typescript)
2. **Package management** - `npm install specweave` is cleaner than `npm install spec-weave`
3. **Consistency** - Same everywhere (repo, package, brand)
4. **Simplicity** - No hyphen to remember
5. **Already used** - All documentation already uses "SpecWeave"

---

## Naming Guidelines

### Display Name (Brand)
**SpecWeave** (CamelCase with capital S and W)

Used in:
- Documentation titles
- README headers
- Marketing materials
- Social media

Example: "Welcome to **SpecWeave** - Intent-Driven Development Framework"

---

### Package Name (npm, pip, etc.)
**specweave** (lowercase, no spaces)

```bash
npm install -g specweave
pip install specweave
brew install specweave
```

---

### GitHub Slug
**specweave** (lowercase, no spaces)

`https://github.com/anton-abyzov/specweave`

---

### Domain
**specweave** (lowercase)

- specweave.dev
- docs.specweave.com
- blog.specweave.io

---

### CLI Command
**specweave** (lowercase)

```bash
specweave init
specweave feature plan
specweave sync jira
```

---

### Python Module (if needed)
**specweave** (lowercase)

```python
import specweave
from specweave import FeaturePlanner
```

---

### Hashtags / Social
**#SpecWeave** (CamelCase)

- Twitter: #SpecWeave
- LinkedIn: #SpecWeave
- Dev.to: #specweave

---

## Places Already Correct

✅ GitHub repo: `https://github.com/anton-abyzov/specweave`
✅ Documentation: "SpecWeave" (display name)
✅ Package references: `npx specweave`
✅ CLI commands: `specweave init`

**No changes needed!**

---

## If You Want to Change (Not Recommended)

If you still prefer `spec-weave`, update:

1. GitHub repo slug (rename repo)
2. All documentation references
3. Package name in package.json
4. CLI command name
5. Domain registrations
6. Social media handles

**Estimated effort**: 2-3 hours
**Risk**: Broken links, confusion

---

## Decision

**Keep `specweave` (single word)** ✅

- Matches dev tools convention
- Simpler for users
- Better for package management
- Already consistent across all docs

**Brand**: SpecWeave (CamelCase for display)
**Package**: specweave (lowercase for commands)
**URL**: specweave (lowercase for repo/domain)

---

**Conclusion**: No changes needed. Current naming is optimal!
