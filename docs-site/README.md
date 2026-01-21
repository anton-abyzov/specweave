# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `do` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

## Writing Blog Posts with SEO Best Practices

We provide an SEO template to ensure all blog posts have optimal metadata for search engines and social sharing.

### Using the Template

1. Copy the template:
   ```bash
   cp blog/_template.md blog/YYYY-MM-DD-your-post-title.md
   ```

2. Fill in SEO metadata:
   - **title**: 50-60 characters, include main keyword
   - **description**: 50-160 characters, compelling summary for search results
   - **keywords**: 3-5 relevant keywords/phrases
   - **image**: (optional) 1200x630px custom social card
   - **authors**: Author information with GitHub profile
   - **tags**: 2-4 relevant categorization tags

3. Write your content below the frontmatter

### SEO Checklist

- ✅ Title is 50-60 characters
- ✅ Description is 50-160 characters and compelling
- ✅ Keywords are relevant and specific
- ✅ Custom image is 1200x630px (if provided)
- ✅ Tags help users find related content
- ✅ Content uses headings (H2, H3) for structure
- ✅ Links to related docs/blog posts

### Example

See `blog/2026-01-04-seo-best-practices.md` for a complete example with all SEO metadata fields.

## Setting Up Site Search

We use Algolia DocSearch for fast, typo-tolerant search across all documentation.

### Applying for Algolia DocSearch

See [ALGOLIA-DOCSEARCH-SETUP.md](./ALGOLIA-DOCSEARCH-SETUP.md) for:
- Eligibility requirements
- Application process and timeline
- Configuration after approval
- Customization options
- Troubleshooting tips

DocSearch is **free for open-source documentation** and provides:
- ⚡ Fast, instant search results
- 🔍 Typo-tolerant fuzzy matching
- ⌨️ Keyboard shortcuts (`Ctrl+K` or `/`)
- 📱 Mobile-friendly search UI
- 🤖 Automatic indexing via web crawler
