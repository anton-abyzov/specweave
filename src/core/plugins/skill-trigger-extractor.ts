/**
 * Skill Trigger Extractor
 *
 * Extracts activation trigger keywords from SKILL.md and AGENT.md files.
 * These triggers enable automatic skill activation based on user prompts.
 *
 * @module core/plugins/skill-trigger-extractor
 * @version 1.0.0
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';

/**
 * Extracted trigger data from a skill or agent
 */
export interface ExtractedTriggers {
  /** Skill or agent name */
  name: string;
  /** Parent plugin name */
  plugin: string;
  /** Type: skill or agent */
  type: 'skill' | 'agent';
  /** Description from frontmatter */
  description: string;
  /** Extracted trigger keywords (normalized) */
  triggers: string[];
  /** Path to the source file */
  path: string;
}

/**
 * Skill triggers index structure
 */
export interface SkillTriggersIndex {
  /** Inverted index: keyword → skill/agent names */
  keywords: Record<string, string[]>;
  /** Skills/agents metadata */
  skills: Record<string, SkillMetadata>;
  /** Generation timestamp */
  generatedAt: string;
  /** Total skill count */
  skillCount: number;
  /** Total keyword count */
  keywordCount: number;
}

/**
 * Metadata for a skill in the index
 */
export interface SkillMetadata {
  /** Parent plugin name */
  plugin: string;
  /** Type: skill or agent */
  type: 'skill' | 'agent';
  /** Trigger keywords */
  triggers: string[];
  /** Short description (first 150 chars) */
  description: string;
  /** Full qualified name for invocation */
  fqn: string;
}

/**
 * SkillTriggerExtractor - Extract activation triggers from plugin skills
 */
export class SkillTriggerExtractor {
  /**
   * Extract triggers from a single SKILL.md or AGENT.md content
   *
   * @param content - File content
   * @param name - Skill/agent name
   * @param plugin - Parent plugin name
   * @param type - 'skill' or 'agent'
   * @param filePath - Path to the file
   * @returns Extracted triggers
   */
  extractFromContent(
    content: string,
    name: string,
    plugin: string,
    type: 'skill' | 'agent',
    filePath: string
  ): ExtractedTriggers {
    const description = this.extractDescription(content);
    const triggers = this.extractTriggerKeywords(content, description);

    return {
      name,
      plugin,
      type,
      description,
      triggers,
      path: filePath
    };
  }

  /**
   * Extract description from YAML frontmatter
   *
   * @param content - File content
   * @returns Description string
   */
  private extractDescription(content: string): string {
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    if (frontmatterMatch) {
      const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
      if (descMatch) {
        return descMatch[1].trim();
      }
    }
    return '';
  }

  /**
   * Extract trigger keywords from content and description
   *
   * Looks for:
   * 1. "Activates for:" sections in description
   * 2. Keywords in YAML frontmatter
   * 3. Technology names and patterns in the description
   *
   * @param content - Full file content
   * @param description - Extracted description
   * @returns Array of normalized trigger keywords
   */
  extractTriggerKeywords(content: string, description: string): string[] {
    const triggers = new Set<string>();

    // 1. Extract from "Activates for:" pattern in description
    const activatesForMatch = description.match(/Activates\s+for[:\s]+(.+?)(?:\.|$)/i);
    if (activatesForMatch) {
      const keywords = this.parseKeywordList(activatesForMatch[1]);
      keywords.forEach(k => triggers.add(k));
    }

    // 2. Extract from "Use when" or "Use this skill when" patterns
    const useWhenMatch = description.match(/Use\s+(?:this\s+skill\s+)?when[:\s]+(.+?)(?:\.|$)/i);
    if (useWhenMatch) {
      const keywords = this.extractTechnologyTerms(useWhenMatch[1]);
      keywords.forEach(k => triggers.add(k));
    }

    // 3. Extract keywords from YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    if (frontmatterMatch) {
      const keywordsMatch = frontmatterMatch[1].match(/keywords:\s*\[([^\]]+)\]/);
      if (keywordsMatch) {
        const keywords = this.parseKeywordList(keywordsMatch[1]);
        keywords.forEach(k => triggers.add(k));
      }
    }

    // 4. Extract technology terms from description
    const techTerms = this.extractTechnologyTerms(description);
    techTerms.forEach(t => triggers.add(t));

    // 5. Look for "When to Use" sections in content
    const whenToUseMatch = content.match(/##\s*When to Use[^\n]*\n([\s\S]+?)(?:\n##|$)/i);
    if (whenToUseMatch) {
      const techTerms = this.extractTechnologyTerms(whenToUseMatch[1]);
      // Only add strong technology terms from this section
      techTerms.filter(t => this.isStrongTechnologyTerm(t)).forEach(t => triggers.add(t));
    }

    return Array.from(triggers).filter(t => t.length >= 2);
  }

  /**
   * Parse a keyword list from comma/or separated string
   *
   * @param text - Keyword list text
   * @returns Array of normalized keywords
   */
  private parseKeywordList(text: string): string[] {
    const keywords: string[] = [];

    // Split by comma, "or", slash, pipe
    const parts = text.split(/[,|\/]|\s+or\s+/gi);

    for (const part of parts) {
      const cleaned = part.trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .toLowerCase();

      if (cleaned.length >= 2 && !this.isStopWord(cleaned)) {
        keywords.push(cleaned);
      }
    }

    return keywords;
  }

  /**
   * Extract technology terms from text
   *
   * @param text - Text to extract from
   * @returns Array of technology terms
   */
  private extractTechnologyTerms(text: string): string[] {
    const terms = new Set<string>();

    // Known technology patterns (case-insensitive)
    const techPatterns = [
      // Cloud Providers
      /\bAWS\b/gi, /\bAzure\b/gi, /\bGCP\b/gi, /\bGoogle Cloud\b/gi,
      // Kubernetes
      /\bKubernetes\b/gi, /\bK8s\b/gi, /\bEKS\b/gi, /\bAKS\b/gi, /\bGKE\b/gi,
      /\bHelm\b/gi, /\bGitOps\b/gi, /\bArgoCD\b/gi, /\bFlux\b/gi, /\bIstio\b/gi,
      // Mobile
      /\bReact Native\b/gi, /\bExpo\b/gi, /\biOS\b/gi, /\bAndroid\b/gi,
      /\bSwift\b/gi, /\bKotlin\b/gi, /\bFlutter\b/gi,
      // Frontend
      /\bReact\b/gi, /\bVue\.?js\b/gi, /\bAngular\b/gi, /\bNext\.?js\b/gi,
      /\bNuxt\b/gi, /\bSvelte\b/gi, /\bTailwind\b/gi, /\bCSS\b/gi,
      // Backend
      /\bNode\.?js\b/gi, /\bExpress\b/gi, /\bNestJS\b/gi, /\bFastify\b/gi,
      /\bDjango\b/gi, /\bFlask\b/gi, /\bFastAPI\b/gi,
      /\bSpring Boot\b/gi, /\b\.NET\b/gi, /\bASP\.NET\b/gi,
      /\bRuby on Rails\b/gi, /\bRails\b/gi, /\bLaravel\b/gi,
      /\bGo\b/gi, /\bGolang\b/gi, /\bRust\b/gi,
      // Databases
      /\bPostgreSQL\b/gi, /\bPostgres\b/gi, /\bMySQL\b/gi, /\bMongoDB\b/gi,
      /\bRedis\b/gi, /\bElasticsearch\b/gi, /\bCassandra\b/gi,
      /\bPrisma\b/gi, /\bTypeORM\b/gi, /\bSequelize\b/gi, /\bMongoose\b/gi,
      // Messaging
      /\bKafka\b/gi, /\bRabbitMQ\b/gi, /\bSQS\b/gi, /\bPubSub\b/gi,
      // DevOps/Infra
      /\bTerraform\b/gi, /\bDocker\b/gi, /\bCI\/CD\b/gi,
      /\bGitHub Actions\b/gi, /\bJenkins\b/gi, /\bGitLab CI\b/gi,
      /\bPrometheus\b/gi, /\bGrafana\b/gi, /\bDatadog\b/gi,
      // Testing
      /\bPlaywright\b/gi, /\bCypress\b/gi, /\bJest\b/gi, /\bVitest\b/gi,
      /\bSelenium\b/gi, /\bE2E\b/gi, /\bTDD\b/gi, /\bBDD\b/gi,
      // Security
      /\bOWASP\b/gi, /\bJWT\b/gi, /\bOAuth\b/gi, /\bSSL\b/gi, /\bTLS\b/gi,
      /\bCORS\b/gi, /\bCSRF\b/gi, /\bXSS\b/gi,
      // ML/AI
      /\bTensorFlow\b/gi, /\bPyTorch\b/gi, /\bMLflow\b/gi,
      /\bScikit-learn\b/gi, /\bPandas\b/gi, /\bNumPy\b/gi,
      // API
      /\bREST API\b/gi, /\bGraphQL\b/gi, /\btRPC\b/gi, /\bgRPC\b/gi,
      /\bOpenAPI\b/gi, /\bSwagger\b/gi,
      // Payments
      /\bStripe\b/gi, /\bPayPal\b/gi, /\bPCI\b/gi,
      // General
      /\bTypeScript\b/gi, /\bJavaScript\b/gi, /\bPython\b/gi, /\bJava\b/gi,
      /\bC#\b/gi, /\bRuby\b/gi, /\bPHP\b/gi
    ];

    for (const pattern of techPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => terms.add(m.toLowerCase().trim()));
      }
    }

    return Array.from(terms);
  }

  /**
   * Check if a term is a strong technology term (not generic)
   *
   * @param term - Term to check
   * @returns True if strong technology term
   */
  private isStrongTechnologyTerm(term: string): boolean {
    const strongTerms = new Set([
      'kubernetes', 'k8s', 'eks', 'aks', 'gke', 'helm', 'gitops', 'argocd',
      'react native', 'expo', 'ios', 'android', 'flutter',
      'react', 'vue', 'angular', 'next.js', 'nextjs', 'nuxt', 'svelte',
      'node.js', 'nodejs', 'express', 'nestjs', 'fastify',
      'django', 'flask', 'fastapi', 'spring boot', '.net', 'asp.net',
      'postgresql', 'postgres', 'mysql', 'mongodb', 'redis',
      'prisma', 'typeorm', 'sequelize', 'mongoose',
      'kafka', 'rabbitmq', 'terraform', 'docker',
      'playwright', 'cypress', 'jest', 'vitest',
      'stripe', 'paypal', 'owasp', 'jwt', 'oauth',
      'tensorflow', 'pytorch', 'mlflow',
      'graphql', 'trpc', 'grpc', 'openapi'
    ]);
    return strongTerms.has(term.toLowerCase());
  }

  /**
   * Check if word is a stop word (common words to ignore)
   *
   * @param word - Word to check
   * @returns True if stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
      'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
      'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
      'just', 'use', 'using', 'used', 'create', 'creating', 'created',
      'build', 'building', 'built', 'implement', 'implementing',
      'help', 'helps', 'helping', 'want', 'wants', 'wanted', 'need', 'needs'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Scan all plugins and extract triggers
   *
   * @param pluginsDir - Path to plugins directory
   * @returns Array of extracted triggers
   */
  async scanAllPlugins(pluginsDir: string): Promise<ExtractedTriggers[]> {
    const allTriggers: ExtractedTriggers[] = [];

    // Get all plugin directories
    if (!(await fs.pathExists(pluginsDir))) {
      return allTriggers;
    }

    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pluginPath = path.join(pluginsDir, entry.name);
      const pluginName = entry.name;

      // Scan skills
      const skillsDir = path.join(pluginPath, 'skills');
      if (await fs.pathExists(skillsDir)) {
        const skillEntries = await fs.readdir(skillsDir, { withFileTypes: true });
        for (const skillEntry of skillEntries) {
          if (!skillEntry.isDirectory()) continue;

          const skillPath = path.join(skillsDir, skillEntry.name, 'SKILL.md');
          if (await fs.pathExists(skillPath)) {
            const content = await fs.readFile(skillPath, 'utf-8');
            const triggers = this.extractFromContent(
              content,
              skillEntry.name,
              pluginName,
              'skill',
              skillPath
            );
            allTriggers.push(triggers);
          }
        }
      }

      // Scan agents
      const agentsDir = path.join(pluginPath, 'agents');
      if (await fs.pathExists(agentsDir)) {
        const agentEntries = await fs.readdir(agentsDir, { withFileTypes: true });
        for (const agentEntry of agentEntries) {
          if (!agentEntry.isDirectory()) continue;

          const agentPath = path.join(agentsDir, agentEntry.name, 'AGENT.md');
          if (await fs.pathExists(agentPath)) {
            const content = await fs.readFile(agentPath, 'utf-8');
            const triggers = this.extractFromContent(
              content,
              agentEntry.name,
              pluginName,
              'agent',
              agentPath
            );
            allTriggers.push(triggers);
          }
        }
      }
    }

    return allTriggers;
  }

  /**
   * Build the skill triggers index from extracted triggers
   *
   * @param triggers - Array of extracted triggers
   * @returns Skill triggers index
   */
  buildIndex(triggers: ExtractedTriggers[]): SkillTriggersIndex {
    const keywords: Record<string, string[]> = {};
    const skills: Record<string, SkillMetadata> = {};

    for (const trigger of triggers) {
      // Full qualified name: plugin:type:name
      const fqn = `${trigger.plugin}:${trigger.name}`;

      // Add to skills metadata
      skills[fqn] = {
        plugin: trigger.plugin,
        type: trigger.type,
        triggers: trigger.triggers,
        description: trigger.description.substring(0, 150),
        fqn
      };

      // Build inverted index
      for (const keyword of trigger.triggers) {
        if (!keywords[keyword]) {
          keywords[keyword] = [];
        }
        if (!keywords[keyword].includes(fqn)) {
          keywords[keyword].push(fqn);
        }
      }
    }

    return {
      keywords,
      skills,
      generatedAt: new Date().toISOString(),
      skillCount: Object.keys(skills).length,
      keywordCount: Object.keys(keywords).length
    };
  }

  /**
   * Match a user prompt against the trigger index
   *
   * @param prompt - User prompt
   * @param index - Skill triggers index
   * @returns Array of matched skill FQNs sorted by relevance
   */
  matchPrompt(prompt: string, index: SkillTriggersIndex): Array<{ fqn: string; score: number; matchedKeywords: string[] }> {
    const matches: Map<string, { score: number; keywords: string[] }> = new Map();

    // Normalize prompt
    const normalizedPrompt = prompt.toLowerCase();

    // Check each keyword
    for (const [keyword, skillFqns] of Object.entries(index.keywords)) {
      // Check if keyword appears in prompt
      if (normalizedPrompt.includes(keyword)) {
        for (const fqn of skillFqns) {
          const existing = matches.get(fqn) || { score: 0, keywords: [] };
          existing.score += keyword.length; // Longer keywords = higher score
          existing.keywords.push(keyword);
          matches.set(fqn, existing);
        }
      }
    }

    // Convert to array and sort by score
    return Array.from(matches.entries())
      .map(([fqn, data]) => ({
        fqn,
        score: data.score,
        matchedKeywords: data.keywords
      }))
      .sort((a, b) => b.score - a.score);
  }
}
