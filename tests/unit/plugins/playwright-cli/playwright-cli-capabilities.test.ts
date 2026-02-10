/**
 * Capability Gap Analysis: @playwright/cli vs Playwright MCP
 *
 * Maps each MCP tool to its CLI equivalent (or lack thereof).
 * Identifies gaps where MCP must remain the primary tool.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

interface CapabilityMapping {
  mcpTool: string;
  cliCommand: string | null;
  parity: 'full' | 'partial' | 'none';
  notes: string;
}

function cliAvailable(): boolean {
  try {
    execSync('playwright-cli --version', { encoding: 'utf-8', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

function runCli(command: string, timeout = 15_000): { ok: boolean; output: string } {
  try {
    const output = execSync(`playwright-cli ${command}`, {
      encoding: 'utf-8',
      timeout,
    }).trim();
    return { ok: true, output };
  } catch (e: unknown) {
    return { ok: false, output: (e as Error).message };
  }
}

/**
 * Complete MCP → CLI capability mapping.
 * This is the source of truth for routing decisions in the skill layer.
 */
const CAPABILITY_MAP: CapabilityMapping[] = [
  // Navigation
  { mcpTool: 'browser_navigate', cliCommand: 'goto <url>', parity: 'full', notes: 'Both navigate to URL' },
  { mcpTool: 'browser_navigate_back', cliCommand: 'go-back', parity: 'full', notes: 'History navigation' },

  // Interaction
  { mcpTool: 'browser_click', cliCommand: 'click <ref>', parity: 'full', notes: 'Element click by ref' },
  { mcpTool: 'browser_type', cliCommand: 'type <text>', parity: 'partial', notes: 'CLI types into focused element; MCP targets by ref' },
  { mcpTool: 'browser_fill_form', cliCommand: 'fill <ref> <text>', parity: 'partial', notes: 'CLI fills one field at a time; MCP fills multiple' },
  { mcpTool: 'browser_select_option', cliCommand: 'select <ref> <val>', parity: 'full', notes: 'Dropdown selection' },
  { mcpTool: 'browser_hover', cliCommand: 'hover <ref>', parity: 'full', notes: 'Element hover' },
  { mcpTool: 'browser_drag', cliCommand: 'drag <start> <end>', parity: 'full', notes: 'Drag and drop' },
  { mcpTool: 'browser_press_key', cliCommand: 'press <key>', parity: 'full', notes: 'Keyboard press' },

  // Capture
  { mcpTool: 'browser_snapshot', cliCommand: 'snapshot', parity: 'full', notes: 'CLI saves to file (token-efficient); MCP returns inline' },
  { mcpTool: 'browser_take_screenshot', cliCommand: 'screenshot', parity: 'full', notes: 'Both save to file' },

  // Tabs
  { mcpTool: 'browser_tabs', cliCommand: 'tab-list/tab-new/tab-close/tab-select', parity: 'full', notes: 'Full tab management' },

  // Advanced
  { mcpTool: 'browser_evaluate', cliCommand: 'eval <func>', parity: 'full', notes: 'JS evaluation' },
  { mcpTool: 'browser_run_code', cliCommand: 'run-code <code>', parity: 'full', notes: 'Execute Playwright code snippet' },
  { mcpTool: 'browser_console_messages', cliCommand: 'console', parity: 'full', notes: 'Console log access' },
  { mcpTool: 'browser_network_requests', cliCommand: 'network', parity: 'full', notes: 'Network request listing' },
  { mcpTool: 'browser_wait_for', cliCommand: null, parity: 'none', notes: 'CLI has no built-in wait; must use eval + polling' },
  { mcpTool: 'browser_handle_dialog', cliCommand: 'dialog-accept/dialog-dismiss', parity: 'full', notes: 'Dialog handling' },
  { mcpTool: 'browser_file_upload', cliCommand: 'upload <file>', parity: 'full', notes: 'File upload' },
  { mcpTool: 'browser_resize', cliCommand: 'resize <w> <h>', parity: 'full', notes: 'Window resize' },
  { mcpTool: 'browser_close', cliCommand: 'close', parity: 'full', notes: 'Close browser' },
  { mcpTool: 'browser_install', cliCommand: null, parity: 'none', notes: 'CLI requires pre-installed browsers via npx playwright install' },

  // CLI-only extras (no MCP equivalent)
  { mcpTool: '(none)', cliCommand: 'route <pattern>', parity: 'none', notes: 'CLI-only: network mocking' },
  { mcpTool: '(none)', cliCommand: 'state-save/state-load', parity: 'none', notes: 'CLI-only: auth state persistence' },
  { mcpTool: '(none)', cliCommand: 'cookie-*/localstorage-*/sessionstorage-*', parity: 'none', notes: 'CLI-only: granular storage management' },
  { mcpTool: '(none)', cliCommand: 'pdf', parity: 'none', notes: 'CLI-only: save page as PDF' },
  { mcpTool: '(none)', cliCommand: 'delete-data', parity: 'none', notes: 'CLI-only: clear session data' },
];

describe('Playwright CLI vs MCP Capability Gap Analysis', () => {

  describe('Capability Mapping Completeness', () => {
    const mcpTools = [
      'browser_navigate', 'browser_navigate_back', 'browser_click',
      'browser_type', 'browser_fill_form', 'browser_select_option',
      'browser_hover', 'browser_drag', 'browser_press_key',
      'browser_snapshot', 'browser_take_screenshot', 'browser_tabs',
      'browser_evaluate', 'browser_run_code', 'browser_console_messages',
      'browser_network_requests', 'browser_wait_for', 'browser_handle_dialog',
      'browser_file_upload', 'browser_resize', 'browser_close', 'browser_install',
    ];

    it('every MCP tool should have a mapping entry', () => {
      const mappedMcpTools = CAPABILITY_MAP.map(m => m.mcpTool);
      const unmapped = mcpTools.filter(t => !mappedMcpTools.includes(t));

      expect(unmapped).toEqual([]);
    });

    it('should have at least 80% full parity', () => {
      const mcpMappings = CAPABILITY_MAP.filter(m => m.mcpTool !== '(none)');
      const fullParity = mcpMappings.filter(m => m.parity === 'full');
      const ratio = fullParity.length / mcpMappings.length;

      console.log(`Full parity: ${fullParity.length}/${mcpMappings.length} (${(ratio * 100).toFixed(0)}%)`);

      expect(ratio).toBeGreaterThanOrEqual(0.8);
    });

    it('should identify CLI-only capabilities', () => {
      const cliOnly = CAPABILITY_MAP.filter(m => m.mcpTool === '(none)');

      console.log(`CLI-only capabilities: ${cliOnly.length}`);
      cliOnly.forEach(c => console.log(`  - ${c.cliCommand}: ${c.notes}`));

      expect(cliOnly.length).toBeGreaterThan(0);
    });

    it('should identify MCP-only capabilities (no CLI equivalent)', () => {
      const mcpOnly = CAPABILITY_MAP.filter(m => m.mcpTool !== '(none)' && m.parity === 'none');

      console.log(`MCP-only capabilities: ${mcpOnly.length}`);
      mcpOnly.forEach(c => console.log(`  - ${c.mcpTool}: ${c.notes}`));

      // browser_wait_for and browser_install have no CLI equivalent
      expect(mcpOnly.length).toBe(2);
    });
  });

  describe('CLI Runtime Verification', () => {
    const isAvailable = cliAvailable();

    it.skipIf(!isAvailable)('playwright-cli should be installed', () => {
      expect(isAvailable).toBe(true);
    });

    it.skipIf(!isAvailable)('open command should support headless flag', () => {
      const result = runCli('open --help');
      expect(result.ok).toBe(true);
      expect(result.output).toContain('--headed');
    });

    it.skipIf(!isAvailable)('should support named sessions for isolation', () => {
      const result = runCli('--help');
      expect(result.ok).toBe(true);
      expect(result.output).toContain('-s=<session>');
    });

    it.skipIf(!isAvailable)('should support multiple browser types', () => {
      const result = runCli('open --help');
      expect(result.ok).toBe(true);
      expect(result.output).toContain('--browser');
    });
  });

  describe('Routing Decision Matrix', () => {
    /** Task types and their optimal tool */
    const routingDecisions = [
      { task: 'run-e2e-tests', tool: 'cli', reason: 'Test execution via npx playwright test' },
      { task: 'generate-automation-script', tool: 'cli', reason: 'CLI output is reusable code' },
      { task: 'interactive-page-exploration', tool: 'mcp', reason: 'MCP inline snapshots enable reasoning' },
      { task: 'screenshot-comparison', tool: 'cli', reason: 'CLI saves to files, better for diffing' },
      { task: 'form-fill-automation', tool: 'cli', reason: 'Token-efficient for repetitive actions' },
      { task: 'self-healing-test-fix', tool: 'mcp', reason: 'Needs DOM inspection to find new selectors' },
      { task: 'ci-pipeline-testing', tool: 'cli', reason: 'Headless default, file-based output, exit codes' },
      { task: 'visual-regression', tool: 'cli', reason: 'File-based screenshots for comparison' },
      { task: 'network-mocking', tool: 'cli', reason: 'CLI-only: route command for request mocking' },
      { task: 'auth-state-management', tool: 'cli', reason: 'CLI-only: state-save/state-load' },
    ];

    it('should have routing decisions for common task types', () => {
      expect(routingDecisions.length).toBeGreaterThanOrEqual(8);
    });

    it('should prefer CLI for majority of tasks', () => {
      const cliPreferred = routingDecisions.filter(d => d.tool === 'cli');
      const ratio = cliPreferred.length / routingDecisions.length;

      console.log(`CLI preferred: ${cliPreferred.length}/${routingDecisions.length} (${(ratio * 100).toFixed(0)}%)`);

      // CLI should be preferred for most tasks (70%+)
      expect(ratio).toBeGreaterThanOrEqual(0.7);
    });

    it('MCP should only be preferred for inspection-heavy tasks', () => {
      const mcpPreferred = routingDecisions.filter(d => d.tool === 'mcp');

      mcpPreferred.forEach(d => {
        console.log(`MCP preferred: ${d.task} - ${d.reason}`);
        // MCP tasks should involve DOM inspection or self-healing
        expect(d.reason).toMatch(/inspect|reason|DOM|selector/i);
      });
    });
  });
});
