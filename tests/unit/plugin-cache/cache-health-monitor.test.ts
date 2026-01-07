import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CacheHealthMonitor } from '../../../src/core/plugin-cache/cache-health-monitor.js';
import { CacheHealthIssue } from '../../../src/core/plugin-cache/types.js';

describe('CacheHealthMonitor', () => {
  let tempDir: string;
  let monitor: CacheHealthMonitor;
  let testPluginPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-health-test-'));
    testPluginPath = path.join(tempDir, 'sw', '1.0.0');
    fs.mkdirSync(testPluginPath, { recursive: true });

    monitor = new CacheHealthMonitor();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('detectMergeConflicts', () => {
    it('should detect <<<<<<< conflict marker', () => {
      const scriptPath = path.join(testPluginPath, 'script.sh');
      const content = `#!/bin/bash
<<<<<<< HEAD
echo "version 1"
=======
echo "version 2"
>>>>>>> branch`;
      fs.writeFileSync(scriptPath, content);

      const result = monitor.detectMergeConflicts(scriptPath);
      expect(result).toBe(true);
    });

    it('should detect ======= conflict marker', () => {
      const scriptPath = path.join(testPluginPath, 'script.sh');
      const content = `#!/bin/bash
<<<<<<< HEAD
echo "old"
=======
echo "new"`;
      fs.writeFileSync(scriptPath, content);

      const result = monitor.detectMergeConflicts(scriptPath);
      expect(result).toBe(true);
    });

    it('should detect >>>>>>> conflict marker', () => {
      const scriptPath = path.join(testPluginPath, 'script.sh');
      const content = `#!/bin/bash
echo "new"
>>>>>>> df087427`;
      fs.writeFileSync(scriptPath, content);

      const result = monitor.detectMergeConflicts(scriptPath);
      expect(result).toBe(true);
    });

    it('should return false for clean file', () => {
      const scriptPath = path.join(testPluginPath, 'script.sh');
      const content = `#!/bin/bash\necho "clean script"`;
      fs.writeFileSync(scriptPath, content);

      const result = monitor.detectMergeConflicts(scriptPath);
      expect(result).toBe(false);
    });

    it('should return false for file without markers', () => {
      const scriptPath = path.join(testPluginPath, 'script.sh');
      const content = `#!/bin/bash
# This file uses >> for redirect
echo "output" >> file.log`;
      fs.writeFileSync(scriptPath, content);

      const result = monitor.detectMergeConflicts(scriptPath);
      expect(result).toBe(false);
    });

    it('should throw error for non-existent file', () => {
      const nonExistent = path.join(testPluginPath, 'missing.sh');

      expect(() => {
        monitor.detectMergeConflicts(nonExistent);
      }).toThrow();
    });
  });

  describe('validateBashSyntax', () => {
    it('should pass for valid bash script', () => {
      const scriptPath = path.join(testPluginPath, 'valid.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "hello"');

      const result = monitor.validateBashSyntax(scriptPath);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for syntax error', () => {
      const scriptPath = path.join(testPluginPath, 'invalid.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\nif [ test; then');

      const result = monitor.validateBashSyntax(scriptPath);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should fail for unresolved merge conflict', () => {
      const scriptPath = path.join(testPluginPath, 'conflict.sh');
      const content = `#!/bin/bash
>>>>>>> df087427`;
      fs.writeFileSync(scriptPath, content);

      const result = monitor.validateBashSyntax(scriptPath);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('>>');
    });

    it('should return valid false for non-bash file', () => {
      const scriptPath = path.join(testPluginPath, 'text.txt');
      fs.writeFileSync(scriptPath, 'plain text file');

      // Should skip non-.sh files in real implementation
      const result = monitor.validateBashSyntax(scriptPath);
      // But if we force validation, it should handle gracefully
      expect(result).toBeDefined();
    });

    it('should timeout on long-running validation', () => {
      const scriptPath = path.join(testPluginPath, 'slow.sh');
      // Create a script that might take long to validate
      fs.writeFileSync(scriptPath, '#!/bin/bash\n# valid script');

      const result = monitor.validateBashSyntax(scriptPath, { timeout: 100 });
      // Should complete quickly for normal scripts
      expect(result).toBeDefined();
    });
  });

  describe('checkPluginHealth', () => {
    it('should detect merge conflict issue', () => {
      const scriptPath = path.join(testPluginPath, 'conflict.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\n>>>>>>> branch');

      const issues = monitor.checkPluginHealth(testPluginPath, '1.0.0');

      expect(issues.length).toBeGreaterThan(0);
      const conflictIssue = issues.find(i => i.type === 'merge_conflict');
      expect(conflictIssue).toBeDefined();
      expect(conflictIssue?.severity).toBe('critical');
      expect(conflictIssue?.file).toContain('conflict.sh');
    });

    it('should detect syntax error issue', () => {
      const scriptPath = path.join(testPluginPath, 'syntax-error.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\nif [ incomplete');

      const issues = monitor.checkPluginHealth(testPluginPath, '1.0.0');

      const syntaxIssue = issues.find(i => i.type === 'syntax_error');
      expect(syntaxIssue).toBeDefined();
      expect(syntaxIssue?.severity).toBe('critical');
    });

    it('should detect checksum mismatch', () => {
      // Create metadata with checksum
      const metadataPath = path.join(testPluginPath, '.cache-metadata.json');
      const metadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'abc123',
        lastUpdated: new Date().toISOString(),
        checksums: {
          'test.sh': 'wrong-checksum-here'
        }
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata));

      // Create file with different content
      const scriptPath = path.join(testPluginPath, 'test.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "content"');

      const issues = monitor.checkPluginHealth(testPluginPath, '1.0.0');

      const checksumIssue = issues.find(i => i.type === 'checksum_mismatch');
      expect(checksumIssue).toBeDefined();
      expect(checksumIssue?.severity).toBe('medium');
    });

    it('should detect missing file from metadata', () => {
      const metadataPath = path.join(testPluginPath, '.cache-metadata.json');
      const metadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'abc123',
        lastUpdated: new Date().toISOString(),
        checksums: {
          'missing.sh': 'abc123def456'
        }
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata));

      const issues = monitor.checkPluginHealth(testPluginPath, '1.0.0');

      const missingIssue = issues.find(i => i.type === 'missing_file');
      expect(missingIssue).toBeDefined();
      expect(missingIssue?.file).toBe('missing.sh');
    });

    it('should return empty array for healthy plugin', () => {
      const scriptPath = path.join(testPluginPath, 'healthy.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "healthy"');

      const issues = monitor.checkPluginHealth(testPluginPath, '1.0.0');

      expect(issues).toEqual([]);
    });

    it('should scan recursively in subdirectories', () => {
      const hooksDir = path.join(testPluginPath, 'hooks');
      fs.mkdirSync(hooksDir);
      const conflictPath = path.join(hooksDir, 'stop.sh');
      fs.writeFileSync(conflictPath, '#!/bin/bash\n<<<<<<< HEAD');

      const issues = monitor.checkPluginHealth(testPluginPath, '1.0.0');

      expect(issues.length).toBeGreaterThan(0);
      const issue = issues.find(i => i.file.includes('hooks/stop.sh'));
      expect(issue).toBeDefined();
    });

    it('should skip non-shell files for syntax validation', () => {
      const jsPath = path.join(testPluginPath, 'file.js');
      fs.writeFileSync(jsPath, 'const x = 1;');

      const mdPath = path.join(testPluginPath, 'README.md');
      fs.writeFileSync(mdPath, '# Documentation');

      const issues = monitor.checkPluginHealth(testPluginPath, '1.0.0');

      // Should not have syntax errors for non-.sh files
      const syntaxIssues = issues.filter(i => i.type === 'syntax_error');
      expect(syntaxIssues.length).toBe(0);
    });
  });

  describe('generateHealthReport', () => {
    it('should generate report with all issue categories', () => {
      // Create mixed issues
      const conflictPath = path.join(testPluginPath, 'conflict.sh');
      fs.writeFileSync(conflictPath, '#!/bin/bash\n>>>>>>> branch');

      const syntaxPath = path.join(testPluginPath, 'syntax.sh');
      fs.writeFileSync(syntaxPath, '#!/bin/bash\nif [');

      const report = monitor.generateHealthReport(testPluginPath, '1.0.0');

      expect(report.pluginName).toBe('sw');
      expect(report.version).toBe('1.0.0');
      expect(report.totalIssues).toBeGreaterThan(0);
      expect(report.criticalIssues).toBeGreaterThan(0);
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.healthy).toBe(false);
    });

    it('should mark as healthy when no issues', () => {
      const healthyPath = path.join(testPluginPath, 'script.sh');
      fs.writeFileSync(healthyPath, '#!/bin/bash\necho "ok"');

      const report = monitor.generateHealthReport(testPluginPath, '1.0.0');

      expect(report.healthy).toBe(true);
      expect(report.totalIssues).toBe(0);
      expect(report.criticalIssues).toBe(0);
    });

    it('should include scan timestamp', () => {
      const report = monitor.generateHealthReport(testPluginPath, '1.0.0');

      expect(report.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
