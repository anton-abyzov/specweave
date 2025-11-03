/**
 * System Prompt Injector
 * 
 * Injects language-specific system prompts into skills, agents, and commands.
 * This enables LLM-native multilingual support without translation costs.
 * 
 * @module core/i18n
 */

import fs from 'fs-extra';
import path from 'path';
import { SupportedLanguage, SystemPromptTemplate } from './types.js';
import { getSystemPrompt } from './language-registry.js';

/**
 * Inject system prompt into markdown file
 */
export async function injectSystemPrompt(
  filePath: string,
  targetLanguage: SupportedLanguage,
  options?: {
    placement?: 'top' | 'after-frontmatter' | 'bottom';
    overwrite?: boolean;
  }
): Promise<void> {
  const { placement = 'after-frontmatter', overwrite = false } = options || {};

  // Read file content
  const content = await fs.readFile(filePath, 'utf-8');

  // Get system prompt for target language
  const systemPrompt = getSystemPrompt(targetLanguage);

  // If English or no prompt needed, skip
  if (!systemPrompt) {
    return;
  }

  // Check if prompt already exists
  if (content.includes('**LANGUAGE INSTRUCTION**') && !overwrite) {
    console.log(`⏭️  Prompt already exists in ${filePath}, skipping...`);
    return;
  }

  // Inject prompt based on placement
  let newContent: string;

  if (placement === 'top') {
    newContent = `${systemPrompt}\n\n---\n\n${content}`;
  } else if (placement === 'after-frontmatter') {
    newContent = injectAfterFrontmatter(content, systemPrompt);
  } else {
    newContent = `${content}\n\n---\n\n${systemPrompt}`;
  }

  // Write back to file
  await fs.writeFile(filePath, newContent, 'utf-8');
  console.log(`✅ Injected ${targetLanguage} prompt into ${filePath}`);
}

/**
 * Inject system prompt after YAML frontmatter
 */
function injectAfterFrontmatter(content: string, systemPrompt: string): string {
  // Check if file has frontmatter (starts with ---)
  if (!content.startsWith('---')) {
    // No frontmatter, inject at top
    return `${systemPrompt}\n\n---\n\n${content}`;
  }

  // Find end of frontmatter (second ---)
  const lines = content.split('\n');
  let frontmatterEnd = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      frontmatterEnd = i;
      break;
    }
  }

  if (frontmatterEnd === -1) {
    // Malformed frontmatter, inject at top
    return `${systemPrompt}\n\n---\n\n${content}`;
  }

  // Inject after frontmatter
  const beforeFrontmatter = lines.slice(0, frontmatterEnd + 1).join('\n');
  const afterFrontmatter = lines.slice(frontmatterEnd + 1).join('\n');

  return `${beforeFrontmatter}\n\n${systemPrompt}\n\n${afterFrontmatter}`;
}

/**
 * Remove system prompt from file
 */
export async function removeSystemPrompt(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Remove LANGUAGE INSTRUCTION block
  const cleanedContent = content.replace(
    /\*\*LANGUAGE INSTRUCTION\*\*:.*?\n\n/gs,
    ''
  );

  await fs.writeFile(filePath, cleanedContent, 'utf-8');
  console.log(`✅ Removed system prompt from ${filePath}`);
}

/**
 * Batch inject prompts into directory
 */
export async function injectPromptsIntoDirectory(
  dirPath: string,
  targetLanguage: SupportedLanguage,
  options?: {
    filePattern?: RegExp;
    recursive?: boolean;
    overwrite?: boolean;
  }
): Promise<number> {
  const { filePattern = /\.md$/, recursive = true, overwrite = false } = options || {};

  let injectedCount = 0;
  const files = await getMarkdownFiles(dirPath, recursive);

  for (const file of files) {
    if (filePattern.test(file)) {
      try {
        await injectSystemPrompt(file, targetLanguage, { overwrite });
        injectedCount++;
      } catch (error) {
        console.error(`❌ Failed to inject prompt into ${file}:`, error);
      }
    }
  }

  console.log(`\n✅ Injected prompts into ${injectedCount} files`);
  return injectedCount;
}

/**
 * Get all markdown files in directory
 */
async function getMarkdownFiles(dirPath: string, recursive: boolean): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && recursive) {
      const subFiles = await getMarkdownFiles(fullPath, recursive);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Create system prompt template
 */
export function createSystemPromptTemplate(
  language: SupportedLanguage,
  placement: 'top' | 'after-frontmatter' | 'bottom' = 'after-frontmatter'
): SystemPromptTemplate {
  return {
    language,
    prompt: getSystemPrompt(language),
    placement,
  };
}
