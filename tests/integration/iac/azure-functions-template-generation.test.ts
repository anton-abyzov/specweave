/**
 * Azure Functions Template Generation Integration Tests
 *
 * Tests Terraform template generation for Azure Functions:
 * - Function App configuration
 * - Service Plan
 * - Storage Account
 * - Cosmos DB integration
 * - Application Insights monitoring
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTemplateEngine } from '../../../src/core/iac/template-engine.js';
import type {
  TerraformTemplateEngine,
  TemplateVariables,
} from '../../../src/core/iac/template-engine.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Azure Functions Template Generation Integration', () => {
  let engine: TerraformTemplateEngine;
  let tempDir: string;

  beforeEach(() => {
    engine = createTemplateEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-functions-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    engine.clearCache();
  });

  describe('testBasicFunctionApp', () => {
    it('should generate Azure Function App configuration', () => {
      const template = engine.loadTemplateString(`
resource "azurerm_linux_function_app" "{{snakeCase functionName}}" {
  name                = "{{projectName}}-{{functionName}}"
  location            = "{{region}}"
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key

  site_config {
    application_stack {
      {{#if (eq runtime "node")}}
      node_version = "{{runtimeVersion}}"
      {{else if (eq runtime "python")}}
      python_version = "{{runtimeVersion}}"
      {{else if (eq runtime "dotnet")}}
      dotnet_version = "{{runtimeVersion}}"
      {{/if}}
    }
  }
}`);

      const variables: TemplateVariables = {
        functionName: 'apiHandler',
        projectName: 'my-project',
        region: 'eastus',
        runtime: 'node',
        runtimeVersion: '18',
      };

      const result = template(variables);

      expect(result).toContain('resource "azurerm_linux_function_app" "api_handler"');
      expect(result).toContain('name                = "my-project-apiHandler"');
      expect(result).toContain('location            = "eastus"');
      expect(result).toContain('node_version = "18"');
    });

    it('should generate Function App with application settings', () => {
      const template = engine.loadTemplateString(`
resource "azurerm_linux_function_app" "function" {
  name                = "{{functionName}}"
  location            = "{{region}}"
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key

  app_settings = {
    {{#each appSettings}}
    {{@key}} = "{{this}}"
    {{/each}}
  }
}`);

      const variables: TemplateVariables = {
        functionName: 'my-function',
        region: 'westus',
        appSettings: {
          COSMOS_DB_ENDPOINT: 'https://mydb.documents.azure.com',
          COSMOS_DB_KEY: 'secret-key',
          LOG_LEVEL: 'INFO',
        },
      };

      const result = template(variables);

      expect(result).toContain('app_settings = {');
      expect(result).toContain('COSMOS_DB_ENDPOINT = "https://mydb.documents.azure.com"');
      expect(result).toContain('LOG_LEVEL = "INFO"');
    });
  });

  describe('testServicePlan', () => {
    it('should generate Consumption Plan for serverless', () => {
      const template = engine.loadTemplateString(`
resource "azurerm_service_plan" "plan" {
  name                = "{{projectName}}-plan"
  location            = "{{region}}"
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "Y1"
}`);

      const variables: TemplateVariables = {
        projectName: 'my-project',
        region: 'eastus',
      };

      const result = template(variables);

      expect(result).toContain('resource "azurerm_service_plan" "plan"');
      expect(result).toContain('os_type             = "Linux"');
      expect(result).toContain('sku_name            = "Y1"');
    });

    it('should generate Premium Plan with autoscaling', () => {
      const template = engine.loadTemplateString(`
resource "azurerm_service_plan" "plan" {
  name                = "{{projectName}}-plan"
  location            = "{{region}}"
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "EP1"

  maximum_elastic_worker_count = {{maxWorkers}}
}`);

      const variables: TemplateVariables = {
        projectName: 'my-project',
        region: 'eastus',
        maxWorkers: 20,
      };

      const result = template(variables);

      expect(result).toContain('sku_name            = "EP1"');
      expect(result).toContain('maximum_elastic_worker_count = 20');
    });
  });

  describe('testStorageAccount', () => {
    it('should generate Storage Account for Function App', () => {
      const template = engine.loadTemplateString(`
resource "azurerm_storage_account" "storage" {
  name                     = "{{snakeCase projectName}}storage"
  location                 = "{{region}}"
  resource_group_name      = azurerm_resource_group.rg.name
  account_tier             = "Standard"
  account_replication_type = "{{replicationType}}"

  tags = {{tfMap tags}}
}`);

      const variables: TemplateVariables = {
        projectName: 'myProject',
        region: 'eastus',
        replicationType: 'LRS',
        tags: {
          Environment: 'prod',
          Team: 'backend',
        },
      };

      const result = template(variables);

      expect(result).toContain('resource "azurerm_storage_account" "storage"');
      expect(result).toContain('name                     = "my_projectstorage"');
      expect(result).toContain('account_replication_type = "LRS"');
      expect(result).toContain('Environment = "prod"');
    });
  });

  describe('testCosmosDBIntegration', () => {
    it('should generate Cosmos DB account', () => {
      const template = engine.loadTemplateString(`
resource "azurerm_cosmosdb_account" "db" {
  name                = "{{projectName}}-cosmosdb"
  location            = "{{region}}"
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "{{consistencyLevel}}"
  }

  geo_location {
    location          = "{{region}}"
    failover_priority = 0
  }
}`);

      const variables: TemplateVariables = {
        projectName: 'my-project',
        region: 'eastus',
        consistencyLevel: 'Session',
      };

      const result = template(variables);

      expect(result).toContain('resource "azurerm_cosmosdb_account" "db"');
      expect(result).toContain('name                = "my-project-cosmosdb"');
      expect(result).toContain('consistency_level = "Session"');
    });

    it('should generate Cosmos DB SQL database and container', () => {
      const template = engine.loadTemplateString(`
resource "azurerm_cosmosdb_sql_database" "database" {
  name                = "{{databaseName}}"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.db.name
  throughput          = {{throughput}}
}

resource "azurerm_cosmosdb_sql_container" "container" {
  name                = "{{containerName}}"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.db.name
  database_name       = azurerm_cosmosdb_sql_database.database.name
  partition_key_path  = "{{partitionKeyPath}}"
}`);

      const variables: TemplateVariables = {
        databaseName: 'users-db',
        containerName: 'users',
        partitionKeyPath: '/userId',
        throughput: 400,
      };

      const result = template(variables);

      expect(result).toContain('resource "azurerm_cosmosdb_sql_database"');
      expect(result).toContain('name                = "users-db"');
      expect(result).toContain('throughput          = 400');
      expect(result).toContain('partition_key_path  = "/userId"');
    });
  });

  describe('testApplicationInsights', () => {
    it('should generate Application Insights for monitoring', () => {
      const template = engine.loadTemplateString(`
resource "azurerm_application_insights" "insights" {
  name                = "{{projectName}}-insights"
  location            = "{{region}}"
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"

  tags = {{tfMap tags}}
}`);

      const variables: TemplateVariables = {
        projectName: 'my-project',
        region: 'eastus',
        tags: {
          Environment: 'prod',
        },
      };

      const result = template(variables);

      expect(result).toContain('resource "azurerm_application_insights" "insights"');
      expect(result).toContain('application_type    = "web"');
    });

    it('should connect Application Insights to Function App', () => {
      const template = engine.loadTemplateString(`
resource "azurerm_linux_function_app" "function" {
  name                = "{{functionName}}"
  location            = "{{region}}"
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key

  app_settings = {
    APPINSIGHTS_INSTRUMENTATIONKEY = azurerm_application_insights.insights.instrumentation_key
  }
}`);

      const variables: TemplateVariables = {
        functionName: 'my-function',
        region: 'eastus',
      };

      const result = template(variables);

      expect(result).toContain('APPINSIGHTS_INSTRUMENTATIONKEY');
      expect(result).toContain('azurerm_application_insights.insights.instrumentation_key');
    });
  });

  describe('testCompleteConfiguration', () => {
    it('should generate complete Azure Functions stack', () => {
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      fs.writeFileSync(
        path.join(templateDir, 'main.tf.hbs'),
        `
# Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "{{projectName}}-rg"
  location = "{{region}}"
}

# Storage Account
resource "azurerm_storage_account" "storage" {
  name                     = "{{snakeCase projectName}}storage"
  location                 = azurerm_resource_group.rg.location
  resource_group_name      = azurerm_resource_group.rg.name
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Service Plan
resource "azurerm_service_plan" "plan" {
  name                = "{{projectName}}-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "Y1"
}

# Function App
resource "azurerm_linux_function_app" "{{snakeCase functionName}}" {
  name                = "{{projectName}}-{{functionName}}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  storage_account_name       = azurerm_storage_account.storage.name
  storage_account_access_key = azurerm_storage_account.storage.primary_access_key

  site_config {
    application_stack {
      node_version = "{{runtimeVersion}}"
    }
  }
}

# Cosmos DB Account
resource "azurerm_cosmosdb_account" "db" {
  name                = "{{projectName}}-cosmosdb"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }
}
`
      );

      fs.writeFileSync(
        path.join(templateDir, 'variables.tf.hbs'),
        `
variable "project_name" {
  type = string
}

variable "region" {
  type = string
  default = "eastus"
}
`
      );

      fs.writeFileSync(
        path.join(templateDir, 'outputs.tf.hbs'),
        `
output "function_app_name" {
  value = azurerm_linux_function_app.{{snakeCase functionName}}.name
}

output "function_app_default_hostname" {
  value = azurerm_linux_function_app.{{snakeCase functionName}}.default_hostname
}

output "cosmosdb_endpoint" {
  value = azurerm_cosmosdb_account.db.endpoint
}
`
      );

      const variables: TemplateVariables = {
        projectName: 'my-project',
        region: 'eastus',
        functionName: 'apiHandler',
        runtimeVersion: '18',
      };

      const result = engine.renderTerraformConfig(templateDir, variables);

      expect(result.mainTf).toContain('azurerm_resource_group');
      expect(result.mainTf).toContain('azurerm_storage_account');
      expect(result.mainTf).toContain('azurerm_service_plan');
      expect(result.mainTf).toContain('azurerm_linux_function_app');
      expect(result.mainTf).toContain('azurerm_cosmosdb_account');

      expect(result.variablesTf).toContain('variable "project_name"');
      expect(result.variablesTf).toContain('variable "region"');

      expect(result.outputsTf).toContain('output "function_app_name"');
      expect(result.outputsTf).toContain('output "cosmosdb_endpoint"');
    });
  });
});
