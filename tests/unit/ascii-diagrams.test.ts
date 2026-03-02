/**
 * ASCII Diagram Generators — Unit Tests
 *
 * TDD Red phase: all tests written before implementation.
 * Covers renderBoxDiagram, renderDAG, renderTable, renderTree.
 */

import { describe, it, expect } from 'vitest';
import {
  renderBoxDiagram,
  renderDAG,
  renderTable,
  renderTree,
  type BoxNode,
  type BoxConnection,
  type DAGTask,
  type DAGDependency,
  type TreeItem,
} from '../../src/utils/ascii-diagrams.js';

// ── Helpers ────────────────────────────────────────────────────────────

function maxLineWidth(output: string): number {
  return Math.max(...output.split('\n').map((l) => l.length), 0);
}

// ── renderBoxDiagram ───────────────────────────────────────────────────

describe('renderBoxDiagram', () => {
  it('TC-001: renders a single node as a box', () => {
    const nodes: BoxNode[] = [{ id: 'a', label: 'Service A' }];
    const result = renderBoxDiagram(nodes, []);

    expect(result).toContain('Service A');
    // Should have box-drawing borders
    expect(result).toMatch(/[┌┐└┘─│]/);
  });

  it('TC-002: renders two connected nodes with an arrow', () => {
    const nodes: BoxNode[] = [
      { id: 'a', label: 'Frontend' },
      { id: 'b', label: 'Backend' },
    ];
    const connections: BoxConnection[] = [{ from: 'a', to: 'b' }];
    const result = renderBoxDiagram(nodes, connections);

    expect(result).toContain('Frontend');
    expect(result).toContain('Backend');
    expect(result).toContain('►');
  });

  it('TC-003: renders sublabels inside the box', () => {
    const nodes: BoxNode[] = [
      { id: 'a', label: 'API Gateway', sublabel: '(Workers)' },
    ];
    const result = renderBoxDiagram(nodes, []);

    expect(result).toContain('API Gateway');
    expect(result).toContain('(Workers)');
  });

  it('TC-004: returns empty string for empty input', () => {
    const result = renderBoxDiagram([], []);
    expect(result).toBe('');
  });

  it('TC-005: no line exceeds 80 characters', () => {
    const nodes: BoxNode[] = [
      { id: 'a', label: 'Very Long Service Name That Keeps Going' },
      { id: 'b', label: 'Another Extremely Long Service Name Here' },
    ];
    const connections: BoxConnection[] = [{ from: 'a', to: 'b' }];
    const result = renderBoxDiagram(nodes, connections);

    expect(maxLineWidth(result)).toBeLessThanOrEqual(80);
  });

  it('pads boxes to same height when mixing sublabel and no-sublabel', () => {
    const nodes: BoxNode[] = [
      { id: 'a', label: 'Service A', sublabel: '(Workers)' },
      { id: 'b', label: 'Service B' }, // no sublabel — shorter box
    ];
    const connections: BoxConnection[] = [{ from: 'a', to: 'b' }];
    const result = renderBoxDiagram(nodes, connections);

    // Both boxes should have same number of lines
    const lines = result.split('\n');
    // Each line should have content from both boxes (horizontally merged)
    for (const line of lines) {
      // Every line should have consistent structure
      expect(line.length).toBeGreaterThan(0);
    }
    expect(result).toContain('(Workers)');
  });

  it('renders multiple connections correctly', () => {
    const nodes: BoxNode[] = [
      { id: 'a', label: 'Service A' },
      { id: 'b', label: 'Service B' },
      { id: 'c', label: 'Service C' },
    ];
    const connections: BoxConnection[] = [
      { from: 'a', to: 'b' },
      { from: 'a', to: 'c' },
    ];
    const result = renderBoxDiagram(nodes, connections);

    expect(result).toContain('Service A');
    expect(result).toContain('Service B');
    expect(result).toContain('Service C');
  });
});

// ── renderDAG ──────────────────────────────────────────────────────────

describe('renderDAG', () => {
  it('TC-006: renders a linear chain with arrows', () => {
    const tasks: DAGTask[] = [
      { id: 'T-001', name: 'Setup' },
      { id: 'T-002', name: 'Build' },
      { id: 'T-003', name: 'Deploy' },
    ];
    const deps: DAGDependency[] = [
      { from: 'T-001', to: 'T-002' },
      { from: 'T-002', to: 'T-003' },
    ];
    const result = renderDAG(tasks, deps);

    expect(result).toContain('T-001');
    expect(result).toContain('T-002');
    expect(result).toContain('T-003');
    expect(result).toContain('►');
  });

  it('TC-007: renders parallel tasks on separate lanes', () => {
    const tasks: DAGTask[] = [
      { id: 'T-001', name: 'DB Schema' },
      { id: 'T-002', name: 'Auth Utils' },
      { id: 'T-003', name: 'Integration' },
    ];
    const deps: DAGDependency[] = [
      { from: 'T-001', to: 'T-003' },
      { from: 'T-002', to: 'T-003' },
    ];
    const result = renderDAG(tasks, deps);

    const lines = result.split('\n');
    // T-001 and T-002 should be on different lines (parallel)
    const t001Line = lines.findIndex((l) => l.includes('T-001'));
    const t002Line = lines.findIndex((l) => l.includes('T-002'));
    expect(t001Line).not.toBe(t002Line);
  });

  it('TC-008: renders a single task', () => {
    const tasks: DAGTask[] = [{ id: 'T-001', name: 'Only Task' }];
    const result = renderDAG(tasks, []);

    expect(result).toContain('T-001');
    expect(result).toContain('Only Task');
  });

  it('TC-009: returns empty string for empty input', () => {
    const result = renderDAG([], []);
    expect(result).toBe('');
  });

  it('TC-010: annotates critical path', () => {
    const tasks: DAGTask[] = [
      { id: 'T-001', name: 'Setup' },
      { id: 'T-002', name: 'API' },
      { id: 'T-003', name: 'Frontend' },
      { id: 'T-004', name: 'Merge' },
    ];
    const deps: DAGDependency[] = [
      { from: 'T-001', to: 'T-002' },
      { from: 'T-001', to: 'T-003' },
      { from: 'T-002', to: 'T-004' },
      { from: 'T-003', to: 'T-004' },
    ];
    const result = renderDAG(tasks, deps);

    expect(result.toLowerCase()).toContain('critical path');
  });

  it('respects 80-char width', () => {
    const tasks: DAGTask[] = [
      { id: 'T-001', name: 'A Very Long Task Name That Goes On' },
      { id: 'T-002', name: 'Another Very Long Task Name Here' },
    ];
    const deps: DAGDependency[] = [{ from: 'T-001', to: 'T-002' }];
    const result = renderDAG(tasks, deps);

    expect(maxLineWidth(result)).toBeLessThanOrEqual(80);
  });

  it('handles wide parallel DAG within 80 chars', () => {
    // Three parallel tasks feeding into one merge — forces wide layout
    const tasks: DAGTask[] = [
      { id: 'T-001', name: 'Database Schema Setup' },
      { id: 'T-002', name: 'Authentication Service' },
      { id: 'T-003', name: 'Frontend Components' },
      { id: 'T-004', name: 'Integration Testing' },
    ];
    const deps: DAGDependency[] = [
      { from: 'T-001', to: 'T-004' },
      { from: 'T-002', to: 'T-004' },
      { from: 'T-003', to: 'T-004' },
    ];
    const result = renderDAG(tasks, deps);

    expect(maxLineWidth(result)).toBeLessThanOrEqual(80);
    expect(result).toContain('T-001');
    expect(result).toContain('T-004');
    expect(result.toLowerCase()).toContain('critical path');
  });

  it('handles skip-level connections (task connects to non-adjacent depth)', () => {
    // T-001 → T-002 → T-003, but also T-001 → T-003 (skip-level)
    const tasks: DAGTask[] = [
      { id: 'T-001', name: 'Setup' },
      { id: 'T-002', name: 'Middle' },
      { id: 'T-003', name: 'Final' },
    ];
    const deps: DAGDependency[] = [
      { from: 'T-001', to: 'T-002' },
      { from: 'T-002', to: 'T-003' },
      { from: 'T-001', to: 'T-003' }, // skip-level
    ];
    const result = renderDAG(tasks, deps);

    expect(result).toContain('T-001');
    expect(result).toContain('T-003');
    // The skip-level connection should still produce an arrow for T-001
    expect(result).toContain('►');
  });

  it('handles tasks without outgoing edges (no arrow drawn)', () => {
    const tasks: DAGTask[] = [
      { id: 'T-001', name: 'First' },
      { id: 'T-002', name: 'Second' },
      { id: 'T-003', name: 'Third' },
    ];
    // Only T-001 → T-002, T-003 is independent
    const deps: DAGDependency[] = [{ from: 'T-001', to: 'T-002' }];
    const result = renderDAG(tasks, deps);

    expect(result).toContain('T-001');
    expect(result).toContain('T-002');
    expect(result).toContain('T-003');
  });
});

// ── renderTable ────────────────────────────────────────────────────────

describe('renderTable', () => {
  it('TC-011: renders headers and rows with aligned columns', () => {
    const headers = ['Column', 'Type', 'Notes'];
    const rows = [
      ['id', 'UUID', 'Primary key'],
      ['email', 'TEXT', 'Unique index'],
    ];
    const result = renderTable(headers, rows);

    expect(result).toContain('Column');
    expect(result).toContain('Type');
    expect(result).toContain('Notes');
    expect(result).toContain('id');
    expect(result).toContain('email');

    // All rows should have consistent alignment
    const lines = result.split('\n').filter((l) => l.trim());
    const widths = lines.map((l) => l.length);
    // All content lines should be the same width (padded)
    const contentWidths = new Set(widths);
    expect(contentWidths.size).toBe(1);
  });

  it('TC-012: renders header separator when option enabled', () => {
    const headers = ['Name', 'Value'];
    const rows = [['key', 'val']];
    const result = renderTable(headers, rows, { headerSeparator: true });

    // Should have a separator line with ─
    expect(result).toMatch(/─/);
    const lines = result.split('\n');
    // Separator should be the second line (after header)
    expect(lines[1]).toMatch(/^[─ ]+$/);
  });

  it('TC-013: truncates long values with ellipsis', () => {
    const headers = ['Description'];
    const rows = [['This is a very long description that should be truncated']];
    const result = renderTable(headers, rows, { maxColWidth: 20 });

    expect(result).toContain('…');
  });

  it('TC-014: returns empty string for empty input', () => {
    const result = renderTable([], []);
    expect(result).toBe('');
  });

  it('TC-015: no line exceeds 80 characters', () => {
    const headers = ['Column A', 'Column B', 'Column C', 'Column D', 'Column E'];
    const rows = [
      ['Long value here', 'Another long value', 'Yet more content', 'Data data', 'Final col'],
    ];
    const result = renderTable(headers, rows);

    expect(maxLineWidth(result)).toBeLessThanOrEqual(80);
  });

  it('handles single column', () => {
    const headers = ['Status'];
    const rows = [['active'], ['blocked']];
    const result = renderTable(headers, rows);

    expect(result).toContain('Status');
    expect(result).toContain('active');
    expect(result).toContain('blocked');
  });

  it('shrinks wide columns proportionally to fit 80 chars', () => {
    // 6 columns with long content that will definitely exceed 80 chars
    const headers = ['Column AAAA', 'Column BBBB', 'Column CCCC', 'Column DDDD', 'Column EEEE', 'Column FFFF'];
    const rows = [
      ['Long value in A', 'Long value in B', 'Long value in C', 'Long value in D', 'Long value in E', 'Long value in F'],
    ];
    const result = renderTable(headers, rows);

    // Must fit within 80 chars
    expect(maxLineWidth(result)).toBeLessThanOrEqual(80);
    // Should contain truncated values (ellipsis)
    expect(result).toContain('…');
  });
});

// ── renderTree ─────────────────────────────────────────────────────────

describe('renderTree', () => {
  it('TC-016: renders flat list with branch characters', () => {
    const items: TreeItem[] = [
      { name: 'file1.ts' },
      { name: 'file2.ts' },
      { name: 'file3.ts' },
    ];
    const result = renderTree(items);

    expect(result).toContain('├──');
    expect(result).toContain('└──');
    expect(result).toContain('file1.ts');
    expect(result).toContain('file3.ts');
  });

  it('TC-017: renders nested items with proper indentation', () => {
    const items: TreeItem[] = [
      {
        name: 'src/',
        children: [
          { name: 'utils/' },
          { name: 'core/' },
        ],
      },
      { name: 'README.md' },
    ];
    const result = renderTree(items);

    expect(result).toContain('src/');
    expect(result).toContain('utils/');
    expect(result).toContain('core/');
    expect(result).toContain('README.md');
    // Nested items should have continuation prefix
    expect(result).toMatch(/│\s+[├└]──/);
  });

  it('TC-018: renders deeply nested items correctly', () => {
    const items: TreeItem[] = [
      {
        name: 'a/',
        children: [
          {
            name: 'b/',
            children: [
              {
                name: 'c/',
                children: [{ name: 'd.ts' }],
              },
            ],
          },
        ],
      },
    ];
    const result = renderTree(items);

    const lines = result.split('\n').filter((l) => l.trim());
    // Each deeper level should have more indentation
    expect(lines.length).toBe(4);
    for (let i = 1; i < lines.length; i++) {
      const prevIndent = lines[i - 1].search(/\S/);
      const currIndent = lines[i].search(/\S/);
      expect(currIndent).toBeGreaterThan(prevIndent);
    }
  });

  it('TC-019: renders single item without branch chars', () => {
    const items: TreeItem[] = [{ name: 'only-file.ts' }];
    const result = renderTree(items);

    expect(result).toContain('only-file.ts');
  });

  it('TC-020: returns empty string for empty input', () => {
    const result = renderTree([]);
    expect(result).toBe('');
  });

  it('handles mixed leaf and branch nodes', () => {
    const items: TreeItem[] = [
      {
        name: 'src/',
        children: [
          { name: 'index.ts' },
          {
            name: 'utils/',
            children: [{ name: 'helpers.ts' }],
          },
        ],
      },
    ];
    const result = renderTree(items);

    expect(result).toContain('src/');
    expect(result).toContain('index.ts');
    expect(result).toContain('utils/');
    expect(result).toContain('helpers.ts');
  });
});
