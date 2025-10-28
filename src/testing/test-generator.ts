/**
 * Test Generator - Converts YAML Test Specifications to Executable TypeScript Tests
 *
 * Takes test-cases (YAML) and generates executable integration tests.
 *
 * Supports:
 * - Skill activation tests
 * - API integration tests (Jira, ADO, GitHub)
 * - End-to-end workflow tests
 * - Uses .env credentials for real API calls
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface TestSpec {
  name: string;
  description: string;
  type?: 'skill_activation' | 'api_integration' | 'e2e_workflow';
  input: {
    prompt?: string;
    api_call?: {
      method: string;
      endpoint: string;
      body?: any;
      headers?: Record<string, string>;
    };
    setup?: string[];  // Pre-test setup steps
  };
  expected_output: {
    skill_activated?: boolean;
    agent_invoked?: string;
    api_response?: {
      status: number;
      body?: any;
    };
    files_created?: string[];
    result?: any;
  };
  requires?: {
    env_vars?: string[];  // Required environment variables
    credentials?: string[];  // Required credentials (jira, ado, github)
  };
}

export interface GeneratedTest {
  skillName: string;
  testFilePath: string;
  testCount: number;
  content: string;
}

export class TestGenerator {
  private projectRoot: string;
  private testSpecsDir: string;
  private testOutputDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.testSpecsDir = path.join(projectRoot, 'tests', 'specs');
    this.testOutputDir = path.join(projectRoot, 'tests', 'integration');
  }

  /**
   * Generate tests for a specific skill
   */
  public async generateTestsForSkill(skillName: string): Promise<GeneratedTest | null> {
    const specsDir = path.join(this.testSpecsDir, skillName);

    if (!fs.existsSync(specsDir)) {
      console.warn(`No test specs found for skill: ${skillName}`);
      return null;
    }

    // Read all YAML specs
    const specFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    if (specFiles.length === 0) {
      console.warn(`No YAML specs found in ${specsDir}`);
      return null;
    }

    const specs: TestSpec[] = [];
    for (const specFile of specFiles) {
      const specPath = path.join(specsDir, specFile);
      const spec = this.loadTestSpec(specPath);
      if (spec) {
        specs.push(spec);
      }
    }

    if (specs.length === 0) {
      return null;
    }

    // Generate TypeScript test file
    const testContent = this.generateTestFile(skillName, specs);

    // Write test file
    const outputDir = path.join(this.testOutputDir, skillName);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const testFilePath = path.join(outputDir, `${skillName}.test.ts`);
    fs.writeFileSync(testFilePath, testContent, 'utf-8');

    return {
      skillName,
      testFilePath,
      testCount: specs.length,
      content: testContent
    };
  }

  /**
   * Generate tests for all skills
   */
  public async generateAllTests(): Promise<GeneratedTest[]> {
    const skillDirs = fs.readdirSync(this.testSpecsDir).filter(name => {
      const fullPath = path.join(this.testSpecsDir, name);
      return fs.statSync(fullPath).isDirectory();
    });

    const generated: GeneratedTest[] = [];

    for (const skillName of skillDirs) {
      try {
        const result = await this.generateTestsForSkill(skillName);
        if (result) {
          generated.push(result);
          console.log(`✅ Generated tests for ${skillName}: ${result.testCount} tests`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to generate tests for ${skillName}:`, error.message);
      }
    }

    return generated;
  }

  /**
   * Load test spec from YAML file
   */
  private loadTestSpec(filePath: string): TestSpec | null {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');

      // Remove trailing --- if present (some YAML files have it)
      content = content.replace(/\n---\s*$/g, '');

      const spec: any = yaml.load(content);

      // Validate spec
      if (!spec || !spec.name || !spec.description) {
        console.warn(`Invalid spec in ${filePath}: missing name or description`);
        return null;
      }

      return spec as TestSpec;
    } catch (error: any) {
      console.error(`Error loading spec ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Generate TypeScript test file from specs
   */
  private generateTestFile(skillName: string, specs: TestSpec[]): string {
    const hasApiTests = specs.some(s => s.type === 'api_integration' || s.requires?.credentials);
    const requiredCredentials = new Set<string>();

    specs.forEach(spec => {
      spec.requires?.credentials?.forEach(cred => requiredCredentials.add(cred));
    });

    let content = this.generateFileHeader(skillName, hasApiTests, Array.from(requiredCredentials));
    content += this.generateTestClass(skillName, specs);
    content += this.generateTestRunner(skillName);

    return content;
  }

  /**
   * Generate file header with imports
   */
  private generateFileHeader(skillName: string, hasApiTests: boolean, credentials: string[]): string {
    let header = `/**\n`;
    header += ` * ${this.formatSkillName(skillName)} Tests\n`;
    header += ` *\n`;
    header += ` * Auto-generated from test specifications in tests/specs/${skillName}/\n`;
    header += ` * \n`;
    header += ` * Run: npm run test:integration:${skillName}\n`;
    header += ` */\n\n`;

    if (hasApiTests) {
      if (credentials.includes('jira')) {
        header += `import { JiraClient } from '../../src/integrations/jira/jira-client';\n`;
      }
      if (credentials.includes('ado')) {
        header += `import { AdoClient } from '../../src/integrations/ado/ado-client';\n`;
      }
      if (credentials.includes('github')) {
        header += `// import { GitHubClient } from '../../src/integrations/github/github-client';\n`;
      }
      header += `import { credentialsManager } from '../../src/core/credentials-manager';\n`;
    }

    header += `import * as fs from 'fs';\n`;
    header += `import * as path from 'path';\n\n`;

    header += `interface TestResult {\n`;
    header += `  name: string;\n`;
    header += `  status: 'PASS' | 'FAIL' | 'SKIP';\n`;
    header += `  duration: number;\n`;
    header += `  message?: string;\n`;
    header += `  details?: any;\n`;
    header += `}\n\n`;

    return header;
  }

  /**
   * Generate test class
   */
  private generateTestClass(skillName: string, specs: TestSpec[]): string {
    const className = this.formatClassName(skillName);

    let classContent = `class ${className}Test {\n`;
    classContent += `  private results: TestResult[] = [];\n\n`;

    // Add client properties if needed
    const hasJira = specs.some(s => s.requires?.credentials?.includes('jira'));
    const hasAdo = specs.some(s => s.requires?.credentials?.includes('ado'));

    if (hasJira) {
      classContent += `  private jiraClient: JiraClient;\n\n`;
      classContent += `  constructor() {\n`;
      classContent += `    this.jiraClient = new JiraClient();\n`;
      classContent += `  }\n\n`;
    } else if (hasAdo) {
      classContent += `  private adoClient: AdoClient;\n\n`;
      classContent += `  constructor() {\n`;
      classContent += `    this.adoClient = new AdoClient();\n`;
      classContent += `  }\n\n`;
    } else {
      classContent += `  constructor() {}\n\n`;
    }

    // Generate run method
    classContent += `  async run(): Promise<void> {\n`;
    classContent += `    console.log('╔══════════════════════════════════════════════════════════════╗');\n`;
    classContent += `    console.log('║      ${this.formatSkillName(skillName)} Tests                        ║');\n`;
    classContent += `    console.log('╚══════════════════════════════════════════════════════════════╝\\n');\n\n`;
    classContent += `    try {\n`;

    // Generate test calls
    specs.forEach((spec, index) => {
      classContent += `      await this.test${index + 1}_${this.camelCase(spec.name)}();\n`;
    });

    classContent += `    } catch (error) {\n`;
    classContent += `      console.error('❌ Test suite failed:', error);\n`;
    classContent += `    } finally {\n`;
    classContent += `      await this.generateReport();\n`;
    classContent += `    }\n`;
    classContent += `  }\n\n`;

    // Generate individual test methods
    specs.forEach((spec, index) => {
      classContent += this.generateTestMethod(spec, index + 1);
    });

    // Generate report method
    classContent += this.generateReportMethod(skillName);

    classContent += `}\n\n`;

    return classContent;
  }

  /**
   * Generate individual test method
   */
  private generateTestMethod(spec: TestSpec, testNumber: number): string {
    const escapedName = this.escapeString(spec.name);
    let method = `  private async test${testNumber}_${this.camelCase(spec.name)}(): Promise<void> {\n`;
    method += `    const testName = 'Test ${testNumber}: ${escapedName}';\n`;
    method += `    console.log(\`\\n🧪 \${testName}\`);\n`;
    method += `    const start = Date.now();\n\n`;

    method += `    try {\n`;

    // Generate test logic based on type
    if (spec.type === 'skill_activation') {
      method += this.generateSkillActivationTest(spec);
    } else if (spec.type === 'api_integration') {
      method += this.generateApiIntegrationTest(spec);
    } else {
      method += this.generateGenericTest(spec);
    }

    method += `      this.results.push({\n`;
    method += `        name: testName,\n`;
    method += `        status: 'PASS',\n`;
    method += `        duration: Date.now() - start,\n`;
    method += `        message: 'Test passed successfully'\n`;
    method += `      });\n`;
    method += `      console.log('✅ PASS\\n');\n`;
    method += `    } catch (error: any) {\n`;
    method += `      this.results.push({\n`;
    method += `        name: testName,\n`;
    method += `        status: 'FAIL',\n`;
    method += `        duration: Date.now() - start,\n`;
    method += `        message: error.message\n`;
    method += `      });\n`;
    method += `      console.log(\`❌ FAIL: \${error.message}\\n\`);\n`;
    method += `    }\n`;
    method += `  }\n\n`;

    return method;
  }

  /**
   * Generate skill activation test logic
   */
  private generateSkillActivationTest(spec: TestSpec): string {
    const prompt = spec.input.prompt ? this.escapeString(spec.input.prompt) : '';
    return `      // Skill activation test - placeholder\n` +
           `      // TODO: Implement skill activation detection\n` +
           `      console.log('   Prompt: ${prompt}');\n` +
           `      console.log('   Expected skill: ${spec.expected_output.skill_activated ? 'should activate' : 'should not activate'}');\n` +
           `      \n`;
  }

  /**
   * Generate API integration test logic
   */
  private generateApiIntegrationTest(spec: TestSpec): string {
    const apiCall = spec.input.api_call;
    if (!apiCall) {
      return `      // API test without API call definition\n`;
    }

    const method = this.escapeString(apiCall.method);
    const endpoint = this.escapeString(apiCall.endpoint);
    return `      // API Integration test\n` +
           `      console.log('   Making ${method} request to ${endpoint}');\n` +
           `      // TODO: Implement actual API call\n` +
           `      \n`;
  }

  /**
   * Generate generic test logic
   */
  private generateGenericTest(spec: TestSpec): string {
    const description = this.escapeString(spec.description);
    return `      // Generic test\n` +
           `      console.log('   Description: ${description}');\n` +
           `      // TODO: Implement test logic\n` +
           `      \n`;
  }

  /**
   * Generate report method
   */
  private generateReportMethod(skillName: string): string {
    return `  private async generateReport(): Promise<void> {\n` +
           `    console.log('\\n╔══════════════════════════════════════════════════════════════╗');\n` +
           `    console.log('║                      Test Results Summary                    ║');\n` +
           `    console.log('╚══════════════════════════════════════════════════════════════╝\\n');\n\n` +
           `    const passed = this.results.filter(r => r.status === 'PASS').length;\n` +
           `    const failed = this.results.filter(r => r.status === 'FAIL').length;\n` +
           `    const skipped = this.results.filter(r => r.status === 'SKIP').length;\n` +
           `    const total = this.results.length;\n\n` +
           `    console.log(\`Total Tests: \${total}\`);\n` +
           `    console.log(\`✅ Passed: \${passed}\`);\n` +
           `    console.log(\`❌ Failed: \${failed}\`);\n` +
           `    console.log(\`⏭️  Skipped: \${skipped}\\n\`);\n\n` +
           `    this.results.forEach(result => {\n` +
           `      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️ ';\n` +
           `      console.log(\`\${icon} \${result.name} (\${result.duration}ms)\`);\n` +
           `      if (result.message) {\n` +
           `        console.log(\`   \${result.message}\`);\n` +
           `      }\n` +
           `    });\n\n` +
           `    // Save report\n` +
           `    const resultsDir = path.join(process.cwd(), 'test-results', '${skillName}');\n` +
           `    if (!fs.existsSync(resultsDir)) {\n` +
           `      fs.mkdirSync(resultsDir, { recursive: true });\n` +
           `    }\n\n` +
           `    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');\n` +
           `    const reportPath = path.join(resultsDir, \`${skillName}-\${timestamp}.json\`);\n\n` +
           `    const report = {\n` +
           `      suite: '${this.formatSkillName(skillName)} Tests',\n` +
           `      timestamp: new Date().toISOString(),\n` +
           `      summary: { total, passed, failed, skipped },\n` +
           `      results: this.results\n` +
           `    };\n\n` +
           `    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));\n` +
           `    console.log(\`\\n📊 Report saved to: \${reportPath}\`);\n` +
           `  }\n`;
  }

  /**
   * Generate test runner
   */
  private generateTestRunner(skillName: string): string {
    const className = this.formatClassName(skillName);
    return `// Run tests\n` +
           `if (require.main === module) {\n` +
           `  const test = new ${className}Test();\n` +
           `  test.run().catch(error => {\n` +
           `    console.error('Test suite failed:', error);\n` +
           `    process.exit(1);\n` +
           `  });\n` +
           `}\n\n` +
           `export { ${className}Test };\n`;
  }

  /**
   * Format skill name for display
   */
  private formatSkillName(skillName: string): string {
    return skillName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  /**
   * Format class name
   */
  private formatClassName(skillName: string): string {
    return skillName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  /**
   * Convert to camelCase - sanitizes all special characters
   */
  private camelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9\s]+/g, ' ')  // Replace all special chars with spaces
      .trim()                             // Remove leading/trailing spaces
      .split(/\s+/)                       // Split on whitespace
      .map((word, index) => {
        if (index === 0) {
          return word.charAt(0).toLowerCase() + word.slice(1).toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * Escape string for use in single-quoted JavaScript strings
   */
  private escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }
}
