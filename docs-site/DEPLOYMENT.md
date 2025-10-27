# SpecWeave Documentation Deployment Guide

This guide explains how to deploy the SpecWeave documentation to **spec-weave.com** using **Cloudflare Pages**.

## Overview

- **Framework**: Docusaurus 3 (React-based)
- **Hosting**: Cloudflare Pages
- **Domain**: spec-weave.com (managed via Cloudflare)
- **Source**: `.specweave/docs/public/` (via docs-site/)
- **Deployment**: Git-based (automatic on push to main)

## Architecture

\`\`\`
GitHub Repository (main branch)
    ↓ (push trigger)
Cloudflare Pages
    ↓ (build)
npm run build
    ↓ (output)
docs-site/build/
    ↓ (deploy)
https://spec-weave.com
\`\`\`

## Prerequisites

1. **Cloudflare account** with access to spec-weave.com domain
2. **GitHub repository** (anton-abyzov/specweave)
3. **Node.js 18+** installed locally for testing

## Step 1: Cloudflare Pages Setup (Git Integration)

### 1.1 Connect Repository

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** in the sidebar
3. Click **Create a project** → **Connect to Git**
4. Select **GitHub** and authorize Cloudflare
5. Choose repository: `anton-abyzov/specweave`
6. Click **Begin setup**

### 1.2 Configure Build Settings

**Project name**: `specweave-docs`

**Production branch**: `main` (or `develop` if you prefer)

**Build settings**:
- **Framework preset**: Docusaurus
- **Build command**: `cd docs-site && npm install && npm run build`
- **Build output directory**: `docs-site/build`
- **Root directory**: `/` (leave empty, we use cd in build command)

**Environment variables**: None needed for public docs

Click **Save and Deploy**.

### 1.3 Custom Domain Configuration

After first deployment:

1. Go to **Pages** → **specweave-docs** → **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `spec-weave.com`
4. Cloudflare will automatically configure DNS (since domain is managed by Cloudflare)
5. Add `www.spec-weave.com` as alias (optional)

**DNS Records** (auto-configured):
\`\`\`
Type: CNAME
Name: spec-weave.com
Value: specweave-docs.pages.dev
Proxy: Enabled (orange cloud)
\`\`\`

## Step 2: Secrets Management

### 2.1 GitHub Secrets (for GitHub Actions)

If using GitHub Actions for build validation:

1. Go to **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | API token for Cloudflare Pages deployment | Cloudflare Dashboard → My Profile → API Tokens → Create Token (Pages: Edit permission) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Cloudflare Dashboard → Pages → Account ID (bottom right) |

**IMPORTANT**: Use minimal permissions for API tokens (Pages:Edit only).

### 2.2 Environment Variables (Local Development)

Create `.env` file in `docs-site/` (gitignored):

\`\`\`bash
# docs-site/.env
# No secrets needed for public documentation
# This file is for future use if needed
\`\`\`

Add to `.gitignore`:
\`\`\`
docs-site/.env
docs-site/.env.local
docs-site/.env.production
\`\`\`

## Step 3: GitHub Actions Workflow (Optional)

Create `.github/workflows/docs-build.yml` for build validation on PRs:

\`\`\`yaml
name: Documentation Build

on:
  pull_request:
    paths:
      - 'docs-site/**'
      - '.specweave/docs/public/**'
  push:
    branches: [main, develop]
    paths:
      - 'docs-site/**'
      - '.specweave/docs/public/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'docs-site/package-lock.json'

      - name: Install dependencies
        run: cd docs-site && npm ci

      - name: Build documentation
        run: cd docs-site && npm run build

      - name: Check for broken links (optional)
        run: |
          cd docs-site
          npm run build
          # Add link checker here if needed
\`\`\`

## Step 4: Local Testing

### 4.1 Development Mode

\`\`\`bash
cd docs-site
npm install
npm start
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

### 4.2 Production Build Test

\`\`\`bash
cd docs-site
npm run build
npm run serve
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to test production build.

### 4.3 Check for Issues

\`\`\`bash
# Check for broken links
npm run build

# TypeScript type checking
npm run typecheck

# Lint check (if configured)
npm run lint
\`\`\`

## Step 5: Deployment Workflow

### Automatic Deployment (Recommended)

**On push to `main` branch**:
1. Developer pushes to `main` (or merges PR)
2. Cloudflare Pages detects push via webhook
3. Cloudflare runs build command
4. Builds to `docs-site/build/`
5. Deploys to https://spec-weave.com
6. Deployment completes in ~2 minutes

**Preview Deployments**:
- Every PR gets a preview URL: `https://abc123.specweave-docs.pages.dev`
- Test changes before merging

### Manual Deployment (if needed)

Using Wrangler CLI:

\`\`\`bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build locally
cd docs-site
npm run build

# Deploy to Cloudflare Pages
wrangler pages publish build --project-name=specweave-docs
\`\`\`

## Step 6: Monitoring & Troubleshooting

### Check Deployment Status

1. Go to **Cloudflare Dashboard** → **Pages** → **specweave-docs**
2. View **Deployments** tab
3. Check build logs for errors

### Common Issues

#### Build Fails: "Module not found"

**Solution**: Check `package.json` dependencies and run `npm install` locally first.

#### Build Fails: "TypeScript errors"

**Solution**: Fix TypeScript errors in `docs-site/src/` or `sidebars.ts`.

#### Broken Links

**Solution**: Ensure all referenced docs exist in `.specweave/docs/public/`.

#### Mermaid Diagrams Not Rendering

**Solution**:
- Verify `@docusaurus/theme-mermaid` is installed
- Check `docusaurus.config.ts` has `themes: ['@docusaurus/theme-mermaid']`
- Ensure diagrams are wrapped in \`\`\`mermaid code blocks

### Rollback Deployment

1. Go to **Pages** → **specweave-docs** → **Deployments**
2. Find previous successful deployment
3. Click **⋮** → **Rollback to this deployment**

## Security Best Practices

### 1. Secrets Management

✅ **DO**:
- Store secrets in GitHub Secrets (never in code)
- Use minimal API token permissions
- Rotate API tokens regularly
- Use environment-specific secrets

❌ **DON'T**:
- Commit `.env` files
- Share API tokens in chat/email
- Use admin-level tokens for deployments
- Store secrets in configuration files

### 2. Access Control

- Limit Cloudflare Pages access to trusted team members
- Use GitHub branch protection for `main` branch
- Require PR reviews before merging to `main`

### 3. Content Security

- Never publish internal documentation to public docs
- Review content before deployment
- Use `.gitignore` for sensitive files

## Performance Optimization

### 1. Cloudflare Configuration

**Caching**:
- Static assets cached at edge
- HTML cached with short TTL
- Automatic cache invalidation on deploy

**CDN**:
- Global distribution (200+ cities)
- Automatic HTTPS
- DDoS protection

### 2. Build Optimization

Add to `docusaurus.config.ts`:

\`\`\`typescript
export default {
  // ... other config
  future: {
    v4: true, // Prepare for Docusaurus v4
  },

  // Optimization
  onBrokenLinks: 'throw',  // Fail build on broken links
  onBrokenMarkdownLinks: 'warn',

  // Performance
  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
  ],
};
\`\`\`

## Maintenance

### Regular Tasks

- **Monthly**: Review deployment logs
- **Quarterly**: Update dependencies (`npm update`)
- **As needed**: Rotate API tokens
- **As needed**: Review and update documentation

### Dependency Updates

\`\`\`bash
cd docs-site

# Check for outdated packages
npm outdated

# Update all packages (test first!)
npm update

# Update Docusaurus specifically
npm install @docusaurus/core@latest @docusaurus/preset-classic@latest
\`\`\`

## Support

### Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Docusaurus Docs](https://docusaurus.io/docs)
- [SpecWeave GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

### Getting Help

1. Check deployment logs in Cloudflare Dashboard
2. Review GitHub Actions logs (if using)
3. Test build locally: `npm run build`
4. Create issue on GitHub with error details

---

**Next Steps**:
1. Complete Cloudflare Pages setup (Step 1)
2. Configure custom domain (Step 1.3)
3. Test deployment with a small change
4. Set up GitHub Actions for build validation (Step 3)

**Status**: ✅ Documentation site ready for deployment
