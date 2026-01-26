---
name: visual-regression
description: Visual regression testing expert. Use when implementing visual testing, detecting CSS regressions, or managing screenshot baselines.
---

# Visual Regression Testing Skill

Expert in visual regression testing - automated detection of unintended visual changes in web applications using screenshot comparison, pixel diffing, and visual testing frameworks.

## Why Visual Regression Testing?

**Problems It Solves**:
- CSS changes breaking layout unexpectedly
- Responsive design regressions (mobile/tablet/desktop)
- Cross-browser rendering differences
- Component library changes affecting consumers
- UI regressions that functional tests miss

**Example Scenario**:
```
Developer changes global CSS: `.container { padding: 10px }`
  ↓
Accidentally breaks checkout page layout
  ↓
Functional E2E tests pass (buttons still clickable)
  ↓
Visual regression test catches layout shift
```

## Core Tools

### 1. Playwright Visual Snapshots (Built-in)

**Why Playwright?**
- No third-party service required (free)
- Fast (parallel execution)
- Built-in automatic masking (hide dynamic content)
- Cross-browser support (Chromium, Firefox, WebKit)

#### Basic Snapshot Test

```typescript
import { test, expect } from '@playwright/test';

test('homepage should match visual baseline', async ({ page }) => {
  await page.goto('https://example.com');

  // Take full-page screenshot and compare to baseline
  await expect(page).toHaveScreenshot('homepage.png');
});
```

**First Run** (create baseline):
```bash
npx playwright test --update-snapshots
# Creates: tests/__screenshots__/homepage.spec.ts/homepage-chromium-darwin.png
```

**Subsequent Runs** (compare to baseline):
```bash
npx playwright test
# Compares current screenshot to baseline
# Fails if difference exceeds threshold
```

#### Element-Level Snapshots

```typescript
test('button should match visual baseline', async ({ page }) => {
  await page.goto('/buttons');

  const submitButton = page.locator('[data-testid="submit-button"]');
  await expect(submitButton).toHaveScreenshot('submit-button.png');
});
```

#### Configurable Thresholds

```typescript
// playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100, // Allow max 100 pixels to differ
      // OR
      maxDiffPixelRatio: 0.01, // Allow 1% of pixels to differ
    },
  },
});
```

#### Masking Dynamic Content

```typescript
test('dashboard with dynamic data', async ({ page }) => {
  await page.goto('/dashboard');

  // Mask elements that change frequently (timestamps, user IDs)
  await expect(page).toHaveScreenshot({
    mask: [
      page.locator('.timestamp'),
      page.locator('.user-avatar'),
      page.locator('[data-testid="ad-banner"]'),
    ],
  });
});
```

#### Responsive Testing (Multiple Viewports)

```typescript
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`homepage on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('https://example.com');

    await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`);
  });
}
```

### 2. Percy (Cloud-Based Visual Testing)

**Why Percy?**
- Smart diffing (ignores anti-aliasing differences)
- Review UI (approve/reject changes)
- Integrates with GitHub PRs
- Parallel testing across browsers
- Automatic baseline management

#### Setup

```bash
npm install --save-dev @percy/playwright
```

```typescript
// tests/visual.spec.ts
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('homepage visual test', async ({ page }) => {
  await page.goto('https://example.com');

  // Percy captures screenshot and compares to baseline
  await percySnapshot(page, 'Homepage');
});
```

```bash
# Run tests with Percy
PERCY_TOKEN=your_token npx percy exec -- npx playwright test
```

#### Percy Configuration

```yaml
# .percy.yml
version: 2
snapshot:
  widths:
    - 375   # Mobile
    - 768   # Tablet
    - 1280  # Desktop
  min-height: 1024
  percy-css: |
    /* Hide dynamic elements */
    .timestamp { visibility: hidden; }
    .ad-banner { display: none; }
```

#### Percy in CI (GitHub Actions)

```yaml
name: Visual Tests

on: [pull_request]

jobs:
  percy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run Percy tests
        run: npx percy exec -- npx playwright test
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

### 3. Chromatic (Storybook Visual Testing)

**Why Chromatic?**
- Designed for component libraries (Storybook integration)
- Captures all component states automatically
- UI review workflow (approve/reject)
- Detects accessibility issues
- Version control for design system

#### Setup (Storybook + Chromatic)

```bash
npm install --save-dev chromatic
npx chromatic --project-token=your_token
```

```javascript
// .storybook/main.js
module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
};
```

```typescript
// Button.stories.tsx
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
};

export const Primary = () => <Button variant="primary">Click me</Button>;
export const Disabled = () => <Button disabled>Disabled</Button>;
export const Loading = () => <Button loading>Loading...</Button>;
```

```bash
# Chromatic captures all stories automatically
npx chromatic --project-token=your_token
```

#### Chromatic in CI

```yaml
name: Chromatic

on: push

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Required for Chromatic
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx chromatic --project-token=${{ secrets.CHROMATIC_TOKEN }}
```

### 4. BackstopJS (Configuration-Based)

**Why BackstopJS?**
- No code required (JSON configuration)
- Local execution (no cloud service)
- Interactive reports
- CSS selector-based scenarios

#### Configuration

```json
{
  "id": "myapp_visual_tests",
  "viewports": [
    { "label": "phone", "width": 375, "height": 667 },
    { "label": "tablet", "width": 768, "height": 1024 },
    { "label": "desktop", "width": 1920, "height": 1080 }
  ],
  "scenarios": [
    {
      "label": "Homepage",
      "url": "https://example.com",
      "selectors": ["document"],
      "delay": 500
    },
    {
      "label": "Login Form",
      "url": "https://example.com/login",
      "selectors": [".login-form"],
      "hideSelectors": [".banner-ad"],
      "delay": 1000
    }
  ],
  "paths": {
    "bitmaps_reference": "backstop_data/bitmaps_reference",
    "bitmaps_test": "backstop_data/bitmaps_test",
    "html_report": "backstop_data/html_report"
  }
}
```

```bash
# Create baseline
backstop reference

# Run test (compare to baseline)
backstop test

# Update baseline (approve changes)
backstop approve
```

## Testing Strategies

### 1. Component-Level Visual Testing

**Use Case**: Design system components (buttons, inputs, modals)

```typescript
// Component snapshots
test.describe('Button component', () => {
  test('primary variant', async ({ page }) => {
    await page.goto('/storybook?path=/story/button--primary');
    await expect(page.locator('.button')).toHaveScreenshot('button-primary.png');
  });

  test('disabled state', async ({ page }) => {
    await page.goto('/storybook?path=/story/button--disabled');
    await expect(page.locator('.button')).toHaveScreenshot('button-disabled.png');
  });

  test('hover state', async ({ page }) => {
    await page.goto('/storybook?path=/story/button--primary');
    const button = page.locator('.button');
    await button.hover();
    await expect(button).toHaveScreenshot('button-hover.png');
  });
});
```

### 2. Page-Level Visual Testing

**Use Case**: Full pages (homepage, checkout, profile)

```typescript
test('checkout page visual baseline', async ({ page }) => {
  await page.goto('/checkout');

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');

  // Mask dynamic content
  await expect(page).toHaveScreenshot('checkout.png', {
    mask: [page.locator('.cart-timestamp'), page.locator('.promo-banner')],
    fullPage: true, // Capture entire page (scrolling)
  });
});
```

### 3. Interaction-Based Visual Testing

**Use Case**: Modals, dropdowns, tooltips (require interaction)

```typescript
test('modal visual test', async ({ page }) => {
  await page.goto('/');

  // Open modal
  await page.click('[data-testid="open-modal"]');
  await page.waitForSelector('.modal');

  // Capture modal screenshot
  await expect(page.locator('.modal')).toHaveScreenshot('modal-open.png');

  // Test error state
  await page.fill('input[name="email"]', 'invalid');
  await page.click('button[type="submit"]');
  await expect(page.locator('.modal')).toHaveScreenshot('modal-error.png');
});
```

### 4. Cross-Browser Visual Testing

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

```bash
# Run tests across all browsers
npx playwright test

# Generates separate baselines per browser:
# - homepage-chromium-darwin.png
# - homepage-firefox-darwin.png
# - homepage-webkit-darwin.png
```

## Best Practices

### 1. Stabilize Before Capturing

**Problem**: Animations, lazy loading, fonts cause flaky tests.

```typescript
// ❌ BAD: Capture immediately
await page.goto('/');
await expect(page).toHaveScreenshot();

// ✅ GOOD: Wait for stability
await page.goto('/');
await page.waitForLoadState('networkidle'); // Wait for network idle
await page.waitForSelector('.main-content'); // Wait for key element
await page.evaluate(() => document.fonts.ready); // Wait for fonts

// Disable animations for consistent screenshots
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `,
});

await expect(page).toHaveScreenshot();
```

### 2. Mask Dynamic Content

```typescript
await expect(page).toHaveScreenshot({
  mask: [
    page.locator('.timestamp'), // Changes every second
    page.locator('.user-id'), // Different per user
    page.locator('[data-dynamic="true"]'), // Marked as dynamic
    page.locator('video'), // Video frames vary
  ],
});
```

### 3. Use Meaningful Names

```typescript
// ❌ BAD: Generic names
await expect(page).toHaveScreenshot('test1.png');

// ✅ GOOD: Descriptive names
await expect(page).toHaveScreenshot('homepage-logged-in-user.png');
await expect(page).toHaveScreenshot('checkout-empty-cart-error.png');
```

### 4. Test Critical Paths Only

**Visual regression tests are expensive (slow, storage)**. Prioritize:

```typescript
// ✅ High Priority (critical user flows)
- Homepage (first impression)
- Checkout flow (revenue-critical)
- Login/signup (user acquisition)
- Product details (conversion)

// ⚠️ Medium Priority (important but not critical)
- Profile settings
- Search results
- Category pages

// ❌ Low Priority (skip or sample)
- Admin dashboards (internal users)
- Footer (rarely changes)
- Legal pages
```

### 5. Baseline Management Strategy

**When to Update Baselines**:
- ✅ Intentional design changes (approved by design team)
- ✅ Component library upgrades (reviewed)
- ✅ Browser updates (expected differences)
- ❌ Unintentional changes (investigate first!)

```bash
# Review diff report BEFORE approving
npx playwright test --update-snapshots # Use carefully!

# Better: Update selectively
npx playwright test homepage.spec.ts --update-snapshots
```

## Debugging Visual Diffs

### 1. Review Diff Report

Playwright generates HTML report with side-by-side comparison:

```bash
npx playwright test
# On failure, opens: playwright-report/index.html
# Shows: Expected | Actual | Diff (highlighted pixels)
```

### 2. Adjust Thresholds

```typescript
// Tolerate minor differences (anti-aliasing, font rendering)
await expect(page).toHaveScreenshot({
  maxDiffPixelRatio: 0.02, // 2% tolerance
});
```

### 3. Ignore Specific Regions

```typescript
// Ignore regions that legitimately differ
await expect(page).toHaveScreenshot({
  mask: [page.locator('.animated-banner')],
  clip: { x: 0, y: 0, width: 800, height: 600 }, // Capture specific area
});
```

## CI/CD Integration

### 1. GitHub Actions (Playwright Snapshots)

```yaml
name: Visual Regression Tests

on:
  pull_request:
    branches: [main]

jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run visual tests
        run: npx playwright test

      - name: Upload diff report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diff-report
          path: playwright-report/
```

### 2. Baseline Storage Strategies

**Option 1: Git LFS (Large File Storage)**
- Store baselines in Git (versioned with code)
- Use Git LFS to avoid bloating repository
- Automatic sync across developers

```bash
# .gitattributes
*.png filter=lfs diff=lfs merge=lfs -text

git lfs install
git add tests/__screenshots__/*.png
git commit -m "Add visual baselines"
```

**Option 2: Cloud Storage (S3, GCS)**
- Store baselines in cloud bucket
- Download in CI before test
- Faster CI (no Git LFS checkout)

```yaml
- name: Download baselines
  run: aws s3 sync s3://my-bucket/baselines tests/__screenshots__/
```

**Option 3: Percy/Chromatic (Managed)**
- Baselines stored in service (no Git needed)
- Automatic baseline management
- UI for reviewing changes

### 3. Handling Baseline Drift

**Problem**: Developer A updates baselines, Developer B's tests fail.

**Solution 1: Require baseline review**
```yaml
# PR merge rules
- Require approval for changes in tests/__screenshots__/
```

**Solution 2: Auto-update in CI**
```yaml
- name: Update baselines if approved
  if: contains(github.event.pull_request.labels.*.name, 'update-baselines')
  run: |
    npx playwright test --update-snapshots
    git config user.name "GitHub Actions"
    git add tests/__screenshots__/
    git commit -m "Update visual baselines"
    git push
```

## Common Pitfalls

### 1. Flaky Tests Due to Animations

❌ **Bad**:
```typescript
await page.goto('/'); // Page has CSS animations
await expect(page).toHaveScreenshot(); // Fails randomly (mid-animation)
```

✅ **Good**:
```typescript
await page.goto('/');
await page.addStyleTag({ content: '* { animation: none !important; }' });
await expect(page).toHaveScreenshot();
```

### 2. Font Loading Issues

❌ **Bad**:
```typescript
await page.goto('/'); // Fonts loading async
await expect(page).toHaveScreenshot(); // Sometimes uses fallback font
```

✅ **Good**:
```typescript
await page.goto('/');
await page.evaluate(() => document.fonts.ready); // Wait for fonts
await expect(page).toHaveScreenshot();
```

### 3. Testing Everything (Slow CI)

❌ **Bad**: 500 visual tests (30 min CI time)
✅ **Good**: 50 critical visual tests (5 min CI time)

**Optimize**:
```typescript
// Run visual tests only on visual changes
if (changedFiles.some(file => file.endsWith('.css'))) {
  runVisualTests();
}
```

### 4. Platform Differences (macOS vs Linux)

**Problem**: Screenshots differ between macOS (local) and Linux (CI).

**Solution**: Use Docker for local development
```bash
# Local development with Docker
docker run -it --rm -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.40.0-focal npx playwright test
```

## Advanced Techniques

### 1. Visual Regression for Emails

```typescript
test('email template visual test', async ({ page }) => {
  const emailHtml = await generateEmailTemplate({ userName: 'John', orderTotal: '$99.99' });

  await page.setContent(emailHtml);
  await expect(page).toHaveScreenshot('order-confirmation-email.png');
});
```

### 2. PDF Visual Testing

```typescript
test('invoice PDF visual test', async ({ page }) => {
  await page.goto('/invoice/123');
  const pdfBuffer = await page.pdf({ format: 'A4' });

  // Convert PDF to image and compare
  const pdfImage = await pdfToImage(pdfBuffer);
  expect(pdfImage).toMatchSnapshot('invoice.png');
});
```

### 3. A/B Test Visual Variants

```typescript
test('A/B test variant visual comparison', async ({ page }) => {
  // Test control variant
  await page.goto('/?variant=control');
  await expect(page).toHaveScreenshot('homepage-control.png');

  // Test experiment variant
  await page.goto('/?variant=experiment');
  await expect(page).toHaveScreenshot('homepage-experiment.png');

  // Manual review to ensure both look good
});
```

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Percy Documentation](https://docs.percy.io/)
- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [BackstopJS](https://github.com/garris/BackstopJS)

## Activation Keywords

Ask me about:
- "How to set up visual regression testing"
- "Playwright screenshot testing"
- "Percy vs Chromatic comparison"
- "Visual testing for components"
- "How to fix flaky visual tests"
- "Managing visual baselines in CI"
- "Cross-browser visual testing"
- "Screenshot comparison best practices"
- "Visual regression CI integration"
