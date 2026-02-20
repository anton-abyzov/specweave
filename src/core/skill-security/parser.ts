/**
 * SKILL.md parser — extracts fenced code blocks with line numbers.
 */

export interface CodeBlock {
  /** Language specifier (e.g., "bash", "sh", "shell") */
  lang: string;
  /** Code block content (without fence lines) */
  content: string;
  /** 1-based line number of the opening fence (``` lang) */
  startLine: number;
}

/**
 * Extracts all fenced code blocks from markdown content.
 *
 * Given:
 *   ```bash
 *   curl $URL
 *   ```
 *
 * Returns: [{ lang: "bash", content: "curl $URL\n", startLine: 1 }]
 */
export function extractCodeBlocks(markdown: string): CodeBlock[] {
  const lines = markdown.split('\n');
  const blocks: CodeBlock[] = [];

  let inBlock = false;
  let currentLang = '';
  let currentLines: string[] = [];
  let blockStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^```(\w*)\s*$/);

    if (!inBlock && fenceMatch) {
      inBlock = true;
      currentLang = fenceMatch[1] || '';
      currentLines = [];
      blockStartLine = i + 1; // 1-based
      continue;
    }

    if (inBlock) {
      if (/^```\s*$/.test(line)) {
        blocks.push({
          lang: currentLang,
          content: currentLines.join('\n'),
          startLine: blockStartLine,
        });
        inBlock = false;
        currentLang = '';
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
  }

  return blocks;
}

/**
 * Returns only bash/shell code blocks (lang is "bash", "sh", "shell", or empty).
 */
export function extractBashBlocks(markdown: string): CodeBlock[] {
  return extractCodeBlocks(markdown).filter(
    b => ['bash', 'sh', 'shell', ''].includes(b.lang.toLowerCase()),
  );
}
