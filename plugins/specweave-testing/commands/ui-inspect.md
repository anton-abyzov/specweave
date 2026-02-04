---
name: ui-inspect
description: Inspect web page elements using browser automation to identify selectors, attributes, and structure for testing and scraping.
---

# UI Inspect - Browser Element Inspection

Inspect web page elements using browser automation tools. Helps identify selectors, attributes, and structure for automated testing and web scraping.

## Usage

```
/sw-ui:ui-inspect <url> [options]
```

## What I Do

1. **Load Target Page**: Launch browser and navigate to the specified URL
2. **Interactive Inspection**: Use browser DevTools to inspect elements
3. **Extract Selectors**: Generate CSS/XPath selectors for identified elements
4. **Element Properties**: Show attributes, text content, styles, and position
5. **Accessibility Info**: Check ARIA labels, roles, and screen reader compatibility

## Options

- `--selector <selector>` - Target a specific CSS selector
- `--screenshot` - Capture screenshot of the inspected page
- `--headless` - Run browser in headless mode (default: true)
- `--browser <browser>` - Choose browser: chromium, firefox, webkit (default: chromium)

## Examples

### Inspect a specific element

```bash
/sw-ui:ui-inspect https://example.com --selector "button.submit"
```

### Capture full-page screenshot

```bash
/sw-ui:ui-inspect https://example.com --screenshot
```

### Inspect with visible browser

```bash
/sw-ui:ui-inspect https://example.com --headless=false
```

## Output

Provides:
- **Element Details**: Tag, classes, IDs, data attributes
- **Selectors**: Multiple selector strategies (CSS, XPath, text-based)
- **Accessibility**: ARIA attributes, semantic HTML usage
- **Visual Info**: Dimensions, position, visibility status
- **Screenshot**: Optional full-page or element screenshot

## Use Cases

- **Test Automation**: Find reliable selectors for Playwright/Selenium tests
- **Web Scraping**: Identify data extraction points
- **Accessibility Audit**: Check element accessibility
- **Bug Investigation**: Debug element behavior and properties

## Requirements

- Playwright browser binaries (auto-installed on first use)
- Network access to target URL

## Related Commands

- `/sw-ui:ui-automate` - Create automated browser workflows
- `/sw-testing:e2e-setup` - Set up E2E testing framework
