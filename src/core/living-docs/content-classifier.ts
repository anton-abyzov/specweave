/**
 * Content Classifier for Intelligent Living Docs Sync
 *
 * Classifies spec sections into content categories using heuristic rules.
 *
 * @module living-docs/content-classifier
 */

import { ParsedSection } from './content-parser.js';

/**
 * Content categories for classification
 */
export enum ContentCategory {
  UserStory = 'user-story',
  NFR = 'nfr',
  Architecture = 'architecture',
  ADR = 'adr',
  Operations = 'operations',
  Delivery = 'delivery',
  Strategy = 'strategy',
  Governance = 'governance',
  Overview = 'overview',
  Unknown = 'unknown',
}

/**
 * Classification result with confidence score
 */
export interface ClassificationResult {
  category: ContentCategory;
  confidence: number; // 0.0 - 1.0
  reasoning: string[];
  suggestedFilename: string;
  suggestedPath: string;
  metadata?: Record<string, any>;
}

/**
 * Classification rule
 */
interface ClassificationRule {
  category: ContentCategory;
  weight: number; // Contribution to confidence score
  matcher: (section: ParsedSection) => boolean;
  description: string;
}

/**
 * Content Classifier class
 */
export class ContentClassifier {
  private rules: ClassificationRule[];

  constructor() {
    this.rules = this.initializeRules();
  }

  /**
   * Initialize classification rules
   */
  private initializeRules(): ClassificationRule[] {
    return [
      // User Story Rules (High confidence patterns)
      {
        category: ContentCategory.UserStory,
        weight: 0.9,
        matcher: (section) =>
          /^(US|User Story|Story)[-\s]*\d+/i.test(section.heading),
        description: 'Heading starts with US-XXX or User Story XXX',
      },
      {
        category: ContentCategory.UserStory,
        weight: 0.8,
        matcher: (section) =>
          /as a|I want|so that/i.test(section.content),
        description: 'Contains user story format (As a... I want... So that...)',
      },
      {
        category: ContentCategory.UserStory,
        weight: 0.7,
        matcher: (section) =>
          /acceptance criteria|ac-|given.*when.*then/i.test(section.content),
        description: 'Contains acceptance criteria or Given/When/Then',
      },

      // NFR Rules
      {
        category: ContentCategory.NFR,
        weight: 0.9,
        matcher: (section) =>
          /^(NFR|Non-Functional Requirement)[-\s]*\d+/i.test(section.heading),
        description: 'Heading starts with NFR-XXX',
      },
      {
        category: ContentCategory.NFR,
        weight: 0.8,
        matcher: (section) =>
          /performance|latency|throughput|scalability|availability|reliability/i.test(
            section.content
          ),
        description: 'Contains NFR keywords (performance, scalability, etc.)',
      },
      {
        category: ContentCategory.NFR,
        weight: 0.7,
        matcher: (section) =>
          /<\d+\s*(ms|sec|min)|>\d+\s*(req\/s|users|concurrent)/i.test(section.content),
        description: 'Contains quantitative metrics (<30s, >1000 req/s)',
      },

      // Architecture Rules
      {
        category: ContentCategory.Architecture,
        weight: 0.9,
        matcher: (section) =>
          /^(Architecture|System Design|Component Design|Data Model|HLD|LLD)/i.test(
            section.heading
          ),
        description: 'Heading indicates architecture',
      },
      {
        category: ContentCategory.Architecture,
        weight: 0.8,
        matcher: (section) =>
          /component|service|module|class diagram|sequence diagram|entity relationship/i.test(
            section.content
          ),
        description: 'Contains architecture terms',
      },
      {
        category: ContentCategory.Architecture,
        weight: 0.7,
        matcher: (section) =>
          section.codeBlocks.some(
            (block) => block.language === 'mermaid' || block.language === 'plantuml'
          ),
        description: 'Contains diagram code blocks',
      },

      // ADR Rules
      {
        category: ContentCategory.ADR,
        weight: 0.95,
        matcher: (section) =>
          /^ADR[-\s]*\d+/i.test(section.heading),
        description: 'Heading starts with ADR-XXX',
      },
      {
        category: ContentCategory.ADR,
        weight: 0.9,
        matcher: (section) =>
          /^(Decision|Technical Decision|Architecture Decision)/i.test(section.heading) &&
          /context|decision|consequences|alternatives|status/i.test(section.content),
        description: 'Contains ADR structure (context, decision, consequences)',
      },
      {
        category: ContentCategory.ADR,
        weight: 0.7,
        matcher: (section) =>
          /why we chose|alternatives considered|trade-?offs/i.test(section.content),
        description: 'Contains decision rationale keywords',
      },

      // Operations Rules
      {
        category: ContentCategory.Operations,
        weight: 0.9,
        matcher: (section) =>
          /^(Runbook|SLO|SLI|Monitoring|Alerting|Incident|Operations)/i.test(section.heading),
        description: 'Heading indicates operations',
      },
      {
        category: ContentCategory.Operations,
        weight: 0.8,
        matcher: (section) =>
          /incident response|on-?call|escalation|monitoring|alerting|slo|sli/i.test(
            section.content
          ),
        description: 'Contains operations keywords',
      },
      {
        category: ContentCategory.Operations,
        weight: 0.7,
        matcher: (section) =>
          /step \d+|procedure|troubleshooting|diagnostic/i.test(section.content),
        description: 'Contains runbook-style content',
      },

      // Delivery Rules
      {
        category: ContentCategory.Delivery,
        weight: 0.9,
        matcher: (section) =>
          /^(Delivery|Release|Test Strategy|CI\/CD|Roadmap|Branch Strategy)/i.test(
            section.heading
          ),
        description: 'Heading indicates delivery process',
      },
      {
        category: ContentCategory.Delivery,
        weight: 0.8,
        matcher: (section) =>
          /test plan|test strategy|release plan|deployment|pipeline|continuous/i.test(
            section.content
          ),
        description: 'Contains delivery keywords',
      },
      {
        category: ContentCategory.Delivery,
        weight: 0.7,
        matcher: (section) =>
          /git flow|pull request|code review|merge strategy/i.test(section.content),
        description: 'Contains development workflow terms',
      },

      // Strategy Rules
      {
        category: ContentCategory.Strategy,
        weight: 0.9,
        matcher: (section) =>
          /^(Strategy|Vision|Business Case|PRD|Product Requirements|OKR)/i.test(
            section.heading
          ),
        description: 'Heading indicates strategy',
      },
      {
        category: ContentCategory.Strategy,
        weight: 0.8,
        matcher: (section) =>
          /business case|roi|market analysis|stakeholder|product vision/i.test(
            section.content
          ),
        description: 'Contains strategy keywords',
      },
      {
        category: ContentCategory.Strategy,
        weight: 0.7,
        matcher: (section) =>
          /objective|key result|okr|metric|success criteria/i.test(section.content),
        description: 'Contains business metrics and objectives',
      },

      // Governance Rules
      {
        category: ContentCategory.Governance,
        weight: 0.9,
        matcher: (section) =>
          /^(Security|Compliance|Coding Standards|Policy|Governance)/i.test(section.heading),
        description: 'Heading indicates governance',
      },
      {
        category: ContentCategory.Governance,
        weight: 0.8,
        matcher: (section) =>
          /security policy|compliance|gdpr|hipaa|pci-?dss|soc 2/i.test(section.content),
        description: 'Contains compliance keywords',
      },
      {
        category: ContentCategory.Governance,
        weight: 0.7,
        matcher: (section) =>
          /coding standard|style guide|convention|best practice/i.test(section.content),
        description: 'Contains coding standards keywords',
      },

      // Overview Rules (Catch common overview sections)
      {
        category: ContentCategory.Overview,
        weight: 0.8,
        matcher: (section) =>
          /^(Overview|Introduction|Summary|Executive Summary|Quick Overview)/i.test(
            section.heading
          ),
        description: 'Heading indicates overview/introduction',
      },
      {
        category: ContentCategory.Overview,
        weight: 0.6,
        matcher: (section) =>
          section.level === 2 && section.heading.toLowerCase().includes('overview'),
        description: 'Top-level overview section',
      },
    ];
  }

  /**
   * Classify a single section
   */
  classify(section: ParsedSection): ClassificationResult {
    const scores = new Map<ContentCategory, number>();
    const reasoning: string[] = [];

    // Apply all rules and accumulate scores
    for (const rule of this.rules) {
      if (rule.matcher(section)) {
        const currentScore = scores.get(rule.category) || 0;
        scores.set(rule.category, currentScore + rule.weight);
        reasoning.push(`[${rule.category}] ${rule.description}`);
      }
    }

    // Find category with highest score
    let maxScore = 0;
    let bestCategory = ContentCategory.Unknown;

    for (const [category, score] of scores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    // Normalize confidence (cap at 1.0)
    const confidence = Math.min(maxScore, 1.0);

    // Generate suggested filename and path
    const { filename, path } = this.suggestFileLocation(section, bestCategory);

    return {
      category: bestCategory,
      confidence,
      reasoning,
      suggestedFilename: filename,
      suggestedPath: path,
      metadata: {
        heading: section.heading,
        level: section.level,
        contentLength: section.content.length,
        hasCodeBlocks: section.codeBlocks.length > 0,
        hasLinks: section.links.length > 0,
      },
    };
  }

  /**
   * Classify multiple sections
   */
  classifyAll(sections: ParsedSection[]): ClassificationResult[] {
    return sections.map((section) => this.classify(section));
  }

  /**
   * Suggest file location based on category
   */
  private suggestFileLocation(
    section: ParsedSection,
    category: ContentCategory
  ): { filename: string; path: string } {
    const slug = this.slugify(section.heading);

    switch (category) {
      case ContentCategory.UserStory: {
        // Extract US ID if present (e.g., "US-016-001" → "us-016-001")
        const usMatch = section.heading.match(/US[-\s]*(\d+[-\s]*\d+)/i);
        const filename = usMatch
          ? `us-${usMatch[1].replace(/\s+/g, '-')}.md`
          : `us-${slug}.md`;
        return { filename, path: 'specs/{project}' };
      }

      case ContentCategory.NFR: {
        const nfrMatch = section.heading.match(/NFR[-\s]*(\d+[-\s]*\d+)/i);
        const filename = nfrMatch
          ? `nfr-${nfrMatch[1].replace(/\s+/g, '-')}.md`
          : `nfr-${slug}.md`;
        return { filename, path: 'specs/{project}' };
      }

      case ContentCategory.Architecture: {
        const isHLD = /high-?level|hld|system/i.test(section.heading);
        const isLLD = /low-?level|lld|component/i.test(section.heading);
        const prefix = isHLD ? 'hld' : isLLD ? 'lld' : 'design';
        return {
          filename: `${prefix}-${slug}.md`,
          path: 'architecture',
        };
      }

      case ContentCategory.ADR: {
        const adrMatch = section.heading.match(/ADR[-\s]*(\d+)/i);
        const filename = adrMatch
          ? `${adrMatch[1].padStart(4, '0')}-${slug}.md`
          : `adr-${slug}.md`;
        return { filename, path: 'architecture/adr' };
      }

      case ContentCategory.Operations: {
        const isRunbook = /runbook/i.test(section.heading);
        const isSLO = /slo|sli/i.test(section.heading);
        const prefix = isRunbook ? 'runbook' : isSLO ? 'slo' : 'ops';
        return {
          filename: `${prefix}-${slug}.md`,
          path: 'operations',
        };
      }

      case ContentCategory.Delivery: {
        const isRoadmap = /roadmap/i.test(section.heading);
        const isTestStrategy = /test.*strategy/i.test(section.heading);
        const prefix = isRoadmap ? 'roadmap' : isTestStrategy ? 'test-strategy' : 'delivery';
        return {
          filename: `${prefix}-${slug}.md`,
          path: 'delivery',
        };
      }

      case ContentCategory.Strategy: {
        const isPRD = /prd|product.*requirements/i.test(section.heading);
        const prefix = isPRD ? 'prd' : 'strategy';
        return {
          filename: `${prefix}-${slug}.md`,
          path: 'strategy',
        };
      }

      case ContentCategory.Governance: {
        const isSecurity = /security/i.test(section.heading);
        const isCompliance = /compliance/i.test(section.heading);
        const prefix = isSecurity
          ? 'security'
          : isCompliance
          ? 'compliance'
          : 'governance';
        return {
          filename: `${prefix}-${slug}.md`,
          path: 'governance',
        };
      }

      case ContentCategory.Overview: {
        return {
          filename: `overview-${slug}.md`,
          path: 'specs/{project}',
        };
      }

      default: {
        return {
          filename: `${slug}.md`,
          path: 'specs/{project}',
        };
      }
    }
  }

  /**
   * Convert text to URL-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }

  /**
   * Get sections by category
   */
  filterByCategory(
    results: ClassificationResult[],
    category: ContentCategory
  ): ClassificationResult[] {
    return results.filter((r) => r.category === category);
  }

  /**
   * Get sections by minimum confidence
   */
  filterByConfidence(
    results: ClassificationResult[],
    minConfidence: number
  ): ClassificationResult[] {
    return results.filter((r) => r.confidence >= minConfidence);
  }

  /**
   * Get statistics about classifications
   */
  getStatistics(results: ClassificationResult[]): {
    total: number;
    byCategory: Record<ContentCategory, number>;
    averageConfidence: number;
    lowConfidence: number;
  } {
    const stats = {
      total: results.length,
      byCategory: {} as Record<ContentCategory, number>,
      averageConfidence: 0,
      lowConfidence: 0,
    };

    // Count by category
    for (const result of results) {
      stats.byCategory[result.category] = (stats.byCategory[result.category] || 0) + 1;
    }

    // Calculate average confidence
    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    stats.averageConfidence = totalConfidence / results.length;

    // Count low confidence (<0.6)
    stats.lowConfidence = results.filter((r) => r.confidence < 0.6).length;

    return stats;
  }
}

/**
 * Factory function to create classifier
 */
export function createContentClassifier(): ContentClassifier {
  return new ContentClassifier();
}
