/**
 * Azure Functions IaC Template Tests
 *
 * Tests template rendering and validation for Azure Functions infrastructure:
 * - Template structure and file existence
 * - Variable substitution
 * - Conditional resource generation
 * - Environment-specific configurations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TerraformTemplateEngine,
  createTemplateEngine,
} from '../../../src/core/iac/template-engine.js';
import type { TemplateVariables } from '../../../src/core/iac/template-engine.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Azure Functions IaC Template Tests', () => {
  let engine: TerraformTemplateEngine;
  let tempDir: string;
  const templateDir = path.join(
    process.cwd(),
    'plugins/specweave/templates/iac/azure-functions/templates'
  );

  beforeEach(() => {
    engine = createTemplateEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    engine.clearCache();
  });

  describe('testTemplateStructure', () => {
    it('should have all required template files', () => {
      const requiredFiles = [
        'main.tf.hbs',
        'variables.tf.hbs',
        'outputs.tf.hbs',
        'provider.tf.hbs',
        'README.md.hbs',
        'environments/dev.tfvars.hbs',
        'environments/staging.tfvars.hbs',
        'environments/prod.tfvars.hbs',
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(templateDir, file);
        expect(fs.existsSync(filePath), `Missing template file: ${file}`).toBe(true);
      }
    });

    it('should have valid defaults.json', () => {
      const defaultsPath = path.join(templateDir, '..', 'defaults.json');
      expect(fs.existsSync(defaultsPath)).toBe(true);

      const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'));
      expect(defaults.location).toBeDefined();
      expect(defaults.functionName).toBeDefined();
      expect(defaults.runtime).toBeDefined();
      expect(defaults.osType).toBeDefined();
      expect(defaults.databaseName).toBeDefined();
    });
  });

  describe('testVariableSubstitution', () => {
    it('should substitute all Azure-specific variables correctly', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'my-rg',
        functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        skuSize: 'Y1',
        environment: 'dev',
        storageAccountName: 'mystorage',
        databaseName: 'mycosmosdb',
        primaryKey: 'id',
        cosmosDbThroughput: 400,
        projectName: 'my-project',
        corsOrigins: ['*'],
        logRetentionDays: 90,
        enableApplicationInsights: true,
        enableManagedIdentity: true,
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      // Verify main.tf contains Azure resources
      expect(config.mainTf).toContain('azurerm_resource_group');
      expect(config.mainTf).toContain('azurerm_storage_account');
      expect(config.mainTf).toContain('azurerm_service_plan');
      expect(config.mainTf).toContain('azurerm_linux_function_app');
      expect(config.mainTf).toContain('azurerm_cosmosdb_account');
      expect(config.mainTf).toContain('my-function');
      expect(config.mainTf).toContain('eastus');

      // Verify variables.tf
      expect(config.variablesTf).toContain('variable "location"');
      expect(config.variablesTf).toContain('variable "function_name"');
      expect(config.variablesTf).toContain('variable "runtime"');

      // Verify outputs.tf
      expect(config.outputsTf).toContain('output "function_url"');
      expect(config.outputsTf).toContain('output "cosmos_db_endpoint"');

      // Verify provider.tf
      expect(config.providerTf).toContain('azurerm');
      expect(config.providerTf).toContain('version = "~> 3.0"');
    });

    it('should render Linux Function App correctly', () => {
      const variables: TemplateVariables = {
        osType: 'linux',
        functionName: 'linux-func',
        runtime: 'python',
        runtimeVersion: '3.11',
        location: 'westus',
        resourceGroupName: 'test-rg',
        storageAccountName: 'teststorage',
        databaseName: 'testdb',
        primaryKey: 'id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        cosmosDbThroughput: 400,
        skuSize: 'Y1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).toContain('azurerm_linux_function_app');
      expect(config.mainTf).toContain('python_version = "3.11"');
      expect(config.mainTf).not.toContain('azurerm_windows_function_app');
    });

    it('should render Windows Function App correctly', () => {
      const variables: TemplateVariables = {
        osType: 'windows',
        functionName: 'windows-func',
        runtime: 'dotnet',
        runtimeVersion: '8',
        location: 'westus',
        resourceGroupName: 'test-rg',
        storageAccountName: 'teststorage',
        databaseName: 'testdb',
        primaryKey: 'id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        cosmosDbThroughput: 400,
        skuSize: 'Y1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).toContain('azurerm_windows_function_app');
      expect(config.mainTf).toContain('dotnet_version = "8"');
      expect(config.mainTf).not.toContain('azurerm_linux_function_app');
    });
  });

  describe('testConditionalResources', () => {
    it('should include Application Insights when enabled', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'my-rg',
        functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'mystorage',
        databaseName: 'mydb',
        primaryKey: 'id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 90,
        cosmosDbThroughput: 400,
        skuSize: 'Y1',
        enableApplicationInsights: true,
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).toContain('azurerm_application_insights');
      expect(config.mainTf).toContain('APPINSIGHTS_INSTRUMENTATIONKEY');
      expect(config.outputsTf).toContain('output "application_insights_key"');
    });

    it('should exclude Application Insights when disabled', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'my-rg',
        functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'mystorage',
        databaseName: 'mydb',
        primaryKey: 'id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        cosmosDbThroughput: 400,
        skuSize: 'Y1',
        enableApplicationInsights: false,
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).not.toContain('azurerm_application_insights');
      expect(config.mainTf).not.toContain('APPINSIGHTS_INSTRUMENTATIONKEY');
    });

    it('should include Managed Identity when enabled', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'my-rg',
        functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'mystorage',
        databaseName: 'mydb',
        primaryKey: 'id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        cosmosDbThroughput: 400,
        skuSize: 'Y1',
        enableManagedIdentity: true,
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).toContain('identity {');
      expect(config.mainTf).toContain('type = "SystemAssigned"');
      expect(config.outputsTf).toContain('function_identity_principal_id');
    });

    it('should use zone redundancy for production', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'my-rg',
        functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'mystorage',
        databaseName: 'mydb',
        primaryKey: 'id',
        environment: 'prod',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 365,
        cosmosDbThroughput: 1000,
        skuSize: 'EP2',
        enableZoneRedundancy: true,
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).toContain('zone_balancing_enabled = true');
      expect(config.mainTf).toContain('zone_redundant = true');
      expect(config.mainTf).toContain('account_replication_type = "ZRS"');
    });
  });

  describe('testEnvironmentConfigurations', () => {
    it('should generate dev environment config with free tier settings', () => {
      const devVarsPath = path.join(templateDir, 'environments/dev.tfvars.hbs');
      const template = engine.loadTemplate(devVarsPath);

      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'test-rg',
        functionName: 'test-func',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'teststorage',
        databaseName: 'testdb',
        primaryKey: 'id',
        projectName: 'test-project',
      };

      const result = template(variables);

      expect(result).toContain('sku_size = "Y1"');
      expect(result).toContain('environment          = "dev"');
      expect(result).toContain('cosmos_db_throughput = 400');
      expect(result).toContain('log_retention_days = 30');
      expect(result).toContain('localhost');
    });

    it('should generate staging environment config with Premium plan', () => {
      const stagingVarsPath = path.join(templateDir, 'environments/staging.tfvars.hbs');
      const template = engine.loadTemplate(stagingVarsPath);

      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'test-rg',
        functionName: 'test-func',
        runtime: 'python',
        runtimeVersion: '3.11',
        osType: 'linux',
        storageAccountName: 'teststorage',
        databaseName: 'testdb',
        primaryKey: 'id',
        projectName: 'test-project',
      };

      const result = template(variables);

      expect(result).toContain('sku_size = "EP1"');
      expect(result).toContain('environment          = "staging"');
      expect(result).toContain('log_retention_days = 90');
    });

    it('should generate prod environment config with zone redundancy', () => {
      const prodVarsPath = path.join(templateDir, 'environments/prod.tfvars.hbs');
      const template = engine.loadTemplate(prodVarsPath);

      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'test-rg',
        functionName: 'test-func',
        runtime: 'dotnet',
        runtimeVersion: '8',
        osType: 'linux',
        storageAccountName: 'teststorage',
        databaseName: 'testdb',
        primaryKey: 'id',
        projectName: 'test-project',
      };

      const result = template(variables);

      expect(result).toContain('sku_size = "EP2"');
      expect(result).toContain('environment          = "prod"');
      expect(result).toContain('cosmos_db_throughput = 1000');
      expect(result).toContain('log_retention_days = 365');
    });
  });

  describe('testREADMEGeneration', () => {
    it('should generate comprehensive README with deployment instructions', () => {
      const variables: TemplateVariables = {
        functionName: 'my-awesome-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        skuSize: 'Y1',
        databaseName: 'my-cosmosdb',
        location: 'eastus',
        environment: 'dev',
        resourceGroupName: 'my-rg',
        storageAccountName: 'mystorage',
        primaryKey: 'id',
        projectName: 'my-project',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        cosmosDbThroughput: 400,
        enableApplicationInsights: true,
        enableManagedIdentity: true,
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.readmeMd).toContain('# my-awesome-function');
      expect(config.readmeMd).toContain('Azure Functions');
      expect(config.readmeMd).toContain('Cosmos DB');
      expect(config.readmeMd).toContain('az login');
      expect(config.readmeMd).toContain('terraform init');
      expect(config.readmeMd).toContain('terraform apply');
      expect(config.readmeMd).toContain('Cost Optimization');
      expect(config.readmeMd).toContain('Security Best Practices');
      expect(config.readmeMd).toContain('Application Insights');
    });
  });

  describe('testOutputGeneration', () => {
    it('should write all files to output directory', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'test-rg',
        functionName: 'test-func',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'teststorage',
        databaseName: 'testdb',
        primaryKey: 'id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        cosmosDbThroughput: 400,
        skuSize: 'Y1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);
      const outputDir = path.join(tempDir, 'azure-output');
      engine.writeTerraformConfig(outputDir, config);

      expect(fs.existsSync(path.join(outputDir, 'main.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'variables.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'outputs.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'provider.tf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
    });
  });
});
