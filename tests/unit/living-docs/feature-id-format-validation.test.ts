import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { LivingDocsSync } from '../../../src/core/living-docs/living-docs-sync.js';

/**
 * Feature ID Format Validation Tests
 *
 * PURPOSE: Prevent date-based feature IDs (FS-YY-MM-DD) for greenfield increments
 *
 * BUG HISTORY:
 * - 2025-11-18: Increment 0042/0043 had `epic: FS-25-11-18` (date format) instead of `FS-043`
 * - ROOT CAUSE: PM agent writing date-based epic for greenfield increments
 * - FIX: LivingDocsSync now validates format and auto-generates correct ID
 *
 * FEATURE ID STANDARDS:
 * - Greenfield (SpecWeave-native): FS-XXX (e.g., FS-031, FS-043)
 * - Brownfield (imported): FS-YY-MM-DD-name (e.g., FS-25-11-14-jira-epic)
 */

describe('Feature ID Format Validation', () => {
  let testRoot: string;
  let sync: LivingDocsSync;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `feature-id-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    sync = new LivingDocsSync(testRoot);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testRoot);
  });

  describe('Greenfield Increments (SpecWeave-native)', () => {
    it('should use correct FS-XXX format when epic field is missing', async () => {
      // Create greenfield increment without epic field
      const incrementId = '0043-test-feature';
      const incrementPath = path.join(testRoot, '.specweave/increments', incrementId);
      await fs.ensureDir(incrementPath);

      // spec.md WITHOUT epic field
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: ${incrementId}
title: "Test Feature"
status: planning
type: feature
---

# Test Feature
`
      );

      // metadata.json WITHOUT feature field
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: incrementId,
        status: 'planning',
        created: '2025-11-18'
      });

      // Sync increment
      const result = await sync.syncIncrement(incrementId);

      // Should auto-generate FS-043 (not date-based)
      expect(result.featureId).toBe('FS-043');
      expect(result.success).toBe(true);
    });

    it('should auto-generate correct FS-XXX when date-based ID found (format mismatch)', async () => {
      // Create greenfield increment with WRONG date-based epic
      const incrementId = '0043-test-feature';
      const incrementPath = path.join(testRoot, '.specweave/increments', incrementId);
      await fs.ensureDir(incrementPath);

      // spec.md with WRONG date-based epic (BUG SCENARIO)
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: ${incrementId}
title: "Test Feature"
status: planning
type: feature
epic: FS-25-11-18  # ❌ WRONG! This is brownfield format for greenfield increment
---

# Test Feature
`
      );

      // metadata.json with date-based feature (from spec.md)
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: incrementId,
        status: 'planning',
        created: '2025-11-18',
        feature: 'FS-25-11-18'  // ❌ WRONG format
      });

      // Mock console.warn to verify warning is logged
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Sync increment
      const result = await sync.syncIncrement(incrementId);

      // Should auto-generate FS-043 (ignoring wrong date-based ID)
      expect(result.featureId).toBe('FS-043');
      expect(result.success).toBe(true);

      // Should log warning about format mismatch
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Feature ID format mismatch for 0043-test-feature')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found: FS-25-11-18')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Expected: FS-XXX (greenfield)')
      );

      warnSpy.mockRestore();
    });

    it('should preserve correct FS-XXX format if already present', async () => {
      // Create greenfield increment with CORRECT FS-XXX epic
      const incrementId = '0043-test-feature';
      const incrementPath = path.join(testRoot, '.specweave/increments', incrementId);
      await fs.ensureDir(incrementPath);

      // spec.md with correct FS-XXX epic
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: ${incrementId}
title: "Test Feature"
status: planning
type: feature
epic: FS-043  # ✅ CORRECT greenfield format
---

# Test Feature
`
      );

      // metadata.json with correct feature
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: incrementId,
        status: 'planning',
        created: '2025-11-18',
        feature: 'FS-043'  // ✅ CORRECT
      });

      // Sync increment
      const result = await sync.syncIncrement(incrementId);

      // Should use existing FS-043 (already correct)
      expect(result.featureId).toBe('FS-043');
      expect(result.success).toBe(true);
    });
  });

  describe('Brownfield Increments (Imported)', () => {
    it('should preserve date-based FS-YY-MM-DD-name format for imported work', async () => {
      // Create brownfield increment with correct date-based epic
      const incrementId = '0050-imported-jira-epic';
      const incrementPath = path.join(testRoot, '.specweave/increments', incrementId);
      await fs.ensureDir(incrementPath);

      // spec.md with brownfield format + imported flag
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: ${incrementId}
title: "Imported JIRA Epic"
status: planning
type: feature
imported: true  # ✅ Brownfield indicator
epic: FS-25-11-18-jira-epic  # ✅ CORRECT brownfield format
---

# Imported JIRA Epic
`
      );

      // metadata.json with imported flag
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: incrementId,
        status: 'planning',
        created: '2025-11-18',
        imported: true,  // ✅ Brownfield marker
        feature: 'FS-25-11-18-jira-epic'
      });

      // Sync increment
      const result = await sync.syncIncrement(incrementId);

      // Should preserve date-based format (correct for brownfield)
      expect(result.featureId).toBe('FS-25-11-18-jira-epic');
      expect(result.success).toBe(true);
    });

    it('should warn if brownfield has wrong FS-XXX format', async () => {
      // Create brownfield increment with WRONG greenfield format
      const incrementId = '0050-imported-jira-epic';
      const incrementPath = path.join(testRoot, '.specweave/increments', incrementId);
      await fs.ensureDir(incrementPath);

      // spec.md with imported flag but WRONG format
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: ${incrementId}
title: "Imported JIRA Epic"
status: planning
type: feature
imported: true  # ✅ Brownfield indicator
epic: FS-050  # ❌ WRONG! Should be date-based for brownfield
---

# Imported JIRA Epic
`
      );

      // metadata.json with imported flag
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: incrementId,
        status: 'planning',
        created: '2025-11-18',
        imported: true,
        feature: 'FS-050'  // ❌ WRONG format for brownfield
      });

      // Mock console.warn to verify warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Sync increment
      const result = await sync.syncIncrement(incrementId);

      // Should auto-generate FS-050 (fallback, but logs warning)
      expect(result.featureId).toBe('FS-050');

      // Should log warning about format mismatch
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Feature ID format mismatch')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Expected: FS-YY-MM-DD-name (brownfield)')
      );

      warnSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing metadata.json gracefully', async () => {
      const incrementId = '0043-test-feature';
      const incrementPath = path.join(testRoot, '.specweave/increments', incrementId);
      await fs.ensureDir(incrementPath);

      // spec.md only (no metadata.json)
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: ${incrementId}
title: "Test Feature"
---

# Test Feature
`
      );

      // Sync increment
      const result = await sync.syncIncrement(incrementId);

      // Should auto-generate FS-043 (default greenfield)
      expect(result.featureId).toBe('FS-043');
    });

    it('should handle metadata.json without feature field', async () => {
      const incrementId = '0043-test-feature';
      const incrementPath = path.join(testRoot, '.specweave/increments', incrementId);
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: ${incrementId}
title: "Test Feature"
---

# Test Feature
`
      );

      // metadata.json without feature field
      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: incrementId,
        status: 'planning'
      });

      // Sync increment
      const result = await sync.syncIncrement(incrementId);

      // Should auto-generate FS-043
      expect(result.featureId).toBe('FS-043');
    });
  });

  describe('Regression Prevention', () => {
    it('should prevent FS-25-11-18 bug (date format for greenfield)', async () => {
      // Exact scenario from bug report (increment 0042/0043)
      const incrementId = '0042-test-infrastructure-cleanup';
      const incrementPath = path.join(testRoot, '.specweave/increments', incrementId);
      await fs.ensureDir(incrementPath);

      // Reproduce the bug: greenfield with date-based epic
      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: ${incrementId}
title: "Test Infrastructure Cleanup"
status: in-progress
type: refactor
epic: FS-25-11-18  # ❌ BUG: Date format for greenfield
---

# Test Infrastructure Cleanup
`
      );

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: incrementId,
        status: 'in-progress',
        created: '2025-11-18',
        feature: 'FS-25-11-18'  // ❌ BUG
      });

      // Sync should auto-fix
      const result = await sync.syncIncrement(incrementId);

      // ✅ FIX: Should generate FS-042, NOT FS-25-11-18
      expect(result.featureId).toBe('FS-042');
      expect(result.featureId).not.toBe('FS-25-11-18');  // Regression check
    });
  });
});
