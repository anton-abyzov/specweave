/**
 * Source Parser for `specweave get`
 *
 * Parses the <source> argument into a structured type:
 * - GitHub shorthand: owner/repo
 * - GitHub HTTPS URL: https://github.com/owner/repo[.git]
 * - GitHub SSH URL: git@github.com:owner/repo[.git]
 * - Generic git URL: https://other-host.com/org/repo
 * - Local path: ./path, /absolute/path, ../relative
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export type SourceType = 'github' | 'git' | 'local';

export interface ParsedSource {
  type: SourceType;
  /** GitHub owner or org, extracted from URL or git remote */
  owner: string;
  /** Repository name (no .git suffix) */
  repo: string;
  /** Full clone URL (undefined for local) */
  cloneUrl?: string;
  /** Resolved absolute path (only for local) */
  absolutePath?: string;
}

/**
 * Parse <source> argument into a structured ParsedSource.
 * Throws with a descriptive message if the input is unrecognizable.
 */
export function parseSource(source: string): ParsedSource {
  const trimmed = source.trim().replace(/\/+$/, ''); // strip trailing slashes

  // 1. Explicit local path indicators: ./ ../ / ~
  if (
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('~')
  ) {
    const resolved = trimmed.startsWith('~')
      ? path.join(os.homedir(), trimmed.slice(1))
      : path.resolve(trimmed);
    return {
      type: 'local',
      owner: '',
      repo: path.basename(resolved),
      absolutePath: resolved,
    };
  }

  // 2. SSH URL: git@github.com:owner/repo[.git]
  const sshGitHub = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshGitHub) {
    return {
      type: 'github',
      owner: sshGitHub[1],
      repo: sshGitHub[2],
      cloneUrl: trimmed.endsWith('.git') ? trimmed : `${trimmed}.git`,
    };
  }

  // 3. Generic SSH: git@host:org/repo
  const sshGeneric = trimmed.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshGeneric) {
    return {
      type: 'git',
      owner: sshGeneric[2],
      repo: sshGeneric[3],
      cloneUrl: trimmed,
    };
  }

  // 4. HTTPS GitHub URL
  const httpsGitHub = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+?)(?:\.git)?$/);
  if (httpsGitHub) {
    const owner = httpsGitHub[1];
    const repo = httpsGitHub[2];
    return {
      type: 'github',
      owner,
      repo,
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
    };
  }

  // 5. Generic HTTPS/HTTP git URL — matches exactly host/owner/repo (no nested paths)
  const httpsGeneric = trimmed.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/?#]+?)(?:\.git)?$/);
  if (httpsGeneric) {
    return {
      type: 'git',
      owner: httpsGeneric[2],
      repo: httpsGeneric[3],
      cloneUrl: trimmed,
    };
  }

  // 6. GitHub shorthand: owner/repo (exactly one slash, no protocol)
  // Checked BEFORE fs.existsSync to avoid ambiguity with local dirs named "owner/repo"
  const shorthand = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shorthand) {
    const owner = shorthand[1];
    const repo = shorthand[2];
    return {
      type: 'github',
      owner,
      repo,
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
    };
  }

  // 7. Bare name fallback: check if it exists as a local path on disk
  if (fs.existsSync(trimmed)) {
    const resolved = path.resolve(trimmed);
    return {
      type: 'local',
      owner: '',
      repo: path.basename(resolved),
      absolutePath: resolved,
    };
  }

  throw new Error(
    `Cannot parse source: "${source}"\n` +
    'Accepted formats:\n' +
    '  owner/repo                    GitHub shorthand\n' +
    '  https://github.com/owner/repo GitHub HTTPS URL\n' +
    '  git@github.com:owner/repo     GitHub SSH URL\n' +
    '  https://other-host.com/org/repo  Any git HTTPS URL\n' +
    '  ./path/to/local-repo          Local path'
  );
}
