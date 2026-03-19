# GitHub Pages Deployment Guide - spec-weave.com

## 🎉 NO SECRETS REQUIRED!

GitHub Pages uses automatic `GITHUB_TOKEN` - **completely secure for public repositories!**

## Overview

- **Hosting**: GitHub Pages (FREE for public repos)
- **Domain**: spec-weave.com (custom domain)
- **Source**: `.specweave/docs/public/` via `docs-site/`
- **Deployment**: Automatic on push to `main` branch
- **Build**: Docusaurus 3 → Static HTML/CSS/JS
- **HTTPS**: Automatic (GitHub provides free SSL)

## Architecture

\`\`\`
GitHub Repository (main branch)
    ↓ (push trigger)
GitHub Actions Workflow
    ↓ (build)
npm run build (in docs-site/)
    ↓ (artifact)
docs-site/do/ directory
    ↓ (deploy)
GitHub Pages
    ↓ (serve)
https://spec-weave.com
\`\`\`

## Prerequisites

1. ✅ **Public GitHub repository** (already done!)
2. ✅ **Custom domain** (spec-weave.com)
3. ✅ **DNS access** (to configure CNAME record)

## Step 1: Enable GitHub Pages

### 1.1 Go to Repository Settings

1. Navigate to https://github.com/anton-abyzov/specweave
2. Click **Settings** tab
3. Scroll to **Pages** section (left sidebar)

### 1.2 Configure GitHub Pages

**Source**:
- Select: **GitHub Actions**
  (NOT "Deploy from a branch" - we're using the workflow)

**Custom domain**:
- Enter: `spec-weave.com`
- Click **Save**

GitHub will create a CNAME file automatically (we already have one in `docs-site/static/CNAME`).

## Step 2: Configure DNS (Your Domain Provider)

You need to add DNS records at your domain registrar (where spec-weave.com is registered).

### Option A: CNAME Record (Recommended)

If using a subdomain or if registrar supports CNAME for apex domain:

\`\`\`
Type: CNAME
Name: @ (or spec-weave.com)
Value: anton-abyzov.github.io
TTL: 3600
\`\`\`

### Option B: A Records (For apex domain)

If CNAME doesn't work, use A records pointing to GitHub Pages IPs:

\`\`\`
Type: A
Name: @ (or spec-weave.com)
Value: 185.199.108.153
TTL: 3600

Type: A
Name: @ (or spec-weave.com)
Value: 185.199.109.153
TTL: 3600

Type: A
Name: @ (or spec-weave.com)
Value: 185.199.110.153
TTL: 3600

Type: A
Name: @ (or spec-weave.com)
Value: 185.199.111.153
TTL: 3600
\`\`\`

### Add www subdomain (optional):

\`\`\`
Type: CNAME
Name: www
Value: anton-abyzov.github.io
TTL: 3600
\`\`\`

**DNS Propagation**: Can take 5 minutes to 48 hours (usually < 1 hour)

## Step 3: Deploy

### 3.1 Push to Main Branch

\`\`\`bash
# Ensure you're on the right branch
git checkout main

# Add all changes
git add .

# Commit
git commit -m "feat: configure GitHub Pages deployment

- Add MIT License (same as spec-kit and BMAD)
- Add GitHub Pages workflow (no secrets!)
- Configure custom domain (spec-weave.com)
- Add CNAME file for custom domain
- Update deployment documentation"

# Push to GitHub
git push origin main
\`\`\`

### 3.2 GitHub Actions Will Automatically:

1. Detect push to `main` branch
2. Checkout repository
3. Install Node.js 18
4. Install npm dependencies (`npm ci`)
5. Build Docusaurus site (`npm run build`)
6. Upload build artifact
7. Deploy to GitHub Pages

**Duration**: ~2-3 minutes

### 3.3 Monitor Deployment

1. Go to **Actions** tab in GitHub
2. Click on the running workflow: "Deploy Documentation to GitHub Pages"
3. Watch build and deploy steps
4. Green checkmark = success!

## Step 4: Verify Deployment

### Check GitHub Pages URL

First deployment will be available at:
- https://anton-abyzov.github.io/specweave/

Custom domain (after DNS propagates):
- https://spec-weave.com

### DNS Verification

Check if DNS is propagated:

\`\`\`bash
# Check CNAME record
dig spec-weave.com CNAME

# Check A records
dig spec-weave.com A

# Expected output:
# spec-weave.com. IN CNAME anton-abyzov.github.io.
\`\`\`

### HTTPS Certificate

After custom domain is configured:
1. GitHub Pages automatically generates SSL certificate
2. HTTPS will be enforced
3. May take 10-30 minutes

## Security: NO SECRETS IN REPOSITORY!

### ✅ What's SECURE:

1. **GITHUB_TOKEN**: Automatically provided by GitHub Actions
   - Scoped to repository only
   - Valid only during workflow execution
   - **Never appears in logs or code**
   - Rotated automatically

2. **No API keys needed**: GitHub Pages is built-in
3. **No credentials in code**: Everything is automatic
4. **Public repository safe**: No secrets to expose

### ✅ What's in `.gitignore`:

\`\`\`
# docs-site/.gitignore
node_modules/
build/
.docusaurus/
.env
.env.local
.env.production
.env.test
\`\`\`

All sensitive files are ignored - safe for public repo!

### ✅ Workflow Permissions (already configured):

\`\`\`yaml
permissions:
  contents: read      # Read repository code
  pages: write        # Write to GitHub Pages
  id-token: write     # Generate deployment token
\`\`\`

Minimal permissions - secure by default!

## Workflow Details

### Triggers

Automatic deployment happens on:
- **Push to main branch** affecting:
  - `docs-site/**` folder
  - `.specweave/docs/public/**` folder
  - Workflow file itself
- **Manual dispatch**: Can trigger from Actions tab

### Build Process

\`\`\`yaml
1. Checkout repository
2. Setup Node.js 18 (with npm cache)
3. npm ci (install dependencies)
4. npm run build (build Docusaurus)
5. Upload artifact (build/ directory)
6. Deploy to GitHub Pages (automatic)
\`\`\`

### Concurrency Control

\`\`\`yaml
concurrency:
  group: "pages"
  cancel-in-progress: false
\`\`\`

Only one deployment at a time - prevents conflicts.

## Custom Domain Configuration

### CNAME File Location

\`\`\`
docs-site/static/CNAME
\`\`\`

Contents:
\`\`\`
spec-weave.com
\`\`\`

This file is automatically copied to the root of the built site during build.

### GitHub Pages Settings

After deployment:
1. Go to Settings → Pages
2. Custom domain should show: **spec-weave.com**
3. **Enforce HTTPS** should be checked (automatic)
4. DNS check status should show: ✅ **DNS check successful**

## Troubleshooting

### Deployment Failed

**Check workflow logs**:
1. Go to **Actions** tab
2. Click failed workflow
3. Expand failed step
4. Read error message

**Common issues**:
- TypeScript errors → Fix in `docusaurus.config.ts`
- Broken links → Check markdown files
- Missing dependencies → Run `npm install` locally first

**Solution**: Fix issue, commit, push again.

### DNS Not Working

**Symptoms**:
- spec-weave.com doesn't resolve
- Shows "404 Not Found"
- HTTPS certificate error

**Check**:
1. DNS records are correct (see Step 2)
2. DNS has propagated (can take up to 48 hours)
3. GitHub Pages custom domain is configured (Settings → Pages)

**Test DNS**:
\`\`\`bash
dig spec-weave.com

# Should return:
# spec-weave.com. IN CNAME anton-abyzov.github.io.
# OR
# spec-weave.com. IN A 185.199.108.153
\`\`\`

### HTTPS Not Working

**Symptoms**:
- "Not Secure" warning
- Certificate error

**Solution**:
1. Wait 10-30 minutes after DNS propagates
2. GitHub Pages generates certificate automatically
3. Check Settings → Pages → "Enforce HTTPS" is checked

**Force certificate refresh**:
1. Go to Settings → Pages
2. Remove custom domain
3. Save
4. Re-add custom domain
5. Save
6. Wait 10-30 minutes

### Build Takes Too Long

**Normal build time**: 2-3 minutes

**If longer**:
- Check npm cache is working (`cache: 'npm'`)
- Ensure `npm ci` is used (not `npm install`)
- Check for large files in `static/` directory

## Manual Deployment (Emergency)

If GitHub Actions fails, you can deploy manually:

\`\`\`bash
# 1. Build locally
cd docs-site
npm run build

# 2. Install gh-pages (one-time)
npm install -g gh-pages

# 3. Deploy to gh-pages branch
gh-pages -d build -t true

# -d build: Deploy build directory
# -t true: Include dotfiles (like .nojekyll)
\`\`\`

**Note**: This creates a `gh-pages` branch. You'll need to change Settings → Pages → Source to "Deploy from a branch" → Branch: `gh-pages`.

## Monitoring

### Check Deployment Status

**GitHub UI**:
- Actions tab → See all deployments
- Green checkmark = successful
- Red X = failed

**Email Notifications**:
- GitHub sends emails on workflow failures
- Configure in Settings → Notifications

**Status Badge** (add to README.md):
\`\`\`markdown
![Deploy Docs](https://github.com/anton-abyzov/specweave/actions/workflows/deploy-docs.yml/badge.svg)
\`\`\`

### Deployment URL

After successful deployment:
- **GitHub Pages**: https://anton-abyzov.github.io/specweave/
- **Custom Domain**: https://spec-weave.com

## Performance

### GitHub Pages Benefits

- ✅ **Free**: Unlimited builds/bandwidth for public repos
- ✅ **Global CDN**: Fast worldwide
- ✅ **HTTPS**: Free SSL certificates
- ✅ **No rate limits**: Unlimited requests
- ✅ **High availability**: 99.9% uptime SLA
- ✅ **DDoS protection**: Built-in
- ✅ **No secrets required**: Completely secure

### Build Optimization

**Current configuration**:
- npm cache enabled (faster installs)
- `npm ci` instead of `npm install` (deterministic)
- Artifact upload only includes `build/` directory

**Typical build times**:
- First build: 3-4 minutes (no cache)
- Subsequent builds: 2-3 minutes (with cache)

## Maintenance

### Regular Tasks

- **Never**: No secrets to rotate!
- **Monthly**: Review deployment logs (optional)
- **Quarterly**: Update dependencies (`npm update` in docs-site/)
- **As needed**: Fix broken links, update content

### Dependency Updates

\`\`\`bash
cd docs-site

# Check for outdated packages
npm outdated

# Update packages
npm update

# Test locally
npm run build

# Commit and push
git add package.json package-lock.json
git commit -m "chore: update dependencies"
git push
\`\`\`

## Costs

**Total cost: $0.00** ✅

- GitHub Pages: FREE for public repositories
- GitHub Actions: 2000 minutes/month free (more than enough)
- Custom domain SSL: FREE (automatic)
- Bandwidth: UNLIMITED
- Builds: UNLIMITED

**No credit card required!**

## Support

### Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Docusaurus Documentation](https://docusaurus.io/docs/deployment#deploying-to-github-pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Custom Domains Guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

### Getting Help

1. **Check workflow logs** (Actions tab)
2. **Test build locally**: `cd docs-site && npm run build`
3. **Check DNS**: `dig spec-weave.com`
4. **Create GitHub Issue**: For SpecWeave-specific questions
5. **GitHub Community**: For GitHub Pages questions

---

## Quick Start Checklist

- [ ] Repository is public ✅ (already done)
- [ ] Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
- [ ] Add custom domain in GitHub Pages settings (spec-weave.com)
- [ ] Configure DNS at domain registrar (CNAME or A records)
- [ ] Push to main branch (`git push origin main`)
- [ ] Wait for GitHub Actions to complete (~2-3 minutes)
- [ ] Wait for DNS to propagate (5 minutes - 48 hours)
- [ ] Visit https://spec-weave.com - Success! 🎉

---

**Ready to deploy?** Just push to main and GitHub does the rest - **NO SECRETS REQUIRED!** 🚀
