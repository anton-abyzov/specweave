import Handlebars from 'handlebars';

/**
 * Result of template generation
 */
export interface TemplateGeneratorResult {
  /** Rendered template content */
  content: string;
  /** Template path (if from file) */
  templatePath?: string;
  /** Variables used for rendering */
  variables: Record<string, any>;
}

/**
 * Terraform template generator using Handlebars
 * Provides variable substitution, conditionals, loops, and custom helpers
 */
export class TemplateGenerator {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // String helpers
    this.handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase() ?? '');
    this.handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase() ?? '');
    this.handlebars.registerHelper('snakeCase', (str: string) =>
      str ? str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') : ''
    );

    // Terraform list helper (handles string, array, or null)
    this.handlebars.registerHelper('tfList', (arr: any) => {
      if (!arr) return '[]';
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch { return `["${arr}"]`; }
      }
      return Array.isArray(arr) ? `[${arr.map(item => `"${item}"`).join(', ')}]` : '[]';
    });

    // Comparison helpers
    this.handlebars.registerHelper('ifEquals', function(this: any, a: any, b: any, options: Handlebars.HelperOptions) {
      return a === b ? options.fn(this) : options.inverse(this);
    });
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('json', (obj: any) => JSON.stringify(obj, null, 2));
  }

  /**
   * Render a Handlebars template with variables
   * @param template Template string or compiled template
   * @param variables Variables to substitute
   * @returns Rendered template content
   */
  render(template: string, variables: Record<string, any>): string {
    const compiledTemplate = this.handlebars.compile(template);
    return compiledTemplate(variables);
  }

  /**
   * Merge default variables with custom variables
   * Custom variables override defaults
   * @param defaults Default variable values
   * @param custom Custom variable values
   * @returns Merged variables
   */
  mergeVariables(
    defaults: Record<string, any>,
    custom: Record<string, any>
  ): Record<string, any> {
    return { ...defaults, ...custom };
  }

  /**
   * Generate Terraform files from template directory
   * @param templateDir Directory containing .hbs templates
   * @param outputDir Directory to write generated files
   * @param variables Variables to substitute
   * @returns Array of generated file results
   */
  async generateFromDirectory(
    templateDir: string,
    outputDir: string,
    variables: Record<string, any>
  ): Promise<TemplateGeneratorResult[]> {
    const { default: fs } = await import('fs/promises');
    const { default: path } = await import('path');

    const results: TemplateGeneratorResult[] = [];

    // Read all .hbs files from template directory
    const files = await fs.readdir(templateDir);
    const templateFiles = files.filter(f => f.endsWith('.hbs'));

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Render each template
    for (const file of templateFiles) {
      const templatePath = path.join(templateDir, file);
      const template = await fs.readFile(templatePath, 'utf-8');
      const rendered = this.render(template, variables);

      // Write to output directory (remove .hbs extension)
      const outputFile = file.replace(/\.hbs$/, '');
      const outputPath = path.join(outputDir, outputFile);
      await fs.writeFile(outputPath, rendered, 'utf-8');

      results.push({
        content: rendered,
        templatePath,
        variables
      });
    }

    return results;
  }

  /**
   * Load defaults from JSON file
   * @param defaultsPath Path to defaults.json
   * @returns Default variables
   */
  async loadDefaults(defaultsPath: string): Promise<Record<string, any>> {
    const { default: fs } = await import('fs/promises');
    const content = await fs.readFile(defaultsPath, 'utf-8');
    return JSON.parse(content);
  }
}
