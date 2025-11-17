/**
 * Infrastructure as Code (IaC) Generation Flow Integration Tests
 *
 * Tests end-to-end IaC generation workflow:
 * - Template loading and compilation
 * - Variable substitution
 * - Multi-file generation (main.tf, variables.tf, outputs.tf)
 * - Platform-specific configurations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  TerraformTemplateEngine,
  createTemplateEngine,
} from '../../src/core/iac/template-engine.js';
import type { TemplateVariables } from '../../src/core/iac/template-engine.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Infrastructure IaC Generation Flow Integration', () => {
  let engine: TerraformTemplateEngine;
  let tempDir: string;

  beforeEach(() => {
    engine = createTemplateEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iac-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    engine.clearCache();
  });

  describe('testTemplateEngineCreation', () => {
    it('should create template engine instance with Handlebars', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(TerraformTemplateEngine);
    });

    it('should support custom Handlebars helpers', () => {
      const template = engine.loadTemplateString('{{snakeCase "myFunctionName"}}');
      const result = template({});
      expect(result).toBe('my_function_name');
    });

    it('should support kebab-case helper', () => {
      const template = engine.loadTemplateString('{{kebabCase "MyProjectName"}}');
      const result = template({});
      expect(result).toBe('my-project-name');
    });

    it('should support uppercase helper', () => {
      const template = engine.loadTemplateString('{{uppercase "env"}}');
      const result = template({ env: 'prod' });
      expect(result).toBe('PROD');
    });

    it('should support equality helper', () => {
      const template = engine.loadTemplateString('{{#if (eq provider "aws")}}AWS{{else}}Other{{/if}}');
      expect(template({ provider: 'aws' })).toBe('AWS');
      expect(template({ provider: 'azure' })).toBe('Other');
    });

    it('should support OR helper', () => {
      const template = engine.loadTemplateString(
        '{{#if (or authEnabled monitoringEnabled)}}Enabled{{else}}Disabled{{/if}}'
      );
      expect(template({ authEnabled: true, monitoringEnabled: false })).toBe('Enabled');
      expect(template({ authEnabled: false, monitoringEnabled: true })).toBe('Enabled');
      expect(template({ authEnabled: false, monitoringEnabled: false })).toBe('Disabled');
    });

    it('should support Terraform list helper', () => {
      const template = engine.loadTemplateString('{{tfList runtimes}}');
      const result = template({ runtimes: ['nodejs', 'python', 'go'] });
      expect(result).toBe('["nodejs", "python", "go"]');
    });

    it('should support Terraform map helper', () => {
      const template = engine.loadTemplateString('{{tfMap tags}}');
      const result = template({ tags: { Environment: 'prod', Team: 'backend' } });
      expect(result).toContain('Environment = "prod"');
      expect(result).toContain('Team = "backend"');
    });
  });

  describe('testTemplateStringLoading', () => {
    it('should load and compile template from string', () => {
      const templateContent = 'resource "aws_lambda_function" "{{functionName}}" {}';
      const template = engine.loadTemplateString(templateContent);

      const result = template({ functionName: 'my_function' });
      expect(result).toContain('my_function');
    });

    it('should handle complex template with conditionals', () => {
      const templateContent = `
resource "aws_lambda_function" "function" {
  function_name = "{{functionName}}"
  runtime       = "{{runtime}}"
  {{#if memorySize}}
  memory_size   = {{memorySize}}
  {{/if}}
}`;
      const template = engine.loadTemplateString(templateContent);

      const result = template({
        functionName: 'test_function',
        runtime: 'nodejs18.x',
        memorySize: 512,
      });

      expect(result).toContain('test_function');
      expect(result).toContain('nodejs18.x');
      expect(result).toContain('memory_size   = 512');
    });

    it('should handle loops in templates', () => {
      const templateContent = `
{{#each lambdas}}
resource "aws_lambda_function" "{{this.name}}" {
  runtime = "{{this.runtime}}"
}
{{/each}}`;
      const template = engine.loadTemplateString(templateContent);

      const result = template({
        lambdas: [
          { name: 'func1', runtime: 'nodejs18.x' },
          { name: 'func2', runtime: 'python3.11' },
        ],
      });

      expect(result).toContain('func1');
      expect(result).toContain('func2');
      expect(result).toContain('nodejs18.x');
      expect(result).toContain('python3.11');
    });
  });

  describe('testVariableSubstitution', () => {
    it('should substitute all template variables correctly', () => {
      const templateContent = `
provider "{{provider}}" {
  region = "{{region}}"
}

resource "aws_lambda_function" "{{functionName}}" {
  function_name = "{{projectName}}-{{functionName}}"
  runtime       = "{{runtime}}"
  handler       = "{{handler}}"
  memory_size   = {{memorySize}}
  timeout       = {{timeout}}
}`;

      const template = engine.loadTemplateString(templateContent);
      const variables: TemplateVariables = {
        provider: 'aws',
        region: 'us-east-1',
        functionName: 'api_handler',
        projectName: 'my_project',
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        memorySize: 1024,
        timeout: 30,
      };

      const result = template(variables);

      expect(result).toContain('provider "aws"');
      expect(result).toContain('region = "us-east-1"');
      expect(result).toContain('function_name = "my_project-api_handler"');
      expect(result).toContain('runtime       = "nodejs18.x"');
      expect(result).toContain('handler       = "index.handler"');
      expect(result).toContain('memory_size   = 1024');
      expect(result).toContain('timeout       = 30');
    });

    it('should handle missing optional variables gracefully', () => {
      const templateContent = `
resource "aws_lambda_function" "function" {
  function_name = "{{functionName}}"
  {{#if timeout}}
  timeout = {{timeout}}
  {{/if}}
  {{#if memorySize}}
  memory_size = {{memorySize}}
  {{/if}}
}`;

      const template = engine.loadTemplateString(templateContent);
      const result = template({ functionName: 'test' });

      expect(result).toContain('test');
      expect(result).not.toContain('timeout');
      expect(result).not.toContain('memory_size');
    });

    it('should handle nested object variables', () => {
      const templateContent = `
resource "aws_lambda_function" "function" {
  vpc_config {
    subnet_ids = {{tfList vpc.subnetIds}}
    security_group_ids = {{tfList vpc.securityGroupIds}}
  }
}`;

      const template = engine.loadTemplateString(templateContent);
      const result = template({
        vpc: {
          subnetIds: ['subnet-1', 'subnet-2'],
          securityGroupIds: ['sg-1'],
        },
      });

      expect(result).toContain('subnet-1');
      expect(result).toContain('subnet-2');
      expect(result).toContain('sg-1');
    });
  });

  describe('testMultiFileGeneration', () => {
    it('should generate main.tf, variables.tf, and outputs.tf from templates', () => {
      // Create template directory
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      // Create template files
      fs.writeFileSync(
        path.join(templateDir, 'main.tf.hbs'),
        'resource "aws_lambda_function" "{{functionName}}" {}'
      );
      fs.writeFileSync(
        path.join(templateDir, 'variables.tf.hbs'),
        'variable "function_name" { type = string }'
      );
      fs.writeFileSync(
        path.join(templateDir, 'outputs.tf.hbs'),
        'output "function_arn" { value = aws_lambda_function.{{functionName}}.arn }'
      );

      const variables: TemplateVariables = {
        functionName: 'my_function',
      };

      const result = engine.renderTerraformConfig(templateDir, variables);

      expect(result.mainTf).toBeDefined();
      expect(result.variablesTf).toBeDefined();
      expect(result.outputsTf).toBeDefined();
      expect(result.mainTf).toContain('my_function');
      expect(result.outputsTf).toContain('my_function');
    });

    it('should generate optional provider.tf if template exists', () => {
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      fs.writeFileSync(path.join(templateDir, 'main.tf.hbs'), 'resource "test" "test" {}');
      fs.writeFileSync(path.join(templateDir, 'variables.tf.hbs'), '# Variables');
      fs.writeFileSync(path.join(templateDir, 'outputs.tf.hbs'), '# Outputs');
      fs.writeFileSync(
        path.join(templateDir, 'provider.tf.hbs'),
        'provider "{{provider}}" { region = "{{region}}" }'
      );

      const variables: TemplateVariables = {
        provider: 'aws',
        region: 'us-west-2',
      };

      const result = engine.renderTerraformConfig(templateDir, variables);

      expect(result.providerTf).toBeDefined();
      expect(result.providerTf).toContain('aws');
      expect(result.providerTf).toContain('us-west-2');
    });

    it('should generate optional README.md if template exists', () => {
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      fs.writeFileSync(path.join(templateDir, 'main.tf.hbs'), 'resource "test" "test" {}');
      fs.writeFileSync(path.join(templateDir, 'variables.tf.hbs'), '# Variables');
      fs.writeFileSync(path.join(templateDir, 'outputs.tf.hbs'), '# Outputs');
      fs.writeFileSync(
        path.join(templateDir, 'README.md.hbs'),
        '# {{projectName}}\n\n{{projectDescription}}'
      );

      const variables: TemplateVariables = {
        projectName: 'My Project',
        projectDescription: 'A serverless application',
      };

      const result = engine.renderTerraformConfig(templateDir, variables);

      expect(result.readmeMd).toBeDefined();
      expect(result.readmeMd).toContain('My Project');
      expect(result.readmeMd).toContain('A serverless application');
    });

    it('should throw error if required template files are missing', () => {
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      // Only create main.tf.hbs, missing variables.tf.hbs and outputs.tf.hbs
      fs.writeFileSync(path.join(templateDir, 'main.tf.hbs'), 'resource "test" "test" {}');

      expect(() => {
        engine.renderTerraformConfig(templateDir, {});
      }).toThrow();
    });
  });

  describe('testFileWriting', () => {
    it('should write all generated files to output directory', () => {
      // Create template directory
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      fs.writeFileSync(path.join(templateDir, 'main.tf.hbs'), 'resource "test" "main" {}');
      fs.writeFileSync(path.join(templateDir, 'variables.tf.hbs'), 'variable "test" {}');
      fs.writeFileSync(path.join(templateDir, 'outputs.tf.hbs'), 'output "test" { value = "test" }');
      fs.writeFileSync(path.join(templateDir, 'provider.tf.hbs'), 'provider "aws" {}');
      fs.writeFileSync(path.join(templateDir, 'README.md.hbs'), '# Test');

      const config = engine.renderTerraformConfig(templateDir, {});

      const outputDir = path.join(tempDir, 'output');
      engine.writeTerraformConfig(outputDir, config);

      // Verify all files were written
      expect(fs.existsSync(path.join(outputDir, 'main.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'variables.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'outputs.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'provider.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);

      // Verify content
      const mainContent = fs.readFileSync(path.join(outputDir, 'main.tf'), 'utf-8');
      expect(mainContent).toContain('resource "test" "main"');
    });

    it('should create output directory if it does not exist', () => {
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      fs.writeFileSync(path.join(templateDir, 'main.tf.hbs'), 'resource "test" "test" {}');
      fs.writeFileSync(path.join(templateDir, 'variables.tf.hbs'), '# Variables');
      fs.writeFileSync(path.join(templateDir, 'outputs.tf.hbs'), '# Outputs');

      const config = engine.renderTerraformConfig(templateDir, {});

      const outputDir = path.join(tempDir, 'nested', 'output', 'dir');
      expect(fs.existsSync(outputDir)).toBe(false);

      engine.writeTerraformConfig(outputDir, config);

      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'main.tf'))).toBe(true);
    });
  });

  describe('testTemplateCaching', () => {
    it('should cache compiled templates for performance', () => {
      const templateContent = 'resource "test" "{{name}}" {}';
      const templatePath = path.join(tempDir, 'test.hbs');
      fs.writeFileSync(templatePath, templateContent);

      // First load
      const template1 = engine.loadTemplate(templatePath);
      const result1 = template1({ name: 'first' });

      // Second load (should use cache)
      const template2 = engine.loadTemplate(templatePath);
      const result2 = template2({ name: 'second' });

      expect(result1).toContain('first');
      expect(result2).toContain('second');
      expect(template1).toBe(template2); // Same instance from cache
    });

    it('should clear template cache when requested', () => {
      const templateContent = 'resource "test" "{{name}}" {}';
      const templatePath = path.join(tempDir, 'test.hbs');
      fs.writeFileSync(templatePath, templateContent);

      const template1 = engine.loadTemplate(templatePath);

      engine.clearCache();

      const template2 = engine.loadTemplate(templatePath);

      // After cache clear, should compile again
      expect(template1).not.toBe(template2);
    });
  });

  describe('testPartialTemplates', () => {
    it('should support partial templates for reusable components', () => {
      const partialContent = 'tags = {{tfMap tags}}';
      const partialPath = path.join(tempDir, 'tags.hbs');
      fs.writeFileSync(partialPath, partialContent);

      engine.registerPartial('tags', partialPath);

      const mainTemplate = engine.loadTemplateString(`
resource "aws_lambda_function" "function" {
  {{> tags}}
}
`);

      const result = mainTemplate({ tags: { Environment: 'dev', Team: 'backend' } });

      expect(result).toContain('Environment = "dev"');
      expect(result).toContain('Team = "backend"');
    });
  });

  describe('testEdgeCases', () => {
    it('should handle empty variable object', () => {
      const template = engine.loadTemplateString('resource "test" "test" {}');
      const result = template({});
      expect(result).toContain('resource "test" "test"');
    });

    it('should handle special characters in strings', () => {
      const template = engine.loadTemplateString('description = "{{description}}"');
      const result = template({ description: 'Test with "quotes" and \'apostrophes\'' });
      expect(result).toBeDefined();
    });

    it('should handle numeric values correctly', () => {
      const template = engine.loadTemplateString('memory = {{memory}}\ntimeout = {{timeout}}');
      const result = template({ memory: 1024, timeout: 30 });
      expect(result).toContain('memory = 1024');
      expect(result).toContain('timeout = 30');
    });

    it('should handle boolean values correctly', () => {
      const template = engine.loadTemplateString(
        '{{#if enabled}}enabled = true{{else}}enabled = false{{/if}}'
      );
      expect(template({ enabled: true })).toContain('enabled = true');
      expect(template({ enabled: false })).toContain('enabled = false');
    });
  });
});
