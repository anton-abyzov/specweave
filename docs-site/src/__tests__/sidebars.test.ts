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

describe('Docusaurus sidebars Diataxis hierarchy (T-017)', () => {
  const docsSidebar = (sidebars as any).docsSidebar;

  it('has primary sidebar groups following the Diataxis hierarchy', () => {
    const topLabels = flattenCategoryLabels(docsSidebar);
    const requiredGroups = [
      'Overview',
      'Getting Started',
      'Core Concepts',
      'Workflows',
      'Integrations',
    ];
    for (const group of requiredGroups) {
      expect(topLabels).toContain(group);
    }
  });

  it('has FAQ as a standalone doc in the primary sidebar', () => {
    const faqEntry = docsSidebar.find(
      (item: SidebarItem) => item.type === 'doc' && item.id === 'faq'
    );
    expect(faqEntry).toBeDefined();
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
      'academy/index',
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

  it('has 4 or fewer left-positioned nav items', () => {
    expect(navItems.length).toBeLessThanOrEqual(4);
  });

  it('includes Docs and Learn nav items', () => {
    const labels = navItems.map((item: any) => item.label);
    expect(labels).toContain('Docs');
    expect(labels).toContain('Learn');
  });

  it('includes Enterprise and Blog nav items', () => {
    const labels = navItems.map((item: any) => item.label);
    expect(labels).toContain('Enterprise');
    expect(labels).toContain('Blog');
  });

  it('does not include Skills or Reference as separate nav items', () => {
    const labels = navItems.map((item: any) => item.label);
    expect(labels).not.toContain('Skills');
    expect(labels).not.toContain('Reference');
  });
});
