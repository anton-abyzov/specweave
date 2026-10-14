import { describe, expect, it } from 'vitest';
import { GitHubClientV2 } from '../../../plugins/specweave/lib/integrations/github/github-client-v2.js';

describe('increment aliases in GitHub issue title validation', () => {
  // Exercise the local validator only; no GitHub requests are made.
  const client = GitHubClientV2.fromRepo('fixture-owner', 'fixture-repo');
  const validate = (title: string) => (client as unknown as { validateIssueTitle(title: string): void }).validateIssueTitle(title);
  it.each(['[001] Title', '[9999] Title', '[10000] Title', '[10000G] Title', '[10000J] Title', '[100000E] Title'])('rejects deprecated plain alias %s', (title) => {
    expect(() => validate(title)).toThrow(/INVALID TITLE FORMAT/);
  });
  it('accepts the living-doc feature format at the same boundary', () => {
    expect(() => validate('[FS-10000][US-001] Title')).not.toThrow();
  });
});
