import { describe, it, expect } from 'vitest';
import { AdoDescriptionUpdater } from '../../../src/core/ado-description-updater.js';

describe('AdoDescriptionUpdater', () => {
  const updater = new AdoDescriptionUpdater();

  describe('updateAcSection', () => {
    it('replaces existing AC section preserving surrounding content', () => {
      const html = `<h2>Overview</h2>
<p>Feature description here.</p>
<!-- AC_SECTION_START -->
<h3>Acceptance Criteria</h3>
<ul><li>old content</li></ul>
<!-- AC_SECTION_END -->
<h2>Notes</h2>
<p>Some notes.</p>`;

      const newAcHtml = `<h3>Acceptance Criteria</h3>
<ul><li>☑ AC-US1-01: First criterion</li><li>☐ AC-US1-02: Second criterion</li></ul>`;

      const result = updater.updateAcSection(html, newAcHtml);

      expect(result).toContain('<h2>Overview</h2>');
      expect(result).toContain('Feature description here.');
      expect(result).toContain('AC-US1-01: First criterion');
      expect(result).toContain('AC-US1-02: Second criterion');
      expect(result).toContain('<h2>Notes</h2>');
      expect(result).toContain('Some notes.');
      expect(result).not.toContain('old content');
    });

    it('appends new section when no AC section exists', () => {
      const html = `<h2>Overview</h2>
<p>Feature description here.</p>`;

      const newAcHtml = `<h3>Acceptance Criteria</h3>
<ul><li>☑ AC-US1-01: First criterion</li></ul>`;

      const result = updater.updateAcSection(html, newAcHtml);

      expect(result).toContain('<h2>Overview</h2>');
      expect(result).toContain('Feature description here.');
      expect(result).toContain('AC-US1-01: First criterion');
      expect(result).toContain('<!-- AC_SECTION_START -->');
      expect(result).toContain('<!-- AC_SECTION_END -->');
    });

    it('handles empty description', () => {
      const result = updater.updateAcSection('', '<p>new content</p>');

      expect(result).toContain('<!-- AC_SECTION_START -->');
      expect(result).toContain('<p>new content</p>');
      expect(result).toContain('<!-- AC_SECTION_END -->');
    });

    it('preserves surrounding content byte-for-byte', () => {
      const before = '<p>Before content with special chars: &amp; &lt; &gt;</p>\n';
      const after = '\n<p>After content &amp; more</p>';
      const html = `${before}<!-- AC_SECTION_START -->\n<p>old</p>\n<!-- AC_SECTION_END -->${after}`;

      const result = updater.updateAcSection(html, '<p>new</p>');

      expect(result.startsWith(before)).toBe(true);
      expect(result.endsWith(after)).toBe(true);
    });
  });

  describe('formatACCheckboxes', () => {
    it('formats AC statuses as HTML checkbox list', () => {
      const acStatus = new Map<string, boolean>([
        ['AC-US1-01', true],
        ['AC-US1-02', false],
        ['AC-US1-03', true],
      ]);

      const result = updater.formatACCheckboxes(acStatus);

      expect(result).toContain('☑ AC-US1-01');
      expect(result).toContain('☐ AC-US1-02');
      expect(result).toContain('☑ AC-US1-03');
      expect(result).toContain('<ul>');
      expect(result).toContain('</ul>');
    });

    it('returns empty string for empty map', () => {
      const result = updater.formatACCheckboxes(new Map());
      expect(result).toBe('');
    });
  });
});
