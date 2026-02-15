/**
 * Docusaurus configuration generator
 * Generates docusaurus.config.js with professional defaults
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { DocusaurusConfig, DocCategory } from './types.js';

/**
 * Generate docusaurus.config.js content
 */
export function generateDocusaurusConfig(config: DocusaurusConfig): string {
  const { title, tagline, url, baseUrl, docsPath } = config;
  const projectName = config.projectMetadata?.name || title;

  // Build Docusaurus exclude patterns from excludeFolders
  const excludeFolders = config.excludeFolders || [];
  const excludePatterns = excludeFolders.map(f => `'**/${f.replace(/'/g, "\\'")}/**'`).join(', ');

  // Generate footer links from detected categories (max 4)
  const categories = config.projectMetadata?.categories || [];
  const footerItems = categories.slice(0, 4).map(cat =>
    `              {\n                label: '${cat.label}',\n                to: '/${cat.id}',\n              }`
  ).join(',\n');

  const footerLinksBlock = footerItems
    ? `[
          {
            title: 'Documentation',
            items: [
${footerItems},
            ],
          },
        ]`
    : `[]`;

  return `// @ts-check
// Auto-generated documentation site configuration
// Generated: ${new Date().toISOString()}

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '${title}',
  tagline: '${escapeQuotes(tagline)}',
  favicon: 'img/favicon.svg',

  // Production URL
  url: '${url}',
  baseUrl: '${baseUrl}',

  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  // Internationalization
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          path: '${docsPath}',
          sidebarPath: './sidebars.js',
          editUrl: undefined,
          exclude: [${excludePatterns}],
          remarkPlugins: [],
          rehypePlugins: [],
          beforeDefaultRemarkPlugins: [],
          beforeDefaultRehypePlugins: [],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: '${projectName} Docs',
        logo: {
          alt: '${projectName} Logo',
          src: 'img/logo.svg',
        },
        items: [],
      },

      footer: {
        style: 'dark',
        links: ${footerLinksBlock},
        copyright: \`Copyright \u00a9 \${new Date().getFullYear()} ${escapeQuotes(projectName)}. Built with Docusaurus.\`,
      },

      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'typescript', 'javascript', 'json', 'yaml'],
      },

      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
      },
    }),

  // Mermaid diagrams support
  markdown: {
    mermaid: true,
    format: 'md',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],
};

export default config;
`;
}

/**
 * Write docusaurus.config.js to file
 */
export async function writeDocusaurusConfig(targetDir: string, config: DocusaurusConfig): Promise<void> {
  const configPath = path.join(targetDir, 'docusaurus.config.js');
  const content = generateDocusaurusConfig(config);
  await fs.ensureDir(targetDir);
  await fs.writeFile(configPath, content, 'utf-8');
}

/**
 * Generate package.json for Docusaurus site
 */
export function generatePackageJSON(title: string): string {
  return JSON.stringify(
    {
      name: 'docs-site',
      version: '1.0.0',
      description: `${title} - Documentation Site`,
      private: true,
      scripts: {
        docusaurus: 'docusaurus',
        start: 'docusaurus start',
        build: 'docusaurus build',
        swizzle: 'docusaurus swizzle',
        deploy: 'docusaurus deploy',
        clear: 'docusaurus clear',
        serve: 'docusaurus serve',
        'write-translations': 'docusaurus write-translations',
        'write-heading-ids': 'docusaurus write-heading-ids'
      },
      dependencies: {
        '@docusaurus/core': '^3.9.0',
        '@docusaurus/preset-classic': '^3.9.0',
        '@docusaurus/theme-mermaid': '^3.9.0',
        '@mdx-js/react': '^3.0.0',
        clsx: '^2.0.0',
        'prism-react-renderer': '^2.3.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0'
      },
      devDependencies: {
        '@docusaurus/module-type-aliases': '^3.9.0',
        '@docusaurus/types': '^3.9.0'
      },
      engines: {
        node: '>=20.0'
      }
    },
    null,
    2
  );
}

/**
 * Write package.json to file
 */
export async function writePackageJSON(targetDir: string, title: string): Promise<void> {
  const packagePath = path.join(targetDir, 'package.json');
  const content = generatePackageJSON(title);
  await fs.ensureDir(targetDir);
  await fs.writeFile(packagePath, content, 'utf-8');
}

/**
 * Generate a professional SVG logo from project initials
 */
export function generateLogoSVG(initials: string, primaryColor: string = '#4f46e5'): string {
  const darkerColor = darkenColor(primaryColor, 20);
  const fontSize = initials.length > 1 ? 76 : 90;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor}" />
      <stop offset="100%" style="stop-color:${darkerColor}" />
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="184" height="184" rx="44" ry="44" fill="url(#logo-bg)" />
  <text x="100" y="100" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="${fontSize}" font-weight="700" fill="white"
        text-anchor="middle" dominant-baseline="central" letter-spacing="-2">${initials}</text>
</svg>`;
}

/**
 * Generate a favicon SVG (simplified, optimized for small sizes)
 */
export function generateFaviconSVG(initials: string, primaryColor: string = '#4f46e5'): string {
  const firstChar = initials.charAt(0);
  const darkerColor = darkenColor(primaryColor, 20);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <linearGradient id="fav-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor}" />
      <stop offset="100%" style="stop-color:${darkerColor}" />
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="30" height="30" rx="7" ry="7" fill="url(#fav-bg)" />
  <text x="16" y="16" font-family="system-ui, sans-serif"
        font-size="18" font-weight="700" fill="white"
        text-anchor="middle" dominant-baseline="central">${firstChar}</text>
</svg>`;
}

/**
 * Generate custom CSS for professional theme
 */
export function generateCustomCSS(theme: string): string {
  const themes: Record<string, { light: string; dark: string }> = {
    default: {
      light: `
  --ifm-color-primary: #4f46e5;
  --ifm-color-primary-dark: #4338ca;
  --ifm-color-primary-darker: #3730a3;
  --ifm-color-primary-darkest: #312e81;
  --ifm-color-primary-light: #6366f1;
  --ifm-color-primary-lighter: #818cf8;
  --ifm-color-primary-lightest: #a5b4fc;`,
      dark: `
  --ifm-color-primary: #818cf8;
  --ifm-color-primary-dark: #6366f1;
  --ifm-color-primary-darker: #4f46e5;
  --ifm-color-primary-darkest: #4338ca;
  --ifm-color-primary-light: #a5b4fc;
  --ifm-color-primary-lighter: #c7d2fe;
  --ifm-color-primary-lightest: #e0e7ff;`,
    },
    classic: {
      light: `
  --ifm-color-primary: #2563eb;
  --ifm-color-primary-dark: #1d4ed8;
  --ifm-color-primary-darker: #1e40af;
  --ifm-color-primary-darkest: #1e3a8a;
  --ifm-color-primary-light: #3b82f6;
  --ifm-color-primary-lighter: #60a5fa;
  --ifm-color-primary-lightest: #93bbfd;`,
      dark: `
  --ifm-color-primary: #60a5fa;
  --ifm-color-primary-dark: #3b82f6;
  --ifm-color-primary-darker: #2563eb;
  --ifm-color-primary-darkest: #1d4ed8;
  --ifm-color-primary-light: #93bbfd;
  --ifm-color-primary-lighter: #bfdbfe;
  --ifm-color-primary-lightest: #dbeafe;`,
    },
    dark: {
      light: `
  --ifm-color-primary: #6366f1;
  --ifm-color-primary-dark: #4f46e5;
  --ifm-color-primary-darker: #4338ca;
  --ifm-color-primary-darkest: #3730a3;
  --ifm-color-primary-light: #818cf8;
  --ifm-color-primary-lighter: #a5b4fc;
  --ifm-color-primary-lightest: #c7d2fe;`,
      dark: `
  --ifm-color-primary: #a5b4fc;
  --ifm-color-primary-dark: #818cf8;
  --ifm-color-primary-darker: #6366f1;
  --ifm-color-primary-darkest: #4f46e5;
  --ifm-color-primary-light: #c7d2fe;
  --ifm-color-primary-lighter: #e0e7ff;
  --ifm-color-primary-lightest: #eef2ff;`,
    },
  };

  const selected = themes[theme] || themes.default;

  return `/**
 * Professional documentation theme
 * Auto-generated — customize as needed
 */

/* ===== Color Palette ===== */
:root {
${selected.light}
  --ifm-code-font-size: 95%;
  --ifm-heading-font-weight: 600;
  --ifm-font-size-base: 16px;
  --ifm-line-height-base: 1.65;
  --docusaurus-highlighted-code-line-bg: rgba(79, 70, 229, 0.1);
}

[data-theme='dark'] {
${selected.dark}
  --docusaurus-highlighted-code-line-bg: rgba(99, 102, 241, 0.15);
}

/* ===== Global ===== */
* {
  transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

html {
  scroll-behavior: smooth;
}

/* ===== Navbar ===== */
.navbar {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid var(--ifm-color-emphasis-200);
  backdrop-filter: blur(8px);
}

.navbar__title {
  font-weight: 700;
  letter-spacing: -0.01em;
}

.navbar__logo img {
  border-radius: 8px;
}

/* ===== Sidebar ===== */
.theme-doc-sidebar-container {
  border-right: 1px solid var(--ifm-color-emphasis-200);
}

.menu__link {
  border-radius: 6px;
  font-size: 0.9rem;
  padding: 0.4rem 0.75rem;
  transition: all 0.15s ease;
}

.menu__link:hover {
  background: var(--ifm-color-emphasis-100);
}

.menu__link--active {
  font-weight: 600;
  color: var(--ifm-color-primary);
  background: var(--ifm-color-primary-lightest);
}

[data-theme='dark'] .menu__link--active {
  background: rgba(99, 102, 241, 0.12);
}

.menu__list-item-collapsible .menu__caret::before {
  filter: var(--ifm-menu-color-active);
}

/* ===== Content ===== */
.markdown {
  --ifm-h1-font-size: 2rem;
  --ifm-h2-font-size: 1.5rem;
  --ifm-h3-font-size: 1.25rem;
}

.markdown h1, .markdown h2, .markdown h3 {
  letter-spacing: -0.02em;
}

.markdown h2 {
  margin-top: 2.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--ifm-color-emphasis-200);
}

/* ===== Links ===== */
.markdown a {
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s ease;
}

.markdown a:hover {
  border-bottom-color: var(--ifm-color-primary);
}

/* ===== Code Blocks ===== */
.prism-code {
  font-size: 0.875rem;
  border-radius: 8px;
}

pre {
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

[data-theme='dark'] pre {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

code {
  border-radius: 4px;
  padding: 2px 6px;
}

/* ===== Tables ===== */
table {
  display: table;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--ifm-color-emphasis-200);
}

table thead tr {
  background: var(--ifm-color-emphasis-100);
}

table thead th {
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--ifm-color-emphasis-200);
}

table tbody td {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--ifm-color-emphasis-100);
}

table tbody tr:last-child td {
  border-bottom: none;
}

table tbody tr:hover {
  background: var(--ifm-color-emphasis-50, rgba(0, 0, 0, 0.02));
}

/* ===== Blockquotes ===== */
blockquote {
  border-left: 4px solid var(--ifm-color-primary);
  background: var(--ifm-color-emphasis-100);
  border-radius: 0 8px 8px 0;
  padding: 1rem 1.25rem;
  font-style: normal;
}

/* ===== Admonitions ===== */
.admonition {
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* ===== Cards (prev/next navigation) ===== */
.pagination-nav__link {
  border-radius: 10px;
  border: 1px solid var(--ifm-color-emphasis-200);
  transition: all 0.2s ease;
}

.pagination-nav__link:hover {
  border-color: var(--ifm-color-primary);
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.1);
}

/* ===== Mermaid ===== */
.docusaurus-mermaid-container {
  text-align: center;
  margin: 2rem 0;
  padding: 1rem;
  background: var(--ifm-color-emphasis-100);
  border-radius: 8px;
}

/* ===== Table of Contents ===== */
.table-of-contents__link--active {
  font-weight: 600;
  color: var(--ifm-color-primary);
}

/* ===== Footer ===== */
.footer--dark {
  background: #1e1e2e;
}

[data-theme='dark'] .footer--dark {
  background: #111118;
}

/* ===== Scrollbar ===== */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--ifm-color-emphasis-300);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--ifm-color-emphasis-500);
}

/* ===== Responsive ===== */
@media screen and (max-width: 996px) {
  .markdown h2 {
    margin-top: 2rem;
  }
}
`;
}

/**
 * Write custom CSS to file
 */
export async function writeCustomCSS(targetDir: string, theme: string): Promise<void> {
  const cssPath = path.join(targetDir, 'src', 'css', 'custom.css');
  const content = generateCustomCSS(theme);
  await fs.ensureDir(path.dirname(cssPath));
  await fs.writeFile(cssPath, content, 'utf-8');
}

/**
 * Generate index page (landing page) with dynamic categories
 */
export function generateIndexPage(title: string, tagline: string, categories: DocCategory[], projectName?: string): string {
  const firstCategoryLink = categories.length > 0 ? `/${categories[0].id}` : '/';

  // Build category cards JSX
  const categoryCards = categories.map(cat => {
    const escapedDesc = escapeQuotes(cat.description);
    return `          <a href="${cat.id}" className={styles.categoryCard} key="${cat.id}">
            <span className={styles.categoryIcon}>${cat.icon}</span>
            <h3>${cat.label}</h3>
            <p>${escapedDesc}</p>
            <span className={styles.docCount}>${cat.docCount} document${cat.docCount !== 1 ? 's' : ''}</span>
          </a>`;
  }).join('\n');

  const brandName = projectName ? escapeQuotes(projectName) : '';

  return `import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <h1 className={styles.heroTitle}>${brandName ? `<span className={styles.brandName}>${brandName}</span> Documentation` : '{siteConfig.title}'}</h1>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="${firstCategoryLink}">
            Browse Documentation
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="${escapeQuotes(tagline)}">
      <HomepageHeader />
      <main>
        <div className="container" style={{padding: '3rem 0'}}>
${categories.length > 0 ? `          <div className={styles.categoryGrid}>
${categoryCards}
          </div>` : ''}
        </div>
      </main>
    </Layout>
  );
}
`;
}

/**
 * Write index page to file
 */
export async function writeIndexPage(
  targetDir: string,
  title: string,
  tagline: string,
  categories: DocCategory[] = [],
  projectName?: string
): Promise<void> {
  const indexPath = path.join(targetDir, 'src', 'pages', 'index.js');
  const content = generateIndexPage(title, tagline, categories, projectName);
  await fs.ensureDir(path.dirname(indexPath));
  await fs.writeFile(indexPath, content, 'utf-8');
}

/**
 * Generate index.module.css for landing page styles
 */
export function generateIndexModuleCSS(): string {
  return `.heroBanner {
  padding: 5rem 0 4rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%);
  color: white;
}

[data-theme='dark'] .heroBanner {
  background: linear-gradient(135deg, #312e81 0%, #3730a3 50%, #4338ca 100%);
}

.heroTitle {
  font-size: 3rem;
  font-weight: 400;
  letter-spacing: -0.03em;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
}

.brandName {
  font-weight: 800;
  color: white;
  letter-spacing: -0.04em;
}

.heroSubtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto 1.5rem;
  color: white;
}

.buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.buttons a {
  background: white;
  color: #4f46e5;
  border: none;
  font-weight: 600;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.buttons a:hover {
  background: #f8fafc;
  color: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  text-decoration: none;
}

/* Category Grid */
.categoryGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0 2rem;
}

.categoryCard {
  background: var(--ifm-card-background-color, white);
  border: 1px solid var(--ifm-color-emphasis-200);
  border-radius: 12px;
  padding: 1.75rem;
  transition: all 0.2s ease;
  text-decoration: none !important;
  color: inherit;
  display: block;
  cursor: pointer;
}

.categoryCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
  border-color: var(--ifm-color-primary);
  text-decoration: none !important;
  color: inherit;
}

[data-theme='dark'] .categoryCard:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.categoryCard h3 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1.15rem;
  font-weight: 600;
}

.categoryCard p {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: var(--ifm-color-emphasis-700);
  line-height: 1.5;
}

.categoryIcon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.25rem;
}

.docCount {
  font-size: 0.8rem;
  color: var(--ifm-color-emphasis-500);
  font-weight: 500;
}

/* Responsive */
@media screen and (max-width: 996px) {
  .heroBanner {
    padding: 3rem 1.5rem;
  }

  .heroTitle {
    font-size: 2.25rem;
  }

  .categoryGrid {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 600px) {
  .heroTitle {
    font-size: 1.75rem;
  }

  .brandName {
    display: block;
    font-size: 2rem;
    margin-bottom: 0.25rem;
  }

  .heroSubtitle {
    font-size: 1rem;
  }
}
`;
}

/**
 * Write index.module.css to file
 */
export async function writeIndexModuleCSS(targetDir: string): Promise<void> {
  const cssPath = path.join(targetDir, 'src', 'pages', 'index.module.css');
  const content = generateIndexModuleCSS();
  await fs.ensureDir(path.dirname(cssPath));
  await fs.writeFile(cssPath, content, 'utf-8');
}

/**
 * Escape single quotes for template string safety
 */
function escapeQuotes(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, ' ');
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(2.55 * percent));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(2.55 * percent));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
