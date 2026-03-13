import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

const mockPersistUmbrellaConfig = vi.hoisted(() => vi.fn());
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: { writeFile: vi.fn() },
}));

vi.mock('../../../../../src/core/living-docs/umbrella-detector.js', () => ({
  persistUmbrellaConfig: mockPersistUmbrellaConfig,
}));

vi.mock('fs', () => mockFs);

import { registerRepo } from '../../../../../src/cli/helpers/get/register-repo.js';

const projectRoot = '/workspace';
const configPath = path.join(projectRoot, '.specweave', 'config.json');

describe('registerRepo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPersistUmbrellaConfig.mockResolvedValue(undefined);
    mockFs.promises.writeFile.mockResolvedValue(undefined);
  });

  describe('duplicate detection', () => {
    it('AC-US3-04: returns alreadyRegistered=true when id already in childRepos', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        umbrella: {
          childRepos: [{ id: 'my-repo', path: 'repositories/org/my-repo', name: 'my-repo', prefix: 'MYR' }],
        },
      }));

      const result = await registerRepo(projectRoot, 'org', 'my-repo', 'repositories/org/my-repo');

      expect(result.alreadyRegistered).toBe(true);
      expect(result.registered).toBe(false);
      expect(mockPersistUmbrellaConfig).not.toHaveBeenCalled();
    });
  });

  describe('successful registration', () => {
    beforeEach(() => {
      // Config exists but no childRepos yet
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => JSON.stringify({ umbrella: { childRepos: [] } }));
    });

    it('AC-US3-01: calls persistUmbrellaConfig with correct entry', async () => {
      await registerRepo(projectRoot, 'org', 'my-service', 'repositories/org/my-service');

      expect(mockPersistUmbrellaConfig).toHaveBeenCalledWith(
        projectRoot,
        expect.objectContaining({
          childRepos: expect.arrayContaining([
            expect.objectContaining({ id: 'my-service', path: 'repositories/org/my-service', name: 'my-service' }),
          ]),
        })
      );
    });

    it('AC-US3-02: uses --prefix option when provided', async () => {
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({ umbrella: { childRepos: [] } })) // duplicate check
        .mockReturnValueOnce(JSON.stringify({ umbrella: { childRepos: [{ id: 'my-service' }] } })); // post-patch read

      await registerRepo(projectRoot, 'org', 'my-service', 'repositories/org/my-service', { prefix: 'BE' });

      const writeCall = mockFs.promises.writeFile.mock.calls[0];
      const written = JSON.parse(writeCall[1]);
      expect(written.umbrella.childRepos[0].prefix).toBe('BE');
    });

    it('AC-US3-03: defaults prefix to first 3 uppercase chars of repo name', async () => {
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({ umbrella: { childRepos: [] } }))
        .mockReturnValueOnce(JSON.stringify({ umbrella: { childRepos: [{ id: 'my-service' }] } }));

      await registerRepo(projectRoot, 'org', 'my-service', 'repositories/org/my-service');

      const writeCall = mockFs.promises.writeFile.mock.calls[0];
      const written = JSON.parse(writeCall[1]);
      expect(written.umbrella.childRepos[0].prefix).toBe('MY-');
    });

    it('AC-US3-05: sets role when provided', async () => {
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify({ umbrella: { childRepos: [] } }))
        .mockReturnValueOnce(JSON.stringify({ umbrella: { childRepos: [{ id: 'my-service' }] } }));

      await registerRepo(projectRoot, 'org', 'my-service', 'repositories/org/my-service', { role: 'backend' });

      const writeCall = mockFs.promises.writeFile.mock.calls[0];
      const written = JSON.parse(writeCall[1]);
      expect(written.umbrella.childRepos[0].role).toBe('backend');
    });

    it('returns registered=true on success', async () => {
      const result = await registerRepo(projectRoot, 'org', 'my-service', 'repositories/org/my-service');
      expect(result.registered).toBe(true);
      expect(result.alreadyRegistered).toBe(false);
    });
  });

  describe('when config file does not exist', () => {
    it('proceeds with registration without duplicate check', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await registerRepo(projectRoot, 'org', 'new-service', 'repositories/org/new-service');

      expect(mockPersistUmbrellaConfig).toHaveBeenCalled();
      expect(result.registered).toBe(true);
    });
  });
});
