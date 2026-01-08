# Algolia DocSearch Setup Guide

Complete guide for applying to and configuring Algolia DocSearch for SpecWeave documentation site.

## Overview

Algolia DocSearch provides free, fast, and typo-tolerant search for open-source documentation. It's the recommended search solution for Docusaurus sites and is **completely free** for qualifying open-source projects.

## Prerequisites

Before applying, ensure your project meets these requirements:

- ✅ **Open-Source**: Project must be open-source (public GitHub repository)
- ✅ **Public Documentation**: Documentation site must be publicly accessible
- ✅ **Technical Content**: Primary content should be technical documentation
- ✅ **Maintained Project**: Active project with regular updates
- ✅ **Owner/Maintainer**: You must be the project owner or authorized maintainer

**SpecWeave Status**: ✅ All prerequisites met

## Application Process

### Step 1: Visit Application Page

Go to: https://docsearch.algolia.com/apply/

### Step 2: Fill Application Form

Provide the following information:

| Field | Value for SpecWeave |
|-------|---------------------|
| **Website URL** | `https://spec-weave.com` |
| **Email** | Your maintainer email (GitHub-associated) |
| **Repository URL** | `https://github.com/anton-abyzov/specweave` |
| **Description** | Spec-driven development framework with autonomous AI agents |
| **Framework** | Docusaurus 3.x |

**Important Notes**:
- Use your official project maintainer email
- Ensure website URL is accessible (not behind auth)
- Repository must be public

### Step 3: Wait for Approval

**Timeline**: Typically 1-2 weeks (sometimes faster)

**What Happens Next**:
1. Algolia team reviews application
2. They verify the site is public documentation
3. You receive approval email with:
   - Application ID (`appId`)
   - Search-only API key (`apiKey`)
   - Index name (`indexName`)
4. They configure initial crawler for your site

### Step 4: Initial Crawl

After approval:
- Algolia's crawler visits your site weekly
- First crawl happens within 24-48 hours
- You can request manual crawls via dashboard

## Configuration

Once approved, add Algolia config to `docusaurus.config.ts`:

### Basic Configuration

```typescript
// docs-site/docusaurus.config.ts
export default {
  // ... other config

  themeConfig: {
    // ... other themeConfig

    algolia: {
      // Application ID (from approval email)
      appId: 'YOUR_APP_ID',

      // Public search-only API key (from approval email)
      apiKey: 'YOUR_SEARCH_API_KEY',

      // Index name (from approval email)
      indexName: 'specweave',

      // Optional: See docs for advanced options
      contextualSearch: true,
      externalUrlRegex: 'external\\.com|domain\\.com',
      searchParameters: {},
      searchPagePath: 'search',
    },
  },
}
```

### Advanced Options

```typescript
algolia: {
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'specweave',

  // Enable contextual search (recommended for versioned docs)
  contextualSearch: true,

  // Optional: Filter search results by facets
  searchParameters: {
    facetFilters: ['language:en', 'version:current'],
  },

  // Optional: Custom search page path
  searchPagePath: 'search',

  // Optional: Disable search on specific pages
  // (configured via page-level meta tags)
},
```

### Environment-Specific Config

For preview/production environments:

```typescript
// docusaurus.config.ts
const algoliaConfig = process.env.VERCEL_ENV === 'production'
  ? {
      appId: process.env.ALGOLIA_APP_ID!,
      apiKey: process.env.ALGOLIA_API_KEY!,
      indexName: 'specweave',
    }
  : undefined; // Disable search in preview

export default {
  themeConfig: {
    algolia: algoliaConfig,
  },
}
```

## Testing the Integration

### 1. Verify Search UI Appears

After configuration:
- Search bar should appear in navbar
- Keyboard shortcut `Ctrl+K` (or `Cmd+K` on Mac) should open search
- Click search icon to test modal

### 2. Test Search Functionality

Try these test queries:
- Product name: `"specweave"`
- Feature keywords: `"increment"`, `"autonomous agents"`
- Common terms: `"installation"`, `"getting started"`
- Typos: `"specweve"` should still find results

### 3. Check Algolia Dashboard

Login to Algolia dashboard (credentials from approval email):
- **Analytics**: View search queries and click-through rates
- **Crawl Status**: See last crawl time and index size
- **Configuration**: Modify crawler settings if needed

## Customization

### Crawler Configuration

Request crawler config changes via [Algolia DocSearch Discourse](https://discourse.algolia.com/c/docsearch/):
- **Custom selectors**: Prioritize specific HTML elements
- **Exclude patterns**: Skip certain pages or sections
- **Index frequency**: Adjust crawl schedule (default: weekly)

### Search UI Customization

Docusaurus provides limited UI customization via CSS:

```css
/* src/css/custom.css */
.DocSearch-Button {
  /* Customize search button appearance */
}

.DocSearch-Modal {
  /* Customize search modal */
}
```

For advanced UI changes, see [Docusaurus Algolia docs](https://docusaurus.io/docs/search#using-algolia-docsearch).

## Troubleshooting

### Search Returns No Results

**Possible Causes**:
1. **Initial crawl not completed**: Wait 24-48 hours after approval
2. **Wrong index name**: Verify `indexName` matches approval email
3. **API key issues**: Ensure using search-only key (not admin key)
4. **Site changed structure**: Request manual re-crawl

**Solution**: Check Algolia dashboard for index size and last crawl date

### Search UI Not Appearing

**Possible Causes**:
1. **Config not applied**: Restart dev server after config changes
2. **Build cache**: Clear Docusaurus cache (`rm -rf .docusaurus`)
3. **Invalid credentials**: Double-check `appId` and `apiKey`

**Solution**: Check browser console for Algolia-related errors

### Outdated Search Results

**Causes**:
- Content updated but crawler hasn't run
- Default weekly crawl schedule

**Solution**: Request manual crawl via Algolia dashboard or Discourse

### Search Not Working in Preview Deployments

**Expected Behavior**: Search should only work on production domain

**Why**: Algolia indexes production URL only (configured during application)

**Solution**: Use conditional config (see Environment-Specific Config above)

## Rate Limits and Quotas

DocSearch free tier includes:
- ✅ **Unlimited searches** (no monthly limit)
- ✅ **Unlimited records** (documents indexed)
- ✅ **Weekly crawls** (customizable)
- ✅ **Analytics dashboard**
- ✅ **Community support**

**No credit card required** for open-source projects.

## Migration from Other Search Solutions

If migrating from another search solution:

1. **Remove old search config** (e.g., local search plugin)
2. **Add Algolia config** as shown above
3. **Test both solutions** in parallel (if possible)
4. **Update documentation** mentioning search feature
5. **Communicate change** to users (blog post, changelog)

## Support and Community

- **Official Docs**: https://docsearch.algolia.com/docs/what-is-docsearch
- **Community Forum**: https://discourse.algolia.com/c/docsearch/
- **GitHub Issues**: https://github.com/algolia/docsearch/issues
- **Docusaurus Integration**: https://docusaurus.io/docs/search#using-algolia-docsearch

## Security Considerations

### API Key Safety

- ✅ **Search-only key is PUBLIC**: Safe to commit to repository
- ❌ **Admin key is SECRET**: Never commit or expose publicly
- ✅ **Use environment variables**: For non-search keys only

```typescript
// Safe to commit (search-only key)
algolia: {
  apiKey: 'abc123searchonly456',  // Public, read-only
}

// Never commit (admin key)
algolia: {
  apiKey: process.env.ALGOLIA_ADMIN_KEY,  // Keep secret!
}
```

### Content Indexing

All public pages will be indexed:
- ✅ Public documentation
- ❌ Pages with `<meta name="robots" content="noindex">`
- ❌ Pages blocked by `robots.txt`

Ensure sensitive pages are properly protected BEFORE applying to DocSearch.

## Next Steps After Setup

1. ✅ **Monitor analytics**: Track popular search queries
2. ✅ **Optimize content**: Improve pages with high searches but low clicks
3. ✅ **Request re-crawls**: When making major content updates
4. ✅ **Configure crawler**: Fine-tune selectors for better results
5. ✅ **Update docs**: Mention search feature in Getting Started guide

## Frequently Asked Questions

### How often is the index updated?

**Default**: Once per week (configurable via Discourse request)

### Can I manually trigger a crawl?

**Yes**: Via Algolia dashboard or by requesting via Discourse

### Does search work offline?

**No**: Algolia DocSearch requires internet connection

### Can I search draft/preview content?

**No**: Only publicly accessible pages are indexed

### What happens if my project becomes private?

**DocSearch access revoked**: Search will stop working within 1-2 weeks

### Can I use custom ranking/scoring?

**Limited**: Request via Discourse for specific use cases

---

## Summary Checklist

**Before applying**:
- [ ] Public repository with open-source license
- [ ] Public documentation site at stable URL
- [ ] You are project owner or authorized maintainer

**After approval**:
- [ ] Add `appId`, `apiKey`, `indexName` to docusaurus.config.ts
- [ ] Verify search UI appears in navbar
- [ ] Test search with various queries
- [ ] Check Algolia dashboard for index status
- [ ] Request crawler customization if needed

**Ongoing maintenance**:
- [ ] Monitor search analytics monthly
- [ ] Request re-crawls after major updates
- [ ] Optimize content based on search data
- [ ] Update config if domain or structure changes

---

**Last Updated**: 2026-01-07
**Maintainer**: SpecWeave Documentation Team
**Status**: Application pending (as of project creation)
