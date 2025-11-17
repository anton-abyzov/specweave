/**
 * Serverless Cost Savings Calculator
 *
 * Calculates potential monthly cost savings by using serverless
 * alternatives instead of traditional infrastructure.
 *
 * **Savings Categories**:
 * - Auth → AWS Cognito/Auth0: $185/month
 * - File uploads → S3 + Lambda: $480/month
 * - Image processing → Lambda/Cloudinary: $490/month
 * - Email → SendGrid/SES: $85/month
 * - Background jobs → Lambda: $280/month
 * - **Total Potential: $1,520/month**
 */

/**
 * Serverless alternative for a specific use case
 */
export interface ServerlessOption {
  /** Use case name (e.g., "Authentication", "File Uploads") */
  useCase: string;

  /** Traditional infrastructure cost per month */
  traditionalCost: number;

  /** Serverless solution cost per month */
  serverlessCost: number;

  /** Monthly savings (traditionalCost - serverlessCost) */
  savings: number;

  /** Recommended serverless service */
  service: string;

  /** Alternative serverless services */
  alternatives?: string[];

  /** Trade-offs to consider */
  tradeoffs: string[];

  /** When to use serverless for this use case */
  recommendedWhen: string[];

  /** When NOT to use serverless for this use case */
  notRecommendedWhen: string[];
}

/**
 * Complete serverless savings analysis
 */
export interface ServerlessSavingsAnalysis {
  /** Total potential monthly savings */
  totalSavings: number;

  /** Breakdown by use case */
  breakdown: ServerlessOption[];

  /** Overall recommendation (serverless vs traditional) */
  recommendation: 'serverless' | 'traditional' | 'hybrid';

  /** Rationale for recommendation */
  rationale: string;

  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Database of serverless cost savings by use case
 */
const SERVERLESS_SAVINGS_DATABASE: ServerlessOption[] = [
  {
    useCase: 'Authentication',
    traditionalCost: 250, // EC2 t3.small ($17/month) + load balancer ($23/month) + dev time ($210/month maintenance)
    serverlessCost: 65, // AWS Cognito free tier → $55/month at 10K users + minimal dev time
    savings: 185,
    service: 'AWS Cognito',
    alternatives: ['Auth0', 'Firebase Auth', 'Supabase Auth'],
    tradeoffs: [
      'Limited customization vs full control',
      'Vendor lock-in vs self-hosted',
      'Instant scale vs manual scaling',
      'AWS-specific vs multi-cloud'
    ],
    recommendedWhen: [
      'Standard OAuth/SAML requirements',
      'User count < 100K (free tier optimized)',
      'Want zero ops burden',
      'Need instant global scale'
    ],
    notRecommendedWhen: [
      'Highly custom auth flows',
      'On-premise requirements',
      'Non-AWS infrastructure',
      'Need full audit trail control'
    ]
  },
  {
    useCase: 'File Uploads',
    traditionalCost: 650, // EC2 t3.medium ($34/month) + EBS 500GB ($50/month) + bandwidth ($100/month) + dev time ($466/month)
    serverlessCost: 170, // S3 500GB ($11.5/month) + Lambda processing ($45/month) + bandwidth ($100/month) + minimal dev time ($13/month)
    savings: 480,
    service: 'S3 + Lambda',
    alternatives: ['Cloudflare R2 + Workers', 'Azure Blob + Functions', 'GCP Cloud Storage + Cloud Functions'],
    tradeoffs: [
      'Pay-per-use vs fixed cost',
      'Automatic scaling vs manual capacity planning',
      'Cold start latency vs always-on',
      'Function timeout limits (15 min Lambda) vs unlimited processing'
    ],
    recommendedWhen: [
      'Sporadic upload patterns',
      'Need global CDN',
      'Variable file sizes',
      'Want automatic backup/versioning'
    ],
    notRecommendedWhen: [
      'Constant high-volume uploads',
      'Processing > 15 minutes per file',
      'Need file system access patterns',
      'On-premise storage requirements'
    ]
  },
  {
    useCase: 'Image Processing',
    traditionalCost: 800, // EC2 c5.large for ImageMagick ($70/month) + EBS ($30/month) + dev time ($700/month)
    serverlessCost: 310, // Lambda with sharp.js ($120/month at scale) + S3 storage ($20/month) + Cloudinary transformations ($170/month) + minimal dev time
    savings: 490,
    service: 'Lambda + Cloudinary',
    alternatives: ['Imgix', 'Cloudflare Images', 'AWS Lambda + sharp.js only', 'Vercel Image Optimization'],
    tradeoffs: [
      'Per-transformation cost vs fixed infrastructure',
      'Automatic optimization vs manual tuning',
      'CDN-integrated vs separate CDN setup',
      'Limited processing time vs unlimited'
    ],
    recommendedWhen: [
      'On-demand image transformations',
      'Need responsive images (multiple sizes)',
      'Want automatic format optimization (WebP, AVIF)',
      'Global user base (CDN benefit)'
    ],
    notRecommendedWhen: [
      'Batch processing millions of images',
      'Custom processing algorithms',
      'Processing time > 15 minutes',
      'Need specific ImageMagick features'
    ]
  },
  {
    useCase: 'Email Sending',
    traditionalCost: 175, // EC2 t3.micro ($9/month) + Postfix setup + IP warming + dev time ($150/month) + deliverability monitoring ($16/month)
    serverlessCost: 90, // SendGrid free tier → $20/month at 10K emails + SES backup ($5/month) + minimal dev time ($65/month)
    savings: 85,
    service: 'SendGrid / AWS SES',
    alternatives: ['Mailgun', 'Postmark', 'Resend', 'Brevo (formerly Sendinblue)'],
    tradeoffs: [
      'Pay-per-email vs fixed cost',
      'Managed deliverability vs DIY IP warming',
      'Email templates vs custom SMTP',
      'Analytics included vs separate tracking'
    ],
    recommendedWhen: [
      'Transactional emails (< 100K/month)',
      'Want high deliverability out-of-box',
      'Need email analytics',
      'Don\'t want to manage SMTP servers'
    ],
    notRecommendedWhen: [
      'Sending millions of emails monthly',
      'Need full SMTP control',
      'On-premise email requirements',
      'Highly sensitive email content (compliance)'
    ]
  },
  {
    useCase: 'Background Jobs',
    traditionalCost: 500, // EC2 t3.medium for queue workers ($34/month) + Redis ($50/month) + monitoring ($50/month) + dev time ($366/month)
    serverlessCost: 220, // Lambda executions ($80/month at 1M jobs) + SQS ($10/month) + CloudWatch ($30/month) + minimal dev time ($100/month)
    savings: 280,
    service: 'AWS Lambda + SQS',
    alternatives: ['Azure Functions + Queue Storage', 'GCP Cloud Functions + Pub/Sub', 'Cloudflare Workers + Queues'],
    tradeoffs: [
      'Per-invocation cost vs always-on workers',
      '15-minute timeout vs unlimited job duration',
      'Automatic scaling vs manual worker pools',
      'Cold start delay vs instant execution'
    ],
    recommendedWhen: [
      'Sporadic job patterns',
      'Jobs complete in < 15 minutes',
      'Want automatic scaling',
      'Need retry logic out-of-box'
    ],
    notRecommendedWhen: [
      'Long-running jobs (> 15 min)',
      'Constant high-frequency jobs',
      'Need stateful workers',
      'Complex job dependencies'
    ]
  }
];

/**
 * Serverless Savings Calculator
 *
 * Analyzes which services can benefit from serverless and calculates savings.
 */
export class ServerlessSavingsCalculator {
  /**
   * Calculate potential serverless savings for a project
   *
   * @param useCases - Array of use cases detected in project (e.g., ["auth", "file-uploads"])
   * @returns Complete savings analysis with recommendations
   *
   * @example
   * ```typescript
   * const calculator = new ServerlessSavingsCalculator();
   * const analysis = calculator.calculateSavings(['auth', 'file-uploads', 'email']);
   * console.log(analysis.totalSavings); // 750
   * console.log(analysis.recommendation); // 'serverless'
   * ```
   */
  calculateSavings(useCases: string[]): ServerlessSavingsAnalysis {
    // Normalize use cases to match database keys
    const normalizedUseCases = useCases.map(uc => this.normalizeUseCase(uc));

    // Filter database to matching use cases
    const applicableOptions = SERVERLESS_SAVINGS_DATABASE.filter(option =>
      normalizedUseCases.some(uc => this.matchesUseCase(uc, option.useCase))
    );

    // Calculate total savings
    const totalSavings = applicableOptions.reduce((sum, option) => sum + option.savings, 0);

    // Determine recommendation
    const { recommendation, rationale, confidence } = this.determineRecommendation(
      applicableOptions,
      totalSavings
    );

    return {
      totalSavings,
      breakdown: applicableOptions,
      recommendation,
      rationale,
      confidence
    };
  }

  /**
   * Get all available serverless options
   *
   * @returns Complete database of serverless savings options
   */
  getAllOptions(): ServerlessOption[] {
    return [...SERVERLESS_SAVINGS_DATABASE];
  }

  /**
   * Get serverless option by use case
   *
   * @param useCase - Use case name
   * @returns Serverless option or undefined if not found
   */
  getOption(useCase: string): ServerlessOption | undefined {
    const normalized = this.normalizeUseCase(useCase);
    return SERVERLESS_SAVINGS_DATABASE.find(option =>
      this.matchesUseCase(normalized, option.useCase)
    );
  }

  /**
   * Calculate savings for specific use case
   *
   * @param useCase - Use case name
   * @returns Savings amount or 0 if not found
   */
  getSavings(useCase: string): number {
    const option = this.getOption(useCase);
    return option?.savings ?? 0;
  }

  /**
   * Normalize use case name for matching
   *
   * @param useCase - Raw use case string
   * @returns Normalized use case
   *
   * @example
   * normalizeUseCase("file upload") → "file-uploads"
   * normalizeUseCase("AUTH") → "authentication"
   */
  private normalizeUseCase(useCase: string): string {
    const normalized = useCase.toLowerCase().trim().replace(/\s+/g, '-');

    // Map common variations to standard names
    const mappings: Record<string, string> = {
      'auth': 'authentication',
      'login': 'authentication',
      'user-auth': 'authentication',
      'file-upload': 'file-uploads',
      'files': 'file-uploads',
      'storage': 'file-uploads',
      'images': 'image-processing',
      'image-transform': 'image-processing',
      'image-resize': 'image-processing',
      'email': 'email-sending',
      'emails': 'email-sending',
      'notifications': 'email-sending',
      'jobs': 'background-jobs',
      'queue': 'background-jobs',
      'workers': 'background-jobs',
      'tasks': 'background-jobs'
    };

    return mappings[normalized] || normalized;
  }

  /**
   * Check if normalized use case matches database use case
   *
   * @param normalized - Normalized use case from user input
   * @param dbUseCase - Use case from database
   * @returns True if match
   */
  private matchesUseCase(normalized: string, dbUseCase: string): boolean {
    const dbNormalized = dbUseCase.toLowerCase().replace(/\s+/g, '-');
    return normalized === dbNormalized;
  }

  /**
   * Determine serverless recommendation based on savings
   *
   * @param options - Applicable serverless options
   * @param totalSavings - Total monthly savings
   * @returns Recommendation with rationale
   */
  private determineRecommendation(
    options: ServerlessOption[],
    totalSavings: number
  ): {
    recommendation: 'serverless' | 'traditional' | 'hybrid';
    rationale: string;
    confidence: number;
  } {
    // No applicable use cases → traditional
    if (options.length === 0) {
      return {
        recommendation: 'traditional',
        rationale: 'No serverless-optimized use cases detected',
        confidence: 0.8
      };
    }

    // High savings (> $500/month) → serverless
    if (totalSavings >= 500) {
      return {
        recommendation: 'serverless',
        rationale: `Serverless saves $${totalSavings}/month across ${options.length} use cases. Significant cost reduction with minimal trade-offs.`,
        confidence: 0.95
      };
    }

    // Moderate savings ($200-500) → hybrid
    if (totalSavings >= 200) {
      return {
        recommendation: 'hybrid',
        rationale: `Serverless saves $${totalSavings}/month. Consider hybrid approach: serverless for ${options.map(o => o.useCase.toLowerCase()).join(', ')}, traditional for other services.`,
        confidence: 0.85
      };
    }

    // Low savings (< $200) → evaluate trade-offs
    if (totalSavings >= 100) {
      return {
        recommendation: 'hybrid',
        rationale: `Modest savings of $${totalSavings}/month. Serverless benefits: zero ops burden, instant scaling. Trade-off: vendor lock-in.`,
        confidence: 0.7
      };
    }

    // Minimal savings → traditional
    return {
      recommendation: 'traditional',
      rationale: `Minimal savings ($${totalSavings}/month). Traditional infrastructure may offer better control for your use cases.`,
      confidence: 0.75
    };
  }

  /**
   * Format savings analysis as markdown report
   *
   * @param analysis - Savings analysis result
   * @returns Markdown-formatted report
   */
  formatReport(analysis: ServerlessSavingsAnalysis): string {
    const lines: string[] = [];

    lines.push('# Serverless Cost Savings Analysis\n');
    lines.push(`**Total Potential Savings**: $${analysis.totalSavings}/month\n`);
    lines.push(`**Recommendation**: ${analysis.recommendation.toUpperCase()}`);
    lines.push(`**Confidence**: ${(analysis.confidence * 100).toFixed(0)}%\n`);
    lines.push(`**Rationale**: ${analysis.rationale}\n`);
    lines.push('---\n');

    if (analysis.breakdown.length > 0) {
      lines.push('## Savings Breakdown\n');

      for (const option of analysis.breakdown) {
        lines.push(`### ${option.useCase}\n`);
        lines.push(`- **Service**: ${option.service}`);
        if (option.alternatives && option.alternatives.length > 0) {
          lines.push(`- **Alternatives**: ${option.alternatives.join(', ')}`);
        }
        lines.push(`- **Traditional Cost**: $${option.traditionalCost}/month`);
        lines.push(`- **Serverless Cost**: $${option.serverlessCost}/month`);
        lines.push(`- **Savings**: $${option.savings}/month\n`);

        lines.push('**Recommended When**:');
        for (const when of option.recommendedWhen) {
          lines.push(`  - ${when}`);
        }

        lines.push('\n**NOT Recommended When**:');
        for (const when of option.notRecommendedWhen) {
          lines.push(`  - ${when}`);
        }

        lines.push('\n**Trade-offs**:');
        for (const tradeoff of option.tradeoffs) {
          lines.push(`  - ${tradeoff}`);
        }

        lines.push('\n---\n');
      }
    }

    return lines.join('\n');
  }
}

/**
 * Quick helper to calculate total potential serverless savings
 *
 * @param useCases - Array of use cases
 * @returns Total monthly savings
 */
export function calculateTotalSavings(useCases: string[]): number {
  const calculator = new ServerlessSavingsCalculator();
  const analysis = calculator.calculateSavings(useCases);
  return analysis.totalSavings;
}
