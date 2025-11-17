/**
 * AWS Lambda Template Generation Integration Tests
 *
 * Tests Terraform template generation for AWS Lambda functions:
 * - Lambda function configuration
 * - IAM roles and policies
 * - API Gateway integration
 * - DynamoDB tables
 * - CloudWatch monitoring
 * - Environment variables
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

describe('AWS Lambda Template Generation Integration', () => {
  let engine: TerraformTemplateEngine;
  let tempDir: string;

  beforeEach(() => {
    engine = createTemplateEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aws-lambda-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    engine.clearCache();
  });

  describe('testBasicLambdaFunction', () => {
    it('should generate basic Lambda function configuration', () => {
      const template = engine.loadTemplateString(`
resource "aws_lambda_function" "{{snakeCase functionName}}" {
  function_name = "{{projectName}}-{{functionName}}"
  runtime       = "{{runtime}}"
  handler       = "{{handler}}"
  memory_size   = {{memorySize}}
  timeout       = {{timeout}}
  role          = aws_iam_role.lambda_role.arn

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")
}`);

      const variables: TemplateVariables = {
        functionName: 'apiHandler',
        projectName: 'my-project',
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        memorySize: 512,
        timeout: 30,
      };

      const result = template(variables);

      expect(result).toContain('resource "aws_lambda_function" "api_handler"');
      expect(result).toContain('function_name = "my-project-apiHandler"');
      expect(result).toContain('runtime       = "nodejs18.x"');
      expect(result).toContain('handler       = "index.handler"');
      expect(result).toContain('memory_size   = 512');
      expect(result).toContain('timeout       = 30');
      expect(result).toContain('role          = aws_iam_role.lambda_role.arn');
    });

    it('should generate Lambda with environment variables', () => {
      const template = engine.loadTemplateString(`
resource "aws_lambda_function" "function" {
  function_name = "{{functionName}}"
  runtime       = "{{runtime}}"
  handler       = "{{handler}}"

  {{#if environmentVars}}
  environment {
    variables = {
      {{#each environmentVars}}
      {{@key}} = "{{this}}"
      {{/each}}
    }
  }
  {{/if}}
}`);

      const variables: TemplateVariables = {
        functionName: 'my-function',
        runtime: 'python3.11',
        handler: 'app.handler',
        environmentVars: {
          TABLE_NAME: 'users-table',
          REGION: 'us-east-1',
          LOG_LEVEL: 'INFO',
        },
      };

      const result = template(variables);

      expect(result).toContain('environment {');
      expect(result).toContain('TABLE_NAME = "users-table"');
      expect(result).toContain('REGION = "us-east-1"');
      expect(result).toContain('LOG_LEVEL = "INFO"');
    });

    it('should generate Lambda with VPC configuration', () => {
      const template = engine.loadTemplateString(`
resource "aws_lambda_function" "function" {
  function_name = "{{functionName}}"
  runtime       = "{{runtime}}"

  {{#if vpc}}
  vpc_config {
    subnet_ids         = {{tfList vpc.subnetIds}}
    security_group_ids = {{tfList vpc.securityGroupIds}}
  }
  {{/if}}
}`);

      const variables: TemplateVariables = {
        functionName: 'vpc-function',
        runtime: 'nodejs18.x',
        vpc: {
          subnetIds: ['subnet-123', 'subnet-456'],
          securityGroupIds: ['sg-abc', 'sg-def'],
        },
      };

      const result = template(variables);

      expect(result).toContain('vpc_config {');
      expect(result).toContain('["subnet-123", "subnet-456"]');
      expect(result).toContain('["sg-abc", "sg-def"]');
    });
  });

  describe('testIAMRoleGeneration', () => {
    it('should generate IAM role for Lambda execution', () => {
      const template = engine.loadTemplateString(`
resource "aws_iam_role" "lambda_role" {
  name = "{{projectName}}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}`);

      const variables: TemplateVariables = {
        projectName: 'my-project',
      };

      const result = template(variables);

      expect(result).toContain('resource "aws_iam_role" "lambda_role"');
      expect(result).toContain('name = "my-project-lambda-role"');
      expect(result).toContain('sts:AssumeRole');
      expect(result).toContain('lambda.amazonaws.com');
    });

    it('should generate IAM policy for DynamoDB access', () => {
      const template = engine.loadTemplateString(`
resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "{{projectName}}-dynamodb-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ]
      Resource = "{{databaseArn}}"
    }]
  })
}`);

      const variables: TemplateVariables = {
        projectName: 'my-project',
        databaseArn: 'arn:aws:dynamodb:us-east-1:123456789:table/users',
      };

      const result = template(variables);

      expect(result).toContain('dynamodb:GetItem');
      expect(result).toContain('dynamodb:PutItem');
      expect(result).toContain('arn:aws:dynamodb:us-east-1:123456789:table/users');
    });

    it('should attach CloudWatch Logs policy', () => {
      const template = engine.loadTemplateString(`
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}`);

      const result = template({});

      expect(result).toContain('aws_iam_role_policy_attachment');
      expect(result).toContain('AWSLambdaBasicExecutionRole');
    });
  });

  describe('testAPIGatewayIntegration', () => {
    it('should generate API Gateway REST API', () => {
      const template = engine.loadTemplateString(`
resource "aws_api_gateway_rest_api" "api" {
  name        = "{{apiName}}"
  description = "{{projectDescription}}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}`);

      const variables: TemplateVariables = {
        apiName: 'my-api',
        projectDescription: 'My serverless API',
      };

      const result = template(variables);

      expect(result).toContain('resource "aws_api_gateway_rest_api" "api"');
      expect(result).toContain('name        = "my-api"');
      expect(result).toContain('description = "My serverless API"');
      expect(result).toContain('types = ["REGIONAL"]');
    });

    it('should generate API Gateway resource and method', () => {
      const template = engine.loadTemplateString(`
resource "aws_api_gateway_resource" "resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "{{resourcePath}}"
}

resource "aws_api_gateway_method" "method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.resource.id
  http_method   = "{{httpMethod}}"
  authorization = "{{#if authEnabled}}AWS_IAM{{else}}NONE{{/if}}"
}`);

      const variables: TemplateVariables = {
        resourcePath: 'users',
        httpMethod: 'GET',
        authEnabled: true,
      };

      const result = template(variables);

      expect(result).toContain('path_part   = "users"');
      expect(result).toContain('http_method   = "GET"');
      expect(result).toContain('authorization = "AWS_IAM"');
    });

    it('should generate Lambda integration with API Gateway', () => {
      const template = engine.loadTemplateString(`
resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = aws_api_gateway_method.method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.{{snakeCase functionName}}.invoke_arn
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.{{snakeCase functionName}}.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "\${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}`);

      const variables: TemplateVariables = {
        functionName: 'apiHandler',
      };

      const result = template(variables);

      expect(result).toContain('type                    = "AWS_PROXY"');
      expect(result).toContain('aws_lambda_function.api_handler.invoke_arn');
      expect(result).toContain('lambda:InvokeFunction');
      expect(result).toContain('apigateway.amazonaws.com');
    });

    it('should generate API Gateway deployment', () => {
      const template = engine.loadTemplateString(`
resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = "{{apiStageName}}"

  depends_on = [
    aws_api_gateway_integration.lambda_integration
  ]
}`);

      const variables: TemplateVariables = {
        apiStageName: 'prod',
      };

      const result = template(variables);

      expect(result).toContain('stage_name  = "prod"');
      expect(result).toContain('depends_on');
    });
  });

  describe('testDynamoDBIntegration', () => {
    it('should generate DynamoDB table configuration', () => {
      const template = engine.loadTemplateString(`
resource "aws_dynamodb_table" "{{snakeCase databaseName}}" {
  name           = "{{projectName}}-{{databaseName}}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "{{hashKey}}"
  {{#if rangeKey}}
  range_key      = "{{rangeKey}}"
  {{/if}}

  attribute {
    name = "{{hashKey}}"
    type = "S"
  }

  {{#if rangeKey}}
  attribute {
    name = "{{rangeKey}}"
    type = "S"
  }
  {{/if}}

  tags = {{tfMap tags}}
}`);

      const variables: TemplateVariables = {
        databaseName: 'usersTable',
        projectName: 'my-project',
        hashKey: 'userId',
        rangeKey: 'timestamp',
        tags: {
          Environment: 'prod',
          Team: 'backend',
        },
      };

      const result = template(variables);

      expect(result).toContain('resource "aws_dynamodb_table" "users_table"');
      expect(result).toContain('name           = "my-project-usersTable"');
      expect(result).toContain('billing_mode   = "PAY_PER_REQUEST"');
      expect(result).toContain('hash_key       = "userId"');
      expect(result).toContain('range_key      = "timestamp"');
      expect(result).toContain('Environment = "prod"');
    });

    it('should generate DynamoDB with GSI', () => {
      const template = engine.loadTemplateString(`
resource "aws_dynamodb_table" "table" {
  name         = "{{tableName}}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }
}`);

      const variables: TemplateVariables = {
        tableName: 'users',
      };

      const result = template(variables);

      expect(result).toContain('global_secondary_index');
      expect(result).toContain('EmailIndex');
      expect(result).toContain('projection_type = "ALL"');
    });
  });

  describe('testCloudWatchMonitoring', () => {
    it('should generate CloudWatch Log Group', () => {
      const template = engine.loadTemplateString(`
resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/{{functionName}}"
  retention_in_days = {{logRetentionDays}}

  tags = {{tfMap tags}}
}`);

      const variables: TemplateVariables = {
        functionName: 'my-function',
        logRetentionDays: 7,
        tags: {
          Environment: 'dev',
        },
      };

      const result = template(variables);

      expect(result).toContain('name              = "/aws/lambda/my-function"');
      expect(result).toContain('retention_in_days = 7');
    });

    it('should generate CloudWatch alarms for Lambda errors', () => {
      const template = engine.loadTemplateString(`
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "{{functionName}}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = "{{errorThreshold}}"
  alarm_description   = "This metric monitors Lambda errors"

  dimensions = {
    FunctionName = aws_lambda_function.{{snakeCase functionName}}.function_name
  }
}`);

      const variables: TemplateVariables = {
        functionName: 'apiHandler',
        errorThreshold: 5,
      };

      const result = template(variables);

      expect(result).toContain('alarm_name          = "apiHandler-errors"');
      expect(result).toContain('metric_name         = "Errors"');
      expect(result).toContain('threshold           = "5"');
    });
  });

  describe('testCompleteConfiguration', () => {
    it('should generate complete AWS Lambda stack with all components', () => {
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      // Create main.tf.hbs with complete Lambda stack
      fs.writeFileSync(
        path.join(templateDir, 'main.tf.hbs'),
        `
# Lambda Function
resource "aws_lambda_function" "{{snakeCase functionName}}" {
  function_name = "{{projectName}}-{{functionName}}"
  runtime       = "{{runtime}}"
  handler       = "{{handler}}"
  memory_size   = {{memorySize}}
  timeout       = {{timeout}}
  role          = aws_iam_role.lambda_role.arn

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")
}

# IAM Role
resource "aws_iam_role" "lambda_role" {
  name = "{{projectName}}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# DynamoDB Table
resource "aws_dynamodb_table" "{{snakeCase databaseName}}" {
  name         = "{{projectName}}-{{databaseName}}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
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

variable "environment" {
  type = string
}
`
      );

      fs.writeFileSync(
        path.join(templateDir, 'outputs.tf.hbs'),
        `
output "function_arn" {
  value = aws_lambda_function.{{snakeCase functionName}}.arn
}

output "function_name" {
  value = aws_lambda_function.{{snakeCase functionName}}.function_name
}

output "table_arn" {
  value = aws_dynamodb_table.{{snakeCase databaseName}}.arn
}
`
      );

      const variables: TemplateVariables = {
        projectName: 'my-project',
        functionName: 'apiHandler',
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        memorySize: 512,
        timeout: 30,
        databaseName: 'usersTable',
      };

      const result = engine.renderTerraformConfig(templateDir, variables);

      // Verify all components are present
      expect(result.mainTf).toContain('aws_lambda_function');
      expect(result.mainTf).toContain('aws_iam_role');
      expect(result.mainTf).toContain('aws_dynamodb_table');
      expect(result.mainTf).toContain('my-project-apiHandler');
      expect(result.mainTf).toContain('nodejs18.x');

      expect(result.variablesTf).toContain('variable "project_name"');
      expect(result.variablesTf).toContain('variable "environment"');

      expect(result.outputsTf).toContain('output "function_arn"');
      expect(result.outputsTf).toContain('output "table_arn"');
    });
  });
});
