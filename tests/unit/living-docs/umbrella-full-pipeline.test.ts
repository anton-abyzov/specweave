/**
 * Integration Test: Umbrella Project Detection
 *
 * A plain project without an umbrella structure is not reported as an umbrella.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { detectUmbrellaStructure } from '../../../src/core/living-docs/umbrella-detector.js';

describe('Umbrella Project Full Pipeline', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'umbrella-pipeline-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Edge Cases', () => {
    it('should handle non-umbrella projects (backwards compatible)', async () => {
      // Create a simple project without umbrella structure
      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'export default {};\n');

      const umbrellaResult = await detectUmbrellaStructure(testDir);

      expect(umbrellaResult.isUmbrella).toBe(false);
      expect(umbrellaResult.modules.length).toBe(0);
    });
  });
});
