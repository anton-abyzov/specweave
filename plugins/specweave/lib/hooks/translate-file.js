import fs from "fs-extra";
import {
  detectLanguage,
  prepareTranslation,
  postProcessTranslation,
  validateTranslation,
  getLanguageName,
  formatCost
} from "../../../../dist/src/utils/translation.js";
async function translateFile(options) {
  const { filePath, targetLang, preview, verbose } = options;
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  if (verbose) {
    console.log(`\u{1F4C4} Reading file: ${filePath}`);
  }
  const originalContent = await fs.readFile(filePath, "utf-8");
  const detectionResult = detectLanguage(originalContent);
  const sourceLanguage = detectionResult.language;
  if (verbose) {
    console.log(`\u{1F50D} Detected language: ${getLanguageName(sourceLanguage)} (confidence: ${(detectionResult.confidence * 100).toFixed(0)}%)`);
  }
  if (sourceLanguage === targetLang) {
    if (verbose) {
      console.log(`\u2705 File already in ${getLanguageName(targetLang)}, skipping translation`);
    }
    return {
      success: true,
      filePath,
      sourceLanguage,
      targetLanguage: targetLang,
      warnings: [`Already in ${getLanguageName(targetLang)}`],
      cost: 0,
      tokensUsed: 0
    };
  }
  if (sourceLanguage === "unknown") {
    if (verbose) {
      console.warn(`\u26A0\uFE0F  Could not detect language, assuming English`);
    }
    return {
      success: false,
      filePath,
      sourceLanguage: "unknown",
      targetLanguage: targetLang,
      warnings: ["Language detection failed - file may already be in English or mixed language"],
      cost: 0,
      tokensUsed: 0
    };
  }
  if (verbose) {
    console.log(`\u{1F310} Translating from ${getLanguageName(sourceLanguage)} to ${getLanguageName(targetLang)}...`);
    console.log(`\u{1F4B0} Estimated cost: ${formatCost(3e-3)} (using Haiku)`);
  }
  const prepared = prepareTranslation(originalContent, sourceLanguage, targetLang);
  const translatedContent = await invokeLLMTranslation(prepared.prompt, verbose);
  const finalContent = postProcessTranslation(translatedContent, prepared.preserved);
  const warnings = validateTranslation(originalContent, finalContent);
  if (warnings.length > 0 && verbose) {
    console.warn(`\u26A0\uFE0F  Translation warnings:`);
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }
  if (preview) {
    if (verbose) {
      console.log(`
\u{1F4CB} PREVIEW (first 500 chars):
`);
      console.log(finalContent.substring(0, 500));
      console.log(`
... (${finalContent.length} total characters)
`);
    }
    return {
      success: true,
      filePath,
      sourceLanguage,
      targetLanguage: targetLang,
      warnings,
      cost: prepared.estimatedCost,
      tokensUsed: prepared.estimatedTokens,
      preview: finalContent
    };
  } else {
    await fs.writeFile(filePath, finalContent, "utf-8");
    if (verbose) {
      console.log(`\u2705 Translation complete: ${filePath}`);
      console.log(`   Tokens used: ${prepared.estimatedTokens.toLocaleString()}`);
      console.log(`   Cost: ${formatCost(prepared.estimatedCost)}`);
    }
    return {
      success: true,
      filePath,
      sourceLanguage,
      targetLanguage: targetLang,
      warnings,
      cost: prepared.estimatedCost,
      tokensUsed: prepared.estimatedTokens
    };
  }
}
async function invokeLLMTranslation(prompt, verbose) {
  const contentMatch = prompt.match(/SOURCE DOCUMENT[^\n]*:\n---\n([\s\S]*?)\n---/);
  const contentToTranslate = contentMatch ? contentMatch[1] : "";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    if (verbose) {
      console.log(`
\u{1F916} Translating via Anthropic API (Haiku model)...`);
    }
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
      if (verbose) {
        console.log(`\u2705 Translation complete via API`);
        console.log(`   Model: claude-3-haiku-20240307`);
        console.log(`   Input tokens: ${message.usage.input_tokens}`);
        console.log(`   Output tokens: ${message.usage.output_tokens}`);
        console.log(`   Cost: ~$${((message.usage.input_tokens * 0.25 + message.usage.output_tokens * 1.25) / 1e6).toFixed(4)}`);
      }
      return translatedContent;
    } catch (error) {
      console.error(`
\u274C API translation failed: ${error.message}`);
      console.error(`   Falling back to manual translation instructions
`);
    }
  }
  const isInteractive = process.stdout.isTTY && process.env.CLAUDE_CODE_SESSION;
  if (isInteractive) {
    if (verbose) {
      console.log(`
\u{1F916} Invoking Claude Code translator skill...`);
      console.log(`   (Tip: Set ANTHROPIC_API_KEY for fully automatic translation)
`);
    }
    console.log("\n" + "=".repeat(80));
    console.log("TRANSLATION REQUEST (translator skill will auto-activate):");
    console.log("=".repeat(80));
    console.log(prompt);
    console.log("=".repeat(80) + "\n");
    return `<!-- \u26A0\uFE0F TRANSLATION IN PROGRESS - Manual translation required via translator skill -->

${contentToTranslate}`;
  } else {
    if (verbose) {
      console.log(`
\u{1F916} Generating translation (automated mode)...`);
    }
    console.error("\n\u26A0\uFE0F  AUTO-TRANSLATION REQUIRES MANUAL STEP:");
    console.error("   Option A (Recommended): Set ANTHROPIC_API_KEY environment variable");
    console.error("   Option B: Run /specweave:translate <file-path>");
    console.error("   Option C: Manually translate the content\n");
    return `<!-- \u26A0\uFE0F AUTO-TRANSLATION PENDING -->
<!-- Set ANTHROPIC_API_KEY for automatic translation -->
<!-- Or run: /specweave:translate to complete -->
<!-- Original content below -->

${contentToTranslate}`;
  }
}
async function batchTranslateFiles(filePaths, targetLang = "en", preview = false, verbose = false) {
  const results = [];
  if (verbose) {
    console.log(`
\u{1F504} Batch translating ${filePaths.length} file(s) to ${getLanguageName(targetLang)}...
`);
  }
  for (const filePath of filePaths) {
    try {
      const result = await translateFile({
        filePath,
        targetLang,
        preview,
        verbose
      });
      results.push(result);
    } catch (error) {
      if (verbose) {
        console.error(`\u274C Error translating ${filePath}: ${error.message}`);
      }
      results.push({
        success: false,
        filePath,
        sourceLanguage: "unknown",
        targetLanguage: targetLang,
        warnings: [error.message],
        cost: 0,
        tokensUsed: 0
      });
    }
  }
  if (verbose) {
    const successful = results.filter((r) => r.success).length;
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);
    console.log(`
\u{1F4CA} Batch Translation Summary:`);
    console.log(`   Successful: ${successful}/${filePaths.length}`);
    console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`   Total cost: ${formatCost(totalCost)}`);
  }
  return results;
}
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Translation CLI Utility

Usage:
  node translate-file.js <file-path> [options]

Options:
  --target-lang <code>  Target language (default: en)
  --preview             Preview translation without writing to file
  --verbose, -v         Show detailed output
  --help, -h            Show this help message

Supported Languages:
  en (English), ru (Russian), es (Spanish), zh (Chinese),
  de (German), fr (French), ja (Japanese), ko (Korean),
  pt (Portuguese), ar (Arabic), he (Hebrew)

Examples:
  # Translate Russian file to English
  node translate-file.js .specweave/increments/0001/spec.md

  # Preview translation
  node translate-file.js spec.md --preview --verbose

  # Translate to Spanish
  node translate-file.js plan.md --target-lang es
    `.trim());
    process.exit(0);
  }
  const filePath = args[0];
  let targetLang = "en";
  let preview = false;
  let verbose = false;
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--target-lang" && args[i + 1]) {
      targetLang = args[i + 1];
      i++;
    } else if (arg === "--preview") {
      preview = true;
    } else if (arg === "--verbose" || arg === "-v") {
      verbose = true;
    }
  }
  return {
    filePath,
    targetLang,
    preview,
    verbose
  };
}
async function main() {
  try {
    const options = parseArgs();
    const result = await translateFile(options);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`\u274C Translation failed: ${error.message}`);
    process.exit(1);
  }
}
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
export {
  batchTranslateFiles,
  translateFile
};
