/**
 * Unit tests for AC parser (T-016 + T-032)
 *
 * Parses acceptance criteria from external item descriptions
 * (GitHub body, JIRA description, ADO description).
 *
 * Extracts checkbox-style ACs:
 *   - [ ] User can log in
 *   - [x] Form validates email
 */

import { describe, it, expect } from 'vitest';
import { parseExternalACs, type ACEntry } from '../../../src/importers/ac-parser.js';

describe('AC parser', () => {
  it('parses markdown checkboxes from JIRA description', () => {
    const description = `
## Description
User authentication feature

## Acceptance Criteria
- [ ] User can log in
- [x] Form validates email
`;

    const acs = parseExternalACs(description);

    expect(acs).toHaveLength(2);
    expect(acs[0]).toEqual({ text: 'User can log in', completed: false });
    expect(acs[1]).toEqual({ text: 'Form validates email', completed: true });
  });

  it('returns empty array when no checklist items', () => {
    const description = 'Just a plain description with no checkboxes.';
    const acs = parseExternalACs(description);
    expect(acs).toEqual([]);
  });

  it('handles GitHub body with mixed checkboxes and regular list items', () => {
    const body = `
## Tasks
- [ ] Implement login API
- [x] Design login page
- Regular bullet point (not a checkbox)
- Another plain item
- [ ] Add rate limiting
`;

    const acs = parseExternalACs(body);

    expect(acs).toHaveLength(3);
    expect(acs[0]).toEqual({ text: 'Implement login API', completed: false });
    expect(acs[1]).toEqual({ text: 'Design login page', completed: true });
    expect(acs[2]).toEqual({ text: 'Add rate limiting', completed: false });
  });

  it('handles ADO HTML-encoded checkboxes', () => {
    const html = `
<div>
- [ ] First criterion
- [x] Second criterion done
</div>
`;

    const acs = parseExternalACs(html);

    expect(acs).toHaveLength(2);
    expect(acs[0]).toEqual({ text: 'First criterion', completed: false });
    expect(acs[1]).toEqual({ text: 'Second criterion done', completed: true });
  });

  it('empty string → empty array', () => {
    expect(parseExternalACs('')).toEqual([]);
  });

  it('trims whitespace from AC text', () => {
    const desc = '- [ ]   Lots of spaces   ';
    const acs = parseExternalACs(desc);

    expect(acs).toHaveLength(1);
    expect(acs[0].text).toBe('Lots of spaces');
  });

  it('handles lowercase x in checkbox', () => {
    const desc = '- [x] lowercase done\n- [X] uppercase done';
    const acs = parseExternalACs(desc);

    expect(acs).toHaveLength(2);
    expect(acs[0].completed).toBe(true);
    expect(acs[1].completed).toBe(true);
  });

  it('handles asterisk-style checkboxes', () => {
    const desc = '* [ ] Star checkbox unchecked\n* [x] Star checkbox done';
    const acs = parseExternalACs(desc);

    expect(acs).toHaveLength(2);
    expect(acs[0]).toEqual({ text: 'Star checkbox unchecked', completed: false });
    expect(acs[1]).toEqual({ text: 'Star checkbox done', completed: true });
  });
});
