import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schemaDir = new URL('../../../src/core/schemas/', import.meta.url);
async function validator() {
  const ajv = new Ajv({ strict: false, loadSchema: async uri => {
    const file = new URL(uri);
    if (file.protocol !== 'file:') throw new Error(`Unexpected network schema request: ${uri}`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } });
  addFormats(ajv);
  // Load through the actual file location, as an editor would. AJV must fetch
  // each adjacent ref itself; no pre-registration of invented resource IDs.
  return ajv.compileAsync({ $ref: new URL('specweave-config.schema.json', schemaDir).href });
}

describe('portable configuration schema', async () => {
  it('resolves adjacent schemas and accepts legacy and adopted repository records', async () => {
    const validate = await validator();
    for (const repo of [
      { id: 'existing', path: 'repositories/org/existing', prefix: 'OLD' },
      { id: 'org-api', path: '../api', prefix: 'API', identity: 'github.com/org/api', sync: { github: { owner: 'org', repo: 'api' } } },
    ]) expect(validate({ workspace: { name: 'test', repos: [repo] } }), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ workspace: { name: 'test', repos: [{ id: 'api', path: '../api', identity: 42 }] } })).toBe(false);
    expect(validate({ workspace: { name: 'test', repos: [{ id: 'api', path: '../api', surprise: true }] } })).toBe(false);
  });
  it('preserves nested status mapping references in the extracted sync schema', async () => {
    const validate = await validator();
    const github = { planning: 'open', active: { state: 'open', labels: ['active'] }, paused: 'open', completed: 'closed', abandoned: 'closed' };
    expect(validate({ sync: { statusSync: { mappings: { github } } } }), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ sync: { statusSync: { mappings: { github: { ...github, active: 42 } } } } })).toBe(false);
  });
});
