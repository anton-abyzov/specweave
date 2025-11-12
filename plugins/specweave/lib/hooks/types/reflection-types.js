var IssueSeverity = /* @__PURE__ */ ((IssueSeverity2) => {
  IssueSeverity2["CRITICAL"] = "CRITICAL";
  IssueSeverity2["HIGH"] = "HIGH";
  IssueSeverity2["MEDIUM"] = "MEDIUM";
  IssueSeverity2["LOW"] = "LOW";
  return IssueSeverity2;
})(IssueSeverity || {});
var IssueCategory = /* @__PURE__ */ ((IssueCategory2) => {
  IssueCategory2["SECURITY"] = "SECURITY";
  IssueCategory2["QUALITY"] = "QUALITY";
  IssueCategory2["TESTING"] = "TESTING";
  IssueCategory2["PERFORMANCE"] = "PERFORMANCE";
  IssueCategory2["TECHNICAL_DEBT"] = "TECHNICAL_DEBT";
  return IssueCategory2;
})(IssueCategory || {});
var ReflectionDepth = /* @__PURE__ */ ((ReflectionDepth2) => {
  ReflectionDepth2["QUICK"] = "quick";
  ReflectionDepth2["STANDARD"] = "standard";
  ReflectionDepth2["DEEP"] = "deep";
  return ReflectionDepth2;
})(ReflectionDepth || {});
var ReflectionModel = /* @__PURE__ */ ((ReflectionModel2) => {
  ReflectionModel2["HAIKU"] = "haiku";
  ReflectionModel2["SONNET"] = "sonnet";
  ReflectionModel2["OPUS"] = "opus";
  return ReflectionModel2;
})(ReflectionModel || {});
var ReflectionMode = /* @__PURE__ */ ((ReflectionMode2) => {
  ReflectionMode2["AUTO"] = "auto";
  ReflectionMode2["MANUAL"] = "manual";
  ReflectionMode2["DISABLED"] = "disabled";
  return ReflectionMode2;
})(ReflectionMode || {});
const DEFAULT_REFLECTION_CONFIG = {
  enabled: true,
  mode: "auto" /* AUTO */,
  depth: "standard" /* STANDARD */,
  model: "haiku" /* HAIKU */,
  categories: {
    security: true,
    quality: true,
    testing: true,
    performance: true,
    technicalDebt: true
  },
  criticalThreshold: "MEDIUM" /* MEDIUM */,
  storeReflections: true,
  autoCreateFollowUpTasks: false,
  soundNotifications: false
};
export {
  DEFAULT_REFLECTION_CONFIG,
  IssueCategory,
  IssueSeverity,
  ReflectionDepth,
  ReflectionMode,
  ReflectionModel
};
