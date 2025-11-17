/**
 * Ultra-Smart Architecture Decision Engine
 *
 * Makes intelligent architecture recommendations based on:
 * - T-036: Serverless for viral + bootstrapped projects
 * - T-037: Traditional for compliance-heavy projects (HIPAA, PCI-DSS, SOC2)
 * - T-038: Learning project recommendations (YAGNI + free tier)
 * - T-039: Infrastructure based on scale
 * - T-040: Cost estimation at different scales
 * - T-042: Project generation
 */

import type { BudgetType } from './types.js';
import type { ComplianceStandard } from '../compliance/ComplianceDetector.js';

export interface ArchitectureDecision {
  category: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  confidence?: number;
  costImpact?: 'low' | 'medium' | 'high';
}

export interface CostEstimate {
  users: number;
  monthlyCost: number;
  breakdown: {
    compute: number;
    database: number;
    storage: number;
    bandwidth: number;
    other: number;
  };
}

export interface ArchitectureRecommendation {
  approach: 'serverless' | 'traditional' | 'hybrid' | 'learning';
  decisions: ArchitectureDecision[];
  costEstimates: CostEstimate[];
  rationale: string;
  confidence: number;
}

export interface ArchitectureInput {
  /** Product vision text */
  vision: string;

  /** Detected compliance standards */
  complianceStandards: ComplianceStandard[];

  /** Expected user count */
  expectedUsers: number;

  /** Expected number of microservices */
  expectedServices: number;

  /** Budget type */
  budget: BudgetType;

  /** Whether project has viral potential */
  viralPotential: boolean;

  /** Project type */
  projectType?: 'startup' | 'scale-up' | 'enterprise' | 'learning';

  /** Whether analytics/ML is needed */
  hasAnalytics?: boolean;
}

export class ArchitectureDecisionEngine {
  /**
   * Generate complete architecture recommendation
   *
   * @param input - Architecture decision input
   * @returns Complete architecture recommendation
   */
  recommend(input: ArchitectureInput): ArchitectureRecommendation {
    // Determine approach (T-036, T-037, T-038)
    const approach = this.determineApproach(input);

    // Generate architecture decisions
    const decisions = this.generateDecisions(approach, input);

    // Calculate cost estimates (T-040)
    const costEstimates = this.calculateCostEstimates(approach, input);

    // Generate rationale
    const { rationale, confidence } = this.generateRationale(approach, input);

    return {
      approach,
      decisions,
      costEstimates,
      rationale,
      confidence
    };
  }

  /**
   * T-036, T-037, T-038: Determine architecture approach
   */
  private determineApproach(input: ArchitectureInput): 'serverless' | 'traditional' | 'hybrid' | 'learning' {
    // T-038: Learning projects → learning approach
    if (input.projectType === 'learning' || input.budget === 'learning') {
      return 'learning';
    }

    // T-037: Compliance-heavy → traditional
    const criticalCompliance = input.complianceStandards.some(s =>
      ['HIPAA', 'PCI-DSS', 'SOC2', 'ISO27001', 'FedRAMP', 'FISMA'].includes(s)
    );
    if (criticalCompliance) {
      return 'traditional';
    }

    // T-036: Viral + bootstrapped → serverless
    if (input.viralPotential && input.budget === 'bootstrapped') {
      return 'serverless';
    }

    // Moderate complexity → hybrid
    if (input.expectedServices >= 3 && input.expectedServices <= 8) {
      return 'hybrid';
    }

    // High scale or funding → traditional
    if (input.expectedUsers > 100000 || input.budget === 'series-a-plus') {
      return 'traditional';
    }

    // Default: serverless for startups
    return input.budget === 'bootstrapped' ? 'serverless' : 'traditional';
  }

  /**
   * Generate architecture decisions based on approach
   */
  private generateDecisions(approach: string, input: ArchitectureInput): ArchitectureDecision[] {
    switch (approach) {
      case 'serverless':
        return this.getServerlessDecisions(input);

      case 'traditional':
        return this.getTraditionalDecisions(input);

      case 'hybrid':
        return this.getHybridDecisions(input);

      case 'learning':
        return this.getLearningDecisions(input);

      default:
        return this.getTraditionalDecisions(input);
    }
  }

  /**
   * T-036: Serverless architecture decisions
   */
  private getServerlessDecisions(input: ArchitectureInput): ArchitectureDecision[] {
    return [
      {
        category: 'Backend',
        decision: 'AWS Lambda + API Gateway',
        rationale: 'Zero fixed costs, automatic scaling, pay-per-use',
        alternatives: ['Vercel Functions', 'Cloudflare Workers', 'Netlify Functions'],
        confidence: 0.9,
        costImpact: 'low'
      },
      {
        category: 'Database',
        decision: 'Supabase (PostgreSQL)',
        rationale: 'Generous free tier, instant APIs, real-time subscriptions',
        alternatives: ['Firebase Firestore', 'PlanetScale', 'DynamoDB'],
        confidence: 0.85,
        costImpact: 'low'
      },
      {
        category: 'Authentication',
        decision: 'Supabase Auth',
        rationale: 'Built-in auth, free tier, OAuth support',
        alternatives: ['AWS Cognito', 'Auth0', 'Firebase Auth'],
        confidence: 0.85,
        costImpact: 'low'
      },
      {
        category: 'Storage',
        decision: 'S3 + CloudFront CDN',
        rationale: 'Pay-per-use, global CDN, 99.99% availability',
        alternatives: ['Cloudflare R2', 'Backblaze B2'],
        confidence: 0.9,
        costImpact: 'low'
      },
      {
        category: 'Hosting',
        decision: 'Vercel (frontend) + AWS Lambda (backend)',
        rationale: 'Free tier for frontend, serverless backend',
        alternatives: ['Netlify', 'Cloudflare Pages + Workers'],
        confidence: 0.85,
        costImpact: 'low'
      }
    ];
  }

  /**
   * T-037: Traditional architecture decisions (compliance-driven)
   */
  private getTraditionalDecisions(input: ArchitectureInput): ArchitectureDecision[] {
    const hasHIPAA = input.complianceStandards.includes('HIPAA');
    const hasPCIDSS = input.complianceStandards.includes('PCI-DSS');

    const decisions: ArchitectureDecision[] = [
      {
        category: 'Backend Framework',
        decision: 'Node.js + Express (TypeScript)',
        rationale: 'Type safety, large ecosystem, proven at scale',
        alternatives: ['Python + FastAPI', 'Go', 'Java + Spring Boot'],
        confidence: 0.85,
        costImpact: 'medium'
      },
      {
        category: 'Database',
        decision: hasHIPAA ? 'PostgreSQL (self-hosted)' : 'PostgreSQL (RDS)',
        rationale: hasHIPAA
          ? 'Full control for HIPAA audit trails and encryption'
          : 'ACID compliance, JSON support, mature ecosystem',
        alternatives: ['MySQL', 'MongoDB', 'CockroachDB'],
        confidence: 0.9,
        costImpact: hasHIPAA ? 'high' : 'medium'
      },
      {
        category: 'Authentication',
        decision: hasPCIDSS ? 'Custom auth server' : 'AWS Cognito',
        rationale: hasPCIDSS
          ? 'PCI compliance requires dedicated auth infrastructure'
          : 'Managed service with MFA, scales automatically',
        alternatives: ['Auth0', 'Keycloak', 'Custom JWT'],
        confidence: 0.85,
        costImpact: hasPCIDSS ? 'high' : 'medium'
      },
      {
        category: 'Infrastructure',
        decision: 'Kubernetes (EKS/AKS/GKE)',
        rationale: 'Container orchestration, multi-region support, proven at scale',
        alternatives: ['ECS Fargate', 'VM-based (EC2/Compute)'],
        confidence: input.expectedServices > 5 ? 0.9 : 0.7,
        costImpact: 'high'
      },
      {
        category: 'Storage',
        decision: 'S3 (or equivalent)',
        rationale: 'Industry standard, 99.99% durability, versioning',
        alternatives: ['Azure Blob', 'GCS', 'MinIO'],
        confidence: 0.9,
        costImpact: 'medium'
      }
    ];

    return decisions;
  }

  /**
   * Hybrid architecture decisions
   */
  private getHybridDecisions(input: ArchitectureInput): ArchitectureDecision[] {
    return [
      {
        category: 'Backend',
        decision: 'Node.js + Express + Serverless Functions',
        rationale: 'Core API on containers, background jobs on Lambda',
        alternatives: ['Full serverless', 'Full traditional'],
        confidence: 0.8,
        costImpact: 'medium'
      },
      {
        category: 'Database',
        decision: 'PostgreSQL (RDS)',
        rationale: 'Managed service, automatic backups, read replicas',
        alternatives: ['Aurora Serverless', 'Self-hosted PostgreSQL'],
        confidence: 0.85,
        costImpact: 'medium'
      },
      {
        category: 'Authentication',
        decision: 'AWS Cognito',
        rationale: 'Managed auth, integrates well with hybrid approach',
        alternatives: ['Auth0', 'Custom JWT'],
        confidence: 0.8,
        costImpact: 'low'
      },
      {
        category: 'Infrastructure',
        decision: 'ECS Fargate + Lambda',
        rationale: 'Containers for core services, serverless for spikes',
        alternatives: ['Full Kubernetes', 'Full Lambda'],
        confidence: 0.75,
        costImpact: 'medium'
      }
    ];
  }

  /**
   * T-038: Learning project decisions (YAGNI + free tier)
   */
  private getLearningDecisions(input: ArchitectureInput): ArchitectureDecision[] {
    return [
      {
        category: 'Backend',
        decision: 'Node.js + Express',
        rationale: 'Simple, minimal setup, great for learning fundamentals',
        alternatives: ['Python + Flask', 'Go'],
        confidence: 0.9,
        costImpact: 'low'
      },
      {
        category: 'Database',
        decision: 'SQLite → PostgreSQL (Supabase free tier)',
        rationale: 'Start simple with SQLite, migrate to Supabase when ready',
        alternatives: ['MongoDB Atlas', 'Firebase'],
        confidence: 0.85,
        costImpact: 'low'
      },
      {
        category: 'Authentication',
        decision: 'Simple JWT (learn basics)',
        rationale: 'Understand auth fundamentals before using managed services',
        alternatives: ['Supabase Auth (if needed later)'],
        confidence: 0.8,
        costImpact: 'low'
      },
      {
        category: 'Hosting',
        decision: 'Render (free tier)',
        rationale: 'Free hosting, easy deployment, no DevOps complexity',
        alternatives: ['Railway', 'Fly.io', 'Heroku'],
        confidence: 0.85,
        costImpact: 'low'
      },
      {
        category: 'Frontend',
        decision: 'React + Vite (static hosting)',
        rationale: 'Modern tooling, fast development, free static hosting',
        alternatives: ['Vue + Vite', 'Svelte'],
        confidence: 0.85,
        costImpact: 'low'
      }
    ];
  }

  /**
   * T-040: Calculate cost estimates at different scales
   */
  private calculateCostEstimates(approach: string, input: ArchitectureInput): CostEstimate[] {
    const scales = [1000, 10000, 100000, 1000000];

    return scales.map(users => {
      switch (approach) {
        case 'serverless':
          return this.estimateServerlessCost(users);

        case 'traditional':
          return this.estimateTraditionalCost(users, input.expectedServices);

        case 'hybrid':
          return this.estimateHybridCost(users, input.expectedServices);

        case 'learning':
          return this.estimateLearningCost(users);

        default:
          return this.estimateTraditionalCost(users, input.expectedServices);
      }
    });
  }

  private estimateServerlessCost(users: number): CostEstimate {
    // Serverless: pay-per-use, scales automatically
    const requestsPerMonth = users * 100; // 100 requests/user/month
    const compute = Math.max(5, requestsPerMonth * 0.0000002); // Lambda pricing
    const database = Math.max(0, (users / 1000) * 25); // Supabase tiers
    const storage = Math.max(5, (users / 1000) * 10); // S3 storage
    const bandwidth = Math.max(10, (users / 1000) * 15); // CloudFront
    const other = 5; // Misc services

    return {
      users,
      monthlyCost: compute + database + storage + bandwidth + other,
      breakdown: { compute, database, storage, bandwidth, other }
    };
  }

  private estimateTraditionalCost(users: number, services: number): CostEstimate {
    // Traditional: fixed infrastructure costs
    const compute = Math.max(100, services * 50 + (users / 10000) * 200);
    const database = Math.max(50, (users / 10000) * 150);
    const storage = Math.max(20, (users / 1000) * 15);
    const bandwidth = Math.max(50, (users / 1000) * 20);
    const other = 100; // Load balancers, monitoring, etc.

    return {
      users,
      monthlyCost: compute + database + storage + bandwidth + other,
      breakdown: { compute, database, storage, bandwidth, other }
    };
  }

  private estimateHybridCost(users: number, services: number): CostEstimate {
    // Hybrid: mix of serverless and traditional
    const serverless = this.estimateServerlessCost(users);
    const traditional = this.estimateTraditionalCost(users, services);

    // 60% traditional, 40% serverless
    return {
      users,
      monthlyCost: traditional.monthlyCost * 0.6 + serverless.monthlyCost * 0.4,
      breakdown: {
        compute: traditional.breakdown.compute * 0.6 + serverless.breakdown.compute * 0.4,
        database: traditional.breakdown.database * 0.6 + serverless.breakdown.database * 0.4,
        storage: traditional.breakdown.storage * 0.6 + serverless.breakdown.storage * 0.4,
        bandwidth: traditional.breakdown.bandwidth * 0.6 + serverless.breakdown.bandwidth * 0.4,
        other: traditional.breakdown.other * 0.6 + serverless.breakdown.other * 0.4
      }
    };
  }

  private estimateLearningCost(users: number): CostEstimate {
    // Learning: free tiers + minimal costs
    if (users <= 1000) {
      return {
        users,
        monthlyCost: 0, // Free tiers (Render, Supabase, Vercel)
        breakdown: { compute: 0, database: 0, storage: 0, bandwidth: 0, other: 0 }
      };
    }

    // Beyond free tier
    const compute = Math.max(7, (users / 1000) * 5);
    const database = Math.max(0, (users / 10000) * 10);
    const storage = Math.max(0, (users / 1000) * 2);
    const bandwidth = Math.max(0, (users / 1000) * 3);

    return {
      users,
      monthlyCost: compute + database + storage + bandwidth,
      breakdown: { compute, database, storage, bandwidth, other: 0 }
    };
  }

  /**
   * Generate rationale for architecture recommendation
   */
  private generateRationale(approach: string, input: ArchitectureInput): { rationale: string; confidence: number } {
    switch (approach) {
      case 'serverless':
        return {
          rationale: `Serverless recommended: ${input.viralPotential ? 'Viral potential requires instant scaling. ' : ''}Bootstrapped budget benefits from pay-per-use pricing. Est. $${this.calculateCostEstimates(approach, input)[0].monthlyCost.toFixed(0)}/month at 1K users.`,
          confidence: 0.9
        };

      case 'traditional':
        const complianceReason = input.complianceStandards.length > 0
          ? `${input.complianceStandards.slice(0, 2).join(', ')} compliance requires traditional infrastructure for audit controls. `
          : '';
        return {
          rationale: `Traditional architecture recommended: ${complianceReason}Scale (${input.expectedUsers.toLocaleString()} users, ${input.expectedServices} services) justifies dedicated infrastructure. Est. $${this.calculateCostEstimates(approach, input)[0].monthlyCost.toFixed(0)}/month at 1K users.`,
          confidence: 0.85
        };

      case 'hybrid':
        return {
          rationale: `Hybrid approach recommended: Balance between serverless agility and traditional control. ${input.expectedServices} services benefit from mixed infrastructure. Est. $${this.calculateCostEstimates(approach, input)[0].monthlyCost.toFixed(0)}/month at 1K users.`,
          confidence: 0.75
        };

      case 'learning':
        return {
          rationale: 'Learning project: Focus on fundamentals with free-tier tools. Start simple (SQLite, JWT), upgrade as you learn. Est. $0/month at 1K users (free tiers).',
          confidence: 0.95
        };

      default:
        return {
          rationale: 'Traditional architecture for stability and control.',
          confidence: 0.7
        };
    }
  }

  /**
   * Legacy API compatibility (for InitFlow.ts)
   */
  decide(vision: string, compliance: ComplianceStandard[]): ArchitectureDecision[] {
    // Default input for legacy API
    const input: ArchitectureInput = {
      vision,
      complianceStandards: compliance,
      expectedUsers: 10000,
      expectedServices: 3,
      budget: 'bootstrapped',
      viralPotential: false,
      projectType: 'startup'
    };

    const recommendation = this.recommend(input);
    return recommendation.decisions;
  }
}
