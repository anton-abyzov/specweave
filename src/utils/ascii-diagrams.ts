/**
 * ASCII Diagram Generators for AskUserQuestion Markdown Previews
 *
 * Pure functions that generate ASCII diagrams for use in Claude Code's
 * AskUserQuestion markdown preview panels. All output fits within 80 chars.
 */

const MAX_WIDTH = 80;

// ── Types ──────────────────────────────────────────────────────────────

export interface BoxNode {
  id: string;
  label: string;
  sublabel?: string;
}

export interface BoxConnection {
  from: string;
  to: string;
  label?: string;
}

export interface DAGTask {
  id: string;
  name: string;
}

export interface DAGDependency {
  from: string;
  to: string;
}

export interface TableOptions {
  headerSeparator?: boolean;
  maxColWidth?: number;
}

export interface TreeItem {
  name: string;
  children?: TreeItem[];
}

// ── renderBoxDiagram ───────────────────────────────────────────────────

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

function makeBox(node: BoxNode, innerWidth: number): string[] {
  const label = truncate(node.label, innerWidth);
  const lines: string[] = [];
  lines.push('┌' + '─'.repeat(innerWidth + 2) + '┐');
  lines.push('│ ' + label.padEnd(innerWidth) + ' │');
  if (node.sublabel) {
    const sub = truncate(node.sublabel, innerWidth);
    lines.push('│ ' + sub.padEnd(innerWidth) + ' │');
  }
  lines.push('└' + '─'.repeat(innerWidth + 2) + '┘');
  return lines;
}

export function renderBoxDiagram(
  nodes: BoxNode[],
  connections: BoxConnection[],
): string {
  if (nodes.length === 0) return '';

  const arrow = '──►';
  const arrowWidth = arrow.length + 2; // with spacing

  // Calculate max inner width per box, fitting within MAX_WIDTH
  const maxLabelLen = Math.max(
    ...nodes.map((n) => Math.max(n.label.length, n.sublabel?.length ?? 0)),
  );
  // Each box takes innerWidth + 4 (borders + padding), plus arrows between
  const boxCount = nodes.length;
  const totalArrowWidth = Math.max(0, boxCount - 1) * arrowWidth;
  const availableForBoxes = MAX_WIDTH - totalArrowWidth;
  const maxInnerPerBox = Math.max(
    4,
    Math.floor(availableForBoxes / boxCount) - 4,
  );
  const innerWidth = Math.min(maxLabelLen, maxInnerPerBox);

  // Build boxes
  const boxes = nodes.map((n) => makeBox(n, innerWidth));

  // Determine max box height (some have sublabels)
  const maxHeight = Math.max(...boxes.map((b) => b.length));

  // Pad shorter boxes to same height (insert blank line before bottom border)
  const paddedBoxes = boxes.map((b) => {
    while (b.length < maxHeight) {
      b.splice(b.length - 1, 0, '│ ' + ' '.repeat(innerWidth) + ' │');
    }
    return b;
  });

  // Find connection arrow row (middle row of box)
  const arrowRow = Math.floor(maxHeight / 2);

  // Build connection lookup: which nodes have outgoing connections
  const hasConnection = new Set<string>();
  for (const c of connections) {
    hasConnection.add(c.from);
  }

  // Merge boxes horizontally with arrows
  const outputLines: string[] = [];
  for (let row = 0; row < maxHeight; row++) {
    let line = '';
    for (let i = 0; i < paddedBoxes.length; i++) {
      line += paddedBoxes[i][row];
      if (i < paddedBoxes.length - 1) {
        if (row === arrowRow && hasConnection.has(nodes[i].id)) {
          line += ' ' + arrow + ' ';
        } else {
          line += ' '.repeat(arrowWidth);
        }
      }
    }
    outputLines.push(line);
  }

  return outputLines.join('\n');
}

// ── renderDAG ──────────────────────────────────────────────────────────

export function renderDAG(
  tasks: DAGTask[],
  dependencies: DAGDependency[],
): string {
  if (tasks.length === 0) return '';

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Build adjacency and reverse adjacency
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();
  for (const t of tasks) {
    outEdges.set(t.id, []);
    inEdges.set(t.id, []);
  }
  for (const d of dependencies) {
    // Skip edges referencing tasks not in the task list
    if (!taskMap.has(d.from) || !taskMap.has(d.to)) continue;
    outEdges.get(d.from)?.push(d.to);
    inEdges.get(d.to)?.push(d.from);
  }

  // Topological sort with depth assignment (BFS from roots)
  const inDegree = new Map<string, number>();
  for (const t of tasks) {
    inDegree.set(t.id, inEdges.get(t.id)?.length ?? 0);
  }

  const depthMap = new Map<string, number>();
  const queue: string[] = [];
  for (const t of tasks) {
    if (inDegree.get(t.id) === 0) {
      queue.push(t.id);
      depthMap.set(t.id, 0);
    }
  }

  let maxDepth = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depthMap.get(current)!;
    for (const next of outEdges.get(current) ?? []) {
      const nextDepth = Math.max(depthMap.get(next) ?? 0, currentDepth + 1);
      depthMap.set(next, nextDepth);
      maxDepth = Math.max(maxDepth, nextDepth);
      const newInDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newInDeg);
      if (newInDeg === 0) {
        queue.push(next);
      }
    }
  }

  // Group tasks by depth (lane)
  const lanes = new Map<number, string[]>();
  for (const t of tasks) {
    const depth = depthMap.get(t.id) ?? 0;
    if (!lanes.has(depth)) lanes.set(depth, []);
    lanes.get(depth)!.push(t.id);
  }

  // Calculate max task label width for consistent formatting
  const maxNameLen = Math.max(
    ...tasks.map((t) => `${t.id} [${t.name}]`.length),
  );
  const cellWidth = Math.min(maxNameLen, 30);

  // Render each lane (parallel tasks on different rows)
  const outputLines: string[] = [];
  const laneCount = maxDepth + 1;

  // Find max parallelism (max tasks at any single depth)
  const maxParallel = Math.max(...[...lanes.values()].map((l) => l.length));

  for (let row = 0; row < maxParallel; row++) {
    let line = '';
    for (let depth = 0; depth < laneCount; depth++) {
      const tasksAtDepth = lanes.get(depth) ?? [];
      if (row < tasksAtDepth.length) {
        const tid = tasksAtDepth[row];
        const task = taskMap.get(tid)!;
        const label = truncate(`${task.id} [${task.name}]`, cellWidth);
        line += label.padEnd(cellWidth);
      } else {
        line += ' '.repeat(cellWidth);
      }
      if (depth < laneCount - 1) {
        // Add arrow if this task has connections to next depth
        const tasksAtDepth2 = lanes.get(depth) ?? [];
        if (row < tasksAtDepth2.length) {
          const tid = tasksAtDepth2[row];
          const outs = outEdges.get(tid) ?? [];
          const hasNext = outs.some(
            (o) => (depthMap.get(o) ?? 0) === depth + 1,
          );
          if (hasNext) {
            line += ' ──► ';
          } else {
            // Check for connections to deeper levels (skip arrows)
            const hasAnyOut = outs.length > 0;
            if (hasAnyOut) {
              line += ' ──► ';
            } else {
              line += '     ';
            }
          }
        } else {
          line += '     ';
        }
      }
    }
    // Trim trailing whitespace and enforce max width
    line = line.trimEnd();
    if (line.length > MAX_WIDTH) {
      line = line.slice(0, MAX_WIDTH - 1) + '…';
    }
    outputLines.push(line);
  }

  // Critical path: longest path from any root to any sink
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  for (const t of tasks) dist.set(t.id, 0);
  for (const t of tasks) prev.set(t.id, null);

  // Process in topological order (by depth)
  for (let depth = 0; depth <= maxDepth; depth++) {
    for (const tid of lanes.get(depth) ?? []) {
      for (const next of outEdges.get(tid) ?? []) {
        if ((dist.get(next) ?? 0) < (dist.get(tid) ?? 0) + 1) {
          dist.set(next, (dist.get(tid) ?? 0) + 1);
          prev.set(next, tid);
        }
      }
    }
  }

  // Find the node with max distance (end of critical path)
  let maxDist = 0;
  let endNode = tasks[0].id;
  for (const [tid, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      endNode = tid;
    }
  }

  // Trace back
  const criticalPath: string[] = [];
  let current: string | null = endNode;
  while (current) {
    criticalPath.unshift(current);
    current = prev.get(current) ?? null;
  }

  outputLines.push('');
  const cpLine = `Critical path: ${criticalPath.join(' → ')}`;
  outputLines.push(
    cpLine.length > MAX_WIDTH ? cpLine.slice(0, MAX_WIDTH - 1) + '…' : cpLine,
  );

  return outputLines.join('\n');
}

// ── renderTable ────────────────────────────────────────────────────────

export function renderTable(
  headers: string[],
  rows: string[][],
  options?: TableOptions,
): string {
  if (headers.length === 0) return '';

  const maxColWidth = options?.maxColWidth;
  const allRows = [headers, ...rows];

  // Calculate column widths
  const colWidths: number[] = headers.map((_, colIdx) => {
    const maxInCol = Math.max(
      ...allRows.map((row) => (row[colIdx] ?? '').length),
    );
    if (maxColWidth && maxInCol > maxColWidth) return maxColWidth;
    return maxInCol;
  });

  // Shrink columns if total exceeds MAX_WIDTH
  const gap = 2; // spaces between columns
  const totalGap = (headers.length - 1) * gap;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + totalGap;

  if (totalWidth > MAX_WIDTH) {
    const excess = totalWidth - MAX_WIDTH;
    // Shrink widest columns first, proportionally
    const sortedIdxs = colWidths
      .map((w, i) => ({ w, i }))
      .sort((a, b) => b.w - a.w);

    let remaining = excess;
    for (const entry of sortedIdxs) {
      if (remaining <= 0) break;
      const shrink = Math.min(
        remaining,
        Math.max(0, entry.w - 4), // never shrink below 4
      );
      colWidths[entry.i] -= shrink;
      remaining -= shrink;
    }
  }

  function formatRow(row: string[]): string {
    return row
      .map((cell, i) => {
        const w = colWidths[i];
        const truncated = cell.length > w ? cell.slice(0, w - 1) + '…' : cell;
        return truncated.padEnd(w);
      })
      .join(' '.repeat(gap));
  }

  const outputLines: string[] = [];
  outputLines.push(formatRow(headers));

  if (options?.headerSeparator) {
    outputLines.push(
      colWidths.map((w) => '─'.repeat(w)).join(' '.repeat(gap)),
    );
  }

  for (const row of rows) {
    outputLines.push(formatRow(row));
  }

  return outputLines.join('\n');
}

// ── renderTree ─────────────────────────────────────────────────────────

export function renderTree(items: TreeItem[]): string {
  if (items.length === 0) return '';

  const lines: string[] = [];

  function walk(children: TreeItem[], prefix: string): void {
    children.forEach((item, index) => {
      const isLast = index === children.length - 1;
      const connector = children.length === 1 && prefix === '' ? '' : isLast ? '└── ' : '├── ';
      lines.push(prefix + connector + item.name);
      if (item.children && item.children.length > 0) {
        const childPrefix =
          prefix + (children.length === 1 && prefix === '' ? '    ' : isLast ? '    ' : '│   ');
        walk(item.children, childPrefix);
      }
    });
  }

  walk(items, '');
  return lines.join('\n');
}
