/**
 * Dashboard Generator
 *
 * Creates HTML overview dashboard with project statistics and quick links.
 */

export interface DashboardData {
  projectName: string;
  repoCount: number;
  fileCount: number;
  techStack: string[];
  adrs: Array<{ number: number; title: string; status: string }>;
  techDebt: { p1: number; p2: number; p3: number };
  moduleCount: number;
  circularDeps: number;
}

/**
 * Generates HTML dashboards for living docs overview.
 */
export class DashboardGenerator {
  /**
   * Generate overview dashboard HTML.
   */
  generateDashboard(data: DashboardData): string {
    const totalDebt = data.techDebt.p1 + data.techDebt.p2 + data.techDebt.p3;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.projectName} - Architecture Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa;
      color: #2c3e50;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    header p {
      font-size: 16px;
      opacity: 0.9;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border-left: 4px solid #667eea;
    }
    .stat-card h3 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #7f8c8d;
      margin-bottom: 10px;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #2c3e50;
    }
    .section {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .section h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #2c3e50;
    }
    .tech-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .tech-badge {
      background: #ecf0f1;
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 14px;
      color: #2c3e50;
    }
    .adr-list {
      list-style: none;
    }
    .adr-item {
      padding: 12px 0;
      border-bottom: 1px solid #ecf0f1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .adr-item:last-child {
      border-bottom: none;
    }
    .adr-number {
      font-weight: bold;
      color: #667eea;
      margin-right: 10px;
    }
    .adr-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .adr-status.accepted {
      background: #d4edda;
      color: #155724;
    }
    .adr-status.proposed {
      background: #fff3cd;
      color: #856404;
    }
    .debt-bar {
      display: flex;
      height: 30px;
      border-radius: 6px;
      overflow: hidden;
      margin: 15px 0;
    }
    .debt-p1 {
      background: #e74c3c;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }
    .debt-p2 {
      background: #f39c12;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }
    .debt-p3 {
      background: #f1c40f;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }
    .quick-links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .quick-link {
      display: block;
      padding: 20px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      text-align: center;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .quick-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .warning-icon {
      color: #ff6b6b;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${data.projectName}</h1>
      <p>Architecture Overview & Living Documentation Dashboard</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Repositories</h3>
        <div class="value">${data.repoCount}</div>
      </div>
      <div class="stat-card">
        <h3>Source Files</h3>
        <div class="value">${data.fileCount.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <h3>Modules</h3>
        <div class="value">${data.moduleCount}</div>
      </div>
      <div class="stat-card">
        <h3>Tech Debt Items</h3>
        <div class="value">${totalDebt}</div>
      </div>
    </div>

    <div class="section">
      <h2>Tech Stack</h2>
      <div class="tech-stack">
        ${data.techStack.map(tech => `<span class="tech-badge">${tech}</span>`).join('')}
      </div>
    </div>

    <div class="section">
      <h2>Architecture Decision Records</h2>
      ${data.adrs.length === 0 ? '<p style="color: #95a5a6;">No ADRs discovered yet. Run analysis to generate.</p>' : `
        <ul class="adr-list">
          ${data.adrs.map(adr => `
            <li class="adr-item">
              <div>
                <span class="adr-number">ADR-${String(adr.number).padStart(4, '0')}</span>
                <span>${adr.title}</span>
              </div>
              <span class="adr-status ${adr.status.toLowerCase()}">${adr.status}</span>
            </li>
          `).join('')}
        </ul>
      `}
    </div>

    <div class="section">
      <h2>Technical Debt</h2>
      <div class="debt-bar">
        ${data.techDebt.p1 > 0 ? `<div class="debt-p1" style="width: ${(data.techDebt.p1 / totalDebt) * 100}%">P1: ${data.techDebt.p1}</div>` : ''}
        ${data.techDebt.p2 > 0 ? `<div class="debt-p2" style="width: ${(data.techDebt.p2 / totalDebt) * 100}%">P2: ${data.techDebt.p2}</div>` : ''}
        ${data.techDebt.p3 > 0 ? `<div class="debt-p3" style="width: ${(data.techDebt.p3 / totalDebt) * 100}%">P3: ${data.techDebt.p3}</div>` : ''}
      </div>
      <p style="font-size: 14px; color: #7f8c8d;">
        <strong>P1 (Critical):</strong> ${data.techDebt.p1} |
        <strong>P2 (Important):</strong> ${data.techDebt.p2} |
        <strong>P3 (Nice-to-have):</strong> ${data.techDebt.p3}
      </p>
      ${data.circularDeps > 0 ? `
        <div class="warning">
          <span class="warning-icon">⚠️</span>
          <strong>Warning:</strong> ${data.circularDeps} circular ${data.circularDeps === 1 ? 'dependency' : 'dependencies'} detected. Check dependency graph for details.
        </div>
      ` : ''}
    </div>

    <div class="section">
      <h2>Quick Links</h2>
      <div class="quick-links">
        <a href="architecture/diagrams/module-graph.html" class="quick-link">📊 Module Graph</a>
        <a href="architecture/diagrams/module-dependencies.mmd" class="quick-link">🔷 Mermaid Diagram</a>
        <a href="technical-debt.md" class="quick-link">⚠️ Tech Debt Report</a>
        <a href="team-structure.md" class="quick-link">👥 Team Structure</a>
        <a href="architecture/adr/" class="quick-link">📋 All ADRs</a>
      </div>
    </div>

    <footer style="text-align: center; margin-top: 40px; padding: 20px; color: #95a5a6; font-size: 14px;">
      Generated by SpecWeave Intelligent Living Docs • Updated: ${new Date().toLocaleDateString()}
    </footer>
  </div>
</body>
</html>`;
  }
}
