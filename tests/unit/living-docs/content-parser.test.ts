import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for Content Parser
 */

import { ContentParser, parseMarkdown } from '../../../src/core/living-docs/content-parser';

describe('ContentParser', () => {
  let parser: ContentParser;

  beforeEach(() => {
    parser = new ContentParser();
  });

  describe('Basic Parsing', () => {
    it('should parse markdown with frontmatter', () => {
      const markdown = `---
title: Test Spec
status: draft
---

# Main Heading

Content goes here.
`;

      const result = parser.parse(markdown);

      expect(result.frontmatter).toEqual({
        title: 'Test Spec',
        status: 'draft',
      });
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].heading).toBe('Main Heading');
    });

    it('should parse markdown without frontmatter', () => {
      const markdown = `# Main Heading

Content goes here.
`;

      const result = parser.parse(markdown);

      expect(result.frontmatter).toEqual({});
      expect(result.sections).toHaveLength(1);
    });

    it('should parse multiple top-level sections', () => {
      const markdown = `# Section 1

Content 1

# Section 2

Content 2

# Section 3

Content 3
`;

      const result = parser.parse(markdown);

      expect(result.sections).toHaveLength(3);
      expect(result.sections[0].heading).toBe('Section 1');
      expect(result.sections[1].heading).toBe('Section 2');
      expect(result.sections[2].heading).toBe('Section 3');
    });
  });

  describe('Section Hierarchy', () => {
    it('should build section hierarchy correctly', () => {
      const markdown = `# Level 1

Content

## Level 2A

Content 2A

### Level 3A

Content 3A

## Level 2B

Content 2B

# Level 1 Again

Content
`;

      const result = parser.parse(markdown);

      expect(result.sections).toHaveLength(2); // Only top-level sections
      expect(result.sections[0].heading).toBe('Level 1');
      expect(result.sections[0].children).toHaveLength(2); // 2A and 2B
      expect(result.sections[0].children[0].heading).toBe('Level 2A');
      expect(result.sections[0].children[0].children).toHaveLength(1); // 3A
      expect(result.sections[0].children[0].children[0].heading).toBe('Level 3A');
      expect(result.sections[1].heading).toBe('Level 1 Again');
    });

    it('should handle nested sections at various levels', () => {
      const markdown = `## Level 2 Start

Content

### Level 3

Content

#### Level 4

Content

## Level 2 Again

Content
`;

      const result = parser.parse(markdown);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].level).toBe(2);
      expect(result.sections[0].children).toHaveLength(1);
      expect(result.sections[0].children[0].level).toBe(3);
      expect(result.sections[0].children[0].children).toHaveLength(1);
      expect(result.sections[0].children[0].children[0].level).toBe(4);
    });
  });

  describe('Code Block Extraction', () => {
    it('should extract code blocks', () => {
      const markdown = `# Section

Some text

\`\`\`typescript
const x = 1;
const y = 2;
\`\`\`

More text

\`\`\`javascript
console.log('hello');
\`\`\`
`;

      const result = parser.parse(markdown);

      expect(result.sections[0].codeBlocks).toHaveLength(2);
      expect(result.sections[0].codeBlocks[0].language).toBe('typescript');
      expect(result.sections[0].codeBlocks[0].content).toContain('const x = 1;');
      expect(result.sections[0].codeBlocks[1].language).toBe('javascript');
      expect(result.sections[0].codeBlocks[1].content).toContain("console.log('hello')");
    });

    it('should handle code blocks without language', () => {
      const markdown = `# Section

\`\`\`
plain text
\`\`\`
`;

      const result = parser.parse(markdown);

      expect(result.sections[0].codeBlocks).toHaveLength(1);
      expect(result.sections[0].codeBlocks[0].language).toBe('text');
    });
  });

  describe('Link Extraction', () => {
    it('should extract markdown links', () => {
      const markdown = `# Section

Check out [Google](https://google.com) and [local](./file.md).

Also see [anchor](#heading).
`;

      const result = parser.parse(markdown);

      expect(result.sections[0].links).toHaveLength(3);
      expect(result.sections[0].links[0]).toEqual({
        text: 'Google',
        url: 'https://google.com',
        type: 'external',
      });
      expect(result.sections[0].links[1]).toEqual({
        text: 'local',
        url: './file.md',
        type: 'internal',
      });
      expect(result.sections[0].links[2]).toEqual({
        text: 'anchor',
        url: '#heading',
        type: 'anchor',
      });
    });
  });

  describe('Image Extraction', () => {
    it('should extract images', () => {
      const markdown = `# Section

![Alt text](image.png)

![Another](https://example.com/image.jpg "Title")
`;

      const result = parser.parse(markdown);

      expect(result.sections[0].images).toHaveLength(2);
      expect(result.sections[0].images[0]).toEqual({
        alt: 'Alt text',
        url: 'image.png',
        title: undefined,
      });
      expect(result.sections[0].images[1]).toEqual({
        alt: 'Another',
        url: 'https://example.com/image.jpg',
        title: 'Title',
      });
    });
  });

  describe('Section ID Generation', () => {
    it('should generate slug IDs from headings', () => {
      const markdown = `# User Stories

## AC-US1-01: Login Flow

### Edge Cases & Error Handling
`;

      const result = parser.parse(markdown);

      expect(result.sections[0].id).toBe('user-stories');
      expect(result.sections[0].children[0].id).toBe('ac-us1-01-login-flow');
      expect(result.sections[0].children[0].children[0].id).toBe('edge-cases-error-handling');
    });

    it('should handle special characters in headings', () => {
      const markdown = `# User's Guide: Getting Started!

## Q&A

## 50% Complete
`;

      const result = parser.parse(markdown);

      expect(result.sections[0].id).toBe('users-guide-getting-started');
      expect(result.sections[0].children[0].id).toBe('qa');
      expect(result.sections[0].children[1].id).toBe('50-complete');
    });
  });

  describe('Utility Methods', () => {
    it('should find sections by ID', () => {
      const markdown = `# Section 1

## Subsection A

## Subsection B

# Section 2
`;

      const result = parser.parse(markdown);
      const found = parser.findSection(result.sections, 'subsection-a');

      expect(found).toBeDefined();
      expect(found?.heading).toBe('Subsection A');
    });

    it('should flatten sections', () => {
      const markdown = `# Section 1

## Subsection A

### Deep

## Subsection B
`;

      const result = parser.parse(markdown);
      const flattened = parser.flattenSections(result.sections);

      expect(flattened).toHaveLength(4); // 1 + 2 + 1
      expect(flattened.map((s) => s.heading)).toEqual([
        'Section 1',
        'Subsection A',
        'Deep',
        'Subsection B',
      ]);
    });

    it('should get sections by level', () => {
      const markdown = `# Level 1

## Level 2

### Level 3

## Level 2 Again
`;

      const result = parser.parse(markdown);
      const level2 = parser.getSectionsByLevel(result.sections, 2);

      expect(level2).toHaveLength(2);
      expect(level2.every((s) => s.level === 2)).toBe(true);
    });

    it('should get content without code', () => {
      const markdown = `# Section

Some text

\`\`\`typescript
const x = 1;
\`\`\`

More text
`;

      const result = parser.parse(markdown);
      const contentWithoutCode = parser.getContentWithoutCode(result.sections[0]);

      expect(contentWithoutCode).not.toContain('const x = 1');
      expect(contentWithoutCode).toContain('Some text');
      expect(contentWithoutCode).toContain('More text');
    });
  });

  describe('Raw Content Generation', () => {
    it('should generate raw content including children', () => {
      const markdown = `# Parent

Parent content

## Child

Child content
`;

      const result = parser.parse(markdown);

      expect(result.sections[0].rawContent).toContain('# Parent');
      expect(result.sections[0].rawContent).toContain('Parent content');
      expect(result.sections[0].rawContent).toContain('## Child');
      expect(result.sections[0].rawContent).toContain('Child content');
    });
  });

  describe('Line Number Tracking', () => {
    it('should track start and end lines', () => {
      const markdown = `---
title: Test
---

# Section 1

Line 1
Line 2
Line 3

## Subsection

Content

# Section 2

Final
`;

      const result = parser.parse(markdown);

      expect(result.sections[0].startLine).toBeGreaterThan(0);
      expect(result.sections[0].endLine).toBeGreaterThan(result.sections[0].startLine);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty markdown', () => {
      const result = parser.parse('');

      expect(result.frontmatter).toEqual({});
      expect(result.sections).toHaveLength(0);
    });

    it('should handle markdown with only frontmatter', () => {
      const markdown = `---
title: Test
---`;

      const result = parser.parse(markdown);

      expect(result.frontmatter.title).toBe('Test');
      expect(result.sections).toHaveLength(0);
    });

    it('should handle headings with no content', () => {
      const markdown = `# Heading 1

# Heading 2

# Heading 3`;

      const result = parser.parse(markdown);

      expect(result.sections).toHaveLength(3);
      expect(result.sections[0].content).toBe('');
      expect(result.sections[1].content).toBe('');
      expect(result.sections[2].content).toBe('');
    });

    it('should handle multiple consecutive empty lines', () => {
      const markdown = `# Section


Content with spaces


More content
`;

      const result = parser.parse(markdown);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].content.includes('Content with spaces')).toBe(true);
    });
  });

  describe('Parser Options', () => {
    it('should respect maxDepth option', () => {
      const markdown = `# L1
## L2
### L3
#### L4
##### L5
###### L6
`;

      const parser = new ContentParser({ maxDepth: 3 });
      const result = parser.parse(markdown);

      const flattened = parser.flattenSections(result.sections);
      const maxLevel = Math.max(...flattened.map((s) => s.level));

      expect(maxLevel).toBeLessThanOrEqual(3);
    });

    it('should respect preserveCodeBlocks option', () => {
      const markdown = `# Section

\`\`\`
code
\`\`\`
`;

      const parserWithCode = new ContentParser({ preserveCodeBlocks: true });
      const parserWithoutCode = new ContentParser({ preserveCodeBlocks: false });

      const resultWith = parserWithCode.parse(markdown);
      const resultWithout = parserWithoutCode.parse(markdown);

      expect(resultWith.sections[0].codeBlocks.length).toBeGreaterThan(0);
      expect(resultWithout.sections[0].codeBlocks).toHaveLength(0);
    });
  });

  describe('Factory Functions', () => {
    it('should work with parseMarkdown convenience function', () => {
      const markdown = `# Test

Content
`;

      const result = parseMarkdown(markdown);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].heading).toBe('Test');
    });
  });
});
