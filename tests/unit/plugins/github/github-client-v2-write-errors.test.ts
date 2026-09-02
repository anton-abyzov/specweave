/**
 * Every GitHub write (create/edit/close/comment/label) that fails with a
 * 404/403 must surface "no write access to owner/repo" instead of a raw
 * "Not Found" — GitHub masks missing write access as 404.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ exec: vi.fn() }));

vi.mock('../../../../plugins/specweave/lib/vendor/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mocks.exec,
}));
vi.mock('../../../../src/sync/github-rate-limit-budget.js', () => ({
  checkAndDecrement: async () => true,
}));

import { GitHubClientV2 } from '../../../../plugins/specweave/lib/integrations/github/github-client-v2.js';

function ghResponder(login: string | null, canPush: boolean) {
  return async (_cmd: string, args: string[]) => {
    const joined = args.join(' ');
    if (joined.startsWith('api user')) {
      return login
        ? { stdout: `${login}\n`, stderr: '', exitCode: 0 }
        : { stdout: '', stderr: 'HTTP 401', exitCode: 1 };
    }
    if (joined.startsWith('api repos/')) {
      return canPush
        ? { stdout: 'true\n', stderr: '', exitCode: 0 }
        : { stdout: '', stderr: 'gh: Not Found (HTTP 404)', exitCode: 1 };
    }
    // the write itself
    return { stdout: '', stderr: 'gh: Not Found (HTTP 404)', exitCode: 1 };
  };
}

describe('GitHubClientV2 write errors', () => {
  let client: GitHubClientV2;
  beforeEach(() => {
    mocks.exec.mockReset();
    client = GitHubClientV2.fromRepo('acme', 'widgets');
  });

  it.each([
    ['closeIssue', () => client.closeIssue(7)],
    ['editIssueBody', () => client.editIssueBody(7, 'body')],
    ['addComment', () => client.addComment(7, 'hi')],
    ['addLabels', () => client.addLabels(7, ['bug'])],
    ['reopenIssue', () => client.reopenIssue(7)],
  ])('%s: 404 from a wrong-account token becomes an actionable message', async (_name, run) => {
    mocks.exec.mockImplementation(ghResponder('other-account', false));
    await expect(run()).rejects.toThrow(/account 'other-account', which has no write access to acme\/widgets/);
  });

  it('keeps the raw error when the token demonstrably can push (real 404)', async () => {
    mocks.exec.mockImplementation(ghResponder('owner', true));
    await expect(client.closeIssue(7)).rejects.toThrow(/Failed to close issue #7: gh: Not Found \(HTTP 404\)/);
  });
});
