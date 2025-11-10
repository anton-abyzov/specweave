---
name: specweave-docs-preview:build
description: Build static documentation site for deployment. Generates production-ready HTML/CSS/JS files optimized for static hosting.
---

# Documentation Build Command

Build a production-ready static documentation site from your SpecWeave living documentation.

## Your Task

Execute the following workflow to build the static documentation site:

### Step 1: Load the Build Utilities

```typescript
import { buildStaticSite, isSetupNeeded } from '../../../src/utils/docs-preview/index.js';
import * as fs from 'fs-extra';
import * as path from 'path';
```

### Step 2: Check Prerequisites

```typescript
const projectRoot = process.cwd();

// Check if docs preview is configured
const configPath = path.join(projectRoot, '.specweave', 'config.json');
let config: any = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const docsConfig = config.documentation?.preview || {};

console.log('\n📦 Building Documentation Site...\n');

// Check if Docusaurus is installed
const setupNeeded = await isSetupNeeded(projectRoot);

if (setupNeeded) {
  console.error('❌ Docusaurus not installed\n');
  console.log('💡 Solution:');
  console.log('   Run: /specweave-docs-preview:preview');
  console.log('   This will install Docusaurus first\n');
  process.exit(1);
}
```

### Step 3: Build the Static Site

```typescript
try {
  console.log('ℹ️  Building production site...');
  console.log('   • Compiling React components');
  console.log('   • Optimizing assets');
  console.log('   • Generating static HTML\n');

  await buildStaticSite(projectRoot);

  const buildPath = path.join(projectRoot, '.specweave', 'docs-site-internal', 'build');
  const buildStats = await getBuildStats(buildPath);

  console.log('\n✅ Build Complete!\n');
  console.log('📊 Build Statistics:');
  console.log(`   • Pages: ${buildStats.pages} HTML files`);
  console.log(`   • Size: ${buildStats.totalSize}`);
  console.log(`   • Location: ${buildPath}\n`);

  console.log('🚀 Deployment Options:\n');
  console.log('1️⃣  Netlify:');
  console.log('   cd .specweave/docs-site-internal');
  console.log('   npx netlify deploy --dir=build --prod\n');

  console.log('2️⃣  Vercel:');
  console.log('   cd .specweave/docs-site-internal');
  console.log('   npx vercel --prod\n');

  console.log('3️⃣  GitHub Pages:');
  console.log('   cp -r build/* docs/');
  console.log('   git add docs/ && git commit -m "docs: update"');
  console.log('   git push\n');

  console.log('4️⃣  Static Server (local test):');
  console.log('   npx serve build/\n');

  console.log('5️⃣  Your own server:');
  console.log('   scp -r build/* user@server:/var/www/docs/\n');

} catch (error: any) {
  console.error('\n❌ Build Failed\n');
  console.error(`Error: ${error.message}\n`);

  console.log('💡 Troubleshooting:');
  console.log('   • Check all markdown files have valid frontmatter');
  console.log('   • Ensure no broken internal links');
  console.log('   • Run preview first to catch errors: /specweave-docs-preview:preview');
  console.log('   • Check build logs above for specific errors\n');

  process.exit(1);
}
```

### Step 4: Helper Function - Get Build Statistics

```typescript
async function getBuildStats(buildPath: string): Promise<{
  pages: number;
  totalSize: string;
}> {
  let pages = 0;
  let totalBytes = 0;

  async function walk(dir: string) {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        await walk(filePath);
      } else {
        totalBytes += stats.size;
        if (file.endsWith('.html')) {
          pages++;
        }
      }
    }
  }

  await walk(buildPath);

  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
  return {
    pages,
    totalSize: `${totalMB} MB`
  };
}
```

## What Gets Built

### Output Directory Structure
```
.specweave/docs-site-internal/build/
├── index.html                    ← Landing page
├── docs/
│   ├── strategy/
│   │   ├── prd-001/
│   │   │   └── index.html
│   │   └── okrs/
│   │       └── index.html
│   ├── specs/
│   │   ├── spec-001-auth/
│   │   │   └── index.html
│   │   └── spec-002-payments/
│   │       └── index.html
│   └── architecture/
│       ├── hld-system/
│       │   └── index.html
│       └── adr/
│           └── 0001-database-choice/
│               └── index.html
├── assets/
│   ├── css/
│   │   └── styles.[hash].css    ← Optimized CSS
│   ├── js/
│   │   └── runtime.[hash].js    ← React runtime
│   └── images/                  ← Optimized images
└── sitemap.xml                  ← Search engine sitemap
```

### Build Optimizations
1. **Code Splitting**: React chunks loaded on demand
2. **Asset Optimization**: CSS/JS minified and compressed
3. **Image Optimization**: Auto-resized and compressed
4. **Static HTML**: Pre-rendered pages for fast loading
5. **Search Index**: Pre-generated search index
6. **Sitemap**: Auto-generated for SEO

## Deployment Examples

### Netlify (Recommended)

**Option 1: CLI**
```bash
cd .specweave/docs-site-internal
npx netlify deploy --dir=build --prod
```

**Option 2: Drag & Drop**
1. Go to https://app.netlify.com/drop
2. Drag `.specweave/docs-site-internal/build/` folder
3. Done! Get instant URL

**Option 3: Git Integration**
1. Create `netlify.toml`:
   ```toml
   [build]
     base = ".specweave/docs-site-internal"
     publish = "build"
     command = "npm run build"
   ```
2. Connect GitHub repo
3. Auto-deploy on push

### Vercel

```bash
cd .specweave/docs-site-internal
npx vercel --prod
```

### GitHub Pages

**Option 1: docs/ folder**
```bash
# 1. Copy build to docs/
cp -r .specweave/docs-site-internal/build/* docs/

# 2. Enable GitHub Pages
# Go to Settings → Pages → Source: main branch /docs folder

# 3. Push
git add docs/
git commit -m "docs: update documentation site"
git push
```

**Option 2: gh-pages branch**
```bash
# 1. Install gh-pages
npm install -g gh-pages

# 2. Deploy
gh-pages -d .specweave/docs-site-internal/build
```

### AWS S3 + CloudFront

```bash
# 1. Sync to S3
aws s3 sync .specweave/docs-site-internal/build/ s3://your-bucket/ \
  --delete \
  --cache-control "max-age=31536000,public"

# 2. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Docker + Nginx

**Dockerfile:**
```dockerfile
FROM nginx:alpine
COPY .specweave/docs-site-internal/build/ /usr/share/nginx/html/
EXPOSE 80
```

**Build and run:**
```bash
docker build -t docs .
docker run -p 80:80 docs
```

### Your Own Server

**Nginx config:**
```nginx
server {
    listen 80;
    server_name docs.example.com;
    root /var/www/docs;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Deploy:**
```bash
scp -r .specweave/docs-site-internal/build/* user@server:/var/www/docs/
```

## Testing Before Deployment

### Local Testing with Serve

```bash
# 1. Install serve
npm install -g serve

# 2. Serve build folder
cd .specweave/docs-site-internal
serve build/

# 3. Open browser
# Visit: http://localhost:3000
```

### Check Lighthouse Scores

```bash
# 1. Install lighthouse
npm install -g lighthouse

# 2. Run audit
lighthouse http://localhost:3000 \
  --view \
  --output html

# Expected scores:
# Performance: 100
# Accessibility: 100
# Best Practices: 100
# SEO: 100
```

## Expected Output

**Successful Build:**
```
📦 Building Documentation Site...

ℹ️  Building production site...
   • Compiling React components
   • Optimizing assets
   • Generating static HTML

[==================================] 100%

✅ Build Complete!

📊 Build Statistics:
   • Pages: 42 HTML files
   • Size: 3.2 MB
   • Location: /project/.specweave/docs-site-internal/build/

🚀 Deployment Options:

1️⃣  Netlify:
   cd .specweave/docs-site-internal
   npx netlify deploy --dir=build --prod

2️⃣  Vercel:
   cd .specweave/docs-site-internal
   npx vercel --prod

3️⃣  GitHub Pages:
   cp -r build/* docs/
   git add docs/ && git commit -m "docs: update"
   git push

4️⃣  Static Server (local test):
   npx serve build/

5️⃣  Your own server:
   scp -r build/* user@server:/var/www/docs/
```

## Common Build Errors

### Invalid Frontmatter
```
Error: Invalid frontmatter in file: spec-001.md
```
**Fix:**
```markdown
---
title: User Authentication
sidebar_position: 1
---

Content here...
```

### Broken Links
```
Error: Broken link in file: architecture/hld.md
Link: ../specs/missing-file.md
```
**Fix:** Update or remove broken links

### Missing Dependencies
```
Error: Module not found: 'react'
```
**Fix:**
```bash
cd .specweave/docs-site-internal
npm install
```

## Build vs Preview

| Aspect | Preview (`/specweave-docs-preview:preview`) | Build (`/specweave-docs-preview:build`) |
|--------|---------------------------------------------|----------------------------------------|
| **Purpose** | Development, hot reload | Production deployment |
| **Speed** | Instant start | 5-10 seconds build |
| **Output** | Dev server | Static files |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Optimization** | ❌ No | ✅ Yes (minified, compressed) |
| **Search** | ✅ Works | ✅ Pre-generated index |
| **Use When** | Editing docs | Deploying to server |

## Best Practices

### 1. Build Before Every Deployment
Always build fresh before deploying:
```bash
/specweave-docs-preview:build
# Then deploy
```

### 2. Test Build Locally
```bash
/specweave-docs-preview:build
cd .specweave/docs-site-internal
npx serve build/
# Visit http://localhost:3000 and test
```

### 3. Check All Pages
- Click through every page
- Test search functionality
- Verify all links work
- Check mobile responsiveness

### 4. Optimize Images
Before building, optimize images:
```bash
# Install sharp-cli
npm install -g sharp-cli

# Optimize images
sharp -i docs/images/*.png -o docs/images/optimized/ -q 80
```

### 5. Update Sitemap
The sitemap is auto-generated, but verify it:
```bash
cat .specweave/docs-site-internal/build/sitemap.xml
```

## Integration with CI/CD

### GitHub Actions

**.github/workflows/docs.yml:**
```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - '.specweave/docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install SpecWeave
        run: npm install -g specweave

      - name: Build Docs
        run: specweave docs build

      - name: Deploy to Netlify
        run: |
          cd .specweave/docs-site-internal
          npx netlify deploy --dir=build --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_TOKEN }}
```

## See Also

- `/specweave-docs-preview:preview` - Preview docs locally with hot reload
- `specweave-docs` plugin - Documentation workflow skills
- Docusaurus docs: https://docusaurus.io/docs/deployment
