# Algolia DocSearch Setup Guide

This guide explains how to apply for and configure Algolia DocSearch for the SpecWeave documentation site.

## What is Algolia DocSearch?

[Algolia DocSearch](https://docsearch.algolia.com/) is a free search service for technical documentation sites. It provides:
- Fast, typo-tolerant search
- Faceted search by category
- Keyboard shortcuts
- Mobile-friendly search UI
- Automatic indexing via web crawling

## Eligibility Requirements

To qualify for free DocSearch, your site must:
- ✅ **Be publicly available** on the internet
- ✅ **Be documentation** for an open-source or technical product
- ✅ **Be the official documentation** (not a mirror or third-party site)
- ✅ **Have meaningful content** (not just placeholder pages)

**SpecWeave qualifies** because:
- Public documentation at spec-weave.com
- Open-source project (MIT license)
- Official documentation site
- Comprehensive content (guides, API docs, glossary, etc.)

## Application Process

### 1. Apply Online

Visit: **https://docsearch.algolia.com/apply/**

Fill out the application form with:

| Field | Value for SpecWeave |
|-------|---------------------|
| **Website URL** | https://spec-weave.com |
| **Email** | [your-email@domain.com] |
| **Repository** | https://github.com/anton-abyzov/specweave |
| **Description** | Autonomous AI agents for production software - spec-driven development framework with intelligent model selection, living documentation, and multi-project support |

### 2. Required Information

- **Domain ownership**: You must have access to the email address listed in the site's domain registration
- **Public repository**: Link to the GitHub repository
- **Technical stack**: Docusaurus 3.x
- **Content type**: Developer documentation (guides, API reference, glossary)

### 3. Approval Timeline

- **Typical wait time**: 1-2 weeks
- **What happens next**:
  1. Algolia team reviews application
  2. If approved, they send credentials via email
  3. You receive: `appId`, `apiKey`, `indexName`
  4. Algolia configures initial crawler settings

## Configuration After Approval

Once approved, you'll receive credentials. Add them to `docusaurus.config.ts`:

```typescript
themeConfig: {
  // ... existing config

  algolia: {
    // Application ID (provided by Algolia)
    appId: 'YOUR_APP_ID',

    // Public API key (safe to commit)
    apiKey: 'YOUR_SEARCH_API_KEY',

    // Index name (provided by Algolia)
    indexName: 'specweave',

    // Optional: search parameters
    contextualSearch: true,
    searchParameters: {
      facetFilters: [],
    },

    // Optional: customize search page path
    // searchPagePath: 'search',
  },
}
```

### Configuration Details

| Field | Description | Example |
|-------|-------------|---------|
| `appId` | Your Algolia application ID | `BH4D9OD16A` |
| `apiKey` | Public search-only API key (NOT the Admin API key!) | `abc123...` |
| `indexName` | Name of the search index | `specweave` |
| `contextualSearch` | Enable version/language-specific search | `true` |
| `searchParameters` | Additional Algolia search config | `{}` |

### Important Notes

- ✅ **Use the Search API key** (public, read-only) - NOT the Admin API key
- ✅ **Safe to commit** - the Search API key can be publicly visible
- ✅ **Don't hardcode Admin API key** - keep it secret if you need it

## Testing the Search

After configuration:

1. **Rebuild the site**:
   ```bash
   npm run build
   ```

2. **Check for search UI**:
   - Press `Ctrl+K` or `/` to open search
   - Search bar should appear in navbar
   - Try searching for "increment" or "spec"

3. **Verify indexing**:
   - Algolia crawler runs automatically (usually daily)
   - Check Algolia dashboard for index statistics
   - Initial crawl may take 1-2 days

## Customizing Search Behavior

### Crawler Configuration

Algolia provides a web interface to customize what gets indexed:

- **Selectors**: Which HTML elements to index (headings, paragraphs, code blocks)
- **Exclusions**: Pages or sections to skip (e.g., `/blog/tags/`)
- **Weighting**: Boost certain content types (e.g., API reference over blog posts)

Default selectors work well for Docusaurus sites.

### Search UI Customization

Customize search appearance in `src/css/custom.css`:

```css
/* Algolia search input */
.DocSearch-Button {
  border-radius: 8px;
}

/* Search modal */
.DocSearch-Modal {
  /* custom styles */
}
```

## Troubleshooting

### Search returns no results

**Possible causes**:
- Crawler hasn't run yet (wait 24-48 hours after approval)
- Incorrect API credentials
- Site not accessible to Algolia crawler (check robots.txt)

**Fix**:
1. Verify credentials in docusaurus.config.ts
2. Check Algolia dashboard for crawl errors
3. Ensure robots.txt allows Algolia crawler

### Search UI doesn't appear

**Possible causes**:
- Missing or incorrect algolia config
- Docusaurus cache issue

**Fix**:
```bash
rm -rf .docusaurus
npm run build
```

### Wrong content being indexed

**Solution**: Contact Algolia support to adjust crawler configuration

## Alternative: Manual Setup (Advanced)

If you need more control, you can:
1. Create a free Algolia account
2. Set up your own index
3. Use `@docusaurus/plugin-search-local` for self-hosted search
4. Run crawler manually with Algolia Crawler

**Note**: Free DocSearch is recommended for most use cases.

## Resources

- [Algolia DocSearch Documentation](https://docsearch.algolia.com/docs/what-is-docsearch)
- [Docusaurus Algolia Plugin](https://docusaurus.io/docs/search#using-algolia-docsearch)
- [Algolia Dashboard](https://www.algolia.com/dashboard)
- [DocSearch Discord](https://discord.com/invite/tXdr5mP)

## Next Steps

After implementing search:
1. Monitor search analytics in Algolia dashboard
2. Adjust crawler config based on user behavior
3. Consider adding custom search result rankings
4. Document frequently searched terms for content gaps

---

**Status**: Application pending / Not yet applied
**Last Updated**: 2026-01-04
**Contact**: SpecWeave Team
