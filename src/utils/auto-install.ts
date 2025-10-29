/**
 * Auto-Install Utility
 *
 * Handles just-in-time installation of SpecWeave components based on user intent.
 * Components are copied from the npm package to .claude/ directories.
 */

import fs from 'fs-extra';
import * as path from 'path';
import { getDirname } from './esm-helpers.js';

const __dirname = getDirname(import.meta.url);

/**
 * Keyword → Component Mapping
 * Maps user keywords to required skills and agents
 */
export const COMPONENT_MAPPING: Record<string, { skills: string[], agents: string[] }> = {
  // Framework detection
  'next.js': { skills: ['nextjs', 'nodejs-backend'], agents: [] },
  'nextjs': { skills: ['nextjs', 'nodejs-backend'], agents: [] },
  'react': { skills: ['frontend'], agents: [] },
  'vue': { skills: ['frontend'], agents: [] },
  'angular': { skills: ['frontend'], agents: [] },
  'fastapi': { skills: ['python-backend'], agents: [] },
  'django': { skills: ['python-backend'], agents: [] },
  'flask': { skills: ['python-backend'], agents: [] },
  '.net': { skills: ['dotnet-backend'], agents: [] },
  'asp.net': { skills: ['dotnet-backend'], agents: [] },
  'express': { skills: ['nodejs-backend'], agents: [] },
  'nestjs': { skills: ['nodejs-backend'], agents: [] },

  // Feature detection
  'authentication': { skills: ['nodejs-backend'], agents: ['security'] },
  'auth': { skills: [], agents: ['security'] },
  'oauth': { skills: [], agents: ['security'] },
  'login': { skills: [], agents: ['security'] },
  'payment': { skills: ['stripe-integrator'], agents: ['security'] },
  'stripe': { skills: ['stripe-integrator'], agents: ['security'] },

  // Infrastructure detection
  'deploy': { skills: [], agents: ['devops'] },
  'deployment': { skills: [], agents: ['devops'] },
  'infrastructure': { skills: [], agents: ['devops'] },
  'hetzner': { skills: ['hetzner-provisioner'], agents: ['devops'] },
  'aws': { skills: [], agents: ['devops'] },
  'vercel': { skills: [], agents: ['devops'] },
  'docker': { skills: [], agents: ['devops'] },

  // Testing detection
  'test': { skills: [], agents: ['qa-lead'] },
  'testing': { skills: [], agents: ['qa-lead'] },
  'e2e': { skills: ['e2e-playwright'], agents: ['qa-lead'] },
  'playwright': { skills: ['e2e-playwright'], agents: ['qa-lead'] },

  // Design detection
  'figma': { skills: ['figma-implementer', 'figma-designer'], agents: [] },
  'design system': { skills: ['design-system-architect'], agents: [] },

  // Integration detection
  'jira': { skills: ['jira-sync'], agents: [] },
  'ado': { skills: ['ado-sync'], agents: [] },
  'azure devops': { skills: ['ado-sync'], agents: [] },
  'github': { skills: ['github-sync'], agents: [] },
};

/**
 * Always-needed agents for creating new features
 */
const STRATEGIC_AGENTS = ['pm', 'architect'];

/**
 * Extract keywords from user prompt
 */
function extractKeywords(prompt: string): string[] {
  const normalized = prompt.toLowerCase();
  const keywords: string[] = [];

  for (const keyword of Object.keys(COMPONENT_MAPPING)) {
    if (normalized.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return keywords;
}

/**
 * Analyze user intent and determine required components
 */
export function analyzeUserIntent(prompt: string): { skills: string[], agents: string[] } {
  const keywords = extractKeywords(prompt);
  const required = { skills: new Set<string>(), agents: new Set<string>() };

  // Map keywords to components
  for (const keyword of keywords) {
    const mapping = COMPONENT_MAPPING[keyword];
    if (mapping) {
      mapping.skills.forEach(skill => required.skills.add(skill));
      mapping.agents.forEach(agent => required.agents.add(agent));
    }
  }

  // Always include strategic agents for new features
  if (prompt.toLowerCase().includes('create') ||
      prompt.toLowerCase().includes('build') ||
      prompt.toLowerCase().includes('implement')) {
    STRATEGIC_AGENTS.forEach(agent => required.agents.add(agent));
  }

  return {
    skills: Array.from(required.skills),
    agents: Array.from(required.agents),
  };
}

/**
 * Find npm package location
 */
function findNpmPackagePath(): string {
  // Try multiple locations
  const possiblePaths = [
    path.join(process.cwd(), 'node_modules', 'specweave'),
    path.join(process.cwd(), '..', '..', '..'), // If running from node_modules/specweave/dist
    path.join(__dirname, '..', '..'), // If running from dist/utils
  ];

  for (const pkgPath of possiblePaths) {
    const srcPath = path.join(pkgPath, 'src');
    if (fs.existsSync(srcPath)) {
      return pkgPath;
    }
  }

  throw new Error('SpecWeave package not found. Ensure it is installed: npm install specweave');
}

/**
 * Check if component is already installed
 */
function isComponentInstalled(type: 'skills' | 'agents', name: string): boolean {
  const componentPath = path.join(process.cwd(), '.claude', type, name);
  return fs.existsSync(componentPath);
}

/**
 * Install a component (skill or agent)
 */
async function installComponent(
  type: 'skills' | 'agents',
  name: string,
  npmPackagePath: string,
  verbose: boolean = true
): Promise<void> {
  const sourcePath = path.join(npmPackagePath, 'src', type, name);
  const destPath = path.join(process.cwd(), '.claude', type, name);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Component not found: ${type}/${name}`);
  }

  // Ensure destination directory exists
  await fs.ensureDir(path.dirname(destPath));

  // Copy component
  await fs.copy(sourcePath, destPath);

  if (verbose) {
    console.log(`   ✅ Installed ${name} ${type === 'skills' ? 'skill' : 'agent'}`);
  }
}

/**
 * Auto-install missing components based on user intent
 *
 * Auto-install is ALWAYS enabled by default.
 * Set environment variable SPECWEAVE_AUTO_INSTALL=false to disable.
 */
export async function autoInstallComponents(
  prompt: string,
  options: { verbose?: boolean } = {}
): Promise<{ installed: { skills: string[], agents: string[] }, skipped: { skills: string[], agents: string[] } }> {
  const { verbose = true } = options;

  // Check if auto-install is disabled via environment variable
  if (process.env.SPECWEAVE_AUTO_INSTALL === 'false') {
    return { installed: { skills: [], agents: [] }, skipped: { skills: [], agents: [] } };
  }

  // Analyze user intent
  const required = analyzeUserIntent(prompt);

  if (required.skills.length === 0 && required.agents.length === 0) {
    return { installed: { skills: [], agents: [] }, skipped: { skills: [], agents: [] } };
  }

  // Find npm package
  const npmPackagePath = findNpmPackagePath();

  const installed = { skills: [] as string[], agents: [] as string[] };
  const skipped = { skills: [] as string[], agents: [] as string[] };

  if (verbose && (required.skills.length > 0 || required.agents.length > 0)) {
    console.log('\n📦 Installing required components...');
  }

  // Install skills
  for (const skill of required.skills) {
    if (isComponentInstalled('skills', skill)) {
      skipped.skills.push(skill);
    } else {
      await installComponent('skills', skill, npmPackagePath, verbose);
      installed.skills.push(skill);
    }
  }

  // Install agents
  for (const agent of required.agents) {
    if (isComponentInstalled('agents', agent)) {
      skipped.agents.push(agent);
    } else {
      await installComponent('agents', agent, npmPackagePath, verbose);
      installed.agents.push(agent);
    }
  }

  if (verbose && (installed.skills.length > 0 || installed.agents.length > 0)) {
    console.log('');
  }

  return { installed, skipped };
}

/**
 * Get list of all available components
 */
export function getAvailableComponents(): { skills: string[], agents: string[] } {
  try {
    const npmPackagePath = findNpmPackagePath();

    const skillsPath = path.join(npmPackagePath, 'src', 'skills');
    const agentsPath = path.join(npmPackagePath, 'src', 'agents');

    const skills = fs.existsSync(skillsPath)
      ? fs.readdirSync(skillsPath).filter(name =>
          fs.statSync(path.join(skillsPath, name)).isDirectory()
        )
      : [];

    const agents = fs.existsSync(agentsPath)
      ? fs.readdirSync(agentsPath).filter(name =>
          fs.statSync(path.join(agentsPath, name)).isDirectory()
        )
      : [];

    return { skills, agents };
  } catch (error) {
    return { skills: [], agents: [] };
  }
}
