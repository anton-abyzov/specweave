import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateGenerator } from '../../../src/core/iac/template-generator.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('TemplateGenerator', () => {
  let generator: TemplateGenerator;

  beforeEach(() => {
    generator = new TemplateGenerator();
  });

  describe('testHandlebarsTemplateRendering', () => {
    it('should render Handlebars template with variables', async () => {
      const template = 'Hello {{name}}! Region: {{region}}';
      const variables = { name: 'Lambda', region: 'us-east-1' };

      const result = generator.render(template, variables);

      expect(result).toBe('Hello Lambda! Region: us-east-1');
    });
  });

  describe('testVariableSubstitution', () => {
    it('should replace all Terraform variables correctly', async () => {
      const template = `
resource "aws_lambda_function" "main" {
  function_name = "{{function_name}}"
  runtime       = "{{runtime}}"
  memory_size   = {{memory_size}}
  timeout       = {{timeout}}
}
      `.trim();

      const variables = {
        function_name: 'my-function',
        runtime: 'nodejs20.x',
        memory_size: 128,
        timeout: 30
      };

      const result = generator.render(template, variables);

      expect(result).toContain('function_name = "my-function"');
      expect(result).toContain('runtime       = "nodejs20.x"');
      expect(result).toContain('memory_size   = 128');
      expect(result).toContain('timeout       = 30');
    });
  });

  describe('testConditionalRendering', () => {
    it('should handle Handlebars #if conditions', async () => {
      const template = `
{{#if enable_vpc}}
vpc_config {
  subnet_ids = {{subnet_ids}}
}
{{/if}}
      `.trim();

      const withVpc = generator.render(template, {
        enable_vpc: true,
        subnet_ids: '["subnet-1", "subnet-2"]'
      });
      expect(withVpc).toContain('vpc_config');

      const withoutVpc = generator.render(template, { enable_vpc: false });
      expect(withoutVpc).not.toContain('vpc_config');
    });
  });

  describe('testLoopRendering', () => {
    it('should handle Handlebars #each loops', async () => {
      const template = `
{{#each environments}}
- {{this}}
{{/each}}
      `.trim();

      const variables = {
        environments: ['dev', 'staging', 'prod']
      };

      const result = generator.render(template, variables);

      expect(result).toContain('- dev');
      expect(result).toContain('- staging');
      expect(result).toContain('- prod');
    });
  });

  describe('testCustomHelpers', () => {
    it('should support uppercase helper', async () => {
      const template = 'Environment: {{uppercase env}}';
      const variables = { env: 'production' };

      const result = generator.render(template, variables);

      expect(result).toBe('Environment: PRODUCTION');
    });

    it('should support lowercase helper', async () => {
      const template = 'Name: {{lowercase name}}';
      const variables = { name: 'MY-FUNCTION' };

      const result = generator.render(template, variables);

      expect(result).toBe('Name: my-function');
    });

    it('should support conditional helper', async () => {
      const template = '{{#ifEquals env "production"}}PROD{{else}}NON-PROD{{/ifEquals}}';

      const prodResult = generator.render(template, { env: 'production' });
      expect(prodResult).toBe('PROD');

      const devResult = generator.render(template, { env: 'dev' });
      expect(devResult).toBe('NON-PROD');
    });
  });

  describe('testVariableResolver', () => {
    it('should merge defaults with custom variables', async () => {
      const defaults = {
        region: 'us-east-1',
        runtime: 'nodejs20.x',
        memory_size: 128
      };

      const custom = {
        region: 'eu-west-1',
        function_name: 'my-function'
      };

      const merged = generator.mergeVariables(defaults, custom);

      expect(merged.region).toBe('eu-west-1'); // custom overrides default
      expect(merged.runtime).toBe('nodejs20.x'); // default preserved
      expect(merged.memory_size).toBe(128); // default preserved
      expect(merged.function_name).toBe('my-function'); // custom added
    });

    it('should prioritize custom variables over defaults', async () => {
      const defaults = { timeout: 30, memory_size: 128 };
      const custom = { timeout: 60 };

      const merged = generator.mergeVariables(defaults, custom);

      expect(merged.timeout).toBe(60);
      expect(merged.memory_size).toBe(128);
    });
  });
});
