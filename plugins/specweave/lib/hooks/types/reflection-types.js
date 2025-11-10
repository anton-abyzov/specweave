/**
 * Type definitions for AI Self-Reflection System
 * @module reflection-types
 */
/**
 * Severity levels for identified issues
 */
export var IssueSeverity;
(function (IssueSeverity) {
    IssueSeverity["CRITICAL"] = "CRITICAL";
    IssueSeverity["HIGH"] = "HIGH";
    IssueSeverity["MEDIUM"] = "MEDIUM";
    IssueSeverity["LOW"] = "LOW";
})(IssueSeverity || (IssueSeverity = {}));
/**
 * Issue categories
 */
export var IssueCategory;
(function (IssueCategory) {
    IssueCategory["SECURITY"] = "SECURITY";
    IssueCategory["QUALITY"] = "QUALITY";
    IssueCategory["TESTING"] = "TESTING";
    IssueCategory["PERFORMANCE"] = "PERFORMANCE";
    IssueCategory["TECHNICAL_DEBT"] = "TECHNICAL_DEBT";
})(IssueCategory || (IssueCategory = {}));
/**
 * Reflection depth modes
 */
export var ReflectionDepth;
(function (ReflectionDepth) {
    ReflectionDepth["QUICK"] = "quick";
    ReflectionDepth["STANDARD"] = "standard";
    ReflectionDepth["DEEP"] = "deep"; // <60s, detailed + architectural
})(ReflectionDepth || (ReflectionDepth = {}));
/**
 * AI model selection for reflection
 */
export var ReflectionModel;
(function (ReflectionModel) {
    ReflectionModel["HAIKU"] = "haiku";
    ReflectionModel["SONNET"] = "sonnet";
    ReflectionModel["OPUS"] = "opus"; // Deep analysis (~$0.15/task)
})(ReflectionModel || (ReflectionModel = {}));
/**
 * Reflection execution mode
 */
export var ReflectionMode;
(function (ReflectionMode) {
    ReflectionMode["AUTO"] = "auto";
    ReflectionMode["MANUAL"] = "manual";
    ReflectionMode["DISABLED"] = "disabled"; // Reflection disabled
})(ReflectionMode || (ReflectionMode = {}));
/**
 * Default reflection configuration
 */
export const DEFAULT_REFLECTION_CONFIG = {
    enabled: true,
    mode: ReflectionMode.AUTO,
    depth: ReflectionDepth.STANDARD,
    model: ReflectionModel.HAIKU,
    categories: {
        security: true,
        quality: true,
        testing: true,
        performance: true,
        technicalDebt: true
    },
    criticalThreshold: IssueSeverity.MEDIUM,
    storeReflections: true,
    autoCreateFollowUpTasks: false,
    soundNotifications: false
};
//# sourceMappingURL=reflection-types.js.map