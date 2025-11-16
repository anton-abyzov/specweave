# Release Process

## Pre-Release Checklist

### 1. Code Quality
- ✅ All P1 tests passing
- ✅ Code coverage >80% for critical paths
- ✅ No linting errors (`npm run lint`)
- ✅ TypeScript compilation successful (`npm run build`)

### 2. Documentation
- ✅ CLAUDE.md updated
- ✅ CHANGELOG.md updated
- ✅ Public docs updated (if user-facing changes)
- ✅ ADRs created for major decisions

### 3. Testing
- ✅ Unit tests pass (`npm test`)
- ✅ E2E smoke tests pass (`npm run test:smoke`)
- ✅ Playwright tests pass (if applicable)
- ✅ Manual testing on sample project

### 4. Version Bump

```bash
npm version patch|minor|major
# Creates git tag automatically
```

### 5. Build & Publish

```bash
npm run build       # TypeScript → dist/
npm publish         # Publish to npm registry
```

### 6. GitHub Release

```bash
gh release create v0.1.0 --title "v0.1.0: Beta Release" --notes "See CHANGELOG.md"
```

### 7. Documentation Deployment

```bash
# Public docs
cd docs-site && npm run build && npm run deploy

# Internal docs (not published)
# Only available locally for framework developers
```

## Post-Release

- ✅ Monitor npm downloads
- ✅ Watch GitHub issues for bug reports
- ✅ Update roadmap if needed

## Hotfix Process

1. Create hotfix branch from `main`
2. Fix critical bug
3. Test thoroughly
4. Version bump (patch only)
5. Merge to `main` and `develop`
6. Publish immediately

## Related

- [Roadmap](roadmap.md)
- [Testing Strategy](guides/testing-strategy.md)
