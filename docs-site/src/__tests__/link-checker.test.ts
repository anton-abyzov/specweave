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

describe('docs-site link checker (T-018)', () => {
  it('all pre-existing critical doc IDs are preserved', () => {
    const allIds: string[] = [];
    for (const [, sidebarItems] of Object.entries(sidebars as any)) {
      if (Array.isArray(sidebarItems)) {
        allIds.push(...flattenDocIds(sidebarItems));
      }
    }

    // Pre-existing doc IDs from before the restructure
    const criticalIds = [
      // Overview
      'overview/introduction',
      'overview/skills-as-structured-expertise',
      'overview/why-specweave',
      'overview/features',
      'overview/philosophy',
      // Getting Started
      'getting-started/index',
      'getting-started/installation',
      'getting-started/first-increment',
      // Core Concepts
      'guides/core-concepts/what-is-an-increment',
      'guides/core-concepts/living-documentation',
      // Workflows
      'workflows/overview',
      'workflows/planning',
      'workflows/implementation',
      // Integrations
      'guides/integrations/external-tools-overview',
      'guides/github-integration',
      // Agent Teams
      'guides/agent-teams-and-swarms',
      'guides/autonomous-execution',
      // Guides
      'guides/best-practices',
      'guides/model-selection',
      // Skills (now in docsSidebar)
      'skills/index',
      'skills/why-skills-matter',
      'skills/fundamentals',
      'skills/installation',
      'skills/extensible/extensible-skills',
      'skills/verified/verified-skills',
      // Reference (now in docsSidebar)
      'reference/index',
      'reference/commands',
      'reference/skills',
      'reference/cost-tracking',
      'commands/overview',
      'commands/do',
      'commands/auto',
      // Standalone
      'faq',
      'metrics',
      // Academy
      'academy/index',
      // Enterprise
      'enterprise/index',
      'enterprise/github-migration',
      // Glossary
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

  it('academySidebar still exists for the Learn nav item', () => {
    expect((sidebars as any).academySidebar).toBeDefined();
  });

  it('enterpriseSidebar still exists', () => {
    expect((sidebars as any).enterpriseSidebar).toBeDefined();
  });
});
