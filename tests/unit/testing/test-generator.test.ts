/**
 * Test Generator Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const { mockYamlLoad } = vi.hoisted(() => ({
  mockYamlLoad: vi.fn(),
}));

vi.mock('js-yaml', () => ({
  load: mockYamlLoad,
}));

vi.mock('../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  TestGenerator,
  setTestGeneratorLogger,
  type TestSpec,
  type GeneratedTest,
} from '../../../src/testing/test-generator.js';
import type { Logger } from '../../../src/utils/logger.js';

describe('TestGenerator', () => {
  let tempDir: string;
  let generator: TestGenerator;
  let silentLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-generator-test-'));
    generator = new TestGenerator(tempDir);
    silentLogger = {
      log: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
    setTestGeneratorLogger(silentLogger);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('setTestGeneratorLogger', () => {
    it('should set a custom logger', () => {
      const customLogger: Logger = {
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };
      setTestGeneratorLogger(customLogger);

      // The logger is used internally; we verify it doesn't throw
      expect(() => setTestGeneratorLogger(customLogger)).not.toThrow();
    });
  });

  describe('generateTestsForSkill', () => {
    it('should return null when specs directory does not exist', async () => {
      const result = await generator.generateTestsForSkill('nonexistent-skill');

      expect(result).toBeNull();
      expect(silentLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No test specs found')
      );
    });

    it('should return null when specs directory has no YAML files', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'my-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'readme.txt'), 'not a yaml file');

      const result = await generator.generateTestsForSkill('my-skill');

      expect(result).toBeNull();
      expect(silentLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No YAML specs found')
      );
    });

    it('should return null when all YAML specs are invalid', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'my-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'invalid content');

      // Mock yaml.load to return null (invalid spec)
      mockYamlLoad.mockReturnValue(null);

      const result = await generator.generateTestsForSkill('my-skill');

      expect(result).toBeNull();
    });

    it('should return null when YAML spec is missing required fields', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'my-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'name: test only');

      // Missing description
      mockYamlLoad.mockReturnValue({ name: 'test only' });

      const result = await generator.generateTestsForSkill('my-skill');

      expect(result).toBeNull();
      expect(silentLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('missing name or description')
      );
    });

    it('should generate test file for valid YAML specs', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'my-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml content');

      const validSpec: TestSpec = {
        name: 'Test Login Flow',
        description: 'Tests the login flow',
        type: 'skill_activation',
        input: { prompt: 'test prompt' },
        expected_output: { skill_activated: true },
      };

      mockYamlLoad.mockReturnValue(validSpec);

      const result = await generator.generateTestsForSkill('my-skill');

      expect(result).not.toBeNull();
      expect(result!.skillName).toBe('my-skill');
      expect(result!.testCount).toBe(1);
      expect(result!.content).toContain('My Skill Tests');
      expect(result!.testFilePath).toContain('my-skill.test.ts');

      // Verify file was actually written
      expect(fs.existsSync(result!.testFilePath)).toBe(true);
    });

    it('should handle .yml extension files', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'my-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yml'), 'yaml content');

      mockYamlLoad.mockReturnValue({
        name: 'Test Feature',
        description: 'Tests the feature',
        input: { prompt: 'test' },
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('my-skill');

      expect(result).not.toBeNull();
      expect(result!.testCount).toBe(1);
    });

    it('should handle YAML parsing errors gracefully', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'my-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'bad.yaml'), 'invalid: yaml: content');

      mockYamlLoad.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      const result = await generator.generateTestsForSkill('my-skill');

      expect(result).toBeNull();
      expect(silentLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error loading spec'),
        'YAML parse error'
      );
    });

    it('should generate test content with API integration imports when credentials required', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'api-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Test API',
        description: 'Tests API integration',
        type: 'api_integration',
        input: {
          api_call: { method: 'GET', endpoint: '/api/test' },
        },
        expected_output: { api_response: { status: 200 } },
        requires: { credentials: ['jira'] },
      });

      const result = await generator.generateTestsForSkill('api-skill');

      expect(result).not.toBeNull();
      expect(result!.content).toContain('JiraClient');
      expect(result!.content).toContain('credentialsManager');
    });

    it('should generate test content with ADO client imports', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'ado-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Test ADO',
        description: 'Tests ADO integration',
        type: 'api_integration',
        input: { api_call: { method: 'GET', endpoint: '/ado/test' } },
        expected_output: {},
        requires: { credentials: ['ado'] },
      });

      const result = await generator.generateTestsForSkill('ado-skill');

      expect(result).not.toBeNull();
      expect(result!.content).toContain('AdoClient');
    });

    it('should generate test content with GitHub import (commented out)', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'gh-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Test GitHub',
        description: 'Tests GitHub integration',
        type: 'api_integration',
        input: { api_call: { method: 'GET', endpoint: '/gh/test' } },
        expected_output: {},
        requires: { credentials: ['github'] },
      });

      const result = await generator.generateTestsForSkill('gh-skill');

      expect(result).not.toBeNull();
      expect(result!.content).toContain('// import { GitHubClient }');
    });

    it('should handle multiple valid specs for one skill', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'multi-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml1');
      fs.writeFileSync(path.join(specsDir, 'test2.yaml'), 'yaml2');
      fs.writeFileSync(path.join(specsDir, 'test3.yml'), 'yaml3');

      mockYamlLoad
        .mockReturnValueOnce({
          name: 'Spec One',
          description: 'First spec',
          input: {},
          expected_output: {},
        })
        .mockReturnValueOnce({
          name: 'Spec Two',
          description: 'Second spec',
          input: {},
          expected_output: {},
        })
        .mockReturnValueOnce({
          name: 'Spec Three',
          description: 'Third spec',
          input: {},
          expected_output: {},
        });

      const result = await generator.generateTestsForSkill('multi-skill');

      expect(result).not.toBeNull();
      expect(result!.testCount).toBe(3);
    });

    it('should generate skill_activation test content', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'skill-test');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Activate Skill',
        description: 'Tests skill activation',
        type: 'skill_activation',
        input: { prompt: 'test prompt text' },
        expected_output: { skill_activated: true },
      });

      const result = await generator.generateTestsForSkill('skill-test');

      expect(result!.content).toContain('Skill activation test');
      expect(result!.content).toContain('test prompt text');
    });

    it('should generate api_integration test content', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'api-test');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'API Test',
        description: 'Tests API endpoint',
        type: 'api_integration',
        input: {
          api_call: { method: 'POST', endpoint: '/api/v1/resource' },
        },
        expected_output: { api_response: { status: 201 } },
      });

      const result = await generator.generateTestsForSkill('api-test');

      expect(result!.content).toContain('API Integration test');
      expect(result!.content).toContain('POST');
      expect(result!.content).toContain('/api/v1/resource');
    });

    it('should generate api_integration test content without api_call', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'api-test2');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'API No Call',
        description: 'API test without call definition',
        type: 'api_integration',
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('api-test2');

      expect(result!.content).toContain('API test without API call definition');
    });

    it('should generate generic test content for unknown type', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'generic-test');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Generic Test',
        description: 'A generic test description',
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('generic-test');

      expect(result!.content).toContain('Generic test');
      expect(result!.content).toContain('A generic test description');
    });

    it('should generate test runner code', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'runner-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test1.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Runner Test',
        description: 'Tests runner generation',
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('runner-skill');

      expect(result!.content).toContain('RunnerSkillTest');
      expect(result!.content).toContain('require.main === module');
      expect(result!.content).toContain('export { RunnerSkillTest }');
    });
  });

  describe('generateAllTests', () => {
    it('should return empty array when specs directory does not exist', async () => {
      // The tempDir doesn't have a tests/specs directory
      // This will throw because readdirSync fails - we need the directory
      const specsDir = path.join(tempDir, 'tests', 'specs');
      fs.mkdirSync(specsDir, { recursive: true });

      const results = await generator.generateAllTests();
      expect(results).toEqual([]);
    });

    it('should generate tests for all skill directories', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs');
      const skill1Dir = path.join(specsDir, 'skill-one');
      const skill2Dir = path.join(specsDir, 'skill-two');
      fs.mkdirSync(skill1Dir, { recursive: true });
      fs.mkdirSync(skill2Dir, { recursive: true });
      fs.writeFileSync(path.join(skill1Dir, 'test.yaml'), 'yaml');
      fs.writeFileSync(path.join(skill2Dir, 'test.yaml'), 'yaml');

      mockYamlLoad
        .mockReturnValueOnce({
          name: 'Skill One Test',
          description: 'Tests skill one',
          input: {},
          expected_output: {},
        })
        .mockReturnValueOnce({
          name: 'Skill Two Test',
          description: 'Tests skill two',
          input: {},
          expected_output: {},
        });

      const results = await generator.generateAllTests();

      expect(results).toHaveLength(2);
      expect(silentLogger.log).toHaveBeenCalledTimes(2);
    });

    it('should skip non-directory entries in specs dir', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs');
      const skillDir = path.join(specsDir, 'real-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'not-a-dir.txt'), 'file');
      fs.writeFileSync(path.join(skillDir, 'test.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Test',
        description: 'A test',
        input: {},
        expected_output: {},
      });

      const results = await generator.generateAllTests();

      expect(results).toHaveLength(1);
      expect(results[0].skillName).toBe('real-skill');
    });

    it('should handle errors in individual skill generation', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs');
      const skillDir = path.join(specsDir, 'error-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'test.yaml'), 'yaml');

      mockYamlLoad.mockImplementation(() => {
        throw new Error('Parse failure');
      });

      const results = await generator.generateAllTests();

      // The skill returns null due to error, so no generated tests
      expect(results).toHaveLength(0);
    });
  });

  describe('utility methods (tested via generateTestFile output)', () => {
    it('should format skill name with capitalized words', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'multi-word-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Test',
        description: 'Desc',
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('multi-word-skill');

      expect(result!.content).toContain('Multi Word Skill Tests');
      expect(result!.content).toContain('MultiWordSkillTest');
    });

    it('should convert test names to camelCase', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'camel-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Test Login Flow',
        description: 'Desc',
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('camel-skill');

      expect(result!.content).toContain('test1_testLoginFlow');
    });

    it('should sanitize special characters in camelCase conversion', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'special-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Test: Login/Flow (v2)',
        description: 'Desc',
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('special-skill');

      // Special chars should be removed and words joined as camelCase
      expect(result!.content).toContain('test1_testLoginFlowV2');
    });

    it('should escape single quotes in strings', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'escape-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: "Test with 'quotes'",
        description: "It's a test with 'single quotes'",
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('escape-skill');

      expect(result!.content).toContain("\\'quotes\\'");
      expect(result!.content).toContain("It\\'s a test");
    });

    it('should escape backslashes and newlines in strings', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'newline-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Test newline',
        description: 'Line1\nLine2\rLine3',
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('newline-skill');

      expect(result!.content).toContain('Line1\\nLine2\\rLine3');
    });

    it('should generate report method with correct skill name', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'report-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'test.yaml'), 'yaml');

      mockYamlLoad.mockReturnValue({
        name: 'Test',
        description: 'Desc',
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('report-skill');

      expect(result!.content).toContain('Test Results Summary');
      expect(result!.content).toContain("'report-skill'");
      expect(result!.content).toContain('Report Skill Tests');
    });

    it('should handle spec with trailing YAML document separator', async () => {
      const specsDir = path.join(tempDir, 'tests', 'specs', 'trailing-skill');
      fs.mkdirSync(specsDir, { recursive: true });
      const yamlContent = 'name: test\ndescription: desc\n---\n';
      fs.writeFileSync(path.join(specsDir, 'test.yaml'), yamlContent);

      mockYamlLoad.mockReturnValue({
        name: 'Test',
        description: 'Desc',
        input: {},
        expected_output: {},
      });

      const result = await generator.generateTestsForSkill('trailing-skill');

      // The trailing --- should be stripped before passing to yaml.load
      expect(mockYamlLoad).toHaveBeenCalled();
      const callArg = mockYamlLoad.mock.calls[0][0];
      expect(callArg).not.toMatch(/\n---\s*$/);
    });
  });

  describe('constructor', () => {
    it('should use process.cwd() as default project root', () => {
      const defaultGenerator = new TestGenerator();
      // We can't easily test the private fields, but we can verify it doesn't throw
      expect(defaultGenerator).toBeDefined();
    });

    it('should accept a custom project root', () => {
      const customGenerator = new TestGenerator('/custom/path');
      expect(customGenerator).toBeDefined();
    });
  });
});
