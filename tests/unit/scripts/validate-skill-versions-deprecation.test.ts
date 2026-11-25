import { describe, it, expect } from 'vitest';
import { versionProblem, deprecationProblem } from '../../../scripts/validation/validate-skill-versions.cjs';

const skill = (metadataLines: string) =>
  `---\nname: old-skill\ndescription: "DEPRECATED: use the MCP tool."\nmetadata:\n  version: "1.0.5"\n${metadataLines}\n---\n# body\n`;

const valid = [
  '  deprecated: "true"',
  '  deprecated-message: "Use the MCP server instead."',
  '  replaced-by: "mcp:gws:drive"',
  '  deprecated-since: "1.0.5"',
].join('\n');

describe('validate-skill-versions deprecation keys (1486)', () => {
  it('accepts a valid set of the four flat keys and every replaced-by shape', () => {
    expect(versionProblem(skill(valid))).toBeNull();
    for (const r of ['none', 'mcp:gws', 'mcp:gws:drive_list', 'anton-abyzov/vskill/task-skill.v2']) {
      expect(versionProblem(skill(valid.replace('mcp:gws:drive', r)))).toBeNull();
    }
    expect(versionProblem(skill('  deprecated: "false"'))).toBeNull();
  });

  it('accepts a skill without the keys exactly as before', () => {
    expect(versionProblem(skill('  author: me'))).toBeNull();
    expect(deprecationProblem({ version: '1.0.0' })).toBeNull();
  });

  it('refuses an unquoted YAML boolean with "quote it"', () => {
    expect(versionProblem(skill(valid.replace('deprecated: "true"', 'deprecated: true')))).toMatch(/quote it/);
    expect(versionProblem(skill(valid.replace('deprecated-since: "1.0.5"', 'deprecated-since: 1.0')))).toMatch(/quote it/);
  });

  it('refuses nested deprecation metadata', () => {
    expect(versionProblem(skill('  deprecated:\n    message: "x"'))).toMatch(/nested/);
    expect(versionProblem(skill('  replaced-by:\n    - mcp:gws'))).toMatch(/nested/);
  });

  it('refuses a missing or empty message when deprecated is "true"', () => {
    expect(versionProblem(skill('  deprecated: "true"'))).toMatch(/deprecated-message/);
    expect(versionProblem(skill('  deprecated: "true"\n  deprecated-message: "  "'))).toMatch(/deprecated-message/);
  });

  it('refuses deprecated values other than "true" and "false"', () => {
    expect(versionProblem(skill('  deprecated: "yes"'))).toMatch(/"true" or "false"/);
  });

  it('refuses a bad replaced-by shape', () => {
    for (const r of ['gws', 'mcp:', 'owner/repo', 'https://github.com/a/b/c', 'mcp:a:b:c']) {
      expect(versionProblem(skill(valid.replace('mcp:gws:drive', r)))).toMatch(/replaced-by/);
    }
  });

  it('refuses a non-SemVer deprecated-since', () => {
    expect(versionProblem(skill(valid.replace('deprecated-since: "1.0.5"', 'deprecated-since: "next"')))).toMatch(/deprecated-since/);
  });

  it('refuses flow-style metadata that carries deprecation keys (only block style is read)', () => {
    const flow = '---\nname: s\nmetadata: { version: "1.0.5", deprecated: "true", deprecated-message: "m" }\n---\n';
    expect(versionProblem(flow)).toMatch(/flow-style/);
    expect(versionProblem('---\nname: s\nmetadata: { version: "1.0.5" }\n---\n')).toBeNull();
  });
});
