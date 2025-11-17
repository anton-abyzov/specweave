import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Terraform Template Engine Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TerraformTemplateEngine, createTemplateEngine } from '../../../src/core/iac/template-engine.js.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TerraformTemplateEngine', () => {
  let engine: TerraformTemplateEngine;
  let tempDir: string;

  beforeEach(() => {
    engine = createTemplateEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terraform-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('testHelpers', () => {
    it('should convert to snake_case', () => {
      const template = engine.loadTemplateString('{{snakeCase name}}');
      const result = template({ name: 'myFunctionName' });
      expect(result).toBe('my_function_name');
    });

    it('should convert to kebab-case', () => {
      const template = engine.loadTemplateString('{{kebabCase name}}');
      const result = template({ name: 'myFunctionName' });
      expect(result).toBe('my-function-name');
    });

    it('should convert to uppercase', () => {
      const template = engine.loadTemplateString('{{uppercase env}}');
      const result = template({ env: 'dev' });
      expect(result).toBe('DEV');
    });

    it('should check equality with eq helper', () => {
      const template = engine.loadTemplateString(
        '{{#if (eq provider "aws")}}AWS{{else}}Other{{/if}}'
      );
      const result = template({ provider: 'aws' });
      expect(result).toBe('AWS');
    });

    it('should handle OR logic', () => {
      const template = engine.loadTemplateString(
        '{{#if (or authEnabled monitoringEnabled)}}Enabled{{else}}Disabled{{/if}}'
      );
      const result1 = template({ authEnabled: true, monitoringEnabled: false });
      const result2 = template({ authEnabled: false, monitoringEnabled: false });
      expect(result1).toBe('Enabled');
      expect(result2).toBe('Disabled');
    });

    it('should format array as Terraform list', () => {
      const template = engine.loadTemplateString('subnets = {{tfList subnets}}');
      const result = template({ subnets: ['subnet-1', 'subnet-2', 'subnet-3'] });
      expect(result).toBe('subnets = ["subnet-1", "subnet-2", "subnet-3"]');
    });

    it('should handle empty array for tfList', () => {
      const template = engine.loadTemplateString('subnets = {{tfList subnets}}');
      const result = template({ subnets: [] });
      expect(result).toBe('subnets = []');
    });

    it('should format object as Terraform map', () => {
      const template = engine.loadTemplateString('tags = {{tfMap tags}}');
      const result = template({ tags: { Environment: 'dev', Project: 'test' } });
      expect(result).toContain('Environment = "dev"');
      expect(result).toContain('Project = "test"');
    });
  });

  describe('testTemplateLoading', () => {
    it('should load and render template from string', () => {
      const template = engine.loadTemplateString('Hello {{name}}!');
      const result = template({ name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should load and cache template from file', () => {
      // Create a test template file
      const templatePath = path.join(tempDir, 'test.hbs');
      fs.writeFileSync(templatePath, 'Project: {{projectName}}');

      const result1 = engine.renderTemplate(templatePath, { projectName: 'MyProject' });
      const result2 = engine.renderTemplate(templatePath, { projectName: 'AnotherProject' });

      expect(result1).toBe('Project: MyProject');
      expect(result2).toBe('Project: AnotherProject');
    });

    it('should support partial templates', () => {
      // Create partial template
      const partialPath = path.join(tempDir, 'tags.hbs');
      fs.writeFileSync(
        partialPath,
        'tags = {\n  Environment = "{{environment}}"\n  Project = "{{projectName}}"\n}'
      );

      // Register partial
      engine.registerPartial('tags', partialPath);

      // Create main template using partial
      const template = engine.loadTemplateString('{{> tags}}');
      const result = template({ environment: 'dev', projectName: 'test' });

      expect(result).toContain('Environment = "dev"');
      expect(result).toContain('Project = "test"');
    });
  });

  describe('testTerraformConfigRendering', () => {
    it('should render complete Terraform configuration from directory', () => {
      // Create template directory with required files
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir);

      // main.tf.hbs
      fs.writeFileSync(
        path.join(templateDir, 'main.tf.hbs'),
        `resource "aws_lambda_function" "{{snakeCase functionName}}" {
  function_name = "{{functionName}}"
  runtime       = "{{runtime}}"
  memory_size   = {{memorySize}}
}`
      );

      // variables.tf.hbs
      fs.writeFileSync(
        path.join(templateDir, 'variables.tf.hbs'),
        `variable "function_name" {
  description = "Lambda function name"
  type        = string
  default     = "{{functionName}}"
}`
      );

      // outputs.tf.hbs
      fs.writeFileSync(
        path.join(templateDir, 'outputs.tf.hbs'),
        `output "function_arn" {
  value = aws_lambda_function.{{snakeCase functionName}}.arn
}`
      );

      const variables = {
        projectName: 'test-project',
        projectDescription: 'Test project',
        environment: 'dev' as const,
        provider: 'aws' as const,
        region: 'us-east-1',
        functionName: 'myFunction',
        runtime: 'nodejs20.x',
        memorySize: 256,
        timeout: 30,
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).toContain('resource "aws_lambda_function" "my_function"');
      expect(config.mainTf).toContain('function_name = "myFunction"');
      expect(config.mainTf).toContain('runtime       = "nodejs20.x"');
      expect(config.mainTf).toContain('memory_size   = 256');

      expect(config.variablesTf).toContain('variable "function_name"');
      expect(config.variablesTf).toContain('default     = "myFunction"');

      expect(config.outputsTf).toContain('output "function_arn"');
      expect(config.outputsTf).toContain('aws_lambda_function.my_function.arn');
    });

    it('should throw error if required template files are missing', () => {
      const templateDir = path.join(tempDir, 'incomplete-templates');
      fs.mkdirSync(templateDir);

      // Only create main.tf.hbs (missing variables.tf.hbs and outputs.tf.hbs)
      fs.writeFileSync(path.join(templateDir, 'main.tf.hbs'), 'resource "test" "test" {}');

      const variables = {
        projectName: 'test',
        environment: 'dev' as const,
        provider: 'aws' as const,
        functionName: 'test',
        runtime: 'nodejs20.x',
      };

      expect(() => {
        engine.renderTerraformConfig(templateDir, variables);
      }).toThrow('Template not found');
    });

    it('should include optional provider.tf and README.md if present', () => {
      const templateDir = path.join(tempDir, 'complete-templates');
      fs.mkdirSync(templateDir);

      // Required files
      fs.writeFileSync(path.join(templateDir, 'main.tf.hbs'), 'resource "test" "test" {}');
      fs.writeFileSync(path.join(templateDir, 'variables.tf.hbs'), 'variable "test" {}');
      fs.writeFileSync(path.join(templateDir, 'outputs.tf.hbs'), 'output "test" {}');

      // Optional files
      fs.writeFileSync(
        path.join(templateDir, 'provider.tf.hbs'),
        'provider "{{provider}}" {\n  region = "{{region}}"\n}'
      );
      fs.writeFileSync(
        path.join(templateDir, 'README.md.hbs'),
        '# {{projectName}}\n\n{{projectDescription}}'
      );

      const variables = {
        projectName: 'my-project',
        projectDescription: 'Test description',
        environment: 'dev' as const,
        provider: 'aws' as const,
        region: 'us-east-1',
        functionName: 'test',
        runtime: 'nodejs20.x',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.providerTf).toBeDefined();
      expect(config.providerTf).toContain('provider "aws"');
      expect(config.providerTf).toContain('region = "us-east-1"');

      expect(config.readmeMd).toBeDefined();
      expect(config.readmeMd).toContain('# my-project');
      expect(config.readmeMd).toContain('Test description');
    });
  });

  describe('testWriteTerraformConfig', () => {
    it('should write all Terraform files to output directory', () => {
      const outputDir = path.join(tempDir, 'output');

      const config = {
        mainTf: 'resource "test" "test" {}',
        variablesTf: 'variable "test" {}',
        outputsTf: 'output "test" {}',
        providerTf: 'provider "aws" {}',
        readmeMd: '# Test Project',
      };

      engine.writeTerraformConfig(outputDir, config);

      expect(fs.existsSync(path.join(outputDir, 'main.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'variables.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'outputs.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'provider.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);

      expect(fs.readFileSync(path.join(outputDir, 'main.tf'), 'utf-8')).toBe(config.mainTf);
      expect(fs.readFileSync(path.join(outputDir, 'provider.tf'), 'utf-8')).toBe(
        config.providerTf
      );
    });

    it('should create output directory if it does not exist', () => {
      const outputDir = path.join(tempDir, 'new', 'nested', 'dir');

      const config = {
        mainTf: 'resource "test" "test" {}',
        variablesTf: 'variable "test" {}',
        outputsTf: 'output "test" {}',
      };

      engine.writeTerraformConfig(outputDir, config);

      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'main.tf'))).toBe(true);
    });
  });

  describe('testCacheManagement', () => {
    it('should cache and reuse compiled templates', () => {
      const templatePath = path.join(tempDir, 'cached.hbs');
      fs.writeFileSync(templatePath, 'Hello {{name}}');

      // First load - should compile and cache
      const result1 = engine.renderTemplate(templatePath, { name: 'World' });

      // Modify the template file
      fs.writeFileSync(templatePath, 'Hi {{name}}');

      // Second load - should use cache (old template)
      const result2 = engine.renderTemplate(templatePath, { name: 'World' });

      expect(result1).toBe('Hello World');
      expect(result2).toBe('Hello World'); // Still uses cached version

      // Clear cache
      engine.clearCache();

      // Third load - should recompile (new template)
      const result3 = engine.renderTemplate(templatePath, { name: 'World' });
      expect(result3).toBe('Hi World'); // Uses new version
    });
  });
});
