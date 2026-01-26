# Broken Links Catalog - Increment 0153

**Generated**: 2026-01-07
**Source**: `npm run build` output from docs-site
**Total Broken Links**: 113 unique targets across hundreds of pages

## Summary by Frequency

### Critical (Global Footer/Navbar)

These broken links appear on ALL pages due to global navigation:

| Link | Frequency | Location | Fix Strategy |
|------|-----------|----------|--------------|
| `/docs/api` | 113 occurrences | Footer/navbar | ❌ Remove from footer (API docs not created yet) OR create placeholder |
| `/docs/glossary/` | 9 occurrences | Various | Create glossary directory structure |
| `/docs/glossary/README` | 9 occurrences | Various | Create README file in glossary |
| `/docs/glossary/index-by-category` | 9 occurrences | Various | Create index-by-category page |

### Medium Priority (Academy Content)

Missing academy module files:

| Link Pattern | Count | Fix Strategy |
|--------------|-------|--------------|
| `./cicd-integration.md` | 4 | Create missing academy lesson files |
| `./04-collaboration` | 2 | Create missing academy lesson files |
| `./03-first-increment` | 2 | Create missing academy lesson files |
| Various academy bridge files | Multiple | Create missing bridge lesson files |

### Low Priority (Other)

| Link | Count | Fix Strategy |
|------|-------|--------------|
| `/docs/guides/workflow` | 2 | Create or redirect to correct path |
| `/docs/guides/getting-started` | 2 | Create or redirect to quickstart |
| `/docs/delivery/*` | Multiple | Create missing delivery guides |

---

## Fix Strategy Breakdown

### Strategy 1: Remove Global Links (Immediate)

**Files to modify**:
- `docs-site/docusaurus.config.ts` - Remove `/docs/api` from footer items

**Impact**: Resolves 113 broken link warnings immediately

### Strategy 2: Create Missing Glossary Structure

**Files to create**:
- `docs-site/docs/glossary/index.md` - Glossary index page
- `docs-site/docs/glossary/README.md` - Glossary README
- `docs-site/docs/glossary/index-by-category.md` - Category index

**Impact**: Resolves 27 broken link warnings

### Strategy 3: Create Missing Academy Files (Lower Priority)

**Files to create**:
- Academy bridge lessons (bridge-5-to-6, bridge-6-to-7, etc.)
- Academy module lessons (cicd-integration, collaboration, etc.)

**Impact**: Resolves ~20 broken link warnings
**Note**: This may be out of scope for SEO increment - consider separate increment

### Strategy 4: Blog Post Link Cleanup

**Blog posts with broken internal links**:
- `2026-01-04-seo-best-practices.md`:
  - `/docs/guides/seo-optimization` → Remove or create placeholder
  - `/docs/guides/documentation` → Remove or create placeholder
  - `/docs/guides/performance` → Remove or create placeholder
  - `/blog/schema-org-saas` → Remove (non-existent blog post)

**Impact**: Resolves 5 broken link warnings

---

## Recommended Immediate Actions (T-024)

### Phase 1: High-Impact Fixes (resolve 100+ warnings)

1. **Remove /docs/api from footer** (docs-site/docusaurus.config.ts)
   - Impact: -113 warnings
   - Estimated time: 2 minutes

2. **Fix blog post internal links** (docs-site/blog/2026-01-04-seo-best-practices.md)
   - Impact: -5 warnings
   - Estimated time: 5 minutes

### Phase 2: Structural Fixes (resolve 20+ warnings)

3. **Create glossary structure**
   - Create `docs-site/docs/glossary/index.md`
   - Create `docs-site/docs/glossary/README.md`
   - Create `docs-site/docs/glossary/index-by-category.md`
   - Impact: -27 warnings
   - Estimated time: 15 minutes

### Phase 3: Optional (Academy - consider separate increment)

4. **Create missing academy files** - Skip for now, address in separate increment
   - Impact: -20 warnings
   - Estimated time: 1-2 hours

---

## Post-Fix Validation

After fixes, run:
```bash
cd docs-site
npm run build 2>&1 | grep "Docusaurus found broken links"
```

Expected result after Phase 1+2: ~90% reduction in broken links (from 165+ to <20)

---

## Full Broken Links Report

See attached `broken-links-report.txt` for exhaustive list of all broken links with source pages.
