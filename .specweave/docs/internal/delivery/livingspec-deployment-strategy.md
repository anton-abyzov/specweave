---
title: LivingSpec Deployment Strategy
status: draft
created: 2025-12-06
---

# LivingSpec Deployment Strategy

## Deployment Targets

### Documentation Site (Docusaurus)

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | livingspec.io | Public documentation |
| Staging | staging.livingspec.io | Pre-release testing |
| Preview | pr-*.livingspec.io | PR previews |

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy LivingSpec Docs

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Validate LivingSpec
        run: npx livingspec validate .

      - name: Build Docusaurus
        run: npm run build

      - name: Deploy to Netlify
        if: github.ref == 'refs/heads/main'
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod
```

### Validation Pipeline

Every commit must pass:

1. **Schema Validation** - All document frontmatter valid
2. **E-Suffix Consistency** - External items properly suffixed
3. **Link Validation** - Cross-references resolve
4. **Build Test** - Docusaurus builds successfully

## Environment Configuration

### Production

```yaml
# docusaurus.config.js
{
  url: 'https://livingspec.io',
  baseUrl: '/',
  themeConfig: {
    livingspec: {
      showOriginBadges: true,
      validateOnSave: true
    }
  }
}
```

### Staging

```yaml
{
  url: 'https://staging.livingspec.io',
  baseUrl: '/',
  themeConfig: {
    livingspec: {
      showOriginBadges: true,
      validateOnSave: true,
      showDraftContent: true  # Show draft status items
    }
  }
}
```

## Rollback Strategy

1. **Automatic Rollback** - If validation fails, deploy is blocked
2. **Manual Rollback** - Revert to previous git tag
3. **Data Rollback** - E-suffix IDs are immutable, never deleted

## Monitoring

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Build Time | GitHub Actions | > 5 minutes |
| Validation Errors | Custom | Any error |
| Page Load Time | Lighthouse | > 3 seconds |
| Broken Links | linkcheck | Any broken |
