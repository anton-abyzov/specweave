import fs from "fs-extra";
import {
  detectLanguage,
  prepareTranslation,
  postProcessTranslation,
  getLanguageName
} from "../../../../src/utils/translation.js";
async function invokeTranslatorSkill(content, sourceLang, targetLang = "en") {
  try {
    const prepared = prepareTranslation(content, sourceLang, targetLang);
    const result = {
      success: true,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      originalContent: content,
      translatedContent: await performTranslation(prepared.prompt, prepared.preserved)
    };
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      originalContent: content,
      error: errorMessage
    };
  }
}
async function performTranslation(prompt, preserved) {
  const contentMatch = prompt.match(/SOURCE DOCUMENT[^\n]*:\n---\n([\s\S]*?)\n---/);
  const contentToTranslate = contentMatch ? contentMatch[1] : "";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    console.log(`
\u{1F916} Translating via Anthropic API (Haiku model)...`);
    try {
      const Anthropic = await import("@anthropic-ai/sdk").then((m) => m.default);
      const anthropic = new Anthropic({
        apiKey
      });
      const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 8e3,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });
      const translatedContent = message.content[0].type === "text" ? message.content[0].text : contentToTranslate;
      console.log(`\u2705 Translation complete via API`);
      console.log(`   Input tokens: ${message.usage.input_tokens}`);
      console.log(`   Output tokens: ${message.usage.output_tokens}`);
      console.log(`   Cost: ~$${((message.usage.input_tokens * 0.25 + message.usage.output_tokens * 1.25) / 1e6).toFixed(4)}
`);
      return postProcessTranslation(translatedContent, preserved);
    } catch (error) {
      console.error(`
\u274C API translation failed: ${error.message}`);
      console.error(`   Falling back to manual translation instructions
`);
    }
  }
  const isInteractive = process.env.CLAUDE_CODE_SESSION === "true";
  if (isInteractive) {
    console.log("\n" + "=".repeat(80));
    console.log("\u{1F310} TRANSLATION REQUEST (translator skill will auto-activate)");
    console.log("=".repeat(80));
    console.log(prompt);
    console.log("=".repeat(80));
    console.log("\u{1F4A1} Tip: Set ANTHROPIC_API_KEY for fully automatic translation\n");
    return postProcessTranslation(
      `<!-- \u26A0\uFE0F TRANSLATION REQUESTED - Awaiting translator skill activation -->

${contentToTranslate}`,
      preserved
    );
  } else {
    console.error("\n\u26A0\uFE0F  AUTO-TRANSLATION REQUIRES ONE OF:");
    console.error("   Option A (Recommended): Set ANTHROPIC_API_KEY environment variable");
    console.error("   Option B: Run /specweave:translate <file-path>");
    console.error("   Option C: Manually translate the content\n");
    return postProcessTranslation(
      `<!-- \u26A0\uFE0F AUTO-TRANSLATION PENDING -->
<!-- Set ANTHROPIC_API_KEY for automatic translation -->
<!-- Or run: /specweave:translate to complete -->
<!-- Original content below -->

${contentToTranslate}`,
      preserved
    );
  }
}
async function translateFile(filePath, targetLang = "en") {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = await fs.readFile(filePath, "utf-8");
  const detection = detectLanguage(content);
  const sourceLang = detection.language;
  if (sourceLang === targetLang) {
    return {
      success: true,
      filePath,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      originalContent: content,
      translatedContent: content
    };
  }
  const result = await invokeTranslatorSkill(content, sourceLang, targetLang);
  if (result.success && result.translatedContent) {
    await fs.writeFile(filePath, result.translatedContent, "utf-8");
    console.log(`\u2705 Translated: ${filePath} (${getLanguageName(sourceLang)} \u2192 ${getLanguageName(targetLang)})`);
  }
  return {
    ...result,
    filePath
  };
}
async function batchTranslateFiles(filePaths, targetLang = "en") {
  const results = [];
  console.log(`
\u{1F310} Batch translating ${filePaths.length} file(s) to ${getLanguageName(targetLang)}...
`);
  for (const filePath of filePaths) {
    try {
      const result = await translateFile(filePath, targetLang);
      results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\u274C Failed to translate ${filePath}: ${errorMessage}`);
      results.push({
        success: false,
        filePath,
        sourceLanguage: "unknown",
        targetLanguage: targetLang,
        originalContent: "",
        error: errorMessage
      });
    }
  }
  const successful = results.filter((r) => r.success).length;
  console.log(`
\u{1F4CA} Batch translation complete: ${successful}/${filePaths.length} files translated
`);
  return results;
}
export {
  batchTranslateFiles,
  invokeTranslatorSkill,
  translateFile
};
