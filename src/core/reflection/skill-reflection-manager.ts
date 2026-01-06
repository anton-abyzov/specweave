/**
 * Skill Reflection Manager - Orchestrates skill-specific learning
 *
 * This is the main entry point for the reflection system.
 * It handles:
 * 1. Detecting which skill(s) were used in a session
 * 2. Routing learnings to the appropriate skill's MEMORY.md
 * 3. Categorizing learnings that don't map to specific skills
 * 4. Managing the /reflect <skill> command
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getSkillsDirectory,
  getSkillMemoryPath,
  listSkills,
  skillExists,
  getGlobalMemoryDir,
  getSkillDefinitionPath,
  isClaudeCodeEnvironment,
} from './skill-memory-paths.js';
import {
  Learning,
  MemoryFile,
  readMemoryFile,
  writeMemoryFile,
  addLearning,
  createEmptyMemory,
  generateMemoryContent,
  parseMemoryFile,
} from './skill-memory-merger.js';

export interface ReflectionConfig {
  enabled: boolean;
  autoReflect: boolean;
  confidenceThreshold: 'high' | 'medium' | 'low';
  maxLearningsPerSession: number;
  maxLearningsPerSkill: number;
}

export interface DetectedSignal {
  type: 'correction' | 'rule' | 'approval';
  confidence: 'high' | 'medium' | 'low';
  content: string;
  context?: string;
  /** Detected skill name, or null for general learning */
  skill: string | null;
  /** Keywords for categorization */
  triggers: string[];
}

export interface ReflectionResult {
  success: boolean;
  skillsUpdated: string[];
  learningsAdded: number;
  learningsSkipped: number;
  errors: string[];
}

// Skill detection keywords (maps keywords to skill names)
const SKILL_KEYWORDS: Record<string, string[]> = {
  architect: [
    'architecture',
    'system design',
    'adr',
    'microservices',
    'api design',
    'data model',
    'schema',
    'scalability',
    'distributed',
    'event-driven',
    'cqrs',
    'ddd',
  ],
  'tech-lead': ['code review', 'best practices', 'refactoring', 'technical debt', 'code quality', 'solid', 'clean code'],
  'qa-lead': ['test strategy', 'qa', 'quality gates', 'acceptance testing', 'regression', 'tdd', 'bdd'],
  security: ['security', 'owasp', 'authentication', 'authorization', 'encryption', 'xss', 'sql injection', 'csrf'],
  'docs-writer': ['documentation', 'readme', 'api docs', 'technical writing', 'docusaurus'],
  infrastructure: ['terraform', 'iac', 'aws', 'azure', 'gcp', 'serverless', 'cloudformation'],
  performance: ['performance', 'optimization', 'profiling', 'caching', 'latency', 'throughput'],
  'tdd-orchestrator': ['tdd', 'test-driven', 'red-green-refactor', 'test first'],
  pm: ['product', 'requirements', 'user stories', 'roadmap', 'mvp', 'prioritization'],
  frontend: ['react', 'vue', 'angular', 'component', 'ui', 'css', 'tailwind', 'button', 'form'],
  backend: ['api', 'endpoint', 'route', 'rest', 'graphql', 'server', 'middleware'],
  database: ['database', 'sql', 'query', 'schema', 'migration', 'prisma', 'drizzle', 'postgres'],
  testing: ['test', 'spec', 'mock', 'vitest', 'jest', 'playwright', 'cypress', 'e2e'],
  devops: ['docker', 'kubernetes', 'ci/cd', 'pipeline', 'deploy', 'github actions'],
};

// Categorization for non-skill learnings (maps to memory category files)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'component-usage': ['component', 'button', 'ui', 'style', 'css', 'tailwind', 'design system'],
  'api-patterns': ['api', 'endpoint', 'route', 'rest', 'graphql', 'fetch'],
  testing: ['test', 'spec', 'mock', 'assert', 'expect', 'coverage'],
  deployment: ['deploy', 'wrangler', 'vercel', 'supabase', 'cloudflare', 'ci'],
  security: ['auth', 'security', 'token', 'password', 'secret', 'encryption'],
  database: ['query', 'database', 'sql', 'schema', 'migration'],
  structure: ['file', 'path', 'import', 'export', 'module'],
  logging: ['logger', 'log', 'console', 'debug', 'error'],
  types: ['type', 'interface', 'typescript', 'generic'],
  git: ['git', 'commit', 'branch', 'merge', 'rebase'],
  general: [], // fallback
};

/**
 * Detect which skill a learning is most relevant to
 */
export function detectSkill(content: string, context?: string): string | null {
  const text = `${content} ${context || ''}`.toLowerCase();

  // Score each skill by keyword matches
  const scores: Map<string, number> = new Map();

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += keyword.split(' ').length; // Multi-word keywords score higher
      }
    }
    if (score > 0) {
      scores.set(skill, score);
    }
  }

  // Return highest scoring skill, or null if no matches
  if (scores.size === 0) return null;

  let bestSkill: string | null = null;
  let bestScore = 0;

  for (const [skill, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestSkill = skill;
    }
  }

  return bestSkill;
}

/**
 * Detect category for non-skill learnings
 */
export function detectCategory(content: string, context?: string): string {
  const text = `${content} ${context || ''}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'general') continue;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return 'general';
}

/**
 * Extract trigger keywords from content
 */
export function extractTriggers(content: string): string[] {
  const words = content.toLowerCase().split(/\s+/);
  const triggers: string[] = [];

  // Extract meaningful words (4+ chars, not common words)
  const stopWords = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'were', 'will', 'should', 'would', 'could']);

  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (clean.length >= 4 && !stopWords.has(clean)) {
      triggers.push(clean);
    }
  }

  // Dedupe and limit to 10
  return [...new Set(triggers)].slice(0, 10);
}

/**
 * Generate a unique learning ID
 */
export function generateLearningId(prefix = 'LRN'): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

/**
 * Add a learning to the appropriate skill or category
 */
export function routeLearning(signal: DetectedSignal, projectRoot?: string): { target: string; added: boolean; reason?: string } {
  const learning: Learning = {
    id: generateLearningId(),
    timestamp: new Date().toISOString(),
    type: signal.type,
    confidence: signal.confidence,
    content: signal.content,
    context: signal.context,
    triggers: signal.triggers,
    source: `session:${new Date().toISOString().split('T')[0]}`,
  };

  // Route to skill if detected
  if (signal.skill && skillExists(signal.skill, projectRoot)) {
    const memoryPath = getSkillMemoryPath(signal.skill, projectRoot);
    let memory = readMemoryFile(memoryPath);

    if (!memory) {
      memory = createEmptyMemory(signal.skill);
    }

    const result = addLearning(memory, learning);

    if (result.added) {
      writeMemoryFile(memoryPath, memory);
      return { target: `skill:${signal.skill}`, added: true };
    }

    return { target: `skill:${signal.skill}`, added: false, reason: result.reason };
  }

  // Route to category memory
  const category = detectCategory(signal.content, signal.context);
  const globalDir = getGlobalMemoryDir(projectRoot);
  const categoryPath = path.join(globalDir, `${category}.md`);

  let memory = readMemoryFile(categoryPath);

  if (!memory) {
    memory = createEmptyMemory(category);
  }

  const result = addLearning(memory, learning);

  if (result.added) {
    writeMemoryFile(categoryPath, memory);
    return { target: `category:${category}`, added: true };
  }

  return { target: `category:${category}`, added: false, reason: result.reason };
}

/**
 * Process detected signals and route to appropriate memory files
 */
export function processSignals(signals: DetectedSignal[], projectRoot?: string): ReflectionResult {
  const result: ReflectionResult = {
    success: true,
    skillsUpdated: [],
    learningsAdded: 0,
    learningsSkipped: 0,
    errors: [],
  };

  const updatedTargets = new Set<string>();

  for (const signal of signals) {
    try {
      // Auto-detect skill if not specified
      if (!signal.skill) {
        signal.skill = detectSkill(signal.content, signal.context);
      }

      // Extract triggers if not specified
      if (!signal.triggers || signal.triggers.length === 0) {
        signal.triggers = extractTriggers(signal.content);
      }

      const routeResult = routeLearning(signal, projectRoot);

      if (routeResult.added) {
        result.learningsAdded++;
        updatedTargets.add(routeResult.target);
      } else {
        result.learningsSkipped++;
      }
    } catch (error) {
      result.errors.push(`Failed to process signal: ${error}`);
    }
  }

  result.skillsUpdated = [...updatedTargets];
  result.success = result.errors.length === 0;

  return result;
}

/**
 * Reflect on a specific skill - add learnings manually
 */
export function reflectOnSkill(
  skillName: string,
  learnings: Array<{ content: string; context?: string; type?: 'correction' | 'rule' | 'approval' }>,
  projectRoot?: string
): ReflectionResult {
  const result: ReflectionResult = {
    success: true,
    skillsUpdated: [],
    learningsAdded: 0,
    learningsSkipped: 0,
    errors: [],
  };

  // Validate skill exists
  if (!skillExists(skillName, projectRoot)) {
    // Check if it's a category instead
    const isCategory = Object.keys(CATEGORY_KEYWORDS).includes(skillName);
    if (!isCategory) {
      result.success = false;
      result.errors.push(`Skill '${skillName}' not found. Available skills: ${listSkills(projectRoot).join(', ')}`);
      return result;
    }
  }

  const signals: DetectedSignal[] = learnings.map((l) => ({
    type: l.type || 'rule',
    confidence: 'high' as const,
    content: l.content,
    context: l.context,
    skill: skillExists(skillName, projectRoot) ? skillName : null,
    triggers: extractTriggers(l.content),
  }));

  return processSignals(signals, projectRoot);
}

/**
 * Get all learnings for a skill
 */
export function getSkillLearnings(skillName: string, projectRoot?: string): Learning[] {
  const memoryPath = getSkillMemoryPath(skillName, projectRoot);
  const memory = readMemoryFile(memoryPath);
  return memory?.learnings || [];
}

/**
 * Get all learnings for a category
 */
export function getCategoryLearnings(category: string, projectRoot?: string): Learning[] {
  const globalDir = getGlobalMemoryDir(projectRoot);
  const categoryPath = path.join(globalDir, `${category}.md`);
  const memory = readMemoryFile(categoryPath);
  return memory?.learnings || [];
}

/**
 * Clear all learnings for a skill
 */
export function clearSkillLearnings(skillName: string, projectRoot?: string): boolean {
  const memoryPath = getSkillMemoryPath(skillName, projectRoot);

  if (!fs.existsSync(memoryPath)) {
    return false;
  }

  const memory = createEmptyMemory(skillName);
  writeMemoryFile(memoryPath, memory);
  return true;
}

/**
 * Remove a specific learning by ID
 */
export function removeLearningById(learningId: string, projectRoot?: string): boolean {
  // Search in skill memories
  for (const skill of listSkills(projectRoot)) {
    const memoryPath = getSkillMemoryPath(skill, projectRoot);
    const memory = readMemoryFile(memoryPath);

    if (memory) {
      const index = memory.learnings.findIndex((l) => l.id === learningId);
      if (index !== -1) {
        memory.learnings.splice(index, 1);
        memory.lastUpdated = new Date().toISOString();
        writeMemoryFile(memoryPath, memory);
        return true;
      }
    }
  }

  // Search in category memories
  const globalDir = getGlobalMemoryDir(projectRoot);
  if (fs.existsSync(globalDir)) {
    for (const file of fs.readdirSync(globalDir)) {
      if (file.endsWith('.md')) {
        const categoryPath = path.join(globalDir, file);
        const memory = readMemoryFile(categoryPath);

        if (memory) {
          const index = memory.learnings.findIndex((l) => l.id === learningId);
          if (index !== -1) {
            memory.learnings.splice(index, 1);
            memory.lastUpdated = new Date().toISOString();
            writeMemoryFile(categoryPath, memory);
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Get reflection statistics
 */
export function getReflectionStats(projectRoot?: string): {
  skills: Array<{ name: string; learningCount: number }>;
  categories: Array<{ name: string; learningCount: number }>;
  totalLearnings: number;
  isClaudeCode: boolean;
} {
  const stats = {
    skills: [] as Array<{ name: string; learningCount: number }>,
    categories: [] as Array<{ name: string; learningCount: number }>,
    totalLearnings: 0,
    isClaudeCode: isClaudeCodeEnvironment(),
  };

  // Count skill learnings
  for (const skill of listSkills(projectRoot)) {
    const memoryPath = getSkillMemoryPath(skill, projectRoot);
    const memory = readMemoryFile(memoryPath);
    const count = memory?.learnings.length || 0;

    if (count > 0) {
      stats.skills.push({ name: skill, learningCount: count });
      stats.totalLearnings += count;
    }
  }

  // Count category learnings
  const globalDir = getGlobalMemoryDir(projectRoot);
  if (fs.existsSync(globalDir)) {
    for (const file of fs.readdirSync(globalDir)) {
      if (file.endsWith('.md')) {
        const categoryPath = path.join(globalDir, file);
        const memory = readMemoryFile(categoryPath);
        const count = memory?.learnings.length || 0;

        if (count > 0) {
          const name = path.basename(file, '.md');
          stats.categories.push({ name, learningCount: count });
          stats.totalLearnings += count;
        }
      }
    }
  }

  // Sort by count descending
  stats.skills.sort((a, b) => b.learningCount - a.learningCount);
  stats.categories.sort((a, b) => b.learningCount - a.learningCount);

  return stats;
}
