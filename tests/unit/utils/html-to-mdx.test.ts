/**
 * Unit tests for html-to-mdx.ts
 *
 * Tests HTML to MDX sanitization for Docusaurus compatibility.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeHtmlForMdx,
  validateMdxCompatibility,
} from '../../../src/utils/html-to-mdx.js';

describe('html-to-mdx', () => {
  describe('sanitizeHtmlForMdx', () => {
    it('fixes unquoted target attribute', () => {
      const input = '<a href="https://example.com" target=_blank>Link</a>';
      const result = sanitizeHtmlForMdx(input);
      expect(result).toContain('target="_blank"');
      expect(result).not.toContain('target=_blank');
    });

    it('fixes unquoted rel attribute', () => {
      const input = '<a href="#" rel=noopener>Link</a>';
      const result = sanitizeHtmlForMdx(input);
      expect(result).toContain('rel="noopener"');
    });

    it('fixes unquoted dir attribute', () => {
      const input = '<span dir=auto>Text</span>';
      const result = sanitizeHtmlForMdx(input);
      expect(result).toContain('dir="auto"');
    });

    it('fixes unquoted alt attribute', () => {
      const input = '<img src="test.png" alt=image>';
      const result = sanitizeHtmlForMdx(input);
      expect(result).toContain('alt="image"');
    });

    it('fixes multiple unquoted attributes', () => {
      const input = '<a href="#" target=_blank rel=noopener>Link</a>';
      const result = sanitizeHtmlForMdx(input);
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener"');
    });

    it('adds self-closing slash to br tags', () => {
      const input = 'Line 1<br>Line 2';
      const result = sanitizeHtmlForMdx(input);
      expect(result).toContain('<br />');
      expect(result).not.toMatch(/<br>(?!\s*\/)/);
    });

    it('adds self-closing slash to hr tags', () => {
      const input = '<hr>';
      const result = sanitizeHtmlForMdx(input);
      expect(result).toContain('<hr />');
    });

    it('adds self-closing slash to img tags', () => {
      const input = '<img src="test.png">';
      const result = sanitizeHtmlForMdx(input);
      expect(result).toContain('<img src="test.png" />');
    });

    it('decodes HTML entities', () => {
      expect(sanitizeHtmlForMdx('Hello&nbsp;World')).toBe('Hello World');
      expect(sanitizeHtmlForMdx('&lt;tag&gt;')).toBe('<tag>');
      expect(sanitizeHtmlForMdx('&amp;')).toBe('&');
      expect(sanitizeHtmlForMdx('&quot;text&quot;')).toBe('"text"');
    });

    it('handles null input', () => {
      expect(sanitizeHtmlForMdx(null)).toBe('');
    });

    it('handles undefined input', () => {
      expect(sanitizeHtmlForMdx(undefined)).toBe('');
    });

    it('handles empty string', () => {
      expect(sanitizeHtmlForMdx('')).toBe('');
    });

    it('preserves already quoted attributes', () => {
      const input = '<a href="url" target="_blank">Link</a>';
      const result = sanitizeHtmlForMdx(input);
      expect(result).toBe(input);
    });

    it('handles complex ADO content', () => {
      const input = `<div>Per <a href="#" data-vss-mention="version:2.0">@User</a> </div><div><br> </div>`;
      const result = sanitizeHtmlForMdx(input);
      expect(result).not.toContain('<br>');
      expect(result).toContain('<br />');
    });
  });

  describe('validateMdxCompatibility', () => {
    it('detects unquoted attributes', () => {
      const issues = validateMdxCompatibility('<a target=_blank>');
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain('target=_blank');
    });

    it('detects self-closing tags without slash', () => {
      const issues = validateMdxCompatibility('Line<br>break');
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain('<br>');
    });

    it('returns empty array for valid content', () => {
      const issues = validateMdxCompatibility('<a target="_blank">Link</a>');
      expect(issues.length).toBe(0);
    });

    it('returns empty array for null/empty content', () => {
      expect(validateMdxCompatibility('')).toEqual([]);
    });
  });
});
