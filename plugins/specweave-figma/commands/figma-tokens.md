# /sw-figma:tokens

Extract design tokens from Figma and generate token files for theme configuration (CSS variables, JavaScript, JSON, SCSS).

You are a design token expert who automates design system token extraction and synchronization from Figma.

## Your Task

Extract design tokens (colors, typography, spacing, shadows, borders) from Figma and generate production-ready token files in multiple formats.

### 1. Design Token Standards

**W3C Design Tokens Format** (Recommended):
```json
{
  "colors": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": "#0066FF",
        "$description": "Primary brand color"
      },
      "secondary": {
        "$type": "color",
        "$value": "#00CC66"
      }
    }
  },
  "typography": {
    "heading": {
      "h1": {
        "$type": "typography",
        "$value": {
          "fontFamily": "Inter",
          "fontSize": "48px",
          "fontWeight": 700,
          "lineHeight": 1.2
        }
      }
    }
  }
}
```

**Token Categories**:
- Colors (brand, semantic, grayscale)
- Typography (font families, sizes, weights, line heights)
- Spacing (margins, paddings, gaps)
- Border radius (corners)
- Shadows (elevations)
- Borders (widths, styles)
- Breakpoints (responsive)
- Z-index (layering)
- Transitions (animations)

### 2. Figma Token Extraction

**Extract Color Tokens from Styles**:

```typescript
import { FigmaImporter } from './figma-importer';

interface ColorToken {
  name: string;
  value: string;
  rgba: { r: number; g: number; b: number; a: number };
  type: 'solid' | 'gradient';
  description?: string;
}

async function extractColorTokens(fileKey: string): Promise<ColorToken[]> {
  const importer = new FigmaImporter({
    accessToken: process.env.FIGMA_ACCESS_TOKEN!,
    fileKey,
  });

  const file = await importer.fetchFile();
  const styles = await importer.fetchStyles();

  const colorTokens: ColorToken[] = [];

  for (const style of styles) {
    if (style.style_type === 'FILL') {
      const node = findNodeById(file.document, style.node_id);

      if (node?.fills?.[0]) {
        const fill = node.fills[0];

        if (fill.type === 'SOLID') {
          colorTokens.push({
            name: style.name,
            value: rgbaToHex(fill.color, fill.opacity),
            rgba: {
              r: fill.color.r,
              g: fill.color.g,
              b: fill.color.b,
              a: fill.opacity ?? 1,
            },
            type: 'solid',
            description: style.description || undefined,
          });
        } else if (fill.type === 'GRADIENT_LINEAR') {
          colorTokens.push({
            name: style.name,
            value: convertGradientToCSS(fill),
            rgba: fill.gradientStops[0].color,
            type: 'gradient',
            description: style.description,
          });
        }
      }
    }
  }

  return colorTokens;
}

function rgbaToHex(color: { r: number; g: number; b: number }, opacity = 1): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (opacity < 1) {
    const a = Math.round(opacity * 255);
    return `#${[r, g, b, a].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }

  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}
```

**Extract Typography Tokens**:

```typescript
interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  description?: string;
}

async function extractTypographyTokens(fileKey: string): Promise<TypographyToken[]> {
  const importer = new FigmaImporter({
    accessToken: process.env.FIGMA_ACCESS_TOKEN!,
    fileKey,
  });

  const file = await importer.fetchFile();
  const styles = await importer.fetchStyles();

  const typographyTokens: TypographyToken[] = [];

  for (const style of styles) {
    if (style.style_type === 'TEXT') {
      const node = findNodeById(file.document, style.node_id);

      if (node?.style) {
        typographyTokens.push({
          name: style.name,
          fontFamily: node.style.fontFamily,
          fontSize: node.style.fontSize,
          fontWeight: node.style.fontWeight,
          lineHeight: node.style.lineHeightPx / node.style.fontSize,
          letterSpacing: node.style.letterSpacing || undefined,
          textTransform: node.style.textCase?.toLowerCase() as any,
          description: style.description,
        });
      }
    }
  }

  return typographyTokens;
}
```

**Extract Spacing Tokens from Auto Layout**:

```typescript
interface SpacingToken {
  name: string;
  value: number;
  description?: string;
}

async function extractSpacingTokens(fileKey: string): Promise<SpacingToken[]> {
  const importer = new FigmaImporter({
    accessToken: process.env.FIGMA_ACCESS_TOKEN!,
    fileKey,
  });

  const file = await importer.fetchFile();

  const spacingValues = new Set<number>();

  // Traverse all frames with auto layout
  traverseNodes(file.document, (node) => {
    if (node.layoutMode) {
      // Item spacing (gap)
      if (node.itemSpacing) {
        spacingValues.add(node.itemSpacing);
      }

      // Padding
      if (node.paddingLeft) spacingValues.add(node.paddingLeft);
      if (node.paddingRight) spacingValues.add(node.paddingRight);
      if (node.paddingTop) spacingValues.add(node.paddingTop);
      if (node.paddingBottom) spacingValues.add(node.paddingBottom);
    }
  });

  // Generate semantic names (4px → xs, 8px → sm, etc.)
  const sortedSpacing = Array.from(spacingValues).sort((a, b) => a - b);

  const sizeMap = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];

  return sortedSpacing.map((value, index) => ({
    name: sizeMap[index] || `spacing-${index}`,
    value,
    description: `${value}px spacing`,
  }));
}
```

**Extract Shadow Tokens (Elevation)**:

```typescript
interface ShadowToken {
  name: string;
  value: string; // CSS box-shadow value
  layers: Array<{
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
  }>;
  description?: string;
}

async function extractShadowTokens(fileKey: string): Promise<ShadowToken[]> {
  const importer = new FigmaImporter({
    accessToken: process.env.FIGMA_ACCESS_TOKEN!,
    fileKey,
  });

  const file = await importer.fetchFile();
  const styles = await importer.fetchStyles();

  const shadowTokens: ShadowToken[] = [];

  for (const style of styles) {
    if (style.style_type === 'EFFECT') {
      const node = findNodeById(file.document, style.node_id);

      if (node?.effects) {
        const shadows = node.effects.filter(
          (e: any) => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'
        );

        if (shadows.length > 0) {
          const layers = shadows.map((shadow: any) => ({
            x: shadow.offset.x,
            y: shadow.offset.y,
            blur: shadow.radius,
            spread: shadow.spread || 0,
            color: rgbaToHex(shadow.color, shadow.color.a),
          }));

          const cssValue = layers
            .map(
              (layer) =>
                `${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${layer.color}`
            )
            .join(', ');

          shadowTokens.push({
            name: style.name,
            value: cssValue,
            layers,
            description: style.description,
          });
        }
      }
    }
  }

  return shadowTokens;
}
```

### 3. Token Organization

**Hierarchical Token Structure**:

```
tokens/
├── global/
│   ├── colors.json          # Brand colors, primitives
│   ├── typography.json      # Font scales
│   ├── spacing.json         # Spacing scale
│   └── shadows.json         # Elevation scale
├── semantic/
│   ├── colors.json          # Semantic colors (success, error, warning)
│   ├── components.json      # Component-specific tokens
│   └── themes.json          # Light/dark theme mappings
└── platform/
    ├── web.json             # Web-specific tokens (CSS variables)
    ├── ios.json             # iOS-specific (Swift)
    └── android.json         # Android-specific (XML)
```

**Naming Convention** (BEM-inspired):
```
category-element-modifier-state

Examples:
- color-brand-primary
- color-semantic-success
- color-text-primary
- typography-heading-h1
- spacing-component-button-padding
- shadow-elevation-1
- border-radius-sm
```

### 4. Token File Formats

**CSS Variables** (Most Common):

```css
/* tokens/global/colors.css */
:root {
  /* Brand Colors */
  --color-brand-primary: #0066FF;
  --color-brand-secondary: #00CC66;
  --color-brand-tertiary: #FF6600;

  /* Semantic Colors */
  --color-semantic-success: #00CC66;
  --color-semantic-error: #FF3333;
  --color-semantic-warning: #FFCC00;
  --color-semantic-info: #0066FF;

  /* Grayscale */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* Typography */
  --font-family-sans: 'Inter', -apple-system, sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;

  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Spacing */
  --spacing-xs: 0.25rem;  /* 4px */
  --spacing-sm: 0.5rem;   /* 8px */
  --spacing-md: 1rem;     /* 16px */
  --spacing-lg: 1.5rem;   /* 24px */
  --spacing-xl: 2rem;     /* 32px */
  --spacing-2xl: 3rem;    /* 48px */
  --spacing-3xl: 4rem;    /* 64px */

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  /* Border Radius */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms;
  --transition-base: 250ms;
  --transition-slow: 350ms;
}
```

**JavaScript/TypeScript**:

```typescript
// tokens/global/colors.ts
export const colors = {
  brand: {
    primary: '#0066FF',
    secondary: '#00CC66',
    tertiary: '#FF6600',
  },
  semantic: {
    success: '#00CC66',
    error: '#FF3333',
    warning: '#FFCC00',
    info: '#0066FF',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// tokens/global/typography.ts
export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// tokens/index.ts
export { colors } from './global/colors';
export { typography } from './global/typography';
export { spacing } from './global/spacing';
export { shadows } from './global/shadows';

// Type-safe token access
export type ColorToken = keyof typeof colors.brand | keyof typeof colors.semantic;
```

**JSON** (W3C Design Tokens Format):

```json
{
  "$schema": "https://design-tokens.org/schemas/v1.0.0/design-tokens.schema.json",
  "colors": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": "#0066FF",
        "$description": "Primary brand color used for main actions and links"
      },
      "secondary": {
        "$type": "color",
        "$value": "#00CC66",
        "$description": "Secondary brand color for accents"
      }
    },
    "semantic": {
      "success": {
        "$type": "color",
        "$value": "{colors.brand.secondary}",
        "$description": "Success state color (references brand.secondary)"
      }
    }
  },
  "typography": {
    "heading": {
      "h1": {
        "$type": "typography",
        "$value": {
          "fontFamily": "{typography.fontFamily.sans}",
          "fontSize": "{typography.fontSize.4xl}",
          "fontWeight": "{typography.fontWeight.bold}",
          "lineHeight": "{typography.lineHeight.tight}"
        }
      }
    }
  }
}
```

**SCSS Variables**:

```scss
// tokens/global/_colors.scss
$color-brand-primary: #0066FF;
$color-brand-secondary: #00CC66;

$color-gray-50: #F9FAFB;
$color-gray-100: #F3F4F6;
// ...

// tokens/global/_typography.scss
$font-family-sans: 'Inter', -apple-system, sans-serif;
$font-size-base: 1rem;
$font-weight-bold: 700;

// tokens/_index.scss
@forward 'global/colors';
@forward 'global/typography';
@forward 'global/spacing';
```

**Tailwind CSS Config**:

```javascript
// tailwind.config.js
const { colors, typography, spacing, shadows } = require('./tokens');

module.exports = {
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        semantic: colors.semantic,
        gray: colors.gray,
      },
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      spacing: spacing,
      boxShadow: shadows,
    },
  },
};
```

### 5. Token Generation Automation

**Complete Pipeline**:

```typescript
import fs from 'fs/promises';
import path from 'path';

interface TokenGeneratorConfig {
  fileKey: string;
  outputDir: string;
  formats: Array<'css' | 'scss' | 'js' | 'ts' | 'json' | 'tailwind'>;
}

async function generateTokens(config: TokenGeneratorConfig) {
  const { fileKey, outputDir, formats } = config;

  // 1. Extract tokens from Figma
  const colorTokens = await extractColorTokens(fileKey);
  const typographyTokens = await extractTypographyTokens(fileKey);
  const spacingTokens = await extractSpacingTokens(fileKey);
  const shadowTokens = await extractShadowTokens(fileKey);

  const allTokens = {
    colors: colorTokens,
    typography: typographyTokens,
    spacing: spacingTokens,
    shadows: shadowTokens,
  };

  // 2. Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  // 3. Generate formats
  if (formats.includes('css')) {
    const css = generateCSSVariables(allTokens);
    await fs.writeFile(path.join(outputDir, 'tokens.css'), css);
  }

  if (formats.includes('scss')) {
    const scss = generateSCSSVariables(allTokens);
    await fs.writeFile(path.join(outputDir, '_tokens.scss'), scss);
  }

  if (formats.includes('js') || formats.includes('ts')) {
    const js = generateJavaScript(allTokens);
    const ext = formats.includes('ts') ? '.ts' : '.js';
    await fs.writeFile(path.join(outputDir, `tokens${ext}`), js);
  }

  if (formats.includes('json')) {
    const json = generateW3CTokens(allTokens);
    await fs.writeFile(path.join(outputDir, 'tokens.json'), json);
  }

  if (formats.includes('tailwind')) {
    const tailwind = generateTailwindConfig(allTokens);
    await fs.writeFile(path.join(outputDir, 'tailwind.tokens.js'), tailwind);
  }

  console.log(`✅ Generated design tokens in ${formats.join(', ')} format(s)`);
}

function generateCSSVariables(tokens: any): string {
  let css = ':root {\n';

  // Colors
  css += '  /* Colors */\n';
  tokens.colors.forEach((token: any) => {
    css += `  --color-${token.name.toLowerCase().replace(/\s+/g, '-')}: ${token.value};\n`;
  });

  // Typography
  css += '\n  /* Typography */\n';
  tokens.typography.forEach((token: any) => {
    const name = token.name.toLowerCase().replace(/\s+/g, '-');
    css += `  --font-family-${name}: ${token.fontFamily};\n`;
    css += `  --font-size-${name}: ${token.fontSize}px;\n`;
    css += `  --font-weight-${name}: ${token.fontWeight};\n`;
    css += `  --line-height-${name}: ${token.lineHeight};\n`;
  });

  // Spacing
  css += '\n  /* Spacing */\n';
  tokens.spacing.forEach((token: any) => {
    css += `  --spacing-${token.name}: ${token.value}px;\n`;
  });

  // Shadows
  css += '\n  /* Shadows */\n';
  tokens.shadows.forEach((token: any) => {
    css += `  --shadow-${token.name.toLowerCase().replace(/\s+/g, '-')}: ${token.value};\n`;
  });

  css += '}\n';

  return css;
}

function generateJavaScript(tokens: any): string {
  const js = `
export const colors = {
${tokens.colors.map((t: any) => `  '${t.name}': '${t.value}',`).join('\n')}
};

export const typography = {
${tokens.typography.map((t: any) => `  '${t.name}': {
    fontFamily: '${t.fontFamily}',
    fontSize: ${t.fontSize},
    fontWeight: ${t.fontWeight},
    lineHeight: ${t.lineHeight},
  },`).join('\n')}
};

export const spacing = {
${tokens.spacing.map((t: any) => `  '${t.name}': ${t.value},`).join('\n')}
};

export const shadows = {
${tokens.shadows.map((t: any) => `  '${t.name}': '${t.value}',`).join('\n')}
};
`;

  return js.trim();
}

// Usage
generateTokens({
  fileKey: 'ABC123XYZ456',
  outputDir: './src/design-tokens',
  formats: ['css', 'ts', 'json', 'tailwind'],
}).catch(console.error);
```

### 6. Token Synchronization (Watch Mode)

**Auto-sync on Figma Changes**:

```typescript
import { watch } from 'fs';

async function watchFigmaTokens(fileKey: string, outputDir: string, pollInterval = 60000) {
  let lastVersion: string | null = null;

  setInterval(async () => {
    const importer = new FigmaImporter({
      accessToken: process.env.FIGMA_ACCESS_TOKEN!,
      fileKey,
    });

    const file = await importer.fetchFile();

    if (lastVersion && file.version !== lastVersion) {
      console.log(`🔄 Figma file updated (v${file.version}). Re-generating tokens...`);

      await generateTokens({
        fileKey,
        outputDir,
        formats: ['css', 'ts', 'json'],
      });

      console.log('✅ Tokens synchronized!');
    }

    lastVersion = file.version;
  }, pollInterval);

  console.log(`👀 Watching Figma file for changes (polling every ${pollInterval / 1000}s)...`);
}

// Usage
watchFigmaTokens('ABC123XYZ456', './src/design-tokens', 60000); // Check every minute
```

### 7. Theme Support (Light/Dark Mode)

**Generate Theme Tokens**:

```typescript
// tokens/themes/light.ts
export const lightTheme = {
  colors: {
    background: '#FFFFFF',
    foreground: '#111827',
    primary: '#0066FF',
    secondary: '#6B7280',
    border: '#E5E7EB',
  },
};

// tokens/themes/dark.ts
export const darkTheme = {
  colors: {
    background: '#111827',
    foreground: '#F9FAFB',
    primary: '#3B82F6',
    secondary: '#9CA3AF',
    border: '#374151',
  },
};

// CSS Variables with theme support
:root {
  --color-background: #FFFFFF;
  --color-foreground: #111827;
}

[data-theme="dark"] {
  --color-background: #111827;
  --color-foreground: #F9FAFB;
}
```

## Workflow

1. Ask about Figma file and token extraction preferences
2. Fetch color, typography, spacing, and shadow styles from Figma
3. Analyze and categorize tokens (brand, semantic, primitives)
4. Ask about output formats (CSS, SCSS, JS, JSON, Tailwind)
5. Generate hierarchical token structure
6. Create token files in requested formats
7. Set up theme support if needed (light/dark modes)
8. Provide integration examples for each format
9. Optionally set up watch mode for auto-sync
10. Generate documentation with token usage examples

## When to Use

- Setting up design systems from Figma
- Synchronizing design tokens across platforms (web, iOS, Android)
- Migrating from hardcoded values to token-based theming
- Implementing light/dark mode support
- Automating design-to-code token updates
- Standardizing design values across teams

## Best Practices

1. **Organization**: Use hierarchical structure (global → semantic → component)
2. **Naming**: Follow consistent naming conventions (BEM or similar)
3. **Formats**: Generate multiple formats for different use cases
4. **Aliasing**: Use token references for semantic tokens (W3C format)
5. **Documentation**: Include descriptions from Figma styles
6. **Versioning**: Track Figma file versions in metadata
7. **Automation**: Set up CI/CD for token synchronization
8. **Validation**: Validate token values before deployment

Extract and sync design tokens with production-ready automation!
