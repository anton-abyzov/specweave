/**
 * Agent Spawner
 *
 * Creates and manages Task tool invocations for parallel agents.
 * Each agent runs in its own worktree with a specialized subagent type.
 */

import type {
  AgentDomain,
  ParallelAgent,
  ParallelConfig,
  WorktreeInfo,
  DOMAIN_SUBAGENT_MAP,
} from '../types.js';
import { generateId, timestamp } from './platform-utils.js';

/**
 * Task spawn request (compatible with Task tool)
 */
export interface TaskSpawnRequest {
  subagent_type: string;
  prompt: string;
  description: string;
  run_in_background?: boolean;
  model?: 'sonnet' | 'opus' | 'haiku';
}

/**
 * Agent spawn context
 */
export interface AgentContext {
  incrementId: string;
  worktree: WorktreeInfo;
  taskIds: string[];
  taskDescriptions?: string[];
  config: ParallelConfig;
}

/**
 * Spawn result
 */
export interface AgentSpawnResult {
  agent: ParallelAgent;
  taskRequest: TaskSpawnRequest;
}

/**
 * Domain to subagent type mapping
 */
const SUBAGENT_MAP: Record<AgentDomain, string> = {
  frontend: 'sw-frontend:frontend-architect',
  backend: 'sw-backend:database-optimizer',
  database: 'sw-backend:database-optimizer',
  devops: 'sw-infra:devops',
  qa: 'sw-testing:qa-engineer',
  general: 'general-purpose',
};

/**
 * Skill entry for domain skill mapping
 */
export interface DomainSkill {
  name: string;
  description: string;
}

/**
 * Domain to available skills mapping.
 *
 * Maps each agent domain to the SpecWeave skills it should invoke.
 * These are injected into agent prompts so subagents know which
 * skills are available via the Skill tool.
 *
 * Source of truth: team-lead SKILL.md § Domain-to-Skill Mapping
 */
const DOMAIN_SKILLS: Record<AgentDomain, DomainSkill[]> = {
  frontend: [
    { name: 'sw-frontend:frontend-architect', description: 'Frontend architecture, component design, state management' },
    { name: 'sw-frontend:frontend-design', description: 'Production-ready UI polish, animations, responsive design' },
    { name: 'sw-frontend:nextjs', description: 'Next.js App Router, Server Components, SSR/SSG' },
  ],
  backend: [
    { name: 'sw:architect', description: 'System architecture, API design, technical decisions' },
    { name: 'sw-backend:nodejs-backend', description: 'Node.js/TypeScript APIs with Express, Fastify, NestJS, Hono' },
    { name: 'sw-backend:python-backend', description: 'Python APIs with FastAPI, Django, Flask' },
  ],
  database: [
    { name: 'sw:architect', description: 'Schema design, data modeling, architectural decisions' },
    { name: 'sw-backend:database-optimizer', description: 'Query optimization, indexing, performance tuning' },
  ],
  devops: [
    { name: 'sw-infra:devops', description: 'CI/CD, Docker, infrastructure automation' },
  ],
  qa: [
    { name: 'sw-testing:qa-engineer', description: 'Test strategy, QA planning, automation frameworks' },
    { name: 'sw-testing:unit-testing', description: 'Vitest/Jest unit tests, mocking, TDD patterns' },
    { name: 'sw-testing:e2e-testing', description: 'Playwright/Cypress E2E tests, visual regression' },
  ],
  general: [
    { name: 'sw:architect', description: 'System architecture and technical decisions' },
    { name: 'sw:tech-lead', description: 'Code quality, design patterns, implementation guidance' },
  ],
};

/**
 * Agent Spawner for creating parallel agent Task invocations.
 */
export class AgentSpawner {
  /**
   * Create a spawn request for an agent
   */
  spawn(domain: AgentDomain, context: AgentContext): AgentSpawnResult {
    const agentId = generateId(`agent-${domain}`);
    const subagentType = this.selectSubagentType(domain);

    const agent: ParallelAgent = {
      id: agentId,
      domain,
      status: 'pending',
      worktree: context.worktree,
      taskIds: context.taskIds,
      progress: { completed: 0, total: context.taskIds.length },
      subagentType,
    };

    const prompt = this.buildAgentPrompt(domain, context);
    const description = this.buildDescription(domain, context.incrementId);

    const taskRequest: TaskSpawnRequest = {
      subagent_type: subagentType,
      prompt,
      description,
      run_in_background: true,
      model: this.selectModel(domain),
    };

    return { agent, taskRequest };
  }

  /**
   * Select the appropriate subagent type for a domain
   */
  selectSubagentType(domain: AgentDomain): string {
    return SUBAGENT_MAP[domain] || SUBAGENT_MAP.general;
  }

  /**
   * Select the appropriate model for a domain
   */
  selectModel(domain: AgentDomain): 'sonnet' | 'opus' | 'haiku' {
    // Use opus for all domains - highest quality model
    switch (domain) {
      case 'frontend':
      case 'backend':
        return 'opus';
      case 'database':
        return 'opus';
      case 'devops':
        return 'opus';
      case 'qa':
        return 'opus';
      case 'general':
      default:
        return 'opus';
    }
  }

  /**
   * Build the prompt for an agent
   */
  buildAgentPrompt(domain: AgentDomain, context: AgentContext): string {
    const { incrementId, worktree, taskIds, taskDescriptions, config } = context;

    const parts: string[] = [];

    // Header
    parts.push(`# Parallel Agent: ${domain.toUpperCase()}`);
    parts.push('');
    parts.push(`You are a specialized ${domain} agent working on increment ${incrementId}.`);
    parts.push('');

    // Worktree context
    parts.push('## Working Directory');
    parts.push(`You are working in a git worktree at: ${worktree.path}`);
    parts.push(`Branch: ${worktree.branch}`);
    parts.push('');
    parts.push('**IMPORTANT**: All file operations must be relative to this worktree path.');
    parts.push('');

    // Tasks
    parts.push('## Assigned Tasks');
    parts.push('Complete the following tasks in order:');
    parts.push('');
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const desc = taskDescriptions?.[i] || `Complete task ${taskId}`;
      parts.push(`${i + 1}. **${taskId}**: ${desc}`);
    }
    parts.push('');

    // Domain-specific instructions
    parts.push('## Domain-Specific Guidelines');
    parts.push(this.getDomainGuidelines(domain));
    parts.push('');

    // Skills available for this domain
    const skillsSection = this.buildSkillsSection(domain);
    if (skillsSection) {
      parts.push(skillsSection);
      parts.push('');
    }

    // Completion instructions
    parts.push('## Completion Requirements');
    parts.push('1. Complete each task and mark it as done in tasks.md');
    parts.push('2. Ensure all changes compile/build without errors');
    parts.push('3. Write tests for new code (target 90%+ coverage)');
    parts.push('4. Commit your changes with descriptive messages');
    parts.push('');

    // Merge strategy context
    if (config.mergeStrategy === 'auto') {
      parts.push(
        '**Note**: Your changes will be automatically merged when complete.'
      );
    } else if (config.mergeStrategy === 'pr') {
      parts.push(
        '**Note**: A pull request will be created for your changes when complete.'
      );
    }

    return parts.join('\n');
  }

  /**
   * Get the available skills for a domain
   */
  getSkillsForDomain(domain: AgentDomain): DomainSkill[] {
    return DOMAIN_SKILLS[domain] || DOMAIN_SKILLS.general;
  }

  /**
   * Build the skills section for an agent prompt
   */
  buildSkillsSection(domain: AgentDomain): string {
    const skills = this.getSkillsForDomain(domain);
    if (skills.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('## Skills Available');
    lines.push('');
    lines.push(
      'You have access to these specialized skills. Invoke them via the Skill tool for domain expertise:'
    );
    lines.push('');
    for (const skill of skills) {
      lines.push(`  Skill({ skill: "${skill.name}" })  — ${skill.description}`);
    }

    return lines.join('\n');
  }

  /**
   * Get domain-specific guidelines
   */
  getDomainGuidelines(domain: AgentDomain): string {
    switch (domain) {
      case 'frontend':
        return `
- Focus on UI/UX and component architecture
- Use appropriate styling (Tailwind, CSS modules, etc.)
- Ensure responsive design and accessibility
- Follow component composition patterns
- Add appropriate loading and error states
`.trim();

      case 'backend':
        return `
- Design clean API interfaces
- Implement proper error handling
- Add input validation and sanitization
- Follow RESTful or GraphQL conventions
- Consider security best practices
`.trim();

      case 'database':
        return `
- Design efficient schema structures
- Create proper migrations
- Add appropriate indexes
- Consider data integrity constraints
- Document relationships and schemas
`.trim();

      case 'devops':
        return `
- Follow infrastructure-as-code principles
- Ensure idempotent operations
- Add proper logging and monitoring
- Consider security and secrets management
- Document deployment procedures
`.trim();

      case 'qa':
        return `
- Write comprehensive test cases
- Cover happy paths and edge cases
- Use appropriate mocking strategies
- Ensure tests are deterministic
- Target high coverage for critical paths
`.trim();

      case 'general':
      default:
        return `
- Follow project conventions
- Write clean, maintainable code
- Add appropriate documentation
- Consider edge cases
`.trim();
    }
  }

  /**
   * Build a short description for the task
   */
  buildDescription(domain: AgentDomain, incrementId: string): string {
    return `${domain} agent for ${incrementId}`;
  }

  /**
   * Create multiple spawn requests for domains
   */
  spawnMultiple(
    domains: AgentDomain[],
    contexts: Map<AgentDomain, AgentContext>
  ): AgentSpawnResult[] {
    const results: AgentSpawnResult[] = [];

    for (const domain of domains) {
      const context = contexts.get(domain);
      if (context) {
        results.push(this.spawn(domain, context));
      }
    }

    return results;
  }

  /**
   * Get subagent map (for external access)
   */
  getSubagentMap(): Record<AgentDomain, string> {
    return { ...SUBAGENT_MAP };
  }

  /**
   * Check if a domain is supported
   */
  isDomainSupported(domain: string): domain is AgentDomain {
    return domain in SUBAGENT_MAP;
  }
}
