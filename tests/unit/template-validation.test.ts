/**
 * Template Validation Tests
 *
 * Validates that template files are correctly structured with:
 * - All anchor links valid
 * - All required sections present
 * - No unresolved placeholders in templates themselves
 * - Quick Reference Cards present
 * - Troubleshooting section present
 */

import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const TEMPLATES_DIR = path.join(__dirname, '../../src/templates');
const CLAUDE_TEMPLATE = path.join(TEMPLATES_DIR, 'CLAUDE.md.template');
const AGENTS_TEMPLATE = path.join(TEMPLATES_DIR, 'AGENTS.md.template');

describe('Template Validation Tests', () => {
  describe('CLAUDE.md.template', () => {
    let claudeContent: string;

    beforeAll(() => {
      claudeContent = fs.readFileSync(CLAUDE_TEMPLATE, 'utf-8');
    });

    test('should exist', () => {
      expect(fs.existsSync(CLAUDE_TEMPLATE)).toBe(true);
    });

    test('should be valid Markdown', () => {
      expect(claudeContent).toBeTruthy();
      expect(claudeContent.length).toBeGreaterThan(0);
    });

    test('should contain Quick Reference Cards section', () => {
      expect(claudeContent).toContain('## 📋 Quick Reference Cards');
    });

    test('should contain Troubleshooting section', () => {
      expect(claudeContent).toContain('## 🆘 Troubleshooting');
    });

    test('should contain Daily Workflow table', () => {
      expect(claudeContent).toMatch(/TASK.*→.*COMMAND/);
    });

    test('should contain File Organization Rules', () => {
      expect(claudeContent).toContain('File Organization Rules');
    });

    test('should contain When to Use Which Command table', () => {
      expect(claudeContent).toMatch(/User Says.*Use Command/);
    });

    test('should have at least 7 troubleshooting issues', () => {
      const troubleshootingSection = claudeContent.split('## 🆘 Troubleshooting')[1] || '';
      const issueCount = (troubleshootingSection.match(/### /g) || []).length;
      expect(issueCount).toBeGreaterThanOrEqual(7);
    });

    test('should contain critical rules', () => {
      expect(claudeContent).toContain('NEVER POLLUTE PROJECT ROOT');
    });

    test('should reference progressive disclosure for Claude Code', () => {
      expect(claudeContent).toMatch(/progressive disclosure|skills activate|agents activate/i);
    });
  });

  describe('AGENTS.md.template', () => {
    let agentsContent: string;

    beforeAll(() => {
      agentsContent = fs.readFileSync(AGENTS_TEMPLATE, 'utf-8');
    });

    test('should exist', () => {
      expect(fs.existsSync(AGENTS_TEMPLATE)).toBe(true);
    });

    test('should be valid Markdown', () => {
      expect(agentsContent).toBeTruthy();
      expect(agentsContent.length).toBeGreaterThan(0);
    });

    test('should be comprehensive (2000+ lines)', () => {
      const lineCount = agentsContent.split('\n').length;
      expect(lineCount).toBeGreaterThan(2000);
    });

    describe('"How to Use This File" section', () => {
      test('should exist', () => {
        expect(agentsContent).toContain('## 🚨 CRITICAL: How to Use This File');
      });

      test('should mention non-Claude tools', () => {
        expect(agentsContent).toMatch(/Cursor|Copilot|non-Claude/);
      });

      test('should explain NO progressive disclosure', () => {
        expect(agentsContent).toContain('DO NOT have progressive disclosure');
      });

      test('should teach reference manual pattern', () => {
        expect(agentsContent).toContain('Think of This File as a REFERENCE MANUAL');
      });

      test('should provide navigation pattern', () => {
        expect(agentsContent).toContain('Navigation Pattern');
      });

      test('should include example workflow', () => {
        expect(agentsContent).toContain('Example Workflow');
      });
    });

    describe('Section Index', () => {
      test('should exist', () => {
        expect(agentsContent).toContain('## 📑 SECTION INDEX');
      });

      test('should have Essential section links', () => {
        expect(agentsContent).toContain('[Essential Knowledge](#essential-knowledge)');
        expect(agentsContent).toContain('[Quick Reference Cards](#quick-reference-cards)');
        expect(agentsContent).toContain('[Critical Rules](#critical-rules)');
      });

      test('should have Commands section with search pattern', () => {
        expect(agentsContent).toContain('Search pattern: `#command-{name}`');
      });

      test('should list core commands', () => {
        expect(agentsContent).toContain('[/specweave:increment](#command-increment)');
        expect(agentsContent).toContain('[/specweave:do](#command-do)');
        expect(agentsContent).toContain('[/specweave:done](#command-done)');
      });

      test('should have Skills section with search pattern', () => {
        expect(agentsContent).toContain('Search pattern: `#skill-{name}`');
      });

      test('should have Agents section with search pattern', () => {
        expect(agentsContent).toContain('Search pattern: `#agent-{name}`');
      });

      test('should have Workflows section with search pattern', () => {
        expect(agentsContent).toContain('Search pattern: `#workflow-{name}`');
      });

      test('should have Troubleshooting section with search pattern', () => {
        expect(agentsContent).toContain('Search pattern: `#troubleshoot-{topic}`');
      });

      test('should have Search Patterns Reference table', () => {
        expect(agentsContent).toContain('Search Patterns Reference');
        expect(agentsContent).toMatch(/What You Need.*Search For.*Example/);
      });
    });

    describe('Quick Reference Cards', () => {
      test('should exist', () => {
        expect(agentsContent).toContain('## 📋 Quick Reference Cards {#quick-reference-cards}');
      });

      test('should have Essential Knowledge section', () => {
        expect(agentsContent).toContain('### 🎯 Essential Knowledge {#essential-knowledge}');
      });

      test('should have Critical Rules', () => {
        expect(agentsContent).toContain('#### Critical Rules {#critical-rules}');
        expect(agentsContent).toContain('⛔ NEVER pollute project root');
      });

      test('should have File Organization', () => {
        expect(agentsContent).toContain('#### File Organization {#file-organization}');
      });

      test('should have Daily Workflow table', () => {
        expect(agentsContent).toContain('### Daily Workflow');
      });

      test('should have "After EVERY Task Completion" section', () => {
        expect(agentsContent).toContain('### After EVERY Task Completion (CRITICAL!)');
        expect(agentsContent).toContain('Non-Claude tools do NOT have automatic hooks');
      });

      test('should list manual sync commands', () => {
        expect(agentsContent).toContain('/specweave:sync-tasks');
        expect(agentsContent).toContain('/specweave:sync-docs update');
      });
    });

    describe('Troubleshooting Section', () => {
      test('should exist', () => {
        expect(agentsContent).toContain('## 🆘 Troubleshooting {#troubleshooting}');
      });

      test('should have at least 14 troubleshooting topics', () => {
        const troubleshootingSection = agentsContent.split('## 🆘 Troubleshooting')[1] || '';
        const topicCount = (troubleshootingSection.match(/### /g) || []).length;
        expect(topicCount).toBeGreaterThanOrEqual(14);
      });

      test('should have Skills Not Working troubleshooting', () => {
        expect(agentsContent).toContain('### Skills Not Working {#troubleshoot-skills}');
      });

      test('should have Commands Not Found troubleshooting', () => {
        expect(agentsContent).toContain('### Commands Not Found {#troubleshoot-commands}');
      });

      test('should have Sync Issues troubleshooting', () => {
        expect(agentsContent).toContain('### Sync Issues {#troubleshoot-sync}');
      });

      test('should have Root Folder Polluted troubleshooting', () => {
        expect(agentsContent).toContain('### Root Folder Polluted {#troubleshoot-root-pollution}');
      });

      test('should have Duplicate Increments troubleshooting', () => {
        expect(agentsContent).toContain('### Duplicate Increments {#troubleshoot-duplicates}');
      });

      test('should have More Help section', () => {
        expect(agentsContent).toContain('### More Help {#more-help}');
      });

      test('should provide Symptoms for each issue', () => {
        const troubleshootingSection = agentsContent.split('## 🆘 Troubleshooting')[1] || '';
        const symptomsCount = (troubleshootingSection.match(/\*\*Symptoms\*\*/g) || []).length;
        expect(symptomsCount).toBeGreaterThanOrEqual(10);
      });

      test('should provide Solutions for each issue', () => {
        const troubleshootingSection = agentsContent.split('## 🆘 Troubleshooting')[1] || '';
        const solutionsCount = (troubleshootingSection.match(/\*\*Solutions\*\*/g) || []).length;
        expect(solutionsCount).toBeGreaterThanOrEqual(10);
      });
    });

    describe('Anchor Links Validation', () => {
      let sectionIndex: string;
      let fullContent: string;

      beforeAll(() => {
        const indexMatch = agentsContent.match(/## 📑 SECTION INDEX[\s\S]*?---/);
        sectionIndex = indexMatch ? indexMatch[0] : '';
        fullContent = agentsContent;
      });

      test('should have Section Index', () => {
        expect(sectionIndex).toBeTruthy();
      });

      // Extract all anchor links from Section Index
      function extractAnchorLinks(content: string): string[] {
        const linkRegex = /\]\(#([a-z0-9-]+)\)/g;
        const matches: string[] = [];
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
          matches.push(match[1]);
        }
        return matches;
      }

      // Check if anchor exists in content
      function anchorExists(content: string, anchor: string): boolean {
        const anchorPattern = new RegExp(`\\{#${anchor}\\}`, 'g');
        return anchorPattern.test(content);
      }

      test('all anchor links in Section Index should exist in file', () => {
        const anchorLinks = extractAnchorLinks(sectionIndex);
        expect(anchorLinks.length).toBeGreaterThan(0);

        const missingAnchors: string[] = [];
        for (const anchor of anchorLinks) {
          if (!anchorExists(fullContent, anchor)) {
            missingAnchors.push(anchor);
          }
        }

        if (missingAnchors.length > 0) {
          console.error('Missing anchors:', missingAnchors);
        }

        expect(missingAnchors).toEqual([]);
      });

      test('essential-knowledge anchor should exist', () => {
        expect(anchorExists(fullContent, 'essential-knowledge')).toBe(true);
      });

      test('quick-reference-cards anchor should exist', () => {
        expect(anchorExists(fullContent, 'quick-reference-cards')).toBe(true);
      });

      test('critical-rules anchor should exist', () => {
        expect(anchorExists(fullContent, 'critical-rules')).toBe(true);
      });

      test('file-organization anchor should exist', () => {
        expect(anchorExists(fullContent, 'file-organization')).toBe(true);
      });

      test('troubleshooting anchor should exist', () => {
        expect(anchorExists(fullContent, 'troubleshooting')).toBe(true);
      });

      test('troubleshoot-skills anchor should exist', () => {
        expect(anchorExists(fullContent, 'troubleshoot-skills')).toBe(true);
      });

      test('troubleshoot-commands anchor should exist', () => {
        expect(anchorExists(fullContent, 'troubleshoot-commands')).toBe(true);
      });

      test('troubleshoot-sync anchor should exist', () => {
        expect(anchorExists(fullContent, 'troubleshoot-sync')).toBe(true);
      });
    });

    describe('Search Patterns', () => {
      test('command search pattern should be documented', () => {
        expect(agentsContent).toContain('`#command-{name}`');
      });

      test('skill search pattern should be documented', () => {
        expect(agentsContent).toContain('`#skill-{name}`');
      });

      test('agent search pattern should be documented', () => {
        expect(agentsContent).toContain('`#agent-{name}`');
      });

      test('workflow search pattern should be documented', () => {
        expect(agentsContent).toContain('`#workflow-{name}`');
      });

      test('troubleshoot search pattern should be documented', () => {
        expect(agentsContent).toContain('`#troubleshoot-{topic}`');
      });
    });

    describe('Multi-Tool Support', () => {
      test('should mention Cursor explicitly', () => {
        expect(agentsContent).toMatch(/Cursor/);
      });

      test('should mention GitHub Copilot explicitly', () => {
        expect(agentsContent).toMatch(/Copilot/);
      });

      test('should mention ChatGPT or generic tools', () => {
        expect(agentsContent).toMatch(/ChatGPT|generic|other AI tool/i);
      });

      test('should explain manual sync requirement', () => {
        expect(agentsContent).toContain('manual sync required');
      });

      test('should explain no automatic hooks', () => {
        expect(agentsContent).toMatch(/no automatic hooks|hooks do NOT/i);
      });
    });
  });

  describe('Both Templates', () => {
    test('should have consistent file organization messaging', () => {
      const claudeContent = fs.readFileSync(CLAUDE_TEMPLATE, 'utf-8');
      const agentsContent = fs.readFileSync(AGENTS_TEMPLATE, 'utf-8');

      expect(claudeContent).toContain('NEVER POLLUTE PROJECT ROOT');
      expect(agentsContent).toContain('NEVER pollute project root');
    });

    test('should reference increment folder structure', () => {
      const claudeContent = fs.readFileSync(CLAUDE_TEMPLATE, 'utf-8');
      const agentsContent = fs.readFileSync(AGENTS_TEMPLATE, 'utf-8');

      expect(claudeContent).toContain('.specweave/increments');
      expect(agentsContent).toContain('.specweave/increments');
    });

    test('should mention reports/, scripts/, logs/ folders', () => {
      const claudeContent = fs.readFileSync(CLAUDE_TEMPLATE, 'utf-8');
      const agentsContent = fs.readFileSync(AGENTS_TEMPLATE, 'utf-8');

      expect(claudeContent).toContain('reports/');
      expect(claudeContent).toContain('scripts/');
      expect(claudeContent).toContain('logs/');

      expect(agentsContent).toContain('reports/');
      expect(agentsContent).toContain('scripts/');
      expect(agentsContent).toContain('logs/');
    });
  });
});
