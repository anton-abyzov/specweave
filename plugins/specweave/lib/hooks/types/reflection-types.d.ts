/**
 * Type definitions for AI Self-Reflection System
 * @module reflection-types
 */
/**
 * Severity levels for identified issues
 */
export declare enum IssueSeverity {
    CRITICAL = "CRITICAL",
    HIGH = "HIGH",
    MEDIUM = "MEDIUM",
    LOW = "LOW"
}
/**
 * Issue categories
 */
export declare enum IssueCategory {
    SECURITY = "SECURITY",
    QUALITY = "QUALITY",
    TESTING = "TESTING",
    PERFORMANCE = "PERFORMANCE",
    TECHNICAL_DEBT = "TECHNICAL_DEBT"
}
/**
 * Reflection depth modes
 */
export declare enum ReflectionDepth {
    QUICK = "quick",// <15s, critical issues only
    STANDARD = "standard",// <30s, full analysis (default)
    DEEP = "deep"
}
/**
 * AI model selection for reflection
 */
export declare enum ReflectionModel {
    HAIKU = "haiku",// Fast, cheap (~$0.01/task)
    SONNET = "sonnet",// Balanced (~$0.05/task)
    OPUS = "opus"
}
/**
 * Reflection execution mode
 */
export declare enum ReflectionMode {
    AUTO = "auto",// Automatic after task completion
    MANUAL = "manual",// User-triggered only
    DISABLED = "disabled"
}
/**
 * Issue identified during reflection
 */
export interface ReflectionIssue {
    severity: IssueSeverity;
    category: IssueCategory;
    description: string;
    impact: string;
    recommendation: string;
    location?: {
        file: string;
        line?: number;
        snippet?: string;
    };
}
/**
 * Lesson learned from task execution
 */
export interface LessonLearned {
    whatWentWell: string[];
    whatCouldImprove: string[];
    forNextTime: string[];
}
/**
 * Quality metrics from reflection
 */
export interface ReflectionMetrics {
    codeQuality: number;
    security: number;
    testCoverage?: number;
    technicalDebt: 'LOW' | 'MEDIUM' | 'HIGH';
    performance: 'GOOD' | 'ACCEPTABLE' | 'NEEDS_WORK';
}
/**
 * Complete reflection result
 */
export interface ReflectionResult {
    taskName: string;
    completed: string;
    duration?: string;
    filesModified: {
        count: number;
        linesAdded: number;
        linesRemoved: number;
    };
    accomplishments: string[];
    strengths: string[];
    issues: ReflectionIssue[];
    recommendedActions: {
        priority1: string[];
        priority2: string[];
        priority3: string[];
    };
    lessonsLearned: LessonLearned;
    metrics: ReflectionMetrics;
    relatedTasks?: string[];
    metadata: {
        model: ReflectionModel;
        reflectionTime: number;
        estimatedCost: number;
    };
}
/**
 * Configuration for reflection system
 */
export interface ReflectionConfig {
    enabled: boolean;
    mode: ReflectionMode;
    depth: ReflectionDepth;
    model: ReflectionModel;
    categories: {
        security: boolean;
        quality: boolean;
        testing: boolean;
        performance: boolean;
        technicalDebt: boolean;
    };
    criticalThreshold: IssueSeverity;
    storeReflections: boolean;
    autoCreateFollowUpTasks: boolean;
    soundNotifications?: boolean;
}
/**
 * Git diff information for modified files
 */
export interface GitDiffInfo {
    file: string;
    linesAdded: number;
    linesRemoved: number;
    content: string;
}
/**
 * Context for reflection execution
 */
export interface ReflectionContext {
    incrementId: string;
    taskId: string;
    modifiedFiles: GitDiffInfo[];
    config: ReflectionConfig;
}
/**
 * Reflection execution result (success or failure)
 */
export interface ReflectionExecutionResult {
    success: boolean;
    result?: ReflectionResult;
    error?: {
        message: string;
        code: string;
        details?: any;
    };
}
/**
 * Default reflection configuration
 */
export declare const DEFAULT_REFLECTION_CONFIG: ReflectionConfig;
//# sourceMappingURL=reflection-types.d.ts.map