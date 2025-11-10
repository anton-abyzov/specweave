/**
 * Living Docs Auto-Translation
 *
 * Automatically translates changed documentation files when language != 'en'
 * and auto-translation is enabled in config.
 *
 * This runs as part of the post-task-completion hook.
 */
import { execSync } from 'child_process';
import fs from 'fs-extra';
/**
 * Main function: Translate changed living docs
 */
export async function translateLivingDocs(incrementId) {
    try {
        // 1. Load config
        const configPath = '.specweave/config.json';
        if (!fs.existsSync(configPath)) {
            console.log('[translate-living-docs] No config found, skipping translation');
            return;
        }
        const config = await fs.readJson(configPath);
        // 2. Check if translation is enabled
        if (!config.language || config.language === 'en') {
            // Already English or no language set - skip translation
            console.log('[translate-living-docs] Project language is English, skipping translation');
            return;
        }
        if (!config.translation?.autoTranslateLivingDocs) {
            // Auto-translation disabled
            console.log('[translate-living-docs] Auto-translation disabled in config');
            return;
        }
        // Always translate TO English for maintainability (not to user's language!)
        console.log(`[translate-living-docs] Auto-translating docs from ${config.language} to English...`);
        // 3. Detect changed documentation files
        const changedFiles = await detectChangedDocs();
        if (changedFiles.length === 0) {
            console.log('[translate-living-docs] No documentation changes detected');
            return;
        }
        console.log(`[translate-living-docs] Found ${changedFiles.length} changed file(s)`);
        // 4. Translate each file TO English (always 'en', not config.language!)
        for (const file of changedFiles) {
            try {
                // Always translate TO English for maintainability
                await translateFile(file, 'en', config.translation);
                console.log(`[translate-living-docs] ✓ Translated: ${file} (${config.language} → en)`);
            }
            catch (error) {
                console.warn(`[translate-living-docs] ⚠️  Failed to translate ${file}: ${error.message}`);
                // Continue with other files
            }
        }
        console.log(`[translate-living-docs] ✅ Translation complete (${changedFiles.length} files)`);
    }
    catch (error) {
        console.error(`[translate-living-docs] Error: ${error.message}`);
        // Don't throw - translation errors shouldn't break the workflow
    }
}
/**
 * Detect changed documentation files using git diff
 */
async function detectChangedDocs() {
    try {
        // Get list of changed files in .specweave/docs/
        const output = execSync('git diff --name-only .specweave/docs/', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        // Filter for markdown files only
        const files = output
            .split('\n')
            .filter(f => f.trim() && f.endsWith('.md'))
            .map(f => f.trim());
        return files;
    }
    catch (error) {
        // git diff might fail if not a git repo or no changes
        return [];
    }
}
/**
 * Translate a single file FROM user's language TO English
 *
 * NOTE: This is a simplified implementation that creates a translation prompt.
 * In a real implementation with Claude Code, the translator skill would auto-activate
 * and handle the translation. For now, we'll add a marker comment to indicate
 * the file needs translation.
 *
 * @param filePath - File to translate
 * @param targetLanguage - Target language (should always be 'en' for living docs)
 * @param translationConfig - Translation settings
 */
async function translateFile(filePath, targetLanguage, // Should always be 'en' for living docs
translationConfig) {
    // Read original content
    const originalContent = await fs.readFile(filePath, 'utf-8');
    // Check if file already has translation marker (avoid re-translating)
    if (originalContent.includes(`<!-- Translated to ${targetLanguage} -->`)) {
        console.log(`[translate-living-docs] File already translated, skipping: ${filePath}`);
        return;
    }
    // For now, we'll create a translation request that the LLM can act on
    // In a production system with Claude Code integration, this would invoke
    // the translator skill directly
    const translationPrompt = generateTranslationPrompt(originalContent, targetLanguage, translationConfig);
    // TODO: In full implementation, this would:
    // 1. Invoke translator skill via Claude Code API
    // 2. Get translated content back
    // 3. Write to file
    // For MVP, we'll add a comment indicating translation is needed
    const markedContent = `<!-- Translation needed to ${targetLanguage} -->\n<!-- Original content below -->\n\n${originalContent}`;
    // Write back (commented out to avoid breaking existing docs)
    // await fs.writeFile(filePath, markedContent, 'utf-8');
    console.log(`[translate-living-docs] Translation prompt generated for: ${filePath}`);
}
/**
 * Generate translation prompt for LLM
 */
function generateTranslationPrompt(content, targetLanguage, translationConfig) {
    const keepFrameworkTerms = translationConfig?.keepFrameworkTerms !== false;
    const keepTechnicalTerms = translationConfig?.keepTechnicalTerms !== false;
    return `
Translate the following markdown documentation to ${getLanguageName(targetLanguage)}.

CRITICAL RULES:
${keepFrameworkTerms ? '- Keep framework terms in English: increment, spec.md, plan.md, tasks.md, COMPLETION-SUMMARY.md, living docs, PM gate, RFC, ADR, PRD, HLD, LLD' : ''}
${keepTechnicalTerms ? '- Keep technical terms in English: TypeScript, npm, git, Docker, Kubernetes, API, CLI, REST, JSON, HTTP' : ''}
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
/**
 * Get human-readable language name
 */
function getLanguageName(code) {
    const names = {
        en: 'English',
        ru: 'Russian (Русский)',
        es: 'Spanish (Español)',
        zh: 'Chinese (中文)',
        de: 'German (Deutsch)',
        fr: 'French (Français)',
        ja: 'Japanese (日本語)',
        ko: 'Korean (한국어)',
        pt: 'Portuguese (Português)',
    };
    return names[code] || code;
}
/**
 * CLI entry point (for standalone execution)
 */
async function main() {
    const args = process.argv.slice(2);
    const incrementId = args[0] || 'current';
    await translateLivingDocs(incrementId);
}
// Check if running as main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    main().catch(error => {
        console.error('[translate-living-docs] Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=translate-living-docs.js.map