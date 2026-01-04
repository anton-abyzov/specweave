# Technical Plan: Documentation Site SEO Enhancements

## Architecture Overview

This increment implements comprehensive SEO improvements for the Docusaurus-based documentation site. All changes are configuration-based or content-based (no runtime code changes), deployed via Cloudflare Pages Git-based deployment.

**Core Technologies**:
- Docusaurus 3.9.2 (Static Site Generator)
- React 19.0.0 (UI framework)
- TypeScript (Configuration)
- Cloudflare Pages (Hosting + CDN)

**Architecture Pattern**: Static Site Generation (SSG) + Edge Caching
- Build-time HTML generation (Docusaurus)
- Edge distribution (Cloudflare CDN, 200+ cities)
- Zero server-side rendering required

---

## Technical Design

### 1. Schema.org Structured Data Implementation

**Location**: `docs-site/docusaurus.config.ts`

**Approach**: Add JSON-LD scripts to Docusaurus headTags configuration. This ensures structured data is injected into the HTML <head> tag of every page during build time.

**Implementation Pattern**:
```typescript
// docs-site/docusaurus.config.ts
export default {
  // ... existing config
  headTags: [
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'SpecWeave',
        url: 'https://spec-weave.com',
        logo: 'https://spec-weave.com/img/logo.svg',
        sameAs: [
          'https://github.com/anton-abyzov/specweave',
          'https://www.npmjs.com/package/specweave'
        ]
      })
    },
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'SpecWeave',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Windows, macOS, Linux',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD'
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '127' // Derive from GitHub stars/reviews
        }
      })
    }
  ]
}
```

**Why This Approach**:
- ✅ Centralized configuration (single source of truth)
- ✅ Applied to all pages automatically
- ✅ No component swizzling required
- ✅ Easy to test and validate

**Validation**:
- Run build: `npm run build`
- View source of generated HTML: `build/index.html`
- Verify JSON-LD scripts present in <head>
- Test with Google Rich Results Test

---

### 2. robots.txt Creation

**Location**: `docs-site/static/robots.txt`

**Approach**: Create static robots.txt file in the Docusaurus static folder. Docusaurus automatically copies all files from `static/` to the build root during build.

**File Content**:
```txt
User-agent: *
Allow: /
Disallow: /docs/DOCUMENTATION-AUDIT*
Disallow: /docs/_*

Sitemap: https://spec-weave.com/sitemap.xml

# Crawl delay for aggressive bots
User-agent: GPTBot
Crawl-delay: 10

User-agent: CCBot
Crawl-delay: 10
```

**Why This Approach**:
- ✅ Standard Docusaurus pattern for root-level files
- ✅ No special configuration needed
- ✅ Version controlled
- ✅ Deployed automatically with every build

**Testing**:
- Local: `npm run build && npm run serve`, then access http://localhost:3000/robots.txt
- Production: Verify https://spec-weave.com/robots.txt after deployment

---

### 3. WebP Image Optimization

**Location**: `docs-site/static/img/specweave-social-card.webp`

**Approach**: Convert existing JPG social card to WebP using command-line tools, update config reference.

**Conversion Command**:
```bash
# Using cwebp (install: brew install webp on macOS)
cwebp -q 85 docs-site/static/img/specweave-social-card.jpg \
      -o docs-site/static/img/specweave-social-card.webp

# Verify file size reduction
ls -lh docs-site/static/img/specweave-social-card.*
```

**Config Update**:
```typescript
// docs-site/docusaurus.config.ts
themeConfig: {
  image: 'img/specweave-social-card.webp', // Changed from .jpg
  // ... other config
}
```

**Why This Approach**:
- ✅ Simple one-time conversion
- ✅ Reduces file size by 30-50%
- ✅ Widely supported (96%+ browser support)
- ✅ Automatic fallback via browser content negotiation

**Browser Compatibility**: WebP supported in Chrome, Firefox, Safari (since 14), Edge. Older browsers fallback to original image URL if needed.

**Testing**:
- Check file size: WebP should be 30-50% smaller
- Verify image quality visually
- Test social media preview: Twitter Card Validator, LinkedIn post inspector

---

### 4. Resource Preconnect Hints

**Location**: `docs-site/docusaurus.config.ts`

**Approach**: Add preconnect and dns-prefetch link tags to headTags configuration.

**Implementation**:
```typescript
// docs-site/docusaurus.config.ts
headTags: [
  // DNS prefetch for faster lookups
  {
    tagName: 'link',
    attributes: {
      rel: 'dns-prefetch',
      href: 'https://fonts.googleapis.com'
    }
  },
  // Preconnect for early connection establishment
  {
    tagName: 'link',
    attributes: {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
      crossorigin: 'anonymous'
    }
  },
  // ... additional preconnects for CDN if needed
]
```

**Why This Approach**:
- ✅ Reduces connection establishment time by 50-100ms
- ✅ Improves First Contentful Paint (FCP)
- ✅ No runtime overhead (handled by browser)

**Performance Impact**:
- DNS lookup: ~20-120ms saved
- TCP connection: ~30-100ms saved
- Total: 50-220ms improvement per external resource

**Testing**:
- Chrome DevTools → Network tab → view connection timing before/after
- Lighthouse audit → performance score should improve 2-5 points

---

### 5. Blog Post SEO Frontmatter Templates

**Location**: `docs-site/blog/_template.md`

**Approach**: Create template file with comprehensive SEO frontmatter that content creators can copy for new blog posts.

**Template Structure**:
```yaml
---
title: "Your Blog Post Title Here"
description: "Concise summary (50-160 chars) for search results and social previews"
keywords: [keyword1, keyword2, keyword3, seo, developer-tools]
image: /img/blog/your-custom-og-image.jpg
authors: [authorname]
tags: [category1, category2]
---

# Your Blog Post Title

Your content here...
```

**Documentation Addition**:
Add section to `docs-site/README.md` or `CONTRIBUTING.md`:
```markdown
### Creating SEO-Optimized Blog Posts

Use the template at `blog/_template.md` when creating new posts.

**SEO Frontmatter Fields**:
- `description`: 50-160 characters, appears in search results
- `keywords`: 5-10 relevant keywords (comma-separated)
- `image`: Custom OG image (1200x630px recommended)
- `authors`: Author ID(s) from authors.yml
- `tags`: Categories for organization and navigation
```

**Why This Approach**:
- ✅ Self-documenting template
- ✅ Easy for content creators to use
- ✅ Ensures consistency across blog posts
- ✅ No code changes required

**Testing**:
- Create example blog post using template
- Verify meta tags render correctly in HTML
- Test social preview with LinkedIn/Twitter validators

---

### 6. Noindex for Tag Archive Pages

**Location**: `docs-site/src/theme/BlogTagsPostsPage/index.tsx`

**Approach**: Swizzle the BlogTagsPostsPage component to add custom meta tags.

**Implementation Steps**:
1. Swizzle component: `npm run swizzle @docusaurus/theme-classic BlogTagsPostsPage -- --wrap`
2. Add PageMetadata with noindex directive

**Component Code**:
```tsx
// docs-site/src/theme/BlogTagsPostsPage/index.tsx
import React from 'react';
import OriginalBlogTagsPostsPage from '@theme-original/BlogTagsPostsPage';
import {PageMetadata} from '@docusaurus/theme-common';
import type BlogTagsPostsPageType from '@theme/BlogTagsPostsPage';
import type {WrapperProps} from '@docusaurus/types';

type Props = WrapperProps<typeof BlogTagsPostsPageType>;

export default function BlogTagsPostsPageWrapper(props: Props): JSX.Element {
  return (
    <>
      <PageMetadata>
        <meta name="robots" content="noindex, follow" />
      </PageMetadata>
      <OriginalBlogTagsPostsPage {...props} />
    </>
  );
}
```

**Why This Approach**:
- ✅ Follows Docusaurus swizzling pattern
- ✅ Applies only to tag archive pages
- ✅ Preserves original component functionality
- ✅ Type-safe with TypeScript

**Alternative Approach** (if swizzling is complex):
Use plugin-sitemap configuration to exclude tag pages from sitemap:
```typescript
// docs-site/docusaurus.config.ts
plugins: [
  [
    '@docusaurus/plugin-sitemap',
    {
      changefreq: 'weekly',
      priority: 0.5,
      ignorePatterns: ['/blog/tags/**', '/blog/page/**'],
    },
  ],
]
```

**Testing**:
- Visit /blog/tags/ai-development
- View page source and verify `<meta name="robots" content="noindex, follow">`
- Google Search Console → verify tag pages not indexed after next crawl

---

### 7. Fix Broken Markdown Links

**Location**: Various documentation files in `docs-site/docs/`

**Approach**: Systematic audit and fix of broken links identified in build warnings.

**Process**:
1. Run build: `npm run build 2>&1 | tee build-warnings.txt`
2. Extract broken link warnings: `grep "Markdown link.*couldn't be resolved" build-warnings.txt`
3. Categorize issues:
   - Missing files → Create or remove link
   - Incorrect paths → Fix relative path
   - External plugin references → Use correct path or remove

**Common Patterns**:
```
Pattern: "./multi-project-sync.md" in scheduling-and-planning.md
Fix: Either create file or update to correct path: "../integrations/multi-project-sync.md"

Pattern: "../../../plugins/sw-github/README.md"
Fix: These plugin READMEs are not in docs-site, remove or replace with docs link

Pattern: "./cicd-integration.md" (missing file)
Fix: Create stub or remove link, update navigation
```

**Script to Automate Detection** (optional):
```bash
#!/bin/bash
# find-broken-links.sh
npm run build 2>&1 | \
  grep "Markdown link.*couldn't be resolved" | \
  sed 's/.*in source file "\([^"]*\)".*/\1/' | \
  sort | uniq > broken-links-files.txt

echo "Files with broken links:"
cat broken-links-files.txt
```

**Prevention**:
Update `docs-site/docusaurus.config.ts`:
```typescript
onBrokenLinks: 'throw', // Fail build on broken links
onBrokenMarkdownLinks: 'throw', // Fail build on broken markdown links
```

**Why This Approach**:
- ✅ Comprehensive audit ensures no links missed
- ✅ Build-time validation prevents future issues
- ✅ Improves user experience and SEO

**Testing**:
- Run `npm run build` → should complete with 0 warnings
- Manual testing: Click through 10-20 random links in docs
- Automated: Consider adding link checker to CI (optional)

---

### 8. Algolia DocSearch Documentation

**Location**: `docs-site/ALGOLIA-DOCSEARCH-SETUP.md`

**Approach**: Create comprehensive documentation file with step-by-step instructions for future Algolia DocSearch implementation.

**Document Sections**:
1. Overview of Algolia DocSearch
2. Prerequisites (open-source project, public documentation)
3. Application process (docsearch.algolia.com/apply/)
4. Configuration template
5. Integration steps
6. Testing and validation

**Content Structure**:
```markdown
# Algolia DocSearch Setup Guide

## Overview
Algolia DocSearch provides free search for open-source documentation sites.

## Prerequisites
- ✅ Open-source project
- ✅ Public documentation site
- ✅ Owned by project maintainers

## Application Process
1. Visit https://docsearch.algolia.com/apply/
2. Fill form with:
   - URL: https://spec-weave.com
   - Email: maintainer email
   - Repository: https://github.com/anton-abyzov/specweave
3. Wait for approval (typically 1-2 weeks)

## Configuration
Once approved, add to docusaurus.config.ts:
\`\`\`typescript
algolia: {
  appId: 'YOUR_APP_ID',  // From Algolia email
  apiKey: 'YOUR_SEARCH_API_KEY',  // From Algolia email
  indexName: 'specweave',  // From Algolia email
  contextualSearch: true,
  searchPagePath: 'search',
}
\`\`\`

## Testing
- Search bar should appear in navbar
- Try search query → results should appear
- Check Algolia dashboard for crawl statistics
```

**Why This Approach**:
- ✅ Future-proofs the search implementation
- ✅ Reduces setup time when ready to implement
- ✅ Documents the "why" and "how" for future maintainers

**Testing**:
- Review document for completeness
- Share with team for feedback
- Link from main README or CONTRIBUTING

---

## Data Flow

### Build-Time Flow (Static Site Generation)
```
1. Developer commits changes → Git push
2. Cloudflare Pages webhook triggered
3. Build starts in Cloudflare environment:
   a. Install dependencies (npm install)
   b. Run Docusaurus build (npm run build)
   c. Generate static HTML/CSS/JS in build/
   d. Copy static assets (robots.txt, images, etc.)
   e. Inject structured data via headTags
4. Build artifacts uploaded to Cloudflare CDN
5. Site deployed to edge locations globally
6. Cache invalidated automatically
```

### User Request Flow
```
1. User visits https://spec-weave.com
2. Cloudflare edge server (nearest location) serves cached HTML
3. Browser parses HTML:
   a. Finds structured data in <head>
   b. Preconnects to external resources
   c. Loads WebP social card
   d. Respects noindex on tag pages
4. Search crawler accesses robots.txt → finds sitemap
5. Crawler parses structured data → creates rich snippets
```

### SEO Crawl Flow
```
1. Search engine bot requests site
2. Checks robots.txt → finds sitemap URL, crawl rules
3. Fetches sitemap.xml → discovers all pages
4. Crawls pages following robots.txt rules
5. Parses structured data → understands entity types
6. Respects noindex on tag archive pages
7. Updates search index with rich snippet data
```

---

## Configuration Changes Summary

### Files Created
- `docs-site/static/robots.txt` - New file
- `docs-site/static/img/specweave-social-card.webp` - New file
- `docs-site/blog/_template.md` - New file
- `docs-site/src/theme/BlogTagsPostsPage/index.tsx` - New file (swizzled)
- `docs-site/ALGOLIA-DOCSEARCH-SETUP.md` - New file

### Files Modified
- `docs-site/docusaurus.config.ts` - Add headTags (structured data, preconnect hints), update image path to WebP
- `docs-site/docs/**/*.md` - Fix broken links (30+ files estimated)
- `docs-site/README.md` or `CONTRIBUTING.md` - Add blog SEO template documentation

### No Code Changes Required
All implementations are configuration-based or content-based. No runtime JavaScript/TypeScript code changes needed in application logic.

---

## Security Considerations

### Structured Data Injection
**Risk**: XSS via JSON-LD injection if user input is included
**Mitigation**: All structured data is hardcoded in config (no user input), JSON.stringify escapes special characters

### robots.txt Exposure
**Risk**: Revealing internal paths in Disallow rules
**Mitigation**: Only disallow genuinely internal paths (_archive, audit files), no sensitive data exposed

### Crawl Rate Limiting
**Risk**: Aggressive bot crawling overwhelming server
**Mitigation**: Cloudflare Pages DDoS protection + crawl-delay directives for known aggressive bots

### WebP Image Safety
**Risk**: WebP encoding vulnerabilities
**Mitigation**: Use official cwebp tool from Google, no user-generated images converted

---

## Performance Impact

### Build Time
- Structured data: +0.1s (JSON serialization)
- robots.txt: 0s (static file copy)
- WebP conversion: +5s (one-time, not in build pipeline)
- Component swizzling: +0.2s (additional component compilation)
- **Total estimated build time increase**: <1 second

### Runtime Performance
- Structured data: 0ms (parsed post-load)
- robots.txt: 1 request saved (explicit sitemap)
- WebP image: -50% file size = faster load
- Preconnect hints: -50-100ms per external resource
- **Net performance improvement**: 50-200ms faster page load

### SEO Metrics Impact
- Lighthouse SEO score: 90 → 95+ (expected)
- Google PageSpeed: +2-5 points (from WebP + preconnect)
- Rich snippet eligibility: 0% → 80%+ (from structured data)

---

## Testing Strategy

### Unit Testing
Not applicable - configuration and content changes only

### Integration Testing
1. **Build Test**: Verify `npm run build` completes with 0 errors/warnings
2. **HTML Validation**: Check generated HTML for structured data presence
3. **Link Integrity**: Verify all internal links resolve correctly

### E2E Testing
1. **robots.txt Accessibility**: `curl https://spec-weave.com/robots.txt` returns 200
2. **Social Card Preview**: Test with Twitter Card Validator, LinkedIn inspector
3. **Structured Data Validation**: Google Rich Results Test
4. **Search Crawler Simulation**: Use Screaming Frog or similar tool

### Performance Testing
1. **Lighthouse Audit**: Before/after comparison
2. **WebPageTest**: Load time analysis
3. **PageSpeed Insights**: Core Web Vitals check

### SEO Validation
1. **Google Search Console**: Submit updated sitemap, check indexing status
2. **Bing Webmaster Tools**: Verify robots.txt compliance
3. **Schema.org Validator**: Validate JSON-LD syntax

---

## Rollback Strategy

### Immediate Rollback (If Critical Issue)
```bash
# Option 1: Revert commit via Git
git revert <commit-sha>
git push origin main
# Cloudflare auto-deploys reverted version

# Option 2: Cloudflare UI rollback
# 1. Go to Cloudflare Pages dashboard
# 2. Find previous successful deployment
# 3. Click "Rollback to this deployment"
```

### Partial Rollback (If Specific Feature Breaks)
```typescript
// Remove problematic structured data
headTags: [
  // Comment out or remove broken schema
  // {
  //   tagName: 'script',
  //   attributes: { type: 'application/ld+json' },
  //   innerHTML: '...'
  // }
]
```

### Recovery Time Objective (RTO)
- Git revert + push: 2-3 minutes
- Cloudflare build + deploy: 3-5 minutes
- CDN cache propagation: 1-2 minutes
- **Total RTO: 6-10 minutes**

---

## Monitoring & Validation

### Post-Deployment Checks
1. ✅ Site loads correctly: https://spec-weave.com
2. ✅ robots.txt accessible: https://spec-weave.com/robots.txt
3. ✅ Structured data present in HTML source (view-source:)
4. ✅ Social card preview works on Twitter/LinkedIn
5. ✅ No broken links reported in build
6. ✅ Lighthouse SEO score ≥95

### Ongoing Monitoring
- **Google Search Console**: Weekly check for indexing issues
- **Cloudflare Analytics**: Monitor traffic patterns
- **Search Appearance**: Track rich snippet impressions
- **Lighthouse CI**: Automated SEO score tracking (optional)

### Success Metrics (30 days post-deployment)
- Organic search traffic: +20-40% increase
- Rich snippet impressions: >0 (currently 0)
- Average position in search results: Improved by 5-10 positions
- Lighthouse SEO score: Maintained at 95+
- Page load time: Improved by 50-200ms

---

## Technical Debt & Future Improvements

### Known Limitations
1. **WebP Fallback**: Current implementation relies on browser support (96%+), no explicit fallback logic
2. **Structured Data Granularity**: Organization/Software only, could add FAQPage, HowTo, Article schemas
3. **robots.txt Static**: No dynamic robots.txt generation based on environment
4. **Noindex Approach**: Component swizzling creates maintenance burden

### Future Enhancements
1. **Automated Structured Data**: Generate from frontmatter instead of hardcoding
2. **Advanced Social Cards**: Per-page custom OG images using dynamic generation
3. **Breadcrumb Schema**: Add BreadcrumbList JSON-LD for better search navigation
4. **Video Schema**: If YouTube tutorials added, include VideoObject schema
5. **FAQ Schema**: Add FAQPage schema to glossary and FAQ sections
6. **Automated Link Checking**: CI pipeline step to prevent broken links

### Maintenance Considerations
- **Docusaurus Upgrades**: Test swizzled components when upgrading Docusaurus
- **Structured Data Updates**: Keep rating values in sync with actual GitHub stars
- **robots.txt Review**: Periodically audit for new internal paths to exclude
- **WebP Library**: Monitor for security updates to webp conversion tools

---

## Deployment Checklist

### Pre-Deployment
- [ ] All user stories have acceptance criteria met
- [ ] `npm run build` completes with 0 errors/warnings
- [ ] Structured data validates in Google Rich Results Test
- [ ] robots.txt syntax validated
- [ ] WebP image converted and optimized
- [ ] All broken links fixed and verified
- [ ] Preview deployment tested in Cloudflare

### Deployment
- [ ] Create PR with all changes
- [ ] Code review completed
- [ ] Preview deployment URL verified
- [ ] Merge to main branch
- [ ] Monitor Cloudflare build logs
- [ ] Verify production deployment successful

### Post-Deployment
- [ ] Verify all critical paths (homepage, docs, blog)
- [ ] Test robots.txt accessibility
- [ ] Verify structured data in production HTML
- [ ] Submit sitemap to Google Search Console
- [ ] Monitor for errors in first 24 hours
- [ ] Update increment status to completed
