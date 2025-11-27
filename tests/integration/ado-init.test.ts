/**
 * Integration tests for ADO init flow
 *
 * Tests the fixes for:
 * - AZURE_DEVOPS_* env var consistency
 * - detectADOConfig reading from config.json + .env
 * - ADO folder structure creation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import functions under test
import { detectADOConfig } from '../../src/cli/helpers/init/config-detection.js';
import { createAdoProjectFolders } from '../../src/cli/helpers/issue-tracker/ado.js';
import type { AzureDevOpsCredentials } from '../../src/cli/helpers/issue-tracker/types.js';

describe('ADO Init Flow', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-ado-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectADOConfig', () => {
    it('should return null when no ADO config exists', () => {
      const result = detectADOConfig(tempDir);
      expect(result).toBeNull();
    });

    it('should detect ADO from config.json + .env', () => {
      // Create .env with PAT
      fs.writeFileSync(
        path.join(tempDir, '.env'),
        'AZURE_DEVOPS_PAT=test-pat-token-12345678901234567890'
      );

      // Create config.json with ADO profile
      const config = {
        sync: {
          profiles: {
            'ado-main': {
              provider: 'ado',
              config: {
                organization: 'test-org',
                project: 'test-project',
                teams: ['Team A'],
                areaPaths: ['TestProject\\Area1']
              }
            }
          }
        }
      };
      fs.writeFileSync(
        path.join(tempDir, '.specweave', 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const result = detectADOConfig(tempDir);

      expect(result).not.toBeNull();
      expect(result?.orgUrl).toBe('https://dev.azure.com/test-org');
      expect(result?.project).toBe('test-project');
      expect(result?.pat).toBe('test-pat-token-12345678901234567890');
      expect(result?.teams).toEqual(['Team A']);
      expect(result?.areaPaths).toEqual(['TestProject\\Area1']);
    });

    it('should fallback to legacy env vars', () => {
      // Create .env with legacy vars
      fs.writeFileSync(
        path.join(tempDir, '.env'),
        [
          'AZURE_DEVOPS_PAT=legacy-pat-token-12345678901234567890',
          'AZURE_DEVOPS_ORG=https://dev.azure.com/legacy-org',
          'AZURE_DEVOPS_PROJECT=legacy-project'
        ].join('\n')
      );

      const result = detectADOConfig(tempDir);

      expect(result).not.toBeNull();
      expect(result?.orgUrl).toBe('https://dev.azure.com/legacy-org');
      expect(result?.project).toBe('legacy-project');
    });
  });

  describe('createAdoProjectFolders', () => {
    it('should create ADO project folder structure', () => {
      const credentials: AzureDevOpsCredentials = {
        pat: 'test-pat',
        org: 'test-org',
        project: 'MyProject',
        areaPaths: ['MyProject\\Team A', 'MyProject\\Team B'],
        strategy: 'area-path-based'
      };

      createAdoProjectFolders(tempDir, credentials);

      const specsDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs');
      const adoDir = path.join(specsDir, 'ADO-MyProject');

      expect(fs.existsSync(adoDir)).toBe(true);
      expect(fs.existsSync(path.join(adoDir, 'Team A'))).toBe(true);
      expect(fs.existsSync(path.join(adoDir, 'Team B'))).toBe(true);
    });

    it('should create team-based structure when strategy is team-based', () => {
      const credentials: AzureDevOpsCredentials = {
        pat: 'test-pat',
        org: 'test-org',
        project: 'MyProject',
        teams: ['Alpha', 'Beta'],
        strategy: 'team-based'
      };

      createAdoProjectFolders(tempDir, credentials);

      const adoDir = path.join(tempDir, '.specweave', 'docs', 'internal', 'specs', 'ADO-MyProject');

      expect(fs.existsSync(adoDir)).toBe(true);
      expect(fs.existsSync(path.join(adoDir, 'Alpha'))).toBe(true);
      expect(fs.existsSync(path.join(adoDir, 'Beta'))).toBe(true);
    });
  });
});
