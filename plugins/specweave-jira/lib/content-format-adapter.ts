/**
 * Content Format Adapter
 *
 * Converts content between formats based on JIRA API version:
 * - API v3 (Cloud): Atlassian Document Format (ADF)
 * - API v2 (Server/DC): Wiki markup
 *
 * @module content-format-adapter
 */

import { getApiVersion } from './jira-deployment-detector.js';

/** ADF document node */
export interface AdfDocument {
  type: 'doc';
  version: 1;
  content: AdfNode[];
}

export interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

/**
 * Convert text/wiki markup to ADF document format.
 */
export function toADF(text: string): AdfDocument {
  const lines = text.split('\n');
  const content: AdfNode[] = [];
  let currentParagraph: AdfNode[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      content.push({ type: 'paragraph', content: [...currentParagraph] });
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    // Headings: h1. h2. h3. or # ## ###
    const wikiHeadingMatch = line.match(/^h(\d)\.\s+(.+)$/);
    const mdHeadingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (wikiHeadingMatch) {
      flushParagraph();
      const level = parseInt(wikiHeadingMatch[1]);
      content.push({
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: wikiHeadingMatch[2] }],
      });
      continue;
    }

    if (mdHeadingMatch) {
      flushParagraph();
      const level = mdHeadingMatch[1].length;
      content.push({
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: mdHeadingMatch[2] }],
      });
      continue;
    }

    // Horizontal rule: ---- or ---
    if (/^-{3,}$/.test(line.trim())) {
      flushParagraph();
      content.push({ type: 'rule' });
      continue;
    }

    // Bullet list item: * item or - item
    const bulletMatch = line.match(/^\*\s+(.+)$/) || line.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      const listItem: AdfNode = {
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: bulletMatch[1] }] }],
      };
      // Append to existing bulletList if the last node is one (consecutive items)
      const lastNode = content[content.length - 1];
      if (lastNode && lastNode.type === 'bulletList' && lastNode.content) {
        lastNode.content.push(listItem);
      } else {
        content.push({ type: 'bulletList', content: [listItem] });
      }
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // Bold: *text* → strong mark
    let textContent = line;
    const textNodes: AdfNode[] = [];

    // Simple inline formatting: *bold* and _italic_
    const parts = textContent.split(/(\*[^*]+\*|_[^_]+_)/);
    for (const part of parts) {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        textNodes.push({
          type: 'text',
          text: part.slice(1, -1),
          marks: [{ type: 'strong' }],
        });
      } else if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
        textNodes.push({
          type: 'text',
          text: part.slice(1, -1),
          marks: [{ type: 'em' }],
        });
      } else if (part) {
        textNodes.push({ type: 'text', text: part });
      }
    }

    currentParagraph.push(...textNodes);
  }

  flushParagraph();

  // Ensure at least one paragraph
  if (content.length === 0) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: text || '' }],
    });
  }

  return {
    type: 'doc',
    version: 1,
    content,
  };
}

/**
 * Convert content to wiki markup format (for JIRA Server/DC API v2).
 * If already in wiki markup, returns as-is.
 */
export function toWikiMarkup(text: string): string {
  // Already wiki markup — return as-is
  return text;
}

/**
 * Format content based on JIRA API version.
 *
 * @param text - Raw text/wiki markup content
 * @param domain - JIRA domain (used to look up cached API version)
 * @returns ADF document for v3/Cloud, wiki markup string for v2/Server
 */
export function formatContent(text: string, domain: string): AdfDocument | string {
  const version = getApiVersion(domain);
  if (version === '3') {
    return toADF(text);
  }
  return toWikiMarkup(text);
}

/**
 * Format a description field for JIRA issue create/update payload.
 *
 * @param text - Raw description text
 * @param domain - JIRA domain
 * @returns Properly formatted description for the API version
 */
export function toDescription(text: string, domain: string): AdfDocument | string {
  return formatContent(text, domain);
}

/**
 * Format a comment body for JIRA issue comment payload.
 *
 * @param text - Raw comment text
 * @param domain - JIRA domain
 * @returns Properly formatted comment body for the API version
 */
export function toCommentBody(text: string, domain: string): AdfDocument | string {
  return formatContent(text, domain);
}
