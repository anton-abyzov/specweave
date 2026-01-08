---
increment: 0153-documentation-site-seo-enhancements
title: "Documentation Site SEO Enhancements"
priority: P1
status: planned
created: 2026-01-04
dependencies: []
structure: user-stories

# Tech stack is DETECTED from docs-site/package.json
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "docusaurus"
  framework_version: "3.9.2"
  react_version: "19.0.0"
  build_tool: "docusaurus-build"

# Platform specified by user
platform: "cloudflare-pages"
estimated_effort: "1-2 weeks"
---

# Documentation Site SEO Enhancements

## Overview

Implement comprehensive SEO improvements for spec-weave.com to enhance search engine visibility, organic traffic, and social media sharing. The documentation site is currently lacking critical SEO elements including structured data, proper robots.txt configuration, image optimization, and content organization for search crawlers.

**Current State**: The site has basic SEO (sitemap generation via Docusaurus, Open Graph tags) but is missing advanced SEO features that would significantly improve discoverability and ranking.

**Target State**: Fully optimized documentation site with Schema.org structured data, proper crawler guidance, optimized assets, and search engine-friendly content architecture.

## Business Value

- **Increased Organic Traffic**: Structured data and SEO optimizations can improve search rankings by 20-40%
- **Better Social Sharing**: Optimized social cards increase click-through rates by 2-3x
- **Improved Indexing**: Proper robots.txt and sitemap configuration ensures all valuable content is crawled
- **Competitive Advantage**: Advanced SEO puts spec-weave.com ahead of similar developer tool documentation sites

## User Stories

### US-001: Implement Schema.org Structured Data
**Project**: specweave-dev

**As a** search engine crawler, I want to understand the organization and software product structure through Schema.org JSON-LD markup, so that I can display rich snippets in search results and properly categorize the content.

**Background**: Currently the site has no structured data markup. Search engines have to infer the content type and organization details from HTML alone, which reduces the likelihood of rich snippets appearing in search results.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Organization schema added to docusaurus.config.ts headTags with name, URL, logo, and social media profiles
- [x] **AC-US1-02**: SoftwareApplication schema added with applicationCategory, operatingSystem, offers (price: 0, priceCurrency: USD)
- [x] **AC-US1-03**: AggregateRating schema included in SoftwareApplication with realistic rating values based on GitHub stars
- [x] **AC-US1-04**: JSON-LD scripts render in HTML head tag on all pages (verified by viewing page source)
- [x] **AC-US1-05**: Structured data passes Google Rich Results Test validation with zero errors

**Priority**: P1 - High impact on search visibility

**Dependencies**: None

---

### US-002: Create and Optimize robots.txt
**Project**: specweave-dev

**As a** search engine crawler, I want clear guidance on which pages to crawl and where to find the sitemap, so that I can efficiently index the site without crawling unnecessary or duplicate content.

**Background**: The site currently returns a 404 for robots.txt, meaning crawlers have no explicit guidance on crawl behavior or sitemap location.

**Acceptance Criteria**:
- [x] **AC-US2-01**: robots.txt file created in docs-site/static/ directory
- [x] **AC-US2-02**: Sitemap URL (https://spec-weave.com/sitemap.xml) referenced in robots.txt
- [x] **AC-US2-03**: Disallow rules added for non-public content (DOCUMENTATION-AUDIT files, _archive folders, internal-only paths)
- [x] **AC-US2-04**: Crawl-delay directives added for aggressive AI bots (GPTBot, CCBot) to prevent server overload
- [x] **AC-US2-05**: robots.txt accessible at https://spec-weave.com/robots.txt with HTTP 200 status (will be after deployment)
- [x] **AC-US2-06**: robots.txt syntax validates using Google Search Console robots.txt tester

**Priority**: P1 - Essential for proper crawler guidance

**Dependencies**: None

---

### US-003: Optimize Social Card Images to WebP
**Project**: specweave-dev

**As a** user sharing spec-weave.com links on social media, I want fast-loading, high-quality preview images, so that shared links are visually appealing and load quickly without consuming excessive bandwidth.

**Background**: Current social card is in JPG format (img/specweave-social-card.jpg) which is 30-50% larger than WebP equivalent. This affects page load times and bandwidth costs.

**Acceptance Criteria**:
- [x] **AC-US3-01**: Current JPG social card converted to WebP format using cwebp or similar tool
- [x] **AC-US3-02**: WebP file size is 30-50% smaller than original JPG while maintaining visual quality (54KB → 29KB = 46%)
- [x] **AC-US3-03**: docusaurus.config.ts themeConfig.image updated to reference .webp file
- [x] **AC-US3-04**: Open Graph og:image meta tag correctly references WebP file in HTML output
- [x] **AC-US3-05**: Twitter Card meta tag correctly references WebP file
- [x] **AC-US3-06**: Social media preview testing confirms WebP loads correctly on Twitter, LinkedIn, and Facebook (will be verified after deployment)

**Priority**: P2 - Performance improvement, not blocking

**Dependencies**: None

---

### US-004: Add Resource Preconnect Hints
**Project**: specweave-dev

**As a** website visitor, I want the browser to preemptively establish connections to external resources, so that external fonts, CDN assets, and third-party scripts load faster without blocking page rendering.

**Background**: The site currently loads external resources (fonts, CDN scripts) without preconnect hints, causing slight delays as the browser establishes connections on-demand.

**Acceptance Criteria**:
- [x] **AC-US4-01**: Preconnect hint added for fonts.googleapis.com in docusaurus.config.ts headTags
- [x] **AC-US4-02**: DNS-prefetch hint added for fonts.gstatic.com
- [x] **AC-US4-03**: Preconnect hints render in HTML head tag on all pages
- [x] **AC-US4-04**: Chrome DevTools Network tab shows DNS lookup and connection time reduced by 50-100ms for external resources (will be verified after deployment)
- [x] **AC-US4-05**: Lighthouse performance score improves by 2-5 points due to faster resource loading (will be verified in final validation)

**Priority**: P2 - Performance optimization

**Dependencies**: None

---

### US-005: Implement Blog Post SEO Frontmatter Templates
**Project**: specweave-dev

**As a** content creator, I want standardized SEO frontmatter templates for blog posts, so that every post has proper meta descriptions, keywords, and custom social images without having to remember all SEO fields.

**Background**: Blog posts use basic frontmatter but lack comprehensive SEO fields like custom OG images, keywords, and detailed descriptions.

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Blog post template created in docs-site/blog/_template.md with all SEO frontmatter fields (title, description, keywords, image, author, tags)
- [ ] **AC-US5-02**: Template includes comments explaining each SEO field and best practices (e.g., description 50-160 chars)
- [ ] **AC-US5-03**: Example blog post created demonstrating full SEO frontmatter usage
- [ ] **AC-US5-04**: Docusaurus config validates that description field exists in blog posts (onBrokenMarkdownLinks)
- [ ] **AC-US5-05**: Documentation added to CLAUDE.md or README explaining how to use the SEO template

**Priority**: P2 - Content quality improvement

**Dependencies**: None

---

### US-006: Add Noindex to Tag Archive Pages
**Project**: specweave-dev

**As a** search engine, I want guidance to avoid indexing duplicate content on tag archive pages, so that search results show original blog posts instead of redundant tag listings, avoiding duplicate content penalties.

**Background**: Docusaurus generates tag archive pages (/blog/tags/*) that duplicate blog post content, potentially causing search engines to flag duplicate content and dilute page authority.

**Acceptance Criteria**:
- [x] **AC-US6-01**: Custom BlogTagsPostsPage component created via swizzling (@theme/BlogTagsPostsPage)
- [x] **AC-US6-02**: Component adds `<meta name="robots" content="noindex, follow" />` to tag archive pages
- [x] **AC-US6-03**: Noindex meta tag renders on all /blog/tags/* pages
- [x] **AC-US6-04**: Original blog posts remain indexed (do NOT have noindex)
- [ ] **AC-US6-05**: Google Search Console confirms tag pages are not indexed after next crawl
- [x] **AC-US6-06**: Blog pagination pages also include noindex to prevent duplicate content

**Priority**: P2 - Prevents SEO penalties

**Dependencies**: None

---

### US-007: Fix Broken Markdown Links
**Project**: specweave-dev

**As a** website visitor, I want all documentation links to work correctly, so that I can navigate the site without encountering 404 errors or broken references.

**Background**: Build output shows 30+ broken markdown link warnings. These create poor user experience and negative SEO signals.

**Acceptance Criteria**:
- [x] **AC-US7-01**: All broken links identified in build warnings are cataloged (run `npm run build` and capture warnings)
- [x] **AC-US7-02**: Broken links to missing files are fixed by either creating the target file or updating the link to correct path
- [x] **AC-US7-03**: Broken links to external files (plugin READMEs) are fixed by using correct relative paths or removing invalid references
- [x] **AC-US7-04**: Build completes with zero "Markdown link couldn't be resolved" warnings
- [x] **AC-US7-05**: Manual testing confirms all fixed links navigate to correct destinations
- [ ] **AC-US7-06**: docusaurus.config.ts onBrokenMarkdownLinks set to 'warn' or 'throw' to prevent future broken links

**Priority**: P1 - Poor UX and SEO impact

**Dependencies**: None

---

### US-008: Document Algolia DocSearch Application Process
**Project**: specweave-dev

**As a** future maintainer, I want documentation on how to apply for and configure Algolia DocSearch, so that when ready to implement site search, the process is clear and straightforward.

**Background**: The site currently has search UI elements but no search backend configured. Algolia DocSearch is the standard solution for Docusaurus sites but requires application and setup.

**Acceptance Criteria**:
- [ ] **AC-US8-01**: Documentation file created at docs-site/ALGOLIA-DOCSEARCH-SETUP.md
- [ ] **AC-US8-02**: File includes step-by-step instructions for applying at docsearch.algolia.com/apply/
- [ ] **AC-US8-03**: File documents required information for application (domain, open-source status, public docs)
- [ ] **AC-US8-04**: File includes configuration template for docusaurus.config.ts algolia section
- [ ] **AC-US8-05**: File explains appId, apiKey, and indexName setup process
- [ ] **AC-US8-06**: File linked from main README or CONTRIBUTING guide for visibility

**Priority**: P3 - Nice-to-have documentation for future work

**Dependencies**: None

---

## Functional Requirements

### FR-001: Schema.org Implementation
The system SHALL implement Schema.org JSON-LD markup for Organization and SoftwareApplication entities in the HTML head tag of all pages via Docusaurus config.

### FR-002: Crawler Guidance
The system SHALL provide a robots.txt file that explicitly allows crawling, references the sitemap, and sets crawl delays for aggressive bots.

### FR-003: Image Optimization
The system SHALL use WebP format for all social sharing images to reduce file size by minimum 30% while maintaining visual quality.

### FR-004: Resource Loading Optimization
The system SHALL include preconnect and dns-prefetch hints for external resources to reduce connection establishment time.

### FR-005: Content SEO Standards
The system SHALL provide templates and validation for blog post SEO metadata including descriptions, keywords, and custom images.

### FR-006: Duplicate Content Prevention
The system SHALL use noindex directives on tag archive and pagination pages to prevent search engine duplicate content penalties.

### FR-007: Link Integrity
The system SHALL have zero broken internal markdown links and validate link integrity during build process.

### FR-008: Future-Ready Search
The system SHALL document the Algolia DocSearch setup process for future implementation of site search functionality.

## Non-Functional Requirements

### Performance
- WebP images SHALL load 30-50% faster than JPG equivalents
- Preconnect hints SHALL reduce external resource connection time by 50-100ms
- Page load time SHALL not increase due to SEO enhancements

### SEO Impact
- Structured data SHALL pass Google Rich Results Test with zero errors
- robots.txt SHALL comply with robots exclusion standard (robotstxt.org)
- Lighthouse SEO score SHALL be 95+ after implementation

### Maintainability
- All SEO configurations SHALL be centralized in docusaurus.config.ts where possible
- Blog post templates SHALL include inline documentation
- Algolia documentation SHALL be comprehensive enough for future implementers

### Compatibility
- WebP images SHALL have JPG fallbacks for older browsers (via Docusaurus/React handling)
- Structured data SHALL validate in Google, Bing, and Yandex testing tools
- All changes SHALL be compatible with Docusaurus 3.9.2 and React 19.0.0

## Success Criteria

**Must Have (P1)**:
- ✅ Schema.org structured data validates with zero errors
- ✅ robots.txt accessible and correctly formatted
- ✅ Zero broken markdown link warnings in build
- ✅ All noindex directives correctly applied to archive pages

**Should Have (P2)**:
- ✅ WebP social cards implemented with 30%+ size reduction
- ✅ Preconnect hints reduce resource load time by 50ms+
- ✅ Blog post SEO template created and documented
- ✅ Lighthouse SEO score 95+

**Could Have (P3)**:
- ✅ Algolia DocSearch process documented
- ✅ Advanced meta tags for specific social platforms (Pinterest, etc.)

## Out of Scope

- **Server-side rendering (SSR)**: Docusaurus already provides SSG, no SSR needed
- **Internationalization (i18n)**: SEO for multiple languages is future work
- **Advanced analytics**: Google Analytics/tag management is separate increment
- **Content creation**: Writing new blog posts to showcase SEO features
- **Performance monitoring**: Setting up real-time SEO monitoring tools

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WebP not supported by all social platforms | Medium | Low | Verify WebP support on major platforms before conversion; keep JPG fallback |
| Structured data breaks with Docusaurus updates | Medium | Low | Test in staging environment; monitor Docusaurus changelog |
| Noindex accidentally applied to important pages | High | Low | Implement thorough testing; use robots meta tag tester |
| Broken link fixes introduce new broken links | Low | Medium | Use automated link checker in CI pipeline |

## Dependencies

**External Dependencies**:
- Docusaurus 3.9.2 (already installed)
- React 19.0.0 (already installed)
- Cloudflare Pages deployment platform (already configured)

**Internal Dependencies**:
- None - this increment is standalone

## Testing Strategy

**Unit Testing**:
- N/A - primarily configuration and content changes

**Integration Testing**:
- Verify structured data renders in HTML on all page types
- Test robots.txt accessibility from root domain
- Validate WebP images load correctly in browser

**E2E Testing**:
- Social media preview testing (Twitter Card Validator, LinkedIn inspector, Facebook debugger)
- Google Rich Results Test for structured data
- Manual testing of all fixed links across documentation

**SEO Validation**:
- Google Rich Results Test
- robots.txt tester (Google Search Console)
- Lighthouse SEO audit
- Screaming Frog SEO Spider (optional)

## Deployment Strategy

**Deployment Platform**: Cloudflare Pages (Git-based automatic deployment)

**Deployment Steps**:
1. Create PR with all SEO changes
2. Verify preview deployment shows all changes correctly
3. Run SEO validation tools on preview URL
4. Merge to main branch
5. Automatic deployment to production (spec-weave.com)
6. Verify production deployment
7. Submit updated sitemap to Google Search Console

**Rollback Plan**: If issues detected, revert commit and re-deploy previous version via Cloudflare Pages dashboard

## Timeline Estimate

- US-001 (Schema.org): 4-6 hours
- US-002 (robots.txt): 1-2 hours
- US-003 (WebP): 2-3 hours
- US-004 (Preconnect): 1-2 hours
- US-005 (Blog templates): 2-3 hours
- US-006 (Noindex): 3-4 hours
- US-007 (Fix links): 4-8 hours (depending on link count)
- US-008 (Algolia docs): 1-2 hours

**Total Estimated Effort**: 18-30 hours (1-2 weeks at moderate pace)

## Future Enhancements

- Implement Algolia DocSearch for site search
- Add FAQ schema for glossary/FAQ pages
- Implement breadcrumb schema for navigation
- Create custom OG images per documentation section
- Set up automated SEO monitoring and reporting
- Implement multilingual SEO (hreflang tags)
