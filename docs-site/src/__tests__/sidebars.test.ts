import { describe, it, expect } from 'vitest';
import sidebars from '../../sidebars';
import config from '../../docusaurus.config';

type SidebarItem = any;

/** Recursively collect all doc IDs from a sidebar config */
function flattenDocIds(items: SidebarItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      ids.push(item);
    } else if (item.type === 'doc') {
      ids.push(item.id);
    } else if (item.type === 'category' && item.items) {
      ids.push(...flattenDocIds(item.items));
      // Also check if category has a link doc
      if (item.link?.type === 'doc') {
        ids.push(item.link.id);
      }
    }
  }
  return ids;
}

/** Recursively collect all category labels from a sidebar */
function flattenCategoryLabels(items: SidebarItem[]): string[] {
  const labels: string[] = [];
  for (const item of items) {
    if (item.type === 'category') {
      labels.push(item.label);
      if (item.items) {
        labels.push(...flattenCategoryLabels(item.items));
      }
    }
  }
  return labels;
}

describe('Docusaurus sidebars (3.0 structure)', () => {
  const docsSidebar = (sidebars as any).docsSidebar;

  it('has primary sidebar groups following the Diataxis hierarchy', () => {
    const topLabels = flattenCategoryLabels(docsSidebar);
    const requiredGroups = [
      'Start here',
      'Concepts',
      'Switch tools and accounts',
      'Working with SpecWeave',
      'Integrations',
      'Reference',
    ];
    for (const group of requiredGroups) {
      expect(topLabels).toContain(group);
    }
  });

  it('keeps FAQ and troubleshooting in the primary sidebar', () => {
    const ids = flattenDocIds(docsSidebar);
    expect(ids).toContain('faq');
    expect(ids).toContain('guides/troubleshooting/index');
  });

  it('preserves all pre-existing doc IDs in the sidebar tree', () => {
    // Collect IDs from ALL sidebars
    const allIds: string[] = [];
    for (const [, sidebarItems] of Object.entries(sidebars as any)) {
      if (Array.isArray(sidebarItems)) {
        allIds.push(...flattenDocIds(sidebarItems));
      }
    }

    // Critical pre-existing doc IDs that must survive the restructure
    const criticalIds = [
      'overview/introduction',
      'getting-started/index',
      'getting-started/installation',
      'getting-started/first-increment',
      'faq',
      'metrics',
      'skills/index',
      'reference/index',
      'enterprise/index',
      'overview/how-it-works',
      'guides/cross-tool-handoff',
      'guides/claude-code-projects',
      'guides/specweave-3',
    ];

    for (const id of criticalIds) {
      expect(allIds).toContain(id);
    }
  });
});

describe('Docusaurus navbar items (Weave)', () => {
  const themeConfig = (config as any).themeConfig;
  const items = themeConfig.navbar.items;
  const navItems = items.filter((item: any) => item.position === 'left');
  const rightItems = items.filter((item: any) => item.position === 'right');

  // One item set per product: custom.css hides the other product's items (.nav-specweave / .nav-specwithcode).
  const shownOn = (product: 'specweave' | 'specwithcode') => (item: any) => {
    const other = product === 'specweave' ? 'nav-specwithcode' : 'nav-specweave';
    return !String(item.className ?? '').split(/\s+/).includes(other);
  };

  it('shows at most 7 items besides search on each product', () => {
    for (const product of ['specweave', 'specwithcode'] as const) {
      expect(items.filter(shownOn(product)).filter((item: any) => item.type !== 'search').length).toBeLessThanOrEqual(7);
    }
  });

  it('gives each product its own links; the family bar switches products', () => {
    expect(navItems.filter(shownOn('specweave')).map((item: any) => item.label)).toEqual(['CLI', 'Integrations', 'Docs', 'Tutorials']);
    expect(navItems.filter(shownOn('specwithcode')).map((item: any) => item.label)).toEqual(['How it works', 'Skills', 'Docs', 'Tutorials']);
    expect(navItems.find((item: any) => item.label === 'CLI')).toEqual(expect.objectContaining({to: '/product'}));
    expect(navItems.find((item: any) => item.label === 'Docs')).toEqual(expect.objectContaining({sidebarId: 'docsSidebar'}));
    expect(navItems.some((item: any) => item.to === '/code/')).toBe(false);
  });

  it('keeps GitHub, search and one main button per product on the right', () => {
    expect(rightItems).toEqual(expect.arrayContaining([
      expect.objectContaining({href: 'https://github.com/anton-abyzov/specweave', className: 'header-github-link'}),
      expect.objectContaining({type: 'search'}),
    ]));
    const cta = (product: 'specweave' | 'specwithcode') => rightItems.filter(shownOn(product)).filter((item: any) => String(item.className ?? '').includes('nav-cta'));
    expect(cta('specweave').map((item: any) => item.to)).toEqual(['/docs/getting-started']);
    expect(cta('specwithcode').map((item: any) => item.to)).toEqual(['/code/download/']);
  });

  it('uses a wordmark, not the SpecWithCode app icon', () => {
    expect(themeConfig.navbar.title).toBe('SpecWeave');
    expect(themeConfig.navbar.logo).toBeUndefined();
  });

  it('does not include Skills or Reference as separate SpecWeave nav items', () => {
    const labels = navItems.filter(shownOn('specweave')).map((item: any) => item.label);
    expect(labels).not.toContain('Skills');
    expect(labels).not.toContain('Reference');
  });
});
