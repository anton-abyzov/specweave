/**
 * GCP Cloud Functions Template Generation Integration Tests
 *
 * Tests Terraform template generation for GCP Cloud Functions:
 * - Cloud Function configuration (Gen 1 and Gen 2)
 * - Service Account and IAM
 * - Cloud Storage buckets
 * - Firestore integration
 * - Cloud Monitoring
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTemplateEngine } from '../../../src/core/iac/template-engine.js';
import type {
  TerraformTemplateEngine,
  TemplateVariables,
} from '../../../src/core/iac/template-engine.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('GCP Cloud Functions Template Generation Integration', () => {
  let engine: TerraformTemplateEngine;
  let tempDir: string;

  beforeEach(() => {
    engine = createTemplateEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gcp-functions-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    engine.clearCache();
  });

  describe('testCloudFunctionGen2', () => {
    it('should generate Cloud Function Gen 2 configuration', () => {
      const template = engine.loadTemplateString(`
resource "google_cloudfunctions2_function" "{{snakeCase functionName}}" {
  name        = "{{projectName}}-{{functionName}}"
  location    = "{{region}}"
  description = "{{description}}"

  build_config {
    runtime     = "{{runtime}}"
    entry_point = "{{entryPoint}}"
    source {
      storage_source {
        bucket = google_storage_bucket.source_bucket.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    max_instance_count = {{maxInstances}}
    min_instance_count = {{minInstances}}
    available_memory   = "{{memoryMb}}M"
    timeout_seconds    = {{timeout}}
  }
}`);

      const variables: TemplateVariables = {
        functionName: 'apiHandler',
        projectName: 'my-project',
        region: 'us-central1',
        description: 'API handler function',
        runtime: 'nodejs18',
        entryPoint: 'handler',
        maxInstances: 100,
        minInstances: 0,
        memoryMb: 512,
        timeout: 60,
      };

      const result = template(variables);

      expect(result).toContain('resource "google_cloudfunctions2_function" "api_handler"');
      expect(result).toContain('name        = "my-project-apiHandler"');
      expect(result).toContain('runtime     = "nodejs18"');
      expect(result).toContain('max_instance_count = 100');
      expect(result).toContain('available_memory   = "512M"');
    });

    it('should generate Cloud Function with environment variables', () => {
      const template = engine.loadTemplateString(`
resource "google_cloudfunctions2_function" "function" {
  name     = "{{functionName}}"
  location = "{{region}}"

  service_config {
    environment_variables = {
      {{#each environmentVars}}
      {{@key}} = "{{this}}"
      {{/each}}
    }
  }
}`);

      const variables: TemplateVariables = {
        functionName: 'my-function',
        region: 'us-central1',
        environmentVars: {
          FIRESTORE_PROJECT: 'my-project-id',
          LOG_LEVEL: 'INFO',
          API_KEY: 'secret-key',
        },
      };

      const result = template(variables);

      expect(result).toContain('environment_variables = {');
      expect(result).toContain('FIRESTORE_PROJECT = "my-project-id"');
      expect(result).toContain('LOG_LEVEL = "INFO"');
    });

    it('should generate Cloud Function with VPC connector', () => {
      const template = engine.loadTemplateString(`
resource "google_cloudfunctions2_function" "function" {
  name     = "{{functionName}}"
  location = "{{region}}"

  service_config {
    {{#if vpcConnector}}
    vpc_connector = "{{vpcConnector}}"
    {{/if}}
    ingress_settings = "{{ingressSettings}}"
  }
}`);

      const variables: TemplateVariables = {
        functionName: 'vpc-function',
        region: 'us-central1',
        vpcConnector: 'projects/my-project/locations/us-central1/connectors/my-vpc',
        ingressSettings: 'ALLOW_INTERNAL_ONLY',
      };

      const result = template(variables);

      expect(result).toContain('vpc_connector = "projects/my-project/locations/us-central1/connectors/my-vpc"');
      expect(result).toContain('ingress_settings = "ALLOW_INTERNAL_ONLY"');
    });
  });

  describe('testServiceAccountAndIAM', () => {
    it('should generate Service Account for Cloud Function', () => {
      const template = engine.loadTemplateString(`
resource "google_service_account" "function_sa" {
  account_id   = "{{snakeCase projectName}}-function-sa"
  display_name = "{{projectName}} Function Service Account"
  description  = "Service account for Cloud Functions"
}`);

      const variables: TemplateVariables = {
        projectName: 'myProject',
      };

      const result = template(variables);

      expect(result).toContain('resource "google_service_account" "function_sa"');
      expect(result).toContain('account_id   = "my_project-function-sa"');
    });

    it('should grant IAM permissions for Firestore access', () => {
      const template = engine.loadTemplateString(`
resource "google_project_iam_member" "firestore_user" {
  project = "{{projectId}}"
  role    = "roles/datastore.user"
  member  = "serviceAccount:\${google_service_account.function_sa.email}"
}`);

      const variables: TemplateVariables = {
        projectId: 'my-project-123',
      };

      const result = template(variables);

      expect(result).toContain('resource "google_project_iam_member" "firestore_user"');
      expect(result).toContain('role    = "roles/datastore.user"');
    });
  });

  describe('testCloudStorageBucket', () => {
    it('should generate Cloud Storage bucket for source code', () => {
      const template = engine.loadTemplateString(`
resource "google_storage_bucket" "source_bucket" {
  name     = "{{projectName}}-function-source"
  location = "{{region}}"

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = {{lifecycleDays}}
    }
    action {
      type = "Delete"
    }
  }
}`);

      const variables: TemplateVariables = {
        projectName: 'my-project',
        region: 'US',
        lifecycleDays: 30,
      };

      const result = template(variables);

      expect(result).toContain('resource "google_storage_bucket" "source_bucket"');
      expect(result).toContain('name     = "my-project-function-source"');
      expect(result).toContain('uniform_bucket_level_access = true');
      expect(result).toContain('age = 30');
    });

    it('should upload function source to bucket', () => {
      const template = engine.loadTemplateString(`
resource "google_storage_bucket_object" "source" {
  name   = "{{functionName}}-{{version}}.zip"
  bucket = google_storage_bucket.source_bucket.name
  source = "{{sourcePath}}"
}`);

      const variables: TemplateVariables = {
        functionName: 'api-handler',
        version: 'v1.0.0',
        sourcePath: './dist/function.zip',
      };

      const result = template(variables);

      expect(result).toContain('resource "google_storage_bucket_object" "source"');
      expect(result).toContain('name   = "api-handler-v1.0.0.zip"');
      expect(result).toContain('source = "./dist/function.zip"');
    });
  });

  describe('testFirestoreIntegration', () => {
    it('should generate Firestore database configuration', () => {
      const template = engine.loadTemplateString(`
resource "google_firestore_database" "database" {
  project     = "{{projectId}}"
  name        = "{{databaseName}}"
  location_id = "{{region}}"
  type        = "{{databaseType}}"

  concurrency_mode = "{{concurrencyMode}}"
}`);

      const variables: TemplateVariables = {
        projectId: 'my-project-123',
        databaseName: '(default)',
        region: 'us-central',
        databaseType: 'FIRESTORE_NATIVE',
        concurrencyMode: 'OPTIMISTIC',
      };

      const result = template(variables);

      expect(result).toContain('resource "google_firestore_database" "database"');
      expect(result).toContain('type        = "FIRESTORE_NATIVE"');
      expect(result).toContain('concurrency_mode = "OPTIMISTIC"');
    });

    it('should generate Firestore index for queries', () => {
      const template = engine.loadTemplateString(`
resource "google_firestore_index" "index" {
  project    = "{{projectId}}"
  collection = "{{collectionName}}"

  {{#each fields}}
  fields {
    field_path = "{{this.fieldPath}}"
    order      = "{{this.order}}"
  }
  {{/each}}
}`);

      const variables: TemplateVariables = {
        projectId: 'my-project-123',
        collectionName: 'users',
        fields: [
          { fieldPath: 'email', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' },
        ],
      };

      const result = template(variables);

      expect(result).toContain('collection = "users"');
      expect(result).toContain('field_path = "email"');
      expect(result).toContain('order      = "ASCENDING"');
      expect(result).toContain('field_path = "createdAt"');
    });
  });

  describe('testCloudMonitoring', () => {
    it('should generate monitoring alert policy', () => {
      const template = engine.loadTemplateString(`
resource "google_monitoring_alert_policy" "function_errors" {
  display_name = "{{functionName}} Error Rate"
  combiner     = "OR"

  conditions {
    display_name = "Error rate too high"

    condition_threshold {
      filter          = "resource.type=\\"cloud_function\\" AND resource.labels.function_name=\\"{{functionName}}\\""
      duration        = "{{durationSeconds}}s"
      comparison      = "COMPARISON_GT"
      threshold_value = {{errorThreshold}}

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
}`);

      const variables: TemplateVariables = {
        functionName: 'api-handler',
        durationSeconds: 60,
        errorThreshold: 0.1,
      };

      const result = template(variables);

      expect(result).toContain('resource "google_monitoring_alert_policy" "function_errors"');
      expect(result).toContain('display_name = "api-handler Error Rate"');
      expect(result).toContain('threshold_value = 0.1');
    });
  });

  describe('testCompleteConfiguration', () => {
    it('should generate complete GCP Cloud Functions stack', () => {
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      fs.writeFileSync(
        path.join(templateDir, 'main.tf.hbs'),
        `
# Service Account
resource "google_service_account" "function_sa" {
  account_id   = "{{snakeCase projectName}}-function-sa"
  display_name = "{{projectName}} Function Service Account"
}

# Storage Bucket for Source
resource "google_storage_bucket" "source_bucket" {
  name     = "{{projectName}}-function-source"
  location = "{{region}}"
  uniform_bucket_level_access = true
}

# Cloud Function Gen 2
resource "google_cloudfunctions2_function" "{{snakeCase functionName}}" {
  name        = "{{projectName}}-{{functionName}}"
  location    = "{{region}}"
  description = "{{description}}"

  build_config {
    runtime     = "{{runtime}}"
    entry_point = "{{entryPoint}}"
    source {
      storage_source {
        bucket = google_storage_bucket.source_bucket.name
        object = "source.zip"
      }
    }
  }

  service_config {
    max_instance_count    = {{maxInstances}}
    available_memory      = "{{memoryMb}}M"
    timeout_seconds       = {{timeout}}
    service_account_email = google_service_account.function_sa.email
  }
}

# Firestore Database
resource "google_firestore_database" "database" {
  project     = "{{projectId}}"
  name        = "(default)"
  location_id = "{{region}}"
  type        = "FIRESTORE_NATIVE"
}
`
      );

      fs.writeFileSync(
        path.join(templateDir, 'variables.tf.hbs'),
        `
variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}
`
      );

      fs.writeFileSync(
        path.join(templateDir, 'outputs.tf.hbs'),
        `
output "function_uri" {
  value = google_cloudfunctions2_function.{{snakeCase functionName}}.service_config[0].uri
}

output "function_name" {
  value = google_cloudfunctions2_function.{{snakeCase functionName}}.name
}
`
      );

      const variables: TemplateVariables = {
        projectName: 'my-project',
        projectId: 'my-project-123',
        region: 'us-central1',
        functionName: 'apiHandler',
        description: 'API handler function',
        runtime: 'nodejs18',
        entryPoint: 'handler',
        maxInstances: 100,
        memoryMb: 512,
        timeout: 60,
      };

      const result = engine.renderTerraformConfig(templateDir, variables);

      expect(result.mainTf).toContain('google_service_account');
      expect(result.mainTf).toContain('google_storage_bucket');
      expect(result.mainTf).toContain('google_cloudfunctions2_function');
      expect(result.mainTf).toContain('google_firestore_database');

      expect(result.variablesTf).toContain('variable "project_id"');
      expect(result.outputsTf).toContain('output "function_uri"');
    });
  });
});
