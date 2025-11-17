/**
 * Project Generator (T-042)
 *
 * Generates project list based on architecture type,
 * compliance requirements, and vision keywords.
 */

import type { ArchitectureType, ProjectDefinition } from './types.js';
import type { ComplianceStandard } from '../compliance/types.js';
import type { VisionInsights } from '../research/types.js';

/**
 * Project Generator Class
 */
export class ProjectGenerator {
  /**
   * Generate projects based on architecture and context
   *
   * @param architecture - Architecture type
   * @param compliance - Compliance standards
   * @param vision - Vision insights (optional)
   * @returns Project definition list
   */
  public generateProjects(
    architecture: ArchitectureType,
    compliance: ComplianceStandard[] = [],
    vision?: VisionInsights
  ): ProjectDefinition[] {
    const projects: ProjectDefinition[] = [];

    // Always add frontend (unless pure API)
    if (!vision?.keywords.includes('api-only')) {
      projects.push({
        name: 'frontend',
        description: 'Web application frontend',
        stack: architecture === 'jamstack' ? ['Next.js', 'React'] : ['React', 'TypeScript']
      });
    }

    // Add architecture-specific projects
    const archProjects = this.getArchitectureProjects(architecture);
    projects.push(...archProjects);

    // Add compliance-driven projects
    const complianceProjects = this.getComplianceProjects(compliance);
    projects.push(...complianceProjects);

    // Add vision-specific projects
    if (vision) {
      const visionProjects = this.getVisionProjects(vision);
      projects.push(...visionProjects);
    }

    // Deduplicate by name
    const uniqueProjects = this.deduplicateProjects(projects);

    return uniqueProjects;
  }

  /**
   * Get projects for architecture type
   */
  private getArchitectureProjects(architecture: ArchitectureType): ProjectDefinition[] {
    switch (architecture) {
      case 'serverless':
        return [
          {
            name: 'backend-functions',
            description: 'Serverless backend functions',
            stack: ['AWS Lambda', 'Node.js', 'TypeScript']
          },
          {
            name: 'api-gateway',
            description: 'API Gateway configuration',
            stack: ['AWS API Gateway']
          }
        ];

      case 'traditional-monolith':
      case 'modular-monolith':
        return [
          {
            name: 'backend',
            description: 'Monolithic backend application',
            stack: ['Node.js', 'Express', 'PostgreSQL']
          }
        ];

      case 'microservices':
        return [
          {
            name: 'api-gateway',
            description: 'API Gateway service',
            stack: ['Kong', 'Nginx']
          },
          {
            name: 'user-service',
            description: 'User management service',
            stack: ['Node.js', 'PostgreSQL']
          },
          {
            name: 'auth-service',
            description: 'Authentication service',
            stack: ['Node.js', 'JWT', 'Redis']
          }
        ];

      case 'jamstack':
        return [
          {
            name: 'cms',
            description: 'Headless CMS',
            stack: ['Contentful', 'Sanity']
          },
          {
            name: 'backend-functions',
            description: 'Serverless backend functions',
            stack: ['Vercel Functions', 'Node.js']
          }
        ];

      case 'hybrid':
        return [
          {
            name: 'backend-monolith',
            description: 'Core backend monolith',
            stack: ['Node.js', 'Express', 'PostgreSQL']
          },
          {
            name: 'backend-functions',
            description: 'Serverless functions for specific services',
            stack: ['AWS Lambda', 'Node.js']
          }
        ];

      default:
        return [];
    }
  }

  /**
   * Get compliance-driven projects
   */
  private getComplianceProjects(compliance: ComplianceStandard[]): ProjectDefinition[] {
    const projects: ProjectDefinition[] = [];

    // HIPAA requires separate auth and data services
    if (compliance.some((c) => c.id === 'HIPAA' || c.id === 'HITRUST')) {
      projects.push(
        {
          name: 'auth-service',
          description: 'HIPAA-compliant authentication service',
          stack: ['Node.js', 'OAuth2', 'MFA', 'Audit Logging']
        },
        {
          name: 'data-service',
          description: 'HIPAA-compliant data encryption and access control',
          stack: ['Node.js', 'PostgreSQL (encrypted)', 'Access Control']
        },
        {
          name: 'audit-logs',
          description: 'HIPAA audit trail and logging',
          stack: ['CloudTrail', 'ELK Stack', 'Log Retention']
        }
      );
    }

    // PCI-DSS: Isolated payment service
    if (compliance.some((c) => c.id === 'PCI-DSS')) {
      projects.push({
        name: 'payment-service',
        description: 'PCI-DSS compliant payment processing (or use Stripe)',
        stack: ['Node.js (PCI scope)', 'Stripe API', 'Tokenization']
      });
    }

    return projects;
  }

  /**
   * Get vision-specific projects
   */
  private getVisionProjects(vision: VisionInsights): ProjectDefinition[] {
    const projects: ProjectDefinition[] = [];

    // Mobile app
    if (
      vision.keywords.includes('mobile') ||
      vision.keywords.includes('app') ||
      vision.keywords.includes('ios') ||
      vision.keywords.includes('android')
    ) {
      projects.push({
        name: 'mobile',
        description: 'Mobile application',
        stack: ['React Native', 'TypeScript']
      });
    }

    // Payment/ecommerce
    if (
      vision.keywords.includes('payment') ||
      vision.keywords.includes('ecommerce') ||
      vision.keywords.includes('shopping')
    ) {
      projects.push({
        name: 'payment-service',
        description: 'Payment processing service',
        stack: ['Stripe', 'PayPal', 'Node.js']
      });
    }

    // Notifications
    if (
      vision.keywords.includes('notification') ||
      vision.keywords.includes('messaging') ||
      vision.keywords.includes('email')
    ) {
      projects.push({
        name: 'notification-service',
        description: 'Notification and messaging service',
        stack: ['SendGrid', 'AWS SES', 'Node.js']
      });
    }

    // Analytics/ML
    if (
      vision.keywords.includes('analytics') ||
      vision.keywords.includes('ml') ||
      vision.keywords.includes('ai')
    ) {
      projects.push({
        name: 'analytics-service',
        description: 'Analytics and ML service',
        stack: ['Python', 'TensorFlow', 'BigQuery']
      });
    }

    return projects;
  }

  /**
   * Deduplicate projects by name (keep first occurrence)
   */
  private deduplicateProjects(projects: ProjectDefinition[]): ProjectDefinition[] {
    const seen = new Set<string>();
    return projects.filter((project) => {
      if (seen.has(project.name)) {
        return false;
      }
      seen.add(project.name);
      return true;
    });
  }
}

/**
 * Singleton instance
 */
export const projectGenerator = new ProjectGenerator();
