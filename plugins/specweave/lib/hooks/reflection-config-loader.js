import fs from "fs-extra";
import path from "path";
import { DEFAULT_REFLECTION_CONFIG } from "./types/reflection-types";
function findSpecweaveRoot(startDir = process.cwd()) {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;
  while (currentDir !== root) {
    const specweavePath = path.join(currentDir, ".specweave");
    if (fs.existsSync(specweavePath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}
function loadReflectionConfig(projectRoot) {
  const rootDir = projectRoot || findSpecweaveRoot();
  if (!rootDir) {
    return { ...DEFAULT_REFLECTION_CONFIG };
  }
  const configPath = path.join(rootDir, ".specweave", "config.json");
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_REFLECTION_CONFIG };
  }
  try {
    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);
    const userReflectionConfig = config.reflection || {};
    const mergedConfig = {
      enabled: userReflectionConfig.enabled ?? DEFAULT_REFLECTION_CONFIG.enabled,
      mode: userReflectionConfig.mode ?? DEFAULT_REFLECTION_CONFIG.mode,
      depth: userReflectionConfig.depth ?? DEFAULT_REFLECTION_CONFIG.depth,
      model: userReflectionConfig.model ?? DEFAULT_REFLECTION_CONFIG.model,
      categories: {
        security: userReflectionConfig.categories?.security ?? DEFAULT_REFLECTION_CONFIG.categories.security,
        quality: userReflectionConfig.categories?.quality ?? DEFAULT_REFLECTION_CONFIG.categories.quality,
        testing: userReflectionConfig.categories?.testing ?? DEFAULT_REFLECTION_CONFIG.categories.testing,
        performance: userReflectionConfig.categories?.performance ?? DEFAULT_REFLECTION_CONFIG.categories.performance,
        technicalDebt: userReflectionConfig.categories?.technicalDebt ?? DEFAULT_REFLECTION_CONFIG.categories.technicalDebt
      },
      criticalThreshold: userReflectionConfig.criticalThreshold ?? DEFAULT_REFLECTION_CONFIG.criticalThreshold,
      storeReflections: userReflectionConfig.storeReflections ?? DEFAULT_REFLECTION_CONFIG.storeReflections,
      autoCreateFollowUpTasks: userReflectionConfig.autoCreateFollowUpTasks ?? DEFAULT_REFLECTION_CONFIG.autoCreateFollowUpTasks,
      soundNotifications: userReflectionConfig.soundNotifications ?? DEFAULT_REFLECTION_CONFIG.soundNotifications
    };
    return mergedConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${configPath}. ${error.message}`);
    }
    throw error;
  }
}
function validateReflectionConfig(config) {
  const errors = [];
  if (config.enabled && config.mode !== "disabled") {
    const hasEnabledCategory = Object.values(config.categories).some((enabled) => enabled);
    if (!hasEnabledCategory) {
      errors.push("At least one analysis category must be enabled when reflection is active");
    }
  }
  if (!config.enabled && config.mode === "auto") {
    errors.push('Reflection mode cannot be "auto" when reflection is disabled');
  }
  if (config.soundNotifications && !config.enabled) {
    errors.push("Sound notifications require reflection to be enabled");
  }
  if (config.autoCreateFollowUpTasks && !config.storeReflections) {
    errors.push("Auto-create follow-up tasks requires storeReflections to be enabled");
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
function loadAndValidateReflectionConfig(projectRoot) {
  const config = loadReflectionConfig(projectRoot);
  const validation = validateReflectionConfig(config);
  if (!validation.valid) {
    throw new Error(
      `Invalid reflection configuration:
${validation.errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }
  return config;
}
export {
  findSpecweaveRoot,
  loadAndValidateReflectionConfig,
  loadReflectionConfig,
  validateReflectionConfig
};
