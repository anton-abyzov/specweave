/**
 * Interactive Graph Visualizer
 *
 * Generates standalone HTML files with D3.js-powered interactive dependency graphs.
 */

import type { ModuleGraph, CircularDep } from './mermaid-generator.js';

export interface GraphVisualizerOptions {
  title?: string;
  highlightCircular?: boolean;
  enableSearch?: boolean;
  enableFilters?: boolean;
}

/**
 * Generates interactive HTML visualizations using D3.js.
 */
export class GraphVisualizer {
  /**
   * Generate standalone HTML file with interactive module graph.
   */
  generateInteractiveGraph(
    graph: ModuleGraph,
    circularDeps: CircularDep[] = [],
    options: GraphVisualizerOptions = {}
  ): string {
    const {
      title = 'Module Dependency Graph',
      highlightCircular = true,
      enableSearch = true,
      enableFilters = true,
    } = options;

    // Prepare data for D3.js
    const nodes = graph.nodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      repo: node.repo,
      isCircular: this.isNodeInCircularDep(node.id, circularDeps),
    }));

    const links = graph.edges.map(edge => ({
      source: edge.from,
      target: edge.to,
      type: edge.type,
      count: edge.count,
    }));

    // Generate HTML with embedded D3.js
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }
    #graph {
      width: 100vw;
      height: 100vh;
    }
    .controls {
      position: absolute;
      top: 10px;
      left: 10px;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
    }
    .controls h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
    }
    .controls input[type="text"] {
      width: 200px;
      padding: 5px;
      margin-bottom: 10px;
    }
    .controls label {
      display: block;
      margin: 5px 0;
      font-size: 14px;
    }
    .node {
      cursor: pointer;
      stroke: #fff;
      stroke-width: 2px;
    }
    .node.component { fill: #4A90E2; }
    .node.service { fill: #7ED321; }
    .node.util { fill: #F5A623; }
    .node.config { fill: #BD10E0; }
    .node.circular { fill: #D0021B; }
    .link {
      stroke: #999;
      stroke-opacity: 0.6;
      stroke-width: 1.5px;
    }
    .link-label {
      font-size: 10px;
      fill: #666;
    }
    .detail-panel {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 300px;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
      display: none;
    }
    .detail-panel h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
    }
    .detail-panel .close {
      float: right;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="controls">
    <h3>Controls</h3>
    ${enableSearch ? '<input type="text" id="search" placeholder="Search modules...">' : ''}
    ${enableFilters ? `
    <div>
      <label><input type="checkbox" class="filter" value="component" checked> Components</label>
      <label><input type="checkbox" class="filter" value="service" checked> Services</label>
      <label><input type="checkbox" class="filter" value="util" checked> Utils</label>
      <label><input type="checkbox" class="filter" value="config" checked> Config</label>
    </div>
    ` : ''}
    <p style="margin-top: 10px; font-size: 12px; color: #666;">
      Zoom: Scroll | Pan: Drag | Click: Details
    </p>
  </div>

  <div class="detail-panel" id="detailPanel">
    <span class="close" onclick="document.getElementById('detailPanel').style.display='none'">&times;</span>
    <h3 id="detailTitle"></h3>
    <div id="detailContent"></div>
  </div>

  <svg id="graph"></svg>

  <script>
    const graphData = {
      nodes: ${JSON.stringify(nodes)},
      links: ${JSON.stringify(links)}
    };

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select('#graph')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('class', 'link');

    // Nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(graphData.nodes)
      .join('circle')
      .attr('class', d => \`node \${d.isCircular ? 'circular' : d.type}\`)
      .attr('r', 10)
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('click', showDetails);

    // Labels
    const label = g.append('g')
      .selectAll('text')
      .data(graphData.nodes)
      .join('text')
      .text(d => d.name)
      .attr('font-size', 12)
      .attr('dx', 15)
      .attr('dy', 4);

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Show details panel
    function showDetails(event, d) {
      const panel = document.getElementById('detailPanel');
      const title = document.getElementById('detailTitle');
      const content = document.getElementById('detailContent');

      title.textContent = d.name;

      const dependencies = graphData.links.filter(l => l.source.id === d.id);
      const dependents = graphData.links.filter(l => l.target.id === d.id);

      content.innerHTML = \`
        <p><strong>Type:</strong> \${d.type}</p>
        <p><strong>Repo:</strong> \${d.repo}</p>
        <p><strong>Dependencies:</strong> \${dependencies.length}</p>
        <p><strong>Dependents:</strong> \${dependents.length}</p>
        \${d.isCircular ? '<p style="color: red;"><strong>⚠️ Part of circular dependency!</strong></p>' : ''}
      \`;

      panel.style.display = 'block';
    }

    // Search functionality
    ${enableSearch ? `
    document.getElementById('search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      node.style('opacity', d => d.name.toLowerCase().includes(query) ? 1 : 0.2);
      label.style('opacity', d => d.name.toLowerCase().includes(query) ? 1 : 0.2);
    });
    ` : ''}

    // Filter functionality
    ${enableFilters ? `
    document.querySelectorAll('.filter').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const activeFilters = Array.from(document.querySelectorAll('.filter:checked')).map(c => c.value);
        node.style('display', d => activeFilters.includes(d.type) ? 'block' : 'none');
        label.style('display', d => activeFilters.includes(d.type) ? 'block' : 'none');
      });
    });
    ` : ''}
  </script>
</body>
</html>`;
  }

  private isNodeInCircularDep(nodeId: string, circularDeps: CircularDep[]): boolean {
    return circularDeps.some(dep => dep.cycle.includes(nodeId));
  }
}
