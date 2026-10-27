import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { versionProblem } = require('../../../scripts/validation/validate-skill-versions.cjs') as {
  versionProblem: (content: string) => string | null;
};

const skill = (frontmatter: string) => `---\n${frontmatter}\n---\n# body\n`;

describe('validate-skill-versions', () => {
  it('accepts a SemVer metadata.version', () => {
    expect(versionProblem(skill('description: d\nmetadata:\n  version: "3.1.0"'))).toBeNull();
  });

  it('refuses a top-level version, a nested one and a non-SemVer one', () => {
    expect(versionProblem(skill('description: d\nversion: 3.1.0'))).toMatch(/top-level version/);
    expect(versionProblem(skill('metadata:\n  nested:\n    version: "3.1.0"'))).toMatch(/no metadata.version/);
    expect(versionProblem(skill('metadata:\n  version: latest'))).toMatch(/non-SemVer/);
  });

  it('refuses duplicate keys and a metadata value that is not a mapping', () => {
    expect(versionProblem(skill('metadata:\n  version: "3.1.0"\nmetadata: false'))).toMatch(/not valid YAML/);
    expect(versionProblem(skill('metadata: false'))).toMatch(/no metadata mapping/);
    expect(versionProblem('# no frontmatter')).toBe('no frontmatter block');
  });
});
