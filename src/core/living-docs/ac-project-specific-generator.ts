/**
 * Acceptance Criteria Project-Specific Generator
 *
 * Intelligently rewrites acceptance criteria based on project context.
 *
 * Architecture:
 * - Generic AC (config schema, validation) → Keep unchanged
 * - Backend AC (API, database) → Rewrite with backend context
 * - Frontend AC (UI, component) → Rewrite with frontend context
 * - Mobile AC (screen, gesture) → Rewrite with mobile context
 *
 * Example:
 * - Original: "UI displays status configuration form"
 * - Backend: "Backend service: API returns status configuration data"
 * - Frontend: "UI: Component displays status configuration form"
 * - Mobile: "Mobile app: Screen displays status configuration form"
 *
 * Related:
 * - .specweave/increments/0034-github-ac-checkboxes-fix/reports/ULTRATHINK-AC-PROJECT-SPECIFIC-DESIGN.md
 * - src/core/living-docs/spec-distributor.ts (uses this)
 */

export interface ProjectContext {
  id: string; // 'backend', 'frontend', 'mobile', 'infrastructure', etc.
  name: string; // 'Backend Services'
  type: 'backend' | 'frontend' | 'mobile' | 'infrastructure' | 'generic';
  techStack: string[]; // ['Node.js', 'PostgreSQL']
  keywords: string[]; // ['api', 'service']
}

export interface AcceptanceCriterion {
  id: string; // AC-US3-01
  description: string;
  priority?: string;
  testable: boolean;
  completed: boolean;
  projectSpecific?: boolean; // Added after rewrite
}

export class ACProjectSpecificGenerator {
  /**
   * Make acceptance criteria project-specific
   *
   * Strategy:
   * 1. Detect if AC is generic (applies to all projects)
   * 2. Detect if AC needs project-specific variant
   * 3. Rewrite AC description based on project context
   * 4. Add project suffix to AC ID
   */
  makeProjectSpecific(
    ac: AcceptanceCriterion[],
    userStoryId: string,
    projectContext: ProjectContext
  ): AcceptanceCriterion[] {
    return ac.map((criterion) => {
      // Step 1: Detect if AC is generic
      if (this.isGenericAC(criterion.description)) {
        return criterion; // Keep as-is
      }

      // Step 2: Detect if AC needs project-specific variant
      const needsProjectVariant = this.needsProjectVariant(criterion.description, projectContext);

      if (!needsProjectVariant) {
        return criterion; // Keep as-is
      }

      // Step 3: Rewrite AC for this project
      const projectSpecificDesc = this.rewriteACForProject(criterion.description, projectContext);

      // Step 4: Add project suffix to ID
      const projectSuffix = this.getProjectSuffix(projectContext);
      const projectSpecificId = `${criterion.id}-${projectSuffix}`;

      return {
        ...criterion,
        id: projectSpecificId,
        description: projectSpecificDesc,
        projectSpecific: true,
      };
    });
  }

  /**
   * Detect if AC is generic (applies to all projects without changes)
   */
  private isGenericAC(description: string): boolean {
    const genericIndicators = [
      /config\s+schema/i,
      /default\s+(mappings|settings|configuration)/i,
      /validation\s+prevents/i,
      /error\s+handling/i,
      /documentation\s+includes/i,
      /logging/i,
      /\btest\b.*\bcoverage\b/i, // "test coverage"
      /\bunit\s+test/i,
      /\bintegration\s+test/i,
    ];

    return genericIndicators.some((pattern) => pattern.test(description));
  }

  /**
   * Detect if AC needs project-specific variant
   */
  private needsProjectVariant(description: string, projectContext: ProjectContext): boolean {
    // Backend-specific indicators
    if (projectContext.type === 'backend') {
      return /API|endpoint|database|service|server|request|response/i.test(description);
    }

    // Frontend-specific indicators
    if (projectContext.type === 'frontend') {
      return /UI|component|screen|form|display|render|button|click|input/i.test(description);
    }

    // Mobile-specific indicators
    if (projectContext.type === 'mobile') {
      return /screen|navigation|gesture|native|platform|tap|swipe/i.test(description);
    }

    // Infrastructure-specific indicators
    if (projectContext.type === 'infrastructure') {
      return /deployment|CI\/CD|pipeline|monitoring|scaling|cluster|container/i.test(
        description
      );
    }

    return false;
  }

  /**
   * Rewrite AC description for specific project
   */
  private rewriteACForProject(description: string, projectContext: ProjectContext): string {
    let rewritten = description;

    // Backend-specific rewrites
    if (projectContext.type === 'backend') {
      rewritten = rewritten
        .replace(/UI\s+(displays|shows)/gi, 'API returns')
        .replace(/form\s+validation/gi, 'request payload validation')
        .replace(/\bscreen\b/gi, 'endpoint')
        .replace(/button\s+click/gi, 'API call')
        .replace(/user\s+sees/gi, 'API response includes')
        .replace(/component/gi, 'service')
        .replace(/\brender\b/gi, 'serialize');

      // Add backend context prefix if not already present
      if (
        !rewritten.includes('Backend') &&
        !rewritten.includes('API') &&
        !rewritten.includes('service')
      ) {
        rewritten = `Backend service: ${rewritten}`;
      }
    }

    // Frontend-specific rewrites
    if (projectContext.type === 'frontend') {
      rewritten = rewritten
        .replace(/API\s+endpoint/gi, 'UI component')
        .replace(/database\s+schema/gi, 'state management')
        .replace(/server\s+validates/gi, 'client-side validation')
        .replace(/returns\s+response/gi, 'displays result')
        .replace(/service/gi, 'component')
        .replace(/\bserialize\b/gi, 'render');

      // Add frontend context prefix if not already present
      if (
        !rewritten.includes('UI') &&
        !rewritten.includes('component') &&
        !rewritten.includes('Frontend')
      ) {
        rewritten = `UI: ${rewritten}`;
      }
    }

    // Mobile-specific rewrites
    if (projectContext.type === 'mobile') {
      rewritten = rewritten
        .replace(/\bpage\b/gi, 'screen')
        .replace(/\bclick\b/gi, 'tap')
        .replace(/\bhover\b/gi, 'long press')
        .replace(/component/gi, 'view')
        .replace(/web/gi, 'mobile');

      // Add mobile context prefix if not already present
      if (!rewritten.includes('Mobile') && !rewritten.includes('screen')) {
        rewritten = `Mobile app: ${rewritten}`;
      }
    }

    // Infrastructure-specific rewrites
    if (projectContext.type === 'infrastructure') {
      rewritten = rewritten
        .replace(/\bcode\b/gi, 'infrastructure code')
        .replace(/application/gi, 'deployment')
        .replace(/feature/gi, 'infrastructure change');

      // Add infrastructure context if not present
      if (
        !rewritten.includes('Infrastructure') &&
        !rewritten.includes('deployment') &&
        !rewritten.includes('pipeline')
      ) {
        rewritten = `Infrastructure: ${rewritten}`;
      }
    }

    return rewritten;
  }

  /**
   * Get project suffix for AC ID
   */
  private getProjectSuffix(projectContext: ProjectContext): string {
    const suffixMap: Record<string, string> = {
      backend: 'BE',
      frontend: 'FE',
      mobile: 'MOB',
      infrastructure: 'INFRA',
      generic: 'GEN',
    };

    return suffixMap[projectContext.type] || projectContext.id.slice(0, 3).toUpperCase();
  }
}
