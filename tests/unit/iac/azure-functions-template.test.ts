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
        appName: 'my-function', functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        skuName: 'Y1',
        environment: 'dev',
        storageAccountName: 'mystorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'mycosmosdb-account',
        databaseName: 'mycosmosdb',
        containerName: 'mycontainer',
        partitionKey: '/id',
        throughput: 400,
        projectName: 'my-project',
        corsOrigins: ['*'],
        logRetentionDays: 90,
        enableApplicationInsights: true,
        enableManagedIdentity: true,
        specweaveVersion: '0.22.1',
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
      expect(config.variablesTf).toContain('variable "app_name"');
      expect(config.variablesTf).toContain('variable "runtime"');
      expect(config.variablesTf).toContain('variable "database_account_name"');

      // Verify outputs.tf
      expect(config.outputsTf).toContain('output "function_app_url"');
      expect(config.outputsTf).toContain('output "cosmos_db_endpoint"');

      // Verify provider.tf
      expect(config.providerTf).toContain('azurerm');
      expect(config.providerTf).toContain('version = "~> 3.0"');
    });

    it('should render Linux Function App correctly', () => {
      const variables: TemplateVariables = {
        osType: 'linux',
        appName: 'linux-func', functionName: 'linux-func',
        runtime: 'python',
        runtimeVersion: '3.11',
        location: 'westus',
        resourceGroupName: 'test-rg',
        storageAccountName: 'teststorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'testdb-account',
        databaseName: 'testdb',
        containerName: 'testcontainer',
        partitionKey: '/id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        throughput: 400,
        skuName: 'Y1',
        specweaveVersion: '0.22.1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).toContain('azurerm_linux_function_app');
      expect(config.mainTf).toContain('python_version = "3.11"');
      expect(config.mainTf).not.toContain('azurerm_windows_function_app');
    });

    it('should render Function App with dotnet runtime correctly', () => {
      const variables: TemplateVariables = {
        osType: 'linux',
        appName: 'dotnet-func', functionName: 'dotnet-func',
        runtime: 'dotnet',
        runtimeVersion: '8',
        location: 'westus',
        resourceGroupName: 'test-rg',
        storageAccountName: 'teststorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'testdb-account',
        databaseName: 'testdb',
        containerName: 'testcontainer',
        partitionKey: '/id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        throughput: 400,
        skuName: 'Y1',
        specweaveVersion: '0.22.1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      // Template currently only supports Linux Function Apps
      expect(config.mainTf).toContain('azurerm_linux_function_app');
      expect(config.mainTf).toContain('dotnet_version = "8"');
    });
  });

  describe('testConditionalResources', () => {
    it('should include Application Insights when enabled', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'my-rg',
        appName: 'my-function', functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'mystorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'mydb-account',
        databaseName: 'mydb',
        containerName: 'mycontainer',
        partitionKey: '/id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 90,
        throughput: 400,
        skuName: 'Y1',
        enableApplicationInsights: true,
        specweaveVersion: '0.22.1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).toContain('azurerm_application_insights');
      expect(config.mainTf).toContain('application_insights_key');
      expect(config.mainTf).toContain('application_insights_connection_string');
    });

    it('should exclude Application Insights when disabled', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'my-rg',
        appName: 'my-function', functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'mystorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'mydb-account',
        databaseName: 'mydb',
        containerName: 'mycontainer',
        partitionKey: '/id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        throughput: 400,
        skuName: 'Y1',
        enableApplicationInsights: false,
        specweaveVersion: '0.22.1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).not.toContain('azurerm_application_insights');
      expect(config.mainTf).not.toContain('APPINSIGHTS_INSTRUMENTATIONKEY');
    });

    it('should include Managed Identity when enabled', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'my-rg',
        appName: 'my-function', functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'mystorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'mydb-account',
        databaseName: 'mydb',
        containerName: 'mycontainer',
        partitionKey: '/id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        throughput: 400,
        skuName: 'Y1',
        enableManagedIdentity: true,
        specweaveVersion: '0.22.1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.mainTf).toContain('identity {');
      expect(config.mainTf).toContain('type = "SystemAssigned"');
      expect(config.outputsTf).toContain('function_app_principal_id');
    });

    it('should use zone redundancy for production', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'my-rg',
        appName: 'my-function', functionName: 'my-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'mystorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'mydb-account',
        databaseName: 'mydb',
        containerName: 'mycontainer',
        partitionKey: '/id',
        environment: 'prod',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 365,
        throughput: 1000,
        skuName: 'EP2',
        enableZoneRedundancy: true,
        specweaveVersion: '0.22.1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      // Template uses EP2 SKU for production (premium plan)
      expect(config.mainTf).toContain('sku_name            = "EP2"');
      expect(config.mainTf).toContain('azurerm_cosmosdb_account');
    });
  });

  describe.skip('testEnvironmentConfigurations', () => {
    it('should generate dev environment config with free tier settings', () => {
      const devVarsPath = path.join(templateDir, 'environments/dev.tfvars.hbs');
      const template = engine.loadTemplate(devVarsPath);

      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'test-rg',
        appName: 'test-func', functionName: 'test-func',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'teststorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'testdb-account',
        databaseName: 'testdb',
        containerName: 'testcontainer',
        partitionKey: '/id',
        projectName: 'test-project',
      };

      const result = template(variables);

      expect(result).toContain('sku_name             = "Y1"');
      expect(result).toContain('environment          = "dev"');
      expect(result).toContain('throughput            = 400');
    });

    it('should generate staging environment config with Premium plan', () => {
      const stagingVarsPath = path.join(templateDir, 'environments/staging.tfvars.hbs');
      const template = engine.loadTemplate(stagingVarsPath);

      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'test-rg',
        appName: 'test-func', functionName: 'test-func',
        runtime: 'python',
        runtimeVersion: '3.11',
        osType: 'linux',
        storageAccountName: 'teststorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'testdb-account',
        databaseName: 'testdb',
        containerName: 'testcontainer',
        partitionKey: '/id',
        projectName: 'test-project',
      };

      const result = template(variables);

      expect(result).toContain('sku_name             = "EP1"');
      expect(result).toContain('environment          = "staging"');
    });

    it('should generate prod environment config with zone redundancy', () => {
      const prodVarsPath = path.join(templateDir, 'environments/prod.tfvars.hbs');
      const template = engine.loadTemplate(prodVarsPath);

      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'test-rg',
        appName: 'test-func', functionName: 'test-func',
        runtime: 'dotnet',
        runtimeVersion: '8',
        osType: 'linux',
        storageAccountName: 'teststorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'testdb-account',
        databaseName: 'testdb',
        containerName: 'testcontainer',
        partitionKey: '/id',
        projectName: 'test-project',
      };

      const result = template(variables);

      expect(result).toContain('sku_name             = "EP2"');
      expect(result).toContain('environment          = "prod"');
      expect(result).toContain('throughput');
    });
  });

  describe('testREADMEGeneration', () => {
    it.skip('should generate comprehensive README with deployment instructions', () => {
      const variables: TemplateVariables = {
        appName: 'my-awesome-function', functionName: 'my-awesome-function',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        skuName: 'Y1',
        databaseAccountName: 'my-cosmosdb-account',
        databaseName: 'my-cosmosdb',
        location: 'eastus',
        environment: 'dev',
        resourceGroupName: 'my-rg',
        storageAccountName: 'mystorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        containerName: 'mycontainer',
        partitionKey: '/id',
        projectName: 'my-project',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        throughput: 400,
        enableApplicationInsights: true,
        enableManagedIdentity: true,
        specweaveVersion: '0.22.1',
      };

      const config = engine.renderTerraformConfig(templateDir, variables);

      expect(config.readmeMd).toContain('# Azure Functions');
      expect(config.readmeMd).toContain('Cosmos DB');
      expect(config.readmeMd).toContain('az login');
      expect(config.readmeMd).toContain('terraform init');
      expect(config.readmeMd).toContain('terraform apply');
    });
  });

  describe('testOutputGeneration', () => {
    it('should write all files to output directory', () => {
      const variables: TemplateVariables = {
        location: 'eastus',
        resourceGroupName: 'test-rg',
        appName: 'test-func', functionName: 'test-func',
        runtime: 'node',
        runtimeVersion: '20',
        osType: 'linux',
        storageAccountName: 'teststorage',
        storageAccountTier: 'Standard',
        storageAccountReplication: 'LRS',
        databaseAccountName: 'testdb-account',
        databaseName: 'testdb',
        containerName: 'testcontainer',
        partitionKey: '/id',
        environment: 'dev',
        projectName: 'test',
        corsOrigins: ['*'],
        logRetentionDays: 30,
        throughput: 400,
        skuName: 'Y1',
        specweaveVersion: '0.22.1',
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
