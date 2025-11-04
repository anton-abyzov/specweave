/**
 * Plugin Detection Utility
 *
 * Maps project tech stack signals to SpecWeave plugins.
 * Used by:
 * - specweave init (scan project structure)
 * - plugin-detector skill (runtime detection)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Plugin detection result
 */
export interface DetectedPlugin {
  name: string;
  reason: string; // Why was it detected?
  confidence: 'high' | 'medium' | 'low';
  signals: string[]; // What triggered detection?
}

/**
 * Project tech stack signals
 */
interface TechStackSignals {
  // Package managers
  hasPackageJson: boolean;
  hasPyProject: boolean;
  hasRequirementsTxt: boolean;
  hasCsproj: boolean;
  hasGemfile: boolean;

  // Dependencies (from package.json)
  dependencies: string[];
  devDependencies: string[];

  // Files & folders
  files: string[];
  folders: string[];

  // Git remote
  gitRemote: string | null;
}

/**
 * Scan project directory for tech stack signals
 */
export async function scanProjectStructure(projectDir: string): Promise<TechStackSignals> {
  const signals: TechStackSignals = {
    hasPackageJson: false,
    hasPyProject: false,
    hasRequirementsTxt: false,
    hasCsproj: false,
    hasGemfile: false,
    dependencies: [],
    devDependencies: [],
    files: [],
    folders: [],
    gitRemote: null,
  };

  // Check package.json
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    signals.hasPackageJson = true;
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      signals.dependencies = Object.keys(pkg.dependencies || {});
      signals.devDependencies = Object.keys(pkg.devDependencies || {});
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Check Python files
  signals.hasPyProject = fs.existsSync(path.join(projectDir, 'pyproject.toml'));
  signals.hasRequirementsTxt = fs.existsSync(path.join(projectDir, 'requirements.txt'));

  // Check .NET files
  const csprojFiles = fs.readdirSync(projectDir).filter(f => f.endsWith('.csproj'));
  signals.hasCsproj = csprojFiles.length > 0;

  // Check Ruby
  signals.hasGemfile = fs.existsSync(path.join(projectDir, 'Gemfile'));

  // Scan folders (top-level only to avoid deep recursion)
  try {
    const entries = fs.readdirSync(projectDir, { withFileTypes: true });
    signals.folders = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);
    signals.files = entries
      .filter(e => e.isFile())
      .map(e => e.name);
  } catch (e) {
    // Ignore permission errors
  }

  // Check git remote
  const gitConfigPath = path.join(projectDir, '.git', 'config');
  if (fs.existsSync(gitConfigPath)) {
    try {
      const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
      const remoteMatch = gitConfig.match(/url\s*=\s*(.+)/);
      if (remoteMatch) {
        signals.gitRemote = remoteMatch[1].trim();
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return signals;
}

/**
 * Detect required plugins based on tech stack signals
 */
export function detectPlugins(signals: TechStackSignals): DetectedPlugin[] {
  const detected: DetectedPlugin[] = [];

  // Helper to add detection
  const addPlugin = (name: string, reason: string, confidence: 'high' | 'medium' | 'low', signals: string[]) => {
    detected.push({ name, reason, confidence, signals });
  };

  // Frontend detection
  const frontendDeps = ['react', 'next', 'vue', 'angular', 'svelte', '@angular/core', 'vue-router', 'react-router-dom'];
  const hasFrontend = signals.dependencies.some(dep => frontendDeps.some(fd => dep.includes(fd)));
  if (hasFrontend) {
    const matchedDeps = signals.dependencies.filter(dep => frontendDeps.some(fd => dep.includes(fd)));
    addPlugin(
      'specweave-frontend',
      'Frontend framework detected',
      'high',
      matchedDeps
    );
  }

  // Backend detection - Node.js
  const backendNodeDeps = ['express', 'fastify', 'nestjs', 'koa', '@nestjs/core', 'hapi'];
  const hasNodeBackend = signals.dependencies.some(dep => backendNodeDeps.some(bd => dep.includes(bd)));
  if (hasNodeBackend) {
    const matchedDeps = signals.dependencies.filter(dep => backendNodeDeps.some(bd => dep.includes(bd)));
    addPlugin(
      'specweave-backend',
      'Node.js backend framework detected',
      'high',
      matchedDeps
    );
  }

  // Backend detection - .NET
  if (signals.hasCsproj) {
    addPlugin(
      'specweave-backend',
      '.NET project detected',
      'high',
      ['*.csproj files']
    );
  }

  // Backend detection - Python
  if (signals.hasPyProject || signals.hasRequirementsTxt) {
    addPlugin(
      'specweave-backend',
      'Python project detected',
      'medium',
      signals.hasPyProject ? ['pyproject.toml'] : ['requirements.txt']
    );
  }

  // Kubernetes detection
  const k8sFolders = ['k8s', 'kubernetes', '.kube', 'helm'];
  const hasK8s = signals.folders.some(f => k8sFolders.includes(f.toLowerCase()));
  if (hasK8s) {
    const matchedFolders = signals.folders.filter(f => k8sFolders.includes(f.toLowerCase()));
    addPlugin(
      'specweave-kubernetes',
      'Kubernetes configuration detected',
      'high',
      matchedFolders
    );
  }

  // Infrastructure detection
  const infraFiles = ['docker-compose.yml', 'docker-compose.yaml', 'Dockerfile'];
  const hasInfra = signals.files.some(f => infraFiles.includes(f));
  const infraFolders = ['terraform', 'infrastructure'];
  const hasInfraFolders = signals.folders.some(f => infraFolders.includes(f.toLowerCase()));
  if (hasInfra || hasInfraFolders) {
    const matchedSignals = [
      ...signals.files.filter(f => infraFiles.includes(f)),
      ...signals.folders.filter(f => infraFolders.includes(f.toLowerCase()))
    ];
    addPlugin(
      'specweave-infrastructure',
      'Infrastructure as Code detected',
      'high',
      matchedSignals
    );
  }

  // GitHub detection
  if (signals.gitRemote && signals.gitRemote.includes('github.com')) {
    addPlugin(
      'specweave-github',
      'GitHub repository detected',
      'high',
      [signals.gitRemote]
    );
  }

  // Payment processing detection
  const paymentDeps = ['stripe', '@stripe/stripe-js', 'paypal', 'braintree'];
  const hasPayments = signals.dependencies.some(dep => paymentDeps.some(pd => dep.includes(pd)));
  if (hasPayments) {
    const matchedDeps = signals.dependencies.filter(dep => paymentDeps.some(pd => dep.includes(pd)));
    addPlugin(
      'specweave-payments',
      'Payment processing library detected',
      'high',
      matchedDeps
    );
  }

  // Machine Learning detection
  const mlDeps = ['tensorflow', '@tensorflow/tfjs', 'torch', 'pytorch', 'sklearn', 'keras'];
  const hasML = signals.dependencies.some(dep => mlDeps.some(md => dep.includes(md)));
  if (hasML) {
    const matchedDeps = signals.dependencies.filter(dep => mlDeps.some(md => dep.includes(md)));
    addPlugin(
      'specweave-ml',
      'Machine learning library detected',
      'high',
      matchedDeps
    );
  }

  // Testing detection
  const testingDeps = ['playwright', '@playwright/test', 'cypress', 'selenium-webdriver', '@testing-library/react'];
  const hasTesting = signals.devDependencies.some(dep => testingDeps.some(td => dep.includes(td)));
  if (hasTesting) {
    const matchedDeps = signals.devDependencies.filter(dep => testingDeps.some(td => dep.includes(td)));
    addPlugin(
      'specweave-testing',
      'E2E testing framework detected',
      'medium',
      matchedDeps
    );
  }

  // Documentation detection
  const docsDeps = ['docusaurus', '@docusaurus/core', 'vuepress', 'docsify'];
  const hasDocs = signals.dependencies.some(dep => docsDeps.some(dd => dep.includes(dd)));
  const docsFolders = ['docs', 'documentation', 'doc'];
  const hasDocsFolders = signals.folders.some(f => docsFolders.includes(f.toLowerCase()));
  if (hasDocs || hasDocsFolders) {
    const matchedSignals = [
      ...signals.dependencies.filter(dep => docsDeps.some(dd => dep.includes(dd))),
      ...signals.folders.filter(f => docsFolders.includes(f.toLowerCase()))
    ];
    addPlugin(
      'specweave-docs',
      'Documentation site detected',
      hasDocs ? 'high' : 'medium',
      matchedSignals
    );
  }

  // Figma detection
  const figmaDeps = ['figma-api', '@figma/rest-api', 'figma-js'];
  const hasFigma = signals.dependencies.some(dep => figmaDeps.some(fd => dep.includes(fd)));
  const figmaFiles = ['.figmarc', 'figma.config.js'];
  const hasFigmaFiles = signals.files.some(f => figmaFiles.includes(f));
  if (hasFigma || hasFigmaFiles) {
    const matchedSignals = [
      ...signals.dependencies.filter(dep => figmaDeps.some(fd => dep.includes(fd))),
      ...signals.files.filter(f => figmaFiles.includes(f))
    ];
    addPlugin(
      'specweave-figma',
      'Figma integration detected',
      'high',
      matchedSignals
    );
  }

  // Diagrams detection (low confidence - common folder names)
  const diagramsFolders = ['diagrams', 'architecture'];
  const hasDiagrams = signals.folders.some(f => diagramsFolders.includes(f.toLowerCase()));
  if (hasDiagrams) {
    const matchedFolders = signals.folders.filter(f => diagramsFolders.includes(f.toLowerCase()));
    addPlugin(
      'specweave-diagrams',
      'Architecture diagrams folder detected',
      'low',
      matchedFolders
    );
  }

  return detected;
}

/**
 * Format detected plugins for CLI output
 */
export function formatDetectedPlugins(plugins: DetectedPlugin[]): string {
  if (plugins.length === 0) {
    return '   No additional plugins recommended for this project.';
  }

  // Group by confidence
  const high = plugins.filter(p => p.confidence === 'high');
  const medium = plugins.filter(p => p.confidence === 'medium');
  const low = plugins.filter(p => p.confidence === 'low');

  let output = '';

  if (high.length > 0) {
    output += '   Recommended (high confidence):\n';
    high.forEach(p => {
      output += `   • ${p.name} - ${p.reason}\n`;
      output += `     Signals: ${p.signals.join(', ')}\n`;
    });
  }

  if (medium.length > 0) {
    output += '\n   Suggested (medium confidence):\n';
    medium.forEach(p => {
      output += `   • ${p.name} - ${p.reason}\n`;
      output += `     Signals: ${p.signals.join(', ')}\n`;
    });
  }

  if (low.length > 0) {
    output += '\n   Optional (low confidence):\n';
    low.forEach(p => {
      output += `   • ${p.name} - ${p.reason}\n`;
    });
  }

  return output;
}

/**
 * Generate install commands for detected plugins
 */
export function generateInstallCommands(plugins: DetectedPlugin[]): string[] {
  // Only include high and medium confidence
  const toInstall = plugins.filter(p => p.confidence === 'high' || p.confidence === 'medium');

  // Deduplicate by name
  const uniquePlugins = Array.from(new Set(toInstall.map(p => p.name)));

  return uniquePlugins.map(name => `/plugin install ${name}@specweave`);
}
