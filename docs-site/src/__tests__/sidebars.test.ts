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

describe('Docusaurus navbar items (T-017)', () => {
  const themeConfig = (config as any).themeConfig;
  const navItems = themeConfig.navbar.items.filter(
    (item: any) => item.position === 'left'
  );

  it('has 6 or fewer left-positioned nav items', () => {
    expect(navItems.length).toBeLessThanOrEqual(6);
  });

  it('links Handoff straight to the handoff guide', () => {
    expect(navItems).toEqual(expect.arrayContaining([
      expect.objectContaining({label: 'Handoff', to: '/docs/guides/cross-tool-handoff'}),
    ]));
  });

  it('links Product and Integrations to the product layers', () => {
    expect(navItems).toEqual(expect.arrayContaining([
      expect.objectContaining({label: 'Product', to: '/product'}),
      expect.objectContaining({label: 'Integrations', to: '/integrations'}),
    ]));
  });

  it('keeps Docs and Verified Skills available in primary navigation', () => {
    expect(navItems).toEqual(expect.arrayContaining([
      expect.objectContaining({label: 'Docs', sidebarId: 'docsSidebar'}),
      expect.objectContaining({label: 'Verified Skills', href: 'https://verified-skill.com'}),
    ]));
  });

  it('does not include Skills or Reference as separate nav items', () => {
    const labels = navItems.map((item: any) => item.label);
    expect(labels).not.toContain('Skills');
    expect(labels).not.toContain('Reference');
  });
});
