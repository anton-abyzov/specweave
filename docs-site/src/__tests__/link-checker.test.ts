import { describe, it, expect } from 'vitest';
import sidebars from '../../sidebars';

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
      if (item.link?.type === 'doc') {
        ids.push(item.link.id);
      }
    }
  }
  return ids;
}

describe('docs-site sidebar coverage', () => {
  it('keeps every page a reader needs in the sidebar', () => {
    const allIds: string[] = [];
    for (const [, sidebarItems] of Object.entries(sidebars as any)) {
      if (Array.isArray(sidebarItems)) {
        allIds.push(...flattenDocIds(sidebarItems));
      }
    }

    // Pre-existing doc IDs from before the restructure
    const criticalIds = [
      'overview/introduction',
      'overview/how-it-works',
      'overview/why-specweave',
      'getting-started/index',
      'getting-started/installation',
      'getting-started/first-increment',
      'guides/specweave-3',
      'guides/core-concepts/what-is-an-increment',
      'guides/cross-tool-handoff',
      'guides/claude-code-projects',
      'integrations/generic-ai-tools',
      'workflows/overview',
      'workflows/brownfield',
      'guides/github-sync',
      'guides/jira-ado-sync',
      'reference/sync-cli',
      'guides/agent-teams-and-swarms',
      'guides/autonomous-execution',
      'guides/dashboard',
      'guides/model-selection',
      'skills/index',
      'skills/verified/verified-skills',
      'reference/index',
      'reference/commands',
      'reference/skills',
      'reference/configuration',
      'faq',
      'metrics',
      'enterprise/index',
      'glossary/overview',
    ];

    for (const id of criticalIds) {
      expect(allIds, `Missing doc ID: ${id}`).toContain(id);
    }
  });

  it('skillsSidebar no longer exists as a separate sidebar', () => {
    expect((sidebars as any).skillsSidebar).toBeUndefined();
  });

  it('referenceSidebar no longer exists as a separate sidebar', () => {
    expect((sidebars as any).referenceSidebar).toBeUndefined();
  });

  it('has one docs sidebar; the academy and enterprise sidebars are gone', () => {
    expect(Object.keys(sidebars as any)).toEqual(['docsSidebar']);
  });

  it('points old URLs of removed pages at a replacement', async () => {
    const config = (await import('../../docusaurus.config')).default as any;
    const redirectPlugin = config.plugins.find((p: any) => Array.isArray(p) && p[0] === '@docusaurus/plugin-client-redirects');
    const froms = redirectPlugin[1].redirects.flatMap((r: any) => [].concat(r.from));
    for (const old of ['/docs/academy', '/docs/guides/specweave-2', '/docs/workflows/planning', '/docs/guides/analytics-dashboard', '/docs/overview/features']) {
      expect(froms).toContain(old);
    }
  });
});
