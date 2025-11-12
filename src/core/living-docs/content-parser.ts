/**
 * Content Parser for Intelligent Living Docs Sync
 *
 * Parses increment spec.md into structured sections for classification and distribution.
 *
 * @module living-docs/content-parser
 */

import matter from 'gray-matter';

/**
 * Represents a code block in the markdown
 */
export interface CodeBlock {
  language: string;
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * Represents a link in the markdown
 */
export interface Link {
  text: string;
  url: string;
  type: 'internal' | 'external' | 'anchor';
}

/**
 * Represents an image reference
 */
export interface Image {
  alt: string;
  url: string;
  title?: string;
}

/**
 * Represents a parsed section of the spec
 */
export interface ParsedSection {
  id: string;              // Unique ID (heading slug)
  heading: string;         // Section heading text
  level: number;           // Heading level (1-6)
  content: string;         // Section content (without heading)
  rawContent: string;      // Raw content (including sub-sections)
  codeBlocks: CodeBlock[]; // Code blocks in this section
  links: Link[];           // Links in this section
  images: Image[];         // Images in this section
  metadata?: Record<string, any>; // Additional metadata
  startLine: number;       // Start line in original file
  endLine: number;         // End line in original file
  children: ParsedSection[]; // Nested sub-sections
}

/**
 * Represents the complete parsed specification
 */
export interface ParsedSpec {
  frontmatter: Record<string, any>; // YAML frontmatter
  sections: ParsedSection[];        // Top-level sections
  raw: string;                      // Original markdown
  filePath?: string;                // Original file path
}

/**
 * Parser options
 */
export interface ParserOptions {
  preserveCodeBlocks?: boolean;  // Extract code blocks separately
  preserveLinks?: boolean;       // Extract links separately
  preserveImages?: boolean;      // Extract images separately
  maxDepth?: number;             // Max heading depth to parse
  includeRawContent?: boolean;   // Include raw content for each section
}

/**
 * Content Parser class
 */
export class ContentParser {
  private options: Required<ParserOptions>;

  constructor(options: ParserOptions = {}) {
    this.options = {
      preserveCodeBlocks: options.preserveCodeBlocks ?? true,
      preserveLinks: options.preserveLinks ?? true,
      preserveImages: options.preserveImages ?? true,
      maxDepth: options.maxDepth ?? 6,
      includeRawContent: options.includeRawContent ?? true,
    };
  }

  /**
   * Parse markdown content into structured sections
   */
  parse(markdown: string, filePath?: string): ParsedSpec {
    // 1. Extract frontmatter
    const { data: frontmatter, content } = matter(markdown);

    // 2. Split into lines for line number tracking
    const lines = content.split('\n');

    // 3. Parse sections
    const sections = this.parseSections(lines, 0, lines.length);

    return {
      frontmatter,
      sections,
      raw: markdown,
      filePath,
    };
  }

  /**
   * Parse sections from lines array (recursive for nested sections)
   */
  private parseSections(
    lines: string[],
    startIndex: number,
    endIndex: number,
    parentLevel: number = 0
  ): ParsedSection[] {
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;
    let sectionContentLines: string[] = [];
    let currentLine = startIndex;

    while (currentLine < endIndex) {
      const line = lines[currentLine];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        const level = headingMatch[1].length;

        // Only process headings at or below max depth
        if (level <= this.options.maxDepth) {
          // Save previous section
          if (currentSection) {
            currentSection.content = sectionContentLines.join('\n').trim();
            currentSection.endLine = currentLine - 1;

            // Parse content elements
            if (this.options.preserveCodeBlocks) {
              currentSection.codeBlocks = this.extractCodeBlocks(currentSection.content);
            }
            if (this.options.preserveLinks) {
              currentSection.links = this.extractLinks(currentSection.content);
            }
            if (this.options.preserveImages) {
              currentSection.images = this.extractImages(currentSection.content);
            }

            sections.push(currentSection);
          }

          // Start new section
          const heading = headingMatch[2].trim();
          currentSection = {
            id: this.slugify(heading),
            heading,
            level,
            content: '',
            rawContent: '',
            codeBlocks: [],
            links: [],
            images: [],
            startLine: currentLine,
            endLine: currentLine,
            children: [],
          };
          sectionContentLines = [];
        }
      } else if (currentSection) {
        // Add line to current section content
        sectionContentLines.push(line);
      }

      currentLine++;
    }

    // Save last section
    if (currentSection) {
      currentSection.content = sectionContentLines.join('\n').trim();
      currentSection.endLine = endIndex - 1;

      if (this.options.preserveCodeBlocks) {
        currentSection.codeBlocks = this.extractCodeBlocks(currentSection.content);
      }
      if (this.options.preserveLinks) {
        currentSection.links = this.extractLinks(currentSection.content);
      }
      if (this.options.preserveImages) {
        currentSection.images = this.extractImages(currentSection.content);
      }

      sections.push(currentSection);
    }

    // Build hierarchy (nest sub-sections)
    return this.buildHierarchy(sections);
  }

  /**
   * Build section hierarchy (nest sub-sections under parent sections)
   */
  private buildHierarchy(sections: ParsedSection[]): ParsedSection[] {
    const result: ParsedSection[] = [];
    const stack: ParsedSection[] = [];

    for (const section of sections) {
      // Pop stack until we find a parent with lower level
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top-level section
        result.push(section);
      } else {
        // Nested section - add to parent
        const parent = stack[stack.length - 1];
        parent.children.push(section);
      }

      stack.push(section);
    }

    // Set raw content for each section (including children)
    this.setRawContent(result);

    return result;
  }

  /**
   * Set raw content for sections (including nested children)
   */
  private setRawContent(sections: ParsedSection[]): void {
    for (const section of sections) {
      if (this.options.includeRawContent) {
        section.rawContent = this.generateRawContent(section);
      }
      if (section.children.length > 0) {
        this.setRawContent(section.children);
      }
    }
  }

  /**
   * Generate raw content for a section (including nested children)
   */
  private generateRawContent(section: ParsedSection): string {
    let content = `${'#'.repeat(section.level)} ${section.heading}\n\n`;
    content += section.content;

    for (const child of section.children) {
      content += '\n\n' + this.generateRawContent(child);
    }

    return content;
  }

  /**
   * Extract code blocks from content
   */
  private extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let currentBlock: { language: string; lines: string[]; startLine: number } | null = null;

    lines.forEach((line, index) => {
      const codeBlockStart = line.match(/^```(\w*)/);
      const codeBlockEnd = line.match(/^```\s*$/);

      if (codeBlockStart && !inCodeBlock) {
        inCodeBlock = true;
        currentBlock = {
          language: codeBlockStart[1] || 'text',
          lines: [],
          startLine: index,
        };
      } else if (codeBlockEnd && inCodeBlock && currentBlock) {
        inCodeBlock = false;
        codeBlocks.push({
          language: currentBlock.language,
          content: currentBlock.lines.join('\n'),
          startLine: currentBlock.startLine,
          endLine: index,
        });
        currentBlock = null;
      } else if (inCodeBlock && currentBlock) {
        currentBlock.lines.push(line);
      }
    });

    return codeBlocks;
  }

  /**
   * Extract links from content
   */
  private extractLinks(content: string): Link[] {
    const links: Link[] = [];

    // Markdown links: [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = markdownLinkRegex.exec(content)) !== null) {
      const [, text, url] = match;
      links.push({
        text,
        url,
        type: this.determineLinkType(url),
      });
    }

    return links;
  }

  /**
   * Extract images from content
   */
  private extractImages(content: string): Image[] {
    const images: Image[] = [];

    // Markdown images: ![alt](url "title")
    const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      const [, alt, url, title] = match;
      images.push({
        alt,
        url,
        title,
      });
    }

    return images;
  }

  /**
   * Determine link type (internal/external/anchor)
   */
  private determineLinkType(url: string): 'internal' | 'external' | 'anchor' {
    if (url.startsWith('#')) {
      return 'anchor';
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      return 'external';
    } else {
      return 'internal';
    }
  }

  /**
   * Convert heading to URL-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/--+/g, '-')     // Replace multiple hyphens with single
      .trim();
  }

  /**
   * Find section by ID (recursive search)
   */
  findSection(sections: ParsedSection[], id: string): ParsedSection | null {
    for (const section of sections) {
      if (section.id === id) {
        return section;
      }
      if (section.children.length > 0) {
        const found = this.findSection(section.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Get all sections flattened (no hierarchy)
   */
  flattenSections(sections: ParsedSection[]): ParsedSection[] {
    const result: ParsedSection[] = [];

    for (const section of sections) {
      result.push(section);
      if (section.children.length > 0) {
        result.push(...this.flattenSections(section.children));
      }
    }

    return result;
  }

  /**
   * Get sections by level
   */
  getSectionsByLevel(sections: ParsedSection[], level: number): ParsedSection[] {
    return this.flattenSections(sections).filter((s) => s.level === level);
  }

  /**
   * Get section content without code blocks
   */
  getContentWithoutCode(section: ParsedSection): string {
    let content = section.content;

    // Remove code blocks
    content = content.replace(/```[\s\S]*?```/g, '');

    return content.trim();
  }
}

/**
 * Factory function to create parser
 */
export function createContentParser(options?: ParserOptions): ContentParser {
  return new ContentParser(options);
}

/**
 * Convenience function to parse markdown
 */
export function parseMarkdown(markdown: string, options?: ParserOptions): ParsedSpec {
  const parser = new ContentParser(options);
  return parser.parse(markdown);
}
