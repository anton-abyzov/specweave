/**
 * Mermaid Diagram Generator
 *
 * Exports module graphs and team structures to Mermaid diagram format.
 */

export interface ModuleGraph {
  nodes: Module[];
  edges: Dependency[];
}

export interface Module {
  id: string;
  name: string;
  path: string;
  type: 'component' | 'service' | 'util' | 'config';
  repo: string;
}

export interface Dependency {
  from: string;
  to: string;
  type: 'import' | 'require' | 'dynamic';
  count: number;
}

export interface CircularDep {
  cycle: string[];
  severity: 'warning' | 'error';
}

/**
 * Generates Mermaid diagrams from module graphs.
 */
export class MermaidGenerator {
  /**
   * Export module graph to Mermaid diagram.
   */
  exportModuleGraph(graph: ModuleGraph, circularDeps?: CircularDep[]): string {
    let mmd = 'graph TD\n';

    // Add nodes
    for (const node of graph.nodes) {
      const label = `${node.name}\\n(${node.type})`;
      mmd += `  ${this.sanitizeId(node.id)}["${label}"]\n`;
    }

    mmd += '\n';

    // Add edges
    for (const edge of graph.edges) {
      mmd += `  ${this.sanitizeId(edge.from)} --> ${this.sanitizeId(edge.to)}\n`;
    }

    // Highlight circular dependencies
    if (circularDeps && circularDeps.length > 0) {
      mmd += '\n  %% Circular dependencies highlighted in red\n';
      for (const cycle of circularDeps) {
        const ids = cycle.cycle.map(id => this.sanitizeId(id)).join(',');
        mmd += `  style ${ids} fill:#ff6b6b\n`;
      }
    }

    return mmd;
  }

  /**
   * Export team structure to Mermaid organization chart.
   */
  exportTeamStructure(teams: any[]): string {
    let mmd = 'graph TD\n';
    mmd += '  ROOT[Organization]\n\n';

    for (const team of teams) {
      const teamId = this.sanitizeId(team.name);
      mmd += `  ROOT --> ${teamId}["${team.name}"]\n`;

      // Add team members/repos
      if (team.repos) {
        for (const repo of team.repos) {
          const repoId = this.sanitizeId(`${team.name}-${repo}`);
          mmd += `  ${teamId} --> ${repoId}["${repo}"]\n`;
        }
      }
    }

    return mmd;
  }

  /**
   * Sanitize ID for Mermaid (remove special characters).
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}
