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

  it('refuses deprecation keys at the top level', () => {
    for (const k of ['deprecated: true', 'deprecated-message: "m"', 'replaced-by: none', 'deprecated-since: "1.0.5"']) {
      expect(versionProblem(`---\nname: s\n${k}\nmetadata:\n  version: "1.0.5"\n---\n`)).toMatch(/top-level/);
    }
  });

  it('refuses deprecation keys nested in a map under metadata', () => {
    expect(versionProblem(skill('  deprecation:\n    deprecated: true'))).toMatch(/metadata\.deprecation\.deprecated is nested/);
    expect(versionProblem(skill('  info:\n    more:\n      replaced-by: "none"'))).toMatch(/metadata\.info\.more\.replaced-by is nested/);
  });

  it('refuses metadata that is an alias of an anchored mapping', () => {
    const aliased = '---\nname: s\nx-base: &m { version: "1.0.5", deprecated: "true", deprecated-message: "m", replaced-by: "none", deprecated-since: "1.0.5" }\nmetadata: *m\n---\n';
    expect(versionProblem(aliased)).toMatch(/alias/);
    const blockAlias = '---\nname: s\nx-base: &m\n  version: "1.0.5"\n  deprecated: "true"\n  deprecated-message: "m"\nmetadata: *m\n---\n';
    expect(versionProblem(blockAlias)).toMatch(/alias/);
  });

  it('refuses a deprecated-since that is not strict SemVer 2.0', () => {
    for (const v of ['01.2.3-foo_bar', '1.02.3', '1.2.3-01', '1.2.3-foo_bar', '1.2']) {
      expect(versionProblem(skill(valid.replace('deprecated-since: "1.0.5"', `deprecated-since: "${v}"`)))).toMatch(/deprecated-since/);
    }
    for (const v of ['1.0.5-rc.1', '2.0.0+build.7', '0.0.1-alpha-1.0']) {
      expect(versionProblem(skill(valid.replace('deprecated-since: "1.0.5"', `deprecated-since: "${v}"`)))).toBeNull();
    }
  });

  it('still accepts the full block-style set with an anchored block metadata mapping', () => {
    const anchored = `---\nname: s\nmetadata: &meta\n  version: "1.0.5"\n${valid}\n---\n`;
    expect(versionProblem(anchored)).toBeNull();
    expect(versionProblem(skill(valid))).toBeNull();
  });

  it('refuses flow-style metadata that carries deprecation keys (only block style is read)', () => {
    const flow = '---\nname: s\nmetadata: { version: "1.0.5", deprecated: "true", deprecated-message: "m" }\n---\n';
    expect(versionProblem(flow)).toMatch(/flow-style/);
    expect(versionProblem('---\nname: s\nmetadata: { version: "1.0.5" }\n---\n')).toBeNull();
  });
});
