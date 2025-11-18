/**
 * Terraform Template Engine
 *
 * Renders Terraform templates using Handlebars with platform-specific variables.
 */

import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateVariables {
  // Project metadata
  projectName?: string;
  projectDescription?: string;
  environment?: 'dev' | 'staging' | 'prod';

  // Cloud provider
  provider?: 'aws' | 'azure' | 'gcp' | 'firebase' | 'supabase';
  region?: string;

  // Function configuration
  functionName?: string;
  runtime?: string;
  handler?: string;
  memorySize?: number;
  timeout?: number;

  // Database configuration
  databaseName?: string;
  databaseType?: 'dynamodb' | 'cosmosdb' | 'firestore' | 'postgresql';

  // API configuration
  apiName?: string;
  apiStageName?: string;

  // Authentication
  authEnabled?: boolean;
  authProvider?: string;

  // Monitoring
  monitoringEnabled?: boolean;

  // Custom variables
  [key: string]: any;
}

export interface TemplateRenderResult {
  mainTf: string; // main.tf content
  variablesTf: string; // variables.tf content
  outputsTf: string; // outputs.tf content
  providerTf?: string; // provider.tf content (optional)
  readmeMd?: string; // README.md content (optional)
}

/**
 * Template Engine for generating Terraform configurations
 */
export class TerraformTemplateEngine {
  private handlebars: typeof Handlebars;
  private templateCache: Map<string, HandlebarsTemplateDelegate>;

  constructor() {
    this.handlebars = Handlebars.create();
    this.templateCache = new Map();
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Helper: Convert to snake_case (Terraform naming convention)
    this.handlebars.registerHelper('snakeCase', (str: string) => {
      if (!str) return '';
      return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
    });

    // Helper: Convert to kebab-case
    this.handlebars.registerHelper('kebabCase', (str: string) => {
      if (!str) return '';
      return str
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
    });

    // Helper: Uppercase
    this.handlebars.registerHelper('uppercase', (str: string) => {
      if (!str) return '';
      return str.toUpperCase();
    });

    // Helper: Lowercase
    this.handlebars.registerHelper('lowercase', (str: string) => {
      if (!str) return '';
      return str.toLowerCase();
    });

    // Helper: Conditional equality check
    this.handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    // Helper: Multiply numbers (for cost calculations)
    this.handlebars.registerHelper('multiply', (...args: any[]) => {
      // Remove the options object (last argument)
      const numbers = args.slice(0, -1);
      return numbers.reduce((acc, val) => acc * (parseFloat(val) || 0), 1);
    });

    // Helper: Add numbers (for cost calculations)
    this.handlebars.registerHelper('add', (...args: any[]) => {
      // Remove the options object (last argument)
      const numbers = args.slice(0, -1);
      return numbers.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    });

    // Helper: Get current date (for documentation generation)
    this.handlebars.registerHelper('currentDate', () => {
      return new Date().toISOString().split('T')[0];
    });

    // Helper: Conditional OR
    this.handlebars.registerHelper('or', function (...args: any[]) {
      // Remove the last argument (Handlebars options object)
      const values = args.slice(0, -1);
      return values.some((v) => !!v);
    });

    // Helper: JSON stringify with indentation
    this.handlebars.registerHelper('json', (obj: any) => {
      return JSON.stringify(obj, null, 2);
    });

    // Helper: Format list as Terraform list
    this.handlebars.registerHelper('tfList', (arr: any[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return '[]';
      const items = arr.map((item) => `"${item}"`).join(', ');
      return `[${items}]`;
    });

    // Helper: Format map as Terraform map
    this.handlebars.registerHelper('tfMap', (obj: Record<string, any>) => {
      if (!obj || Object.keys(obj).length === 0) return '{}';
      const entries = Object.entries(obj)
        .map(([key, value]) => `  ${key} = "${value}"`)
        .join('\n');
      return `{\n${entries}\n}`;
    });
  }

  /**
   * Load and compile a template from file
   */
  loadTemplate(templatePath: string): HandlebarsTemplateDelegate {
    // Check cache first
    if (this.templateCache.has(templatePath)) {
      return this.templateCache.get(templatePath)!;
    }

    // Read template file
    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    // Compile template
    const compiled = this.handlebars.compile(templateContent, {
      strict: true,
      noEscape: true, // Don't escape HTML (not relevant for Terraform)
    });

    // Cache compiled template
    this.templateCache.set(templatePath, compiled);

    return compiled;
  }

  /**
   * Load template from string
   */
  loadTemplateString(templateContent: string): HandlebarsTemplateDelegate {
    return this.handlebars.compile(templateContent, {
      strict: true,
      noEscape: true,
    });
  }

  /**
   * Register a partial template
   */
  registerPartial(name: string, templatePath: string): void {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    this.handlebars.registerPartial(name, templateContent);
  }

  /**
   * Render a single template file
   */
  renderTemplate(templatePath: string, variables: TemplateVariables): string {
    const template = this.loadTemplate(templatePath);
    return template(variables);
  }

  /**
   * Render complete Terraform configuration from template directory
   */
  renderTerraformConfig(
    templateDir: string,
    variables: TemplateVariables
  ): TemplateRenderResult {
    const result: TemplateRenderResult = {
      mainTf: '',
      variablesTf: '',
      outputsTf: '',
    };

    // Required files
    const mainTfPath = path.join(templateDir, 'main.tf.hbs');
    const variablesTfPath = path.join(templateDir, 'variables.tf.hbs');
    const outputsTfPath = path.join(templateDir, 'outputs.tf.hbs');

    if (!fs.existsSync(mainTfPath)) {
      throw new Error(`Template not found: ${mainTfPath}`);
    }
    if (!fs.existsSync(variablesTfPath)) {
      throw new Error(`Template not found: ${variablesTfPath}`);
    }
    if (!fs.existsSync(outputsTfPath)) {
      throw new Error(`Template not found: ${outputsTfPath}`);
    }

    // Render required files
    result.mainTf = this.renderTemplate(mainTfPath, variables);
    result.variablesTf = this.renderTemplate(variablesTfPath, variables);
    result.outputsTf = this.renderTemplate(outputsTfPath, variables);

    // Optional files
    const providerTfPath = path.join(templateDir, 'provider.tf.hbs');
    if (fs.existsSync(providerTfPath)) {
      result.providerTf = this.renderTemplate(providerTfPath, variables);
    }

    const readmeMdPath = path.join(templateDir, 'README.md.hbs');
    if (fs.existsSync(readmeMdPath)) {
      result.readmeMd = this.renderTemplate(readmeMdPath, variables);
    }

    return result;
  }

  /**
   * Write rendered Terraform configuration to output directory
   */
  writeTerraformConfig(outputDir: string, config: TemplateRenderResult): void {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write files
    fs.writeFileSync(path.join(outputDir, 'main.tf'), config.mainTf);
    fs.writeFileSync(path.join(outputDir, 'variables.tf'), config.variablesTf);
    fs.writeFileSync(path.join(outputDir, 'outputs.tf'), config.outputsTf);

    if (config.providerTf) {
      fs.writeFileSync(path.join(outputDir, 'provider.tf'), config.providerTf);
    }

    if (config.readmeMd) {
      fs.writeFileSync(path.join(outputDir, 'README.md'), config.readmeMd);
    }
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

/**
 * Create a new template engine instance
 */
export function createTemplateEngine(): TerraformTemplateEngine {
  return new TerraformTemplateEngine();
}
