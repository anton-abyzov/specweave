/**
 * Ultra-Smart Team Recommender
 *
 * Goes beyond backend/frontend to recommend:
 * - Compliance-driven teams (HIPAA → auth + data teams)
 * - Security teams (SOC2 → DevSecOps + CISO)
 * - Infrastructure teams (platform, data, observability)
 * - Serverless alternatives (with cost savings analysis)
 *
 * Implements T-020 to T-026 from increment 0037.
 */

import { TeamRecommendation, ServerlessAlternative } from './types.js';
import { ServerlessSavingsCalculator } from './ServerlessSavingsCalculator.js';

// Import ComplianceStandard from ComplianceDetector to ensure type compatibility
import type { ComplianceStandard } from '../compliance/ComplianceDetector.js';

/**
 * Input for team recommendation
 */
export interface TeamRecommendationInput {
  /** Detected compliance standards */
  complianceStandards: ComplianceStandard[];

  /** Expected team size */
  teamSize?: number;

  /** Number of microservices (if applicable) */
  microserviceCount?: number;

  /** Whether analytics/ML is part of the product */
  hasAnalytics?: boolean;

  /** Detected use cases for serverless analysis */
  useCases?: string[];

  /** Project type */
  projectType?: 'startup' | 'scale-up' | 'enterprise' | 'learning';

  /** Data types being handled */
  dataTypes?: ('healthcare' | 'payment' | 'personal' | 'financial' | 'education')[];
}

/**
 * Ultra-Smart Team Recommender
 */
export class TeamRecommender {
  private savingsCalculator: ServerlessSavingsCalculator;

  constructor() {
    this.savingsCalculator = new ServerlessSavingsCalculator();
  }

  /**
   * Recommend teams based on compliance, scale, and architecture
   *
   * @param input - Project characteristics
   * @returns Array of team recommendations with priorities
   *
   * @example
   * ```typescript
   * const recommender = new TeamRecommender();
   * const teams = recommender.recommend({
   *   complianceStandards: ['HIPAA', 'SOC2'],
   *   teamSize: 20,
   *   useCases: ['auth', 'file-uploads']
   * });
   * ```
   */
  recommend(input: TeamRecommendationInput): TeamRecommendation[] {
    const recommendations: TeamRecommendation[] = [];

    // 1. Core teams (ALWAYS recommended)
    recommendations.push(...this.getCoreTeams());

    // 2. Compliance-driven teams (T-020, T-021, T-022)
    recommendations.push(...this.getComplianceTeams(input));

    // 3. Infrastructure teams based on scale (T-023)
    recommendations.push(...this.getInfrastructureTeams(input));

    // 4. Specialized services (T-024)
    recommendations.push(...this.getSpecializedServiceTeams(input));

    // Sort by priority (descending)
    return recommendations.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * T-020: HIPAA-driven team recommendations
   *
   * HIPAA requires:
   * - Separate auth team (BAA, encryption, audit logs)
   * - Separate data team (PHI handling, encryption at rest)
   */
  private getHipaaTeams(): TeamRecommendation[] {
    return [
      {
        teamName: 'auth-team',
        role: 'Authentication & Authorization',
        required: true,
        reason: 'HIPAA requires BAA-compliant authentication, audit logs, and MFA enforcement',
        size: '2-3 engineers',
        skills: [
          'OAuth 2.0 / SAML',
          'JWT token management',
          'MFA implementation',
          'Audit logging',
          'HIPAA security controls'
        ],
        serverlessAlternative: {
          service: 'AWS Cognito (BAA-eligible)',
          costSavings: 185,
          tradeoffs: [
            'Must sign AWS BAA for HIPAA compliance',
            'Limited customization vs full control',
            'AWS vendor lock-in'
          ],
          pricingModel: '$50-$150/month for 10K users with MFA'
        },
        priority: 100
      },
      {
        teamName: 'data-team',
        role: 'PHI Data Management',
        required: true,
        reason: 'HIPAA requires specialized team for PHI (Protected Health Information) handling',
        size: '2-4 engineers',
        skills: [
          'Encryption at rest (AES-256)',
          'Encryption in transit (TLS 1.2+)',
          'Database security (row-level)',
          'Data anonymization',
          'HIPAA data lifecycle management'
        ],
        priority: 95
      }
    ];
  }

  /**
   * T-021: PCI-DSS team recommendations
   *
   * PCI-DSS options:
   * - Option A: Isolated payments team (expensive, $3.5K/month overhead)
   * - Option B: Use Stripe/PayPal (recommended, 2.9% + $0.30/transaction)
   */
  private getPciDssTeams(): TeamRecommendation[] {
    return [
      {
        teamName: 'payments-team',
        role: 'PCI-DSS Compliant Payments',
        required: false, // Optional because Stripe is better
        reason: 'PCI-DSS compliance for credit card processing (ONLY if not using Stripe/PayPal)',
        size: '3-5 engineers + PCI compliance officer',
        skills: [
          'PCI-DSS Level 1 certification',
          'Tokenization',
          'Network segmentation',
          'Quarterly ASV scans',
          'Annual PCI audit preparation'
        ],
        serverlessAlternative: {
          service: 'Stripe',
          costSavings: 3500, // Avoids PCI overhead: infrastructure ($1K) + compliance ($2.5K)
          tradeoffs: [
            'No PCI compliance burden (Stripe is PCI Level 1)',
            'Pay 2.9% + $0.30 per transaction vs lower fees with direct processor',
            'Vendor lock-in vs self-hosted',
            'Limited customization vs full control'
          ],
          pricingModel: '2.9% + $0.30 per transaction (vs $3.5K/month fixed overhead)'
        },
        priority: 50 // Low priority because Stripe is almost always better
      }
    ];
  }

  /**
   * T-022: SOC2/ISO 27001 team recommendations
   *
   * SOC2/ISO 27001 + >15 people → DevSecOps team + CISO
   */
  private getSoc2Teams(teamSize: number = 10): TeamRecommendation[] {
    const teams: TeamRecommendation[] = [];

    // DevSecOps team (if team > 15)
    if (teamSize > 15) {
      teams.push({
        teamName: 'devsecops-team',
        role: 'DevSecOps & Security Engineering',
        required: true,
        reason: 'SOC2/ISO 27001 compliance requires dedicated security team for organizations > 15 people',
        size: '2-3 engineers',
        skills: [
          'Security monitoring (SIEM)',
          'Vulnerability management',
          'Incident response',
          'Penetration testing',
          'SOC2 Type II controls',
          'ISO 27001 ISMS implementation'
        ],
        priority: 90
      });

      // CISO (Chief Information Security Officer) for large orgs
      teams.push({
        teamName: 'ciso',
        role: 'Chief Information Security Officer',
        required: false,
        reason: 'SOC2/ISO 27001 audits prefer dedicated CISO role for organizations > 15 people',
        size: '1 executive',
        skills: [
          'Security strategy',
          'Compliance oversight',
          'Risk management',
          'Security awareness training',
          'Audit coordination'
        ],
        priority: 70
      });
    }

    return teams;
  }

  /**
   * T-023: Infrastructure team recommendations
   *
   * - Platform team if >5 microservices
   * - Data team if analytics/ML
   * - Observability team if >20 services
   */
  private getInfrastructureTeams(input: TeamRecommendationInput): TeamRecommendation[] {
    const teams: TeamRecommendation[] = [];
    const { microserviceCount = 0, hasAnalytics = false, teamSize = 10 } = input;

    // Platform team (if >5 microservices)
    if (microserviceCount > 5) {
      teams.push({
        teamName: 'platform-team',
        role: 'Platform Engineering',
        required: true,
        reason: `Managing ${microserviceCount} microservices requires dedicated platform team`,
        size: '2-4 engineers',
        skills: [
          'Kubernetes (EKS/AKS/GKE)',
          'Service mesh (Istio/Linkerd)',
          'CI/CD pipelines',
          'Infrastructure as Code (Terraform)',
          'Developer tooling'
        ],
        priority: 85
      });
    }

    // Data team (if analytics/ML)
    if (hasAnalytics) {
      teams.push({
        teamName: 'data-team',
        role: 'Data Engineering & Analytics',
        required: true,
        reason: 'Analytics and ML features require specialized data engineering',
        size: '2-3 engineers',
        skills: [
          'Data pipelines (Airflow/Prefect)',
          'Data warehousing (Snowflake/BigQuery)',
          'ML model deployment',
          'Data quality monitoring',
          'SQL optimization'
        ],
        priority: 80
      });
    }

    // Observability team (if >20 services OR team >30 people)
    if (microserviceCount > 20 || teamSize > 30) {
      teams.push({
        teamName: 'observability-team',
        role: 'Observability & Monitoring',
        required: false,
        reason: `${microserviceCount} services require dedicated observability team`,
        size: '1-2 engineers',
        skills: [
          'Distributed tracing (Jaeger/Zipkin)',
          'Metrics (Prometheus/Grafana)',
          'Logging (ELK/Loki)',
          'Alerting strategy',
          'SLO/SLI management'
        ],
        priority: 60
      });
    }

    return teams;
  }

  /**
   * T-024: Specialized service teams
   *
   * Detects needs for: payments, notifications, analytics, file storage, image processing, email
   */
  private getSpecializedServiceTeams(input: TeamRecommendationInput): TeamRecommendation[] {
    const teams: TeamRecommendation[] = [];
    const { useCases = [], dataTypes = [] } = input;

    // Check for payment needs
    if (dataTypes.includes('payment') && !useCases.includes('auth')) { // If no PCI-DSS team recommended
      const savingsOption = this.savingsCalculator.getOption('authentication');
      teams.push({
        teamName: 'payment-integration',
        role: 'Payment Integration',
        required: false,
        reason: 'Payment processing detected',
        size: '1-2 engineers',
        skills: ['Stripe/PayPal API', 'Webhook handling', 'Payment reconciliation'],
        serverlessAlternative: savingsOption ? {
          service: 'Stripe',
          costSavings: 3500,
          tradeoffs: savingsOption.tradeoffs,
          pricingModel: '2.9% + $0.30/transaction'
        } : undefined,
        priority: 65
      });
    }

    // Notification service (if email use case detected)
    if (useCases.includes('email') || useCases.includes('notifications')) {
      const emailOption = this.savingsCalculator.getOption('email-sending');
      teams.push({
        teamName: 'notifications-service',
        role: 'Notifications & Messaging',
        required: false,
        reason: 'Email/notification features detected',
        size: '1 engineer',
        skills: ['Email templates', 'SendGrid/SES', 'Push notifications', 'SMS (Twilio)'],
        serverlessAlternative: emailOption ? {
          service: emailOption.service,
          costSavings: emailOption.savings,
          tradeoffs: emailOption.tradeoffs,
          pricingModel: '$20-90/month for transactional emails'
        } : undefined,
        priority: 55
      });
    }

    return teams;
  }

  /**
   * Get core teams (always recommended)
   */
  private getCoreTeams(): TeamRecommendation[] {
    return [
      {
        teamName: 'backend',
        role: 'Backend Engineering',
        required: true,
        reason: 'Core backend development and API design',
        size: '2-5 engineers',
        skills: ['API design', 'Database optimization', 'Microservices', 'Security'],
        priority: 100
      },
      {
        teamName: 'frontend',
        role: 'Frontend Engineering',
        required: true,
        reason: 'User interface and experience development',
        size: '2-4 engineers',
        skills: ['React/Vue/Angular', 'CSS', 'Performance optimization', 'Accessibility'],
        priority: 100
      }
    ];
  }

  /**
   * Get compliance-driven teams based on detected standards
   */
  private getComplianceTeams(input: TeamRecommendationInput): TeamRecommendation[] {
    const teams: TeamRecommendation[] = [];
    const { complianceStandards = [], teamSize = 10 } = input;

    // T-020: HIPAA teams
    if (complianceStandards.some(s => ['HIPAA', 'FDA21CFR'].includes(s))) {
      teams.push(...this.getHipaaTeams());
    }

    // T-021: PCI-DSS teams
    if (complianceStandards.some(s => ['PCI-DSS', 'PSD2', 'SOX'].includes(s))) {
      teams.push(...this.getPciDssTeams());
    }

    // T-022: SOC2/ISO 27001 teams
    if (complianceStandards.some(s => ['SOC2', 'ISO27001'].includes(s))) {
      teams.push(...this.getSoc2Teams(teamSize));
    }

    return teams;
  }

  /**
   * T-026: Store team recommendations in config
   *
   * @param recommendations - Team recommendations
   * @param configPath - Optional custom config path
   */
  static async saveToConfig(recommendations: TeamRecommendation[], configPath?: string): Promise<void> {
    const { ConfigManager } = await import('../../config/ConfigManager.js');
    await ConfigManager.updateResearch({ teams: recommendations }, configPath);
  }

  /**
   * Get serverless savings analysis for detected use cases
   *
   * @param useCases - Detected use cases
   * @returns Savings analysis
   */
  getServerlessSavings(useCases: string[]) {
    return this.savingsCalculator.calculateSavings(useCases);
  }

  /**
   * Format team recommendations as markdown report
   *
   * @param recommendations - Team recommendations
   * @returns Markdown report
   */
  formatReport(recommendations: TeamRecommendation[]): string {
    const lines: string[] = [];

    lines.push('# Team Structure Recommendations\n');

    // Required teams
    const required = recommendations.filter(t => t.required);
    if (required.length > 0) {
      lines.push('## Required Teams\n');
      for (const team of required) {
        lines.push(`### ${team.teamName} (${team.role})`);
        lines.push(`**Size**: ${team.size}`);
        lines.push(`**Reason**: ${team.reason}`);
        lines.push(`**Skills**: ${team.skills.join(', ')}\n`);

        if (team.serverlessAlternative) {
          lines.push('**Serverless Alternative**:');
          lines.push(`- Service: ${team.serverlessAlternative.service}`);
          lines.push(`- Cost Savings: $${team.serverlessAlternative.costSavings}/month`);
          if (team.serverlessAlternative.pricingModel) {
            lines.push(`- Pricing: ${team.serverlessAlternative.pricingModel}`);
          }
          lines.push('- Trade-offs:');
          for (const tradeoff of team.serverlessAlternative.tradeoffs) {
            lines.push(`  - ${tradeoff}`);
          }
          lines.push('');
        }
      }
    }

    // Optional teams
    const optional = recommendations.filter(t => !t.required);
    if (optional.length > 0) {
      lines.push('## Optional Teams\n');
      for (const team of optional) {
        lines.push(`### ${team.teamName} (${team.role})`);
        lines.push(`**Size**: ${team.size}`);
        lines.push(`**Reason**: ${team.reason}\n`);
      }
    }

    return lines.join('\n');
  }
}
