/**
 * Unit tests for CodeValidator
 *
 * Tests code validation for completed tasks:
 * - File path extraction from task descriptions
 * - File existence validation
 * - Content validation (not empty)
 */

import { CodeValidator } from '../../../src/core/living-docs/CodeValidator';
import fs from 'fs/promises';

// Mock dependencies
jest.mock('fs/promises');

describe('CodeValidator', () => {
  let validator: CodeValidator;

  beforeEach(() => {
    validator = new CodeValidator();
    jest.clearAllMocks();
  });

  describe('validateCodeExists', () => {
    it('should validate task with existing files', async () => {
      const tasksContent = `
### T-001: Create ThreeLayerSyncManager
**Files**:
- src/core/living-docs/ThreeLayerSyncManager.ts
- src/core/living-docs/types.ts
      `;

      (fs.readFile as jest.Mock).mockResolvedValue(tasksContent);
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 1000
      } as any);

      const result = await validator.validateCodeExists('T-001', '/path/to/increment');

      expect(result).toBe(true);
    });

    it('should fail validation for missing files', async () => {
      const tasksContent = `
### T-001: Create File
**Files**:
- src/missing/file.ts
      `;

      (fs.readFile as jest.Mock).mockResolvedValue(tasksContent);
      (fs.stat as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await validator.validateCodeExists('T-001', '/path/to/increment');

      expect(result).toBe(false);
    });

    it('should fail validation for empty files', async () => {
      const tasksContent = `
### T-001: Create File
**Files**:
- src/empty/file.ts
      `;

      (fs.readFile as jest.Mock).mockResolvedValue(tasksContent);
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 0
      } as any);

      const result = await validator.validateCodeExists('T-001', '/path/to/increment');

      expect(result).toBe(false);
    });

    it('should extract file paths from inline code references', async () => {
      const tasksContent = `
### T-001: Update file
Update \`src/core/file.ts\` and \`src/utils/helper.ts\`
      `;

      (fs.readFile as jest.Mock).mockResolvedValue(tasksContent);
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 100
      } as any);

      const result = await validator.validateCodeExists('T-001', '/path/to/increment');

      expect(result).toBe(true);
    });

    it('should return true for tasks without files', async () => {
      const tasksContent = `
### T-001: Write documentation
This task has no specific files.
      `;

      (fs.readFile as jest.Mock).mockResolvedValue(tasksContent);

      const result = await validator.validateCodeExists('T-001', '/path/to/increment');

      expect(result).toBe(true);
    });
  });

  describe('validateFile', () => {
    it('should validate existing file with content', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 500
      } as any);

      const result = await validator.validateFile('src/test.ts');

      expect(result.exists).toBe(true);
      expect(result.hasContent).toBe(true);
      expect(result.size).toBe(500);
    });

    it('should detect missing file', async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await validator.validateFile('missing.ts');

      expect(result.exists).toBe(false);
      expect(result.hasContent).toBe(false);
    });
  });

  describe('validateMultipleTasks', () => {
    it('should validate multiple tasks', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(`
### T-001: Task One
\`src/file1.ts\`

### T-002: Task Two
\`src/file2.ts\`
      `);

      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 100
      } as any);

      const results = await validator.validateMultipleTasks(
        ['T-001', 'T-002'],
        '/path/to/increment'
      );

      expect(results.size).toBe(2);
      expect(results.get('T-001')).toBe(true);
      expect(results.get('T-002')).toBe(true);
    });
  });

  describe('getValidationDetails', () => {
    it('should provide detailed validation results', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(`
### T-001: Create files
**Files**:
- src/file1.ts
- src/file2.ts
      `);

      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 200
      } as any);

      const details = await validator.getValidationDetails('T-001', '/path/to/increment');

      expect(details).toHaveLength(2);
      expect(details[0].path).toBe('src/file1.ts');
      expect(details[1].path).toBe('src/file2.ts');
    });
  });
});
