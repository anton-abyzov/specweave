/**
 * Label Detector
 *
 * Detects increment type and applies appropriate labels for external tools.
 * Supports GitHub labels, Jira labels, and ADO tags.
 *
 * @author SpecWeave Team
 * @version 1.0.0
 */

export type IncrementType = 'bug' | 'feature' | 'docs' | 'hotfix' | 'refactor' | 'chore' | 'experiment';

export interface LabelConfig {
  bug: string;
  feature: string;
  docs: string;
  hotfix?: string;
  refactor?: string;
  chore?: string;
  experiment?: string;
}

export interface DetectionResult {
  type: IncrementType;
  confidence: number;  // 0-100
  labels: string[];
  detectionMethod: 'frontmatter' | 'title' | 'content' | 'filename';
}

const DEFAULT_GITHUB_LABELS: LabelConfig = {
  bug: 'bug',
  feature: 'enhancement',
  docs: 'documentation',
  hotfix: 'hotfix',
  refactor: 'refactor',
  chore: 'chore',
  experiment: 'experiment'
};

const DEFAULT_USER_LABELS: LabelConfig = {
  bug: '[Bug]',
  feature: '[Feature]',
  docs: '[Docs]',
  hotfix: '[Hotfix]',
  refactor: '[Refactor]',
  chore: '[Chore]',
  experiment: '[Experiment]'
};

export class LabelDetector {
  private labelConfig: LabelConfig;

  constructor(labelConfig?: Partial<LabelConfig>, useUserFormat: boolean = true) {
    const defaults = useUserFormat ? DEFAULT_USER_LABELS : DEFAULT_GITHUB_LABELS;
    this.labelConfig = { ...defaults, ...labelConfig };
  }

  /**
   * Detect increment type from spec content
   */
  detectType(specContent: string, incrementId?: string): DetectionResult {
    // Try detection methods in order of confidence
    const methods = [
      () => this.detectFromFrontmatter(specContent),
      () => this.detectFromTitle(specContent),
      () => this.detectFromFilename(incrementId),
      () => this.detectFromContent(specContent)
    ];

    for (const method of methods) {
      const result = method();
      if (result && result.confidence >= 70) {
        return result;
      }
    }

    // Fallback: default to feature with low confidence
    return {
      type: 'feature',
      confidence: 30,
      labels: [this.labelConfig.feature],
      detectionMethod: 'content'
    };
  }

  /**
   * Detect from YAML frontmatter (type: bug, type: feature, etc.)
   */
  private detectFromFrontmatter(content: string): DetectionResult | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];

    // Look for "type: bug" or "type: feature"
    const typeMatch = frontmatter.match(/^type:\s*(.+)$/m);
    if (!typeMatch) return null;

    const type = typeMatch[1].trim().toLowerCase() as IncrementType;
    const label = this.labelConfig[type];

    if (!label) return null;

    return {
      type,
      confidence: 100,
      labels: [label],
      detectionMethod: 'frontmatter'
    };
  }

  /**
   * Detect from title/heading (# Fix: Bug Title, # Feature: New Feature, etc.)
   */
  private detectFromTitle(content: string): DetectionResult | null {
    const titleMatch = content.match(/^#\s+(?:Increment\s+\d+:\s+)?(.+)$/m);
    if (!titleMatch) return null;

    const title = titleMatch[1].toLowerCase();

    // Check for explicit markers
    const markers = {
      bug: ['fix:', 'bug:', 'bugfix:', 'hotfix:'],
      feature: ['feature:', 'feat:', 'add:', 'implement:'],
      docs: ['docs:', 'doc:', 'documentation:'],
      hotfix: ['hotfix:', 'emergency:', 'critical:'],
      refactor: ['refactor:', 'refactoring:', 'cleanup:'],
      chore: ['chore:', 'maintenance:']
    };

    for (const [type, patterns] of Object.entries(markers)) {
      if (patterns.some(p => title.startsWith(p))) {
        return {
          type: type as IncrementType,
          confidence: 90,
          labels: [this.labelConfig[type as IncrementType]],
          detectionMethod: 'title'
        };
      }
    }

    return null;
  }

  /**
   * Detect from increment filename (0001-bugfix-auth, 0002-feature-dashboard, etc.)
   */
  private detectFromFilename(incrementId?: string): DetectionResult | null {
    if (!incrementId) return null;

    const filename = incrementId.toLowerCase();

    const patterns = {
      bug: /\b(bug|bugfix|fix)\b/,
      feature: /\b(feature|feat)\b/,
      docs: /\b(docs?|documentation)\b/,
      hotfix: /\b(hotfix|emergency)\b/,
      refactor: /\b(refactor|cleanup)\b/,
      chore: /\b(chore|maintenance)\b/,
      experiment: /\b(experiment|poc|spike)\b/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(filename)) {
        return {
          type: type as IncrementType,
          confidence: 80,
          labels: [this.labelConfig[type as IncrementType]],
          detectionMethod: 'filename'
        };
      }
    }

    return null;
  }

  /**
   * Detect from content keywords
   */
  private detectFromContent(content: string): DetectionResult | null {
    const lower = content.toLowerCase();

    // Bug indicators
    const bugKeywords = ['error', 'crash', 'issue', 'problem', 'broken', 'not working'];
    const bugCount = bugKeywords.filter(k => lower.includes(k)).length;

    // Feature indicators
    const featureKeywords = ['implement', 'add', 'create', 'new feature', 'enhancement'];
    const featureCount = featureKeywords.filter(k => lower.includes(k)).length;

    // Docs indicators
    const docsKeywords = ['documentation', 'readme', 'guide', 'tutorial', 'docs'];
    const docsCount = docsKeywords.filter(k => lower.includes(k)).length;

    // Determine type by keyword frequency
    const max = Math.max(bugCount, featureCount, docsCount);

    if (max === 0) return null;

    let type: IncrementType;
    let confidence: number;

    if (bugCount === max) {
      type = 'bug';
      confidence = Math.min(50 + bugCount * 10, 100);
    } else if (featureCount === max) {
      type = 'feature';
      confidence = Math.min(50 + featureCount * 10, 100);
    } else {
      type = 'docs';
      confidence = Math.min(50 + docsCount * 10, 100);
    }

    return {
      type,
      confidence,
      labels: [this.labelConfig[type]],
      detectionMethod: 'content'
    };
  }

  /**
   * Get labels for GitHub (standard format)
   */
  getGitHubLabels(type: IncrementType): string[] {
    const githubLabels: LabelConfig = {
      bug: 'bug',
      feature: 'enhancement',
      docs: 'documentation',
      hotfix: 'hotfix',
      refactor: 'refactor',
      chore: 'chore',
      experiment: 'experiment'
    };

    return [githubLabels[type]];
  }

  /**
   * Get labels for Jira (supports labels)
   */
  getJiraLabels(type: IncrementType): string[] {
    return [type];  // Jira labels are just lowercase type names
  }

  /**
   * Get tags for Azure DevOps (supports tags)
   */
  getAdoTags(type: IncrementType): string[] {
    return [type];  // ADO tags are also lowercase type names
  }

  /**
   * Get user-friendly labels (with brackets: [Bug], [Feature], etc.)
   */
  getUserLabels(type: IncrementType): string[] {
    return [this.labelConfig[type]];
  }
}
