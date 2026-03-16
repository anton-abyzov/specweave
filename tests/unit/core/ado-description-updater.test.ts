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

  describe('backward compatibility — legacy regex format', () => {
    it('replaces AC section even when legacy unicode entities are present', () => {
      // Legacy format used &#9744; (☐) and &#9745; (☑) unicode entities
      const legacyHtml = `<h2>User Story</h2>
<p>Some description</p>
<!-- AC_SECTION_START -->
<h3>Acceptance Criteria</h3>
<ul><li>&#9745; AC-US1-01: First</li><li>&#9744; AC-US1-02: Second</li></ul>
<!-- AC_SECTION_END -->
<h2>Priority</h2>
<p>P1</p>`;

      const newAcHtml = `<h3>Acceptance Criteria</h3>
<ul><li>☑ AC-US1-01: First</li><li>☑ AC-US1-02: Second</li></ul>`;

      const result = updater.updateAcSection(legacyHtml, newAcHtml);

      // Non-AC content preserved byte-for-byte
      expect(result).toContain('<h2>User Story</h2>');
      expect(result).toContain('Some description');
      expect(result).toContain('<h2>Priority</h2>');
      expect(result).toContain('<p>P1</p>');
      // Old unicode entities replaced
      expect(result).not.toContain('&#9745;');
      expect(result).not.toContain('&#9744;');
      // New content present
      expect(result).toContain('☑ AC-US1-01');
      expect(result).toContain('☑ AC-US1-02');
    });

    it('preserves non-AC content byte-for-byte with legacy format', () => {
      const before = '<div class="custom">Special &amp; content &lt;here&gt;</div>\n';
      const after = '\n<footer>End &amp; footer</footer>';
      const legacyHtml = `${before}<!-- AC_SECTION_START -->\n<ul><li>&#9744; old</li></ul>\n<!-- AC_SECTION_END -->${after}`;

      const result = updater.updateAcSection(legacyHtml, '<ul><li>☑ new</li></ul>');

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
