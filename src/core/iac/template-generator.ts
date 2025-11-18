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
    // Uppercase helper
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Lowercase helper
    this.handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    // Snake case helper (camelCase -> snake_case)
    this.handlebars.registerHelper('snakeCase', (str: string) => {
      if (!str) return '';
      return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
    });

    // Terraform list helper (array -> ["item1", "item2"])
    this.handlebars.registerHelper('tfList', (arr: any) => {
      if (!arr) return '[]';
      if (typeof arr === 'string') {
        try {
          arr = JSON.parse(arr);
        } catch {
          return `["${arr}"]`;
        }
      }
      if (!Array.isArray(arr)) return '[]';
      return `[${arr.map(item => `"${item}"`).join(', ')}]`;
    });

    // Conditional equality helper (if arg1 == arg2)
    this.handlebars.registerHelper('ifEquals', function(
      this: any,
      arg1: any,
      arg2: any,
      options: Handlebars.HelperOptions
    ) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Inline equality helper (for expressions like {{#if eq var "value"}})
    this.handlebars.registerHelper('eq', (arg1: any, arg2: any) => {
      return arg1 === arg2;
    });

    // JSON stringify helper (for complex values)
    this.handlebars.registerHelper('json', (obj: any) => {
      return JSON.stringify(obj, null, 2);
    });
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
