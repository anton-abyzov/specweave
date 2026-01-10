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

// Common false positive words that should never be detected as skills (GAP-008)
const SKILL_FALSE_POSITIVES = new Set([
  'the',
  'this',
  'that',
  'some',
  'any',
  'a',
  'an',
  'one',
  'new',
  'old',
  'same',
  'other',
  'first',
  'last',
  'next',
  'only',
  'main',
  'basic',
  'simple',
  'good',
  'bad',
  'right',
  'wrong',
  'great',
  'my',
  'your',
  'our',
]);

// Generic words that need additional context to be valid skills (GAP-008)
const SKILL_AMBIGUOUS_WORDS = new Set([
  'test',
  'build',
  'run',
  'start',
  'stop',
  'check',
  'fix',
  'update',
  'create',
  'delete',
  'add',
  'remove',
  'get',
  'set',
]);

/**
 * Detect which skill a learning is most relevant to
 *
 * Uses priority-based detection (v4.2 - GAP-008):
 * 1. Explicit skill name mention (highest priority)
 * 2. Keyword-based detection with improved accuracy
 * 3. Returns null for category fallback
 */
export function detectSkill(content: string, context?: string): string | null {
  const text = `${content} ${context || ''}`.toLowerCase();

  // Priority 1: Check for explicit skill name mentions
  // Patterns: "the X skill", "X skill", "X command", "X agent", hyphenated names followed by problem words
  const explicitPatterns = [
    /(?:the\s+)?([a-z][-a-z0-9]*)\s+skill/gi,
    /(?:the\s+)?([a-z][-a-z0-9]*)\s+command/gi,
    /(?:the\s+)?([a-z][-a-z0-9]*)\s+agent/gi,
    /\/sw:([a-z][-a-z0-9]*)/gi, // Slash command format
    // Hyphenated skill names followed by problem/status words (increment-planner has a bug)
    /\b([a-z]+-[a-z][-a-z0-9]*)\s+(?:has|is|doesn'?t|won'?t|can'?t|isn'?t|failed|fails|broken|not working)/gi,
  ];

  for (const pattern of explicitPatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const skillName = match[1];

      // GAP-008: Enhanced validation to reduce false positives
      if (!skillName || skillName.length < 3) continue;

      // Skip known false positives
      if (SKILL_FALSE_POSITIVES.has(skillName)) continue;

      // For ambiguous words, require them to be in our known skills list
      if (SKILL_AMBIGUOUS_WORDS.has(skillName)) {
        if (SKILL_KEYWORDS[skillName] || Object.keys(SKILL_KEYWORDS).includes(skillName)) {
          return skillName;
        }
        continue; // Skip ambiguous word if not a known skill
      }

      // Check if skill exists in our known skills or the skill directory
      if (SKILL_KEYWORDS[skillName] || Object.keys(SKILL_KEYWORDS).includes(skillName)) {
        return skillName;
      }

      // For hyphenated names, be more permissive (likely actual skill names)
      if (skillName.includes('-') && skillName.length > 5) {
        return skillName;
      }

      // For non-hyphenated names, require length > 5 AND not a common word
      if (skillName.length > 5 && !SKILL_AMBIGUOUS_WORDS.has(skillName)) {
        return skillName;
      }
    }
  }

  // Priority 2: Score each skill by keyword matches
  let bestSkill: string | null = null;
  let bestScore = 0;

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    const score = keywords.reduce((sum, keyword) => {
      return text.includes(keyword.toLowerCase()) ? sum + keyword.split(' ').length : sum;
    }, 0);

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
 *
 * GAP-002: Enhanced to work in non-Claude environments by:
 * 1. Gracefully falling back to category when skills unavailable
 * 2. Creating memory directories if they don't exist
 * 3. Providing clear routing information for debugging
 */
export function routeLearning(signal: DetectedSignal, projectRoot?: string): { target: string; added: boolean; reason?: string; fallback?: boolean } {
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

  // Determine target: skill or category
  // GAP-002: Check if skill exists, fall back to category if not
  let isSkillTarget = signal.skill && skillExists(signal.skill, projectRoot);
  let fallback = false;

  // If skill was detected but doesn't exist, mark as fallback
  if (signal.skill && !isSkillTarget) {
    fallback = true;
    // Try to find a matching category based on the skill name
    const matchingCategory = Object.keys(CATEGORY_KEYWORDS).find(
      (cat) => signal.skill!.toLowerCase().includes(cat) || cat.includes(signal.skill!.toLowerCase())
    );
    if (matchingCategory) {
      // Use matching category as fallback
      isSkillTarget = false;
    }
  }

  const targetName = isSkillTarget ? signal.skill! : detectCategory(signal.content, signal.context);
  const targetType = isSkillTarget ? 'skill' : 'category';

  const memoryPath = isSkillTarget
    ? getSkillMemoryPath(signal.skill!, projectRoot)
    : path.join(getGlobalMemoryDir(projectRoot), `${targetName}.md`);

  // GAP-002: Ensure directory exists before writing
  const memoryDir = path.dirname(memoryPath);
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  const memory = readMemoryFile(memoryPath) || createEmptyMemory(targetName);
  const result = addLearning(memory, learning);

  if (result.added) {
    writeMemoryFile(memoryPath, memory);
  }

  return {
    target: `${targetType}:${targetName}`,
    added: result.added,
    reason: result.reason,
    fallback,
  };
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
  // Helper to remove learning from a memory file
  function tryRemoveFromFile(memoryPath: string): boolean {
    const memory = readMemoryFile(memoryPath);
    if (!memory) return false;

    const index = memory.learnings.findIndex((l) => l.id === learningId);
    if (index === -1) return false;

    memory.learnings.splice(index, 1);
    memory.lastUpdated = new Date().toISOString();
    writeMemoryFile(memoryPath, memory);
    return true;
  }

  // Search in skill memories
  for (const skill of listSkills(projectRoot)) {
    if (tryRemoveFromFile(getSkillMemoryPath(skill, projectRoot))) {
      return true;
    }
  }

  // Search in category memories
  const globalDir = getGlobalMemoryDir(projectRoot);
  if (fs.existsSync(globalDir)) {
    for (const file of fs.readdirSync(globalDir).filter((f) => f.endsWith('.md'))) {
      if (tryRemoveFromFile(path.join(globalDir, file))) {
        return true;
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
  // Helper to get learning count from a memory file
  function getLearningCount(memoryPath: string): number {
    return readMemoryFile(memoryPath)?.learnings.length || 0;
  }

  // Count skill learnings
  const skills = listSkills(projectRoot)
    .map((skill) => ({ name: skill, learningCount: getLearningCount(getSkillMemoryPath(skill, projectRoot)) }))
    .filter((s) => s.learningCount > 0)
    .sort((a, b) => b.learningCount - a.learningCount);

  // Count category learnings
  const globalDir = getGlobalMemoryDir(projectRoot);
  const categories = fs.existsSync(globalDir)
    ? fs
        .readdirSync(globalDir)
        .filter((f) => f.endsWith('.md'))
        .map((file) => ({
          name: path.basename(file, '.md'),
          learningCount: getLearningCount(path.join(globalDir, file)),
        }))
        .filter((c) => c.learningCount > 0)
        .sort((a, b) => b.learningCount - a.learningCount)
    : [];

  const totalLearnings = [...skills, ...categories].reduce((sum, item) => sum + item.learningCount, 0);

  return { skills, categories, totalLearnings, isClaudeCode: isClaudeCodeEnvironment() };
}

/**
 * Verbose signal analysis result for --dry-run --verbose mode (GAP-005)
 */
export interface VerboseSignalAnalysis {
  /** Original signal content */
  content: string;
  /** Why this was detected as a signal */
  detectionReason: string;
  /** Signal type that was detected */
  signalType: 'correction' | 'rule' | 'approval';
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
  /** Detected skill (or null for category) */
  detectedSkill: string | null;
  /** Skill detection reason */
  skillDetectionReason: string;
  /** Target location where it would be stored */
  targetPath: string;
  /** Whether this would be a duplicate */
  isDuplicate: boolean;
  /** Extracted triggers */
  triggers: string[];
}

/**
 * Simulate reflection for --dry-run --verbose mode (GAP-005)
 *
 * Provides detailed analysis of what would be detected and where it would be routed,
 * without actually writing to memory files.
 */
export function simulateReflection(
  signals: DetectedSignal[],
  projectRoot?: string
): VerboseSignalAnalysis[] {
  const analyses: VerboseSignalAnalysis[] = [];

  for (const signal of signals) {
    // Detect skill if not specified
    const detectedSkill = signal.skill || detectSkill(signal.content, signal.context);
    const triggers = signal.triggers?.length ? signal.triggers : extractTriggers(signal.content);

    // Determine target
    const isSkillTarget = detectedSkill && skillExists(detectedSkill, projectRoot);
    const targetName = isSkillTarget ? detectedSkill! : detectCategory(signal.content, signal.context);
    const targetType = isSkillTarget ? 'skill' : 'category';

    // Get target path
    const targetPath = isSkillTarget
      ? getSkillMemoryPath(detectedSkill!, projectRoot)
      : path.join(getGlobalMemoryDir(projectRoot), `${targetName}.md`);

    // Check for duplicate
    let isDuplicate = false;
    const existingMemory = readMemoryFile(targetPath);
    if (existingMemory) {
      // Simple duplicate check by content similarity
      isDuplicate = existingMemory.learnings.some(
        (l) => l.content.toLowerCase().includes(signal.content.toLowerCase().slice(0, 50))
      );
    }

    // Build detection reason
    let detectionReason = '';
    const contentLower = signal.content.toLowerCase();
    if (contentLower.includes("don't") || contentLower.includes('wrong') || contentLower.includes('instead')) {
      detectionReason = 'Correction pattern detected ("don\'t/wrong/instead")';
    } else if (contentLower.includes('always') || contentLower.includes('never')) {
      detectionReason = 'Rule pattern detected ("always/never")';
    } else if (contentLower.includes('perfect') || contentLower.includes('exactly')) {
      detectionReason = 'Strong approval pattern detected';
    } else {
      detectionReason = 'Contextual signal detection';
    }

    // Build skill detection reason
    let skillDetectionReason = '';
    if (detectedSkill) {
      // Check if explicit mention
      if (signal.content.toLowerCase().includes(`${detectedSkill} skill`)) {
        skillDetectionReason = `Explicit skill mention: "${detectedSkill} skill"`;
      } else if (signal.content.toLowerCase().includes(`/sw:${detectedSkill}`)) {
        skillDetectionReason = `Slash command mention: /sw:${detectedSkill}`;
      } else {
        const matchedKeywords = SKILL_KEYWORDS[detectedSkill]?.filter((k) =>
          signal.content.toLowerCase().includes(k)
        );
        skillDetectionReason = matchedKeywords?.length
          ? `Keyword match: ${matchedKeywords.slice(0, 3).join(', ')}`
          : 'Skill name pattern match';
      }
    } else {
      skillDetectionReason = 'No skill detected → Category fallback';
    }

    analyses.push({
      content: signal.content.slice(0, 100) + (signal.content.length > 100 ? '...' : ''),
      detectionReason,
      signalType: signal.type,
      confidence: signal.confidence,
      detectedSkill,
      skillDetectionReason,
      targetPath,
      isDuplicate,
      triggers,
    });
  }

  return analyses;
}

/**
 * Format verbose analysis for console output (GAP-005)
 */
export function formatVerboseAnalysis(analyses: VerboseSignalAnalysis[]): string {
  if (analyses.length === 0) {
    return '  No signals detected in this session.\n  Tip: Make explicit corrections like "No, use X instead of Y"';
  }

  const lines: string[] = [];
  lines.push(`\n  📊 Detected ${analyses.length} signal(s):\n`);

  for (let i = 0; i < analyses.length; i++) {
    const a = analyses[i];
    lines.push(`  ─────────────────────────────────────────`);
    lines.push(`  [${i + 1}] ${a.signalType.toUpperCase()} (${a.confidence} confidence)`);
    lines.push(`      Content: "${a.content}"`);
    lines.push(`      Detection: ${a.detectionReason}`);
    lines.push(`      Skill: ${a.detectedSkill || 'none'} (${a.skillDetectionReason})`);
    lines.push(`      Target: ${a.targetPath}`);
    lines.push(`      Triggers: ${a.triggers.slice(0, 5).join(', ') || 'none'}`);
    lines.push(`      Duplicate: ${a.isDuplicate ? '⚠️ YES (would be skipped)' : '✅ No'}`);
  }

  lines.push(`\n  ─────────────────────────────────────────`);
  const wouldAdd = analyses.filter((a) => !a.isDuplicate).length;
  const wouldSkip = analyses.filter((a) => a.isDuplicate).length;
  lines.push(`  Summary: ${wouldAdd} would be added, ${wouldSkip} would be skipped (duplicates)`);

  return lines.join('\n');
}
