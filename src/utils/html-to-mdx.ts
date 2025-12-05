/**
 * HTML to MDX Sanitizer
 *
 * Self-healing utility that sanitizes HTML content from external tools (ADO, JIRA, GitHub)
 * for MDX compatibility. MDX uses JSX syntax which has stricter rules than HTML5.
 *
 * Common MDX compatibility issues fixed:
 * 1. Unquoted attributes: target=_blank → target="_blank"
 * 2. Self-closing tags: <br> → <br />
 * 3. HTML entities: decoded to characters
 *
 * @module utils/html-to-mdx
 */

/**
 * Sanitize HTML content for MDX compatibility
 *
 * Apply to ALL content imported from external tools before writing to .md files.
 *
 * @param html - Raw HTML content from external tool (ADO, JIRA, GitHub)
 * @returns Sanitized content safe for MDX compilation
 *
 * @example
 * ```typescript
 * const description = sanitizeHtmlForMdx(adoWorkItem.fields['System.Description']);
 * ```
 */
export function sanitizeHtmlForMdx(html: string | null | undefined): string {
  if (!html) return '';

  let result = html;

  // 1. Fix unquoted HTML attributes (CRITICAL - main cause of MDX failures)
  // Pattern: attr=value (not attr="value" or attr='value' or attr={value})
  // Common patterns: target=_blank, rel=noopener, dir=auto, alt=image
  result = result.replace(
    /(\s)([a-zA-Z][a-zA-Z0-9-]*)=([^"'\s{][^\s>]*)/g,
    '$1$2="$3"'
  );

  // 2. Fix self-closing tags (HTML5 allows <br>, MDX/JSX requires <br />)
  const selfClosingTags = [
    'br',
    'hr',
    'img',
    'input',
    'meta',
    'link',
    'area',
    'base',
    'col',
    'embed',
    'source',
    'track',
    'wbr',
  ];
  for (const tag of selfClosingTags) {
    // Match <tag> or <tag attr="value"> without closing slash
    const regex = new RegExp(`<${tag}(\\s[^>]*)?(?<!/)>`, 'gi');
    result = result.replace(regex, (match) => {
      return match.slice(0, -1) + ' />';
    });
  }

  // 3. Decode common HTML entities
  result = result
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");

  return result;
}

/**
 * Validate MDX compatibility without modifying content
 *
 * Use for validation hooks that need to detect issues without fixing.
 *
 * @param content - Content to validate
 * @returns Array of issue descriptions found
 */
export function validateMdxCompatibility(content: string): string[] {
  if (!content) return [];

  const issues: string[] = [];

  // Check for unquoted attributes
  const unquotedAttrRegex = /(\s)([a-zA-Z][a-zA-Z0-9-]*)=([^"'\s{][^\s>]*)/g;
  let match;
  while ((match = unquotedAttrRegex.exec(content)) !== null) {
    issues.push(`Unquoted attribute: ${match[2]}=${match[3]}`);
  }

  // Check for non-self-closing void elements
  const selfClosingTags = ['br', 'hr', 'img', 'input'];
  for (const tag of selfClosingTags) {
    const regex = new RegExp(`<${tag}(\\s[^>]*)?(?<!/)>`, 'gi');
    while ((match = regex.exec(content)) !== null) {
      issues.push(`Self-closing tag without slash: ${match[0]}`);
    }
  }

  return issues;
}
