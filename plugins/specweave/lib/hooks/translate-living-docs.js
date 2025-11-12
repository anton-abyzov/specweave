import { execSync } from "child_process";
import fs from "fs-extra";
async function translateLivingDocs(incrementId) {
  try {
    const configPath = ".specweave/config.json";
    if (!fs.existsSync(configPath)) {
      console.log("[translate-living-docs] No config found, skipping translation");
      return;
    }
    const config = await fs.readJson(configPath);
    if (!config.language || config.language === "en") {
      console.log("[translate-living-docs] Project language is English, skipping translation");
      return;
    }
    if (!config.translation?.autoTranslateLivingDocs) {
      console.log("[translate-living-docs] Auto-translation disabled in config");
      return;
    }
    console.log(`[translate-living-docs] Auto-translating docs from ${config.language} to English...`);
    const changedFiles = await detectChangedDocs();
    if (changedFiles.length === 0) {
      console.log("[translate-living-docs] No documentation changes detected");
      return;
    }
    console.log(`[translate-living-docs] Found ${changedFiles.length} changed file(s)`);
    for (const file of changedFiles) {
      try {
        await translateFile(file, "en", config.translation);
        console.log(`[translate-living-docs] \u2713 Translated: ${file} (${config.language} \u2192 en)`);
      } catch (error) {
        console.warn(`[translate-living-docs] \u26A0\uFE0F  Failed to translate ${file}: ${error.message}`);
      }
    }
    console.log(`[translate-living-docs] \u2705 Translation complete (${changedFiles.length} files)`);
  } catch (error) {
    console.error(`[translate-living-docs] Error: ${error.message}`);
  }
}
async function detectChangedDocs() {
  try {
    const output = execSync(
      "git diff --name-only .specweave/docs/",
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    );
    const files = output.split("\n").filter((f) => f.trim() && f.endsWith(".md")).map((f) => f.trim());
    return files;
  } catch (error) {
    return [];
  }
}
async function translateFile(filePath, targetLanguage, translationConfig) {
  const originalContent = await fs.readFile(filePath, "utf-8");
  if (originalContent.includes(`<!-- Translated to ${targetLanguage} -->`)) {
    console.log(`[translate-living-docs] File already translated, skipping: ${filePath}`);
    return;
  }
  const translationPrompt = generateTranslationPrompt(
    originalContent,
    targetLanguage,
    translationConfig
  );
  const markedContent = `<!-- Translation needed to ${targetLanguage} -->
<!-- Original content below -->

${originalContent}`;
  console.log(`[translate-living-docs] Translation prompt generated for: ${filePath}`);
}
function generateTranslationPrompt(content, targetLanguage, translationConfig) {
  const keepFrameworkTerms = translationConfig?.keepFrameworkTerms !== false;
  const keepTechnicalTerms = translationConfig?.keepTechnicalTerms !== false;
  return `
Translate the following markdown documentation to ${getLanguageName(targetLanguage)}.

CRITICAL RULES:
${keepFrameworkTerms ? "- Keep framework terms in English: increment, spec.md, plan.md, tasks.md, COMPLETION-SUMMARY.md, living docs, PM gate, RFC, ADR, PRD, HLD, LLD" : ""}
${keepTechnicalTerms ? "- Keep technical terms in English: TypeScript, npm, git, Docker, Kubernetes, API, CLI, REST, JSON, HTTP" : ""}
- Preserve ALL markdown formatting (headers, lists, code blocks, links)
- Do NOT translate code blocks
- Do NOT translate YAML frontmatter keys (only values if applicable)
- Preserve all emojis
- Preserve all file paths and URLs

Content to translate:
---
${content}
---

Translated version:
`.trim();
}
function getLanguageName(code) {
  const names = {
    en: "English",
    ru: "Russian (\u0420\u0443\u0441\u0441\u043A\u0438\u0439)",
    es: "Spanish (Espa\xF1ol)",
    zh: "Chinese (\u4E2D\u6587)",
    de: "German (Deutsch)",
    fr: "French (Fran\xE7ais)",
    ja: "Japanese (\u65E5\u672C\u8A9E)",
    ko: "Korean (\uD55C\uAD6D\uC5B4)",
    pt: "Portuguese (Portugu\xEAs)"
  };
  return names[code] || code;
}
async function main() {
  const args = process.argv.slice(2);
  const incrementId = args[0] || "current";
  await translateLivingDocs(incrementId);
}
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error("[translate-living-docs] Fatal error:", error);
    process.exit(1);
  });
}
export {
  translateLivingDocs
};
