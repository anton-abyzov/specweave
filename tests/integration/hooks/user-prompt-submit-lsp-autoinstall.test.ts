/**
 * User Prompt Submit Hook - LSP Auto-Install Tests (v1.0.235)
 *
 * Tests the LSP auto-install system that:
 * 1. Detects project languages from filesystem (C#, Go, Java in addition to TS/Py/Rust)
 * 2. Detects languages from prompt keywords
 * 3. Checks if LSP binaries + plugins are installed
 * 4. Returns auto-install commands in additionalContext for Claude to execute
 * 5. Falls back to standard LSP CLI instructions when everything is installed
 *
 * @see plugins/specweave/hooks/user-prompt-submit.sh
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('User Prompt Submit Hook - LSP Auto-Install (v1.0.235)', () => {
  const hookPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  let hookContent: string;

  beforeEach(() => {
    hookContent = fs.readFileSync(hookPath, 'utf-8');
  });

  describe('Language Detection Variables', () => {
    it('should declare project detection variables for all 6 languages', () => {
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_TS="false"');
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_PY="false"');
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_RUST="false"');
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_CSHARP="false"');
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_GO="false"');
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_JAVA="false"');
    });

    it('should declare prompt detection variables for all 6 languages', () => {
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_TS="false"');
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_PY="false"');
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_RUST="false"');
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_CSHARP="false"');
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_GO="false"');
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_JAVA="false"');
    });
  });

  describe('C# Project Detection from Filesystem', () => {
    it('should detect *.csproj files at root level', () => {
      expect(hookContent).toMatch(/ls \*\.csproj/);
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_CSHARP="true"');
    });

    it('should detect *.sln files at root level', () => {
      expect(hookContent).toMatch(/ls \*\.csproj \*\.sln/);
    });

    it('should detect Directory.Build.props', () => {
      expect(hookContent).toContain('Directory.Build.props');
    });

    it('should check one level of subdirectories for *.csproj', () => {
      // Typical C# structure: src/MyApp/MyApp.csproj
      expect(hookContent).toMatch(/\*\/\*\.csproj/);
      expect(hookContent).toMatch(/src\/\*\/\*\.csproj/);
    });

    it('should detect *.cs source files', () => {
      expect(hookContent).toMatch(/ls \*\.cs src\/\*\.cs/);
    });
  });

  describe('Go Project Detection from Filesystem', () => {
    it('should detect go.mod', () => {
      expect(hookContent).toContain('-f "go.mod"');
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_GO="true"');
    });

    it('should detect go.sum', () => {
      expect(hookContent).toContain('-f "go.sum"');
    });

    it('should detect *.go files in common locations', () => {
      expect(hookContent).toMatch(/ls \*\.go cmd\/\*\.go pkg\/\*\.go/);
    });
  });

  describe('Java Project Detection from Filesystem', () => {
    it('should detect pom.xml (Maven)', () => {
      expect(hookContent).toContain('-f "pom.xml"');
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_JAVA="true"');
    });

    it('should detect build.gradle (Gradle)', () => {
      expect(hookContent).toContain('-f "build.gradle"');
    });

    it('should detect build.gradle.kts (Kotlin Gradle DSL)', () => {
      expect(hookContent).toContain('-f "build.gradle.kts"');
    });

    it('should detect settings.gradle', () => {
      expect(hookContent).toContain('-f "settings.gradle"');
    });

    it('should detect *.java files in common locations', () => {
      expect(hookContent).toMatch(/ls \*\.java src\/\*\.java/);
    });
  });

  describe('C# Prompt Keyword Detection', () => {
    it('should detect C# prompt keywords', () => {
      // Should match: .cs, c#, csharp, dotnet, .net, asp.net, blazor, entity framework, nuget, .csproj, .sln
      expect(hookContent).toMatch(/grep.*csharp/i);
      expect(hookContent).toMatch(/grep.*dotnet/i);
      expect(hookContent).toMatch(/grep.*blazor/i);
      expect(hookContent).toMatch(/grep.*asp\\?\.net/i);
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_CSHARP="true"');
    });
  });

  describe('Go Prompt Keyword Detection', () => {
    it('should detect Go prompt keywords', () => {
      // Should match: .go, golang, go.mod, goroutine, gin, echo, fiber
      expect(hookContent).toMatch(/grep.*golang/i);
      expect(hookContent).toMatch(/grep.*goroutine/i);
      expect(hookContent).toMatch(/grep.*gin/i);
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_GO="true"');
    });
  });

  describe('Java Prompt Keyword Detection', () => {
    it('should detect Java prompt keywords', () => {
      // Should match: .java, java, spring, maven, gradle, kotlin, .kt, jvm
      expect(hookContent).toMatch(/grep.*spring/i);
      expect(hookContent).toMatch(/grep.*maven/i);
      expect(hookContent).toMatch(/grep.*gradle/i);
      expect(hookContent).toMatch(/grep.*kotlin/i);
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_JAVA="true"');
    });
  });

  describe('LSP Needs Install Check', () => {
    it('should check all 6 languages in the LSP_NEEDS_INSTALL condition', () => {
      // The condition should check all language detection flags
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_CSHARP');
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_CSHARP');
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_GO');
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_GO');
      expect(hookContent).toContain('LSP_PROJECT_NEEDS_JAVA');
      expect(hookContent).toContain('LSP_PROMPT_NEEDS_JAVA');

      // Verify they appear in the compound condition that sets LSP_NEEDS_INSTALL
      const installSection = hookContent.substring(
        hookContent.indexOf('# Check if ANY language detection triggered'),
        hookContent.indexOf('LSP_NEEDS_INSTALL="true"') + 30
      );
      expect(installSection).toContain('LSP_PROJECT_NEEDS_CSHARP');
      expect(installSection).toContain('LSP_PROMPT_NEEDS_CSHARP');
      expect(installSection).toContain('LSP_PROJECT_NEEDS_GO');
      expect(installSection).toContain('LSP_PROMPT_NEEDS_GO');
      expect(installSection).toContain('LSP_PROJECT_NEEDS_JAVA');
      expect(installSection).toContain('LSP_PROMPT_NEEDS_JAVA');
    });
  });

  describe('LSP Setup Suggestion for New Languages', () => {
    it('should include C# in setup suggestion language list', () => {
      expect(hookContent).toContain('"C#"');
    });

    it('should include Go in setup suggestion language list', () => {
      expect(hookContent).toContain('"Go"');
    });

    it('should include Java in setup suggestion language list', () => {
      expect(hookContent).toContain('"Java"');
    });

    it('should check csharp-lsp plugin', () => {
      expect(hookContent).toContain('_check_plugin "csharp-lsp"');
    });

    it('should check gopls plugin', () => {
      expect(hookContent).toContain('_check_plugin "gopls"');
    });

    it('should check jdtls plugin', () => {
      expect(hookContent).toContain('_check_plugin "jdtls"');
    });
  });

  describe('Auto-Install Function (_lsp_check_and_install)', () => {
    it('should define the _lsp_check_and_install function', () => {
      expect(hookContent).toContain('_lsp_check_and_install()');
    });

    it('should check binary with command -v', () => {
      // Function checks if the LSP binary is installed
      const funcSection = hookContent.substring(
        hookContent.indexOf('_lsp_check_and_install()'),
        hookContent.indexOf('# Check each detected language')
      );
      expect(funcSection).toContain('command -v "$binary"');
    });

    it('should check plugin in installed_plugins.json', () => {
      const funcSection = hookContent.substring(
        hookContent.indexOf('_lsp_check_and_install()'),
        hookContent.indexOf('# Check each detected language')
      );
      expect(funcSection).toContain('installed_plugins.json');
      expect(funcSection).toContain('grep -q');
    });

    it('should generate install commands for missing binary', () => {
      const funcSection = hookContent.substring(
        hookContent.indexOf('_lsp_check_and_install()'),
        hookContent.indexOf('# Check each detected language')
      );
      expect(funcSection).toContain('binary missing');
      expect(funcSection).toContain('${binary_install}');
    });

    it('should generate install commands for missing plugin', () => {
      const funcSection = hookContent.substring(
        hookContent.indexOf('_lsp_check_and_install()'),
        hookContent.indexOf('# Check each detected language')
      );
      expect(funcSection).toContain('plugin missing');
      expect(funcSection).toContain('claude plugin install');
    });
  });

  describe('Auto-Install Language Coverage', () => {
    it('should call _lsp_check_and_install for TypeScript', () => {
      expect(hookContent).toContain(
        '_lsp_check_and_install "TypeScript" "typescript-language-server"'
      );
    });

    it('should call _lsp_check_and_install for Python', () => {
      expect(hookContent).toContain(
        '_lsp_check_and_install "Python" "pyright-langserver"'
      );
    });

    it('should call _lsp_check_and_install for Rust', () => {
      expect(hookContent).toContain(
        '_lsp_check_and_install "Rust" "rust-analyzer"'
      );
    });

    it('should call _lsp_check_and_install for C#', () => {
      expect(hookContent).toContain(
        '_lsp_check_and_install "C#" "csharp-ls"'
      );
      expect(hookContent).toContain('dotnet tool install -g csharp-ls');
    });

    it('should call _lsp_check_and_install for Go', () => {
      expect(hookContent).toContain('_lsp_check_and_install "Go" "gopls"');
      expect(hookContent).toContain(
        'go install golang.org/x/tools/gopls@latest'
      );
    });

    it('should call _lsp_check_and_install for Java', () => {
      expect(hookContent).toContain('_lsp_check_and_install "Java" "jdtls"');
      expect(hookContent).toContain('brew install jdtls');
    });
  });

  describe('Auto-Install Output Format', () => {
    it('should output MANDATORY install instructions when components missing', () => {
      expect(hookContent).toContain('LSP AUTO-INSTALL REQUIRED');
      expect(hookContent).toContain(
        'MANDATORY'
      );
      expect(hookContent).toContain('Run ALL missing install commands');
    });

    it('should include specweave lsp CLI instructions', () => {
      expect(hookContent).toContain('specweave lsp refs');
      expect(hookContent).toContain('specweave lsp def');
      expect(hookContent).toContain('specweave lsp hover');
      expect(hookContent).toContain('specweave lsp symbols');
    });

    it('should warn against using grep for find references', () => {
      // In bash, the quotes are escaped as \"
      expect(hookContent).toContain(
        'Do NOT use Grep for \\"find references\\"'
      );
    });

    it('should show standard LSP message when everything is installed', () => {
      expect(hookContent).toContain('LSP Semantic Analysis Available');
      expect(hookContent).toContain('specweave lsp search');
    });
  });

  describe('LLM Language Override', () => {
    it('should handle csharp/c# from LLM detection', () => {
      const overrideSection = hookContent.substring(
        hookContent.indexOf('case "$LSP_LLM_LANGUAGE"'),
        hookContent.indexOf('esac', hookContent.indexOf('case "$LSP_LLM_LANGUAGE"')) + 10
      );
      expect(overrideSection).toContain('csharp');
      expect(overrideSection).toContain('LSP_PROMPT_NEEDS_CSHARP="true"');
    });

    it('should handle go/golang from LLM detection', () => {
      const overrideSection = hookContent.substring(
        hookContent.indexOf('case "$LSP_LLM_LANGUAGE"'),
        hookContent.indexOf('esac', hookContent.indexOf('case "$LSP_LLM_LANGUAGE"')) + 10
      );
      expect(overrideSection).toContain('go|golang');
      expect(overrideSection).toContain('LSP_PROMPT_NEEDS_GO="true"');
    });

    it('should handle java/kotlin from LLM detection', () => {
      const overrideSection = hookContent.substring(
        hookContent.indexOf('case "$LSP_LLM_LANGUAGE"'),
        hookContent.indexOf('esac', hookContent.indexOf('case "$LSP_LLM_LANGUAGE"')) + 10
      );
      expect(overrideSection).toContain('java|kotlin');
      expect(overrideSection).toContain('LSP_PROMPT_NEEDS_JAVA="true"');
    });
  });
});

describe('LSP Auto-Install - Bash Function Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-autoinstall-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('_lsp_check_and_install function logic', () => {
    const createTestScript = (
      binaryExists: boolean,
      pluginInstalled: boolean,
      pluginName: string = 'vtsls'
    ): string => {
      const mockPluginsFile = path.join(tempDir, 'installed_plugins.json');
      if (pluginInstalled) {
        fs.writeFileSync(
          mockPluginsFile,
          JSON.stringify({
            version: 2,
            plugins: { [`${pluginName}@claude-code-lsps`]: [{ scope: 'project' }] },
          })
        );
      } else {
        fs.writeFileSync(mockPluginsFile, JSON.stringify({ version: 2, plugins: {} }));
      }

      // Create a standalone test script that mimics the function
      return `#!/bin/bash
set -e

LSP_AUTO_INSTALL_CMDS=""
LSP_PLUGIN_SCOPE="project"

_lsp_check_and_install() {
  local lang="$1" binary="$2" binary_install="$3" plugin="$4" marketplace="claude-code-lsps"
  # Check if binary is installed
  if ! command -v "$binary" >/dev/null 2>&1; then
    LSP_AUTO_INSTALL_CMDS="\${LSP_AUTO_INSTALL_CMDS}
- **\${lang}** binary missing: \\\`\${binary_install}\\\`"
  fi
  # Check if plugin is installed
  local plugins_file="${mockPluginsFile}"
  if [[ -f "$plugins_file" ]]; then
    if ! grep -q "\\"$\{plugin\}@" "$plugins_file" 2>/dev/null; then
      LSP_AUTO_INSTALL_CMDS="\${LSP_AUTO_INSTALL_CMDS}
- **\${lang}** plugin missing: \\\`claude plugin install \${plugin}@\${marketplace} --scope \${LSP_PLUGIN_SCOPE}\\\`"
    fi
  else
    LSP_AUTO_INSTALL_CMDS="\${LSP_AUTO_INSTALL_CMDS}
- **\${lang}** plugin missing: \\\`claude plugin install \${plugin}@\${marketplace} --scope \${LSP_PLUGIN_SCOPE}\\\`"
  fi
}

${
  binaryExists
    ? `# Binary exists - mock it\n_lsp_check_and_install "TypeScript" "bash" "npm install -g typescript-language-server typescript" "${pluginName}"`
    : `_lsp_check_and_install "TypeScript" "nonexistent-binary-xyz" "npm install -g typescript-language-server typescript" "${pluginName}"`
}

echo "RESULT:$LSP_AUTO_INSTALL_CMDS"
`;
    };

    it('should report missing binary when binary not found', () => {
      const scriptPath = path.join(tempDir, 'test.sh');
      fs.writeFileSync(scriptPath, createTestScript(false, true));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], {
        encoding: 'utf-8',
        timeout: 5000,
      });

      expect(result).toContain('binary missing');
      expect(result).toContain('npm install -g typescript-language-server');
    });

    it('should report missing plugin when plugin not in registry', () => {
      const scriptPath = path.join(tempDir, 'test.sh');
      fs.writeFileSync(scriptPath, createTestScript(true, false));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], {
        encoding: 'utf-8',
        timeout: 5000,
      });

      expect(result).toContain('plugin missing');
      expect(result).toContain('claude plugin install');
    });

    it('should report both when binary and plugin missing', () => {
      const scriptPath = path.join(tempDir, 'test.sh');
      fs.writeFileSync(scriptPath, createTestScript(false, false));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], {
        encoding: 'utf-8',
        timeout: 5000,
      });

      expect(result).toContain('binary missing');
      expect(result).toContain('plugin missing');
    });

    it('should report nothing when both binary and plugin exist', () => {
      const scriptPath = path.join(tempDir, 'test.sh');
      fs.writeFileSync(scriptPath, createTestScript(true, true));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], {
        encoding: 'utf-8',
        timeout: 5000,
      });

      // RESULT: should be empty (no missing components)
      expect(result.trim()).toBe('RESULT:');
    });
  });

  describe('Project language filesystem detection', () => {
    const createDetectionScript = (lang: string): string => {
      return `#!/bin/bash
set -e
cd "${tempDir}"

LSP_PROJECT_NEEDS_CSHARP="false"
LSP_PROJECT_NEEDS_GO="false"
LSP_PROJECT_NEEDS_JAVA="false"

case "${lang}" in
  csharp)
    # C# detection logic from the hook
    if ls *.csproj *.sln 2>/dev/null | head -1 | grep -q . || [[ -f "Directory.Build.props" ]]; then
      LSP_PROJECT_NEEDS_CSHARP="true"
    fi
    if [[ "$LSP_PROJECT_NEEDS_CSHARP" != "true" ]]; then
      if ls */*.csproj */*.sln src/*/*.csproj 2>/dev/null | head -1 | grep -q .; then
        LSP_PROJECT_NEEDS_CSHARP="true"
      elif ls *.cs src/*.cs 2>/dev/null | head -1 | grep -q .; then
        LSP_PROJECT_NEEDS_CSHARP="true"
      fi
    fi
    echo "CSHARP=$LSP_PROJECT_NEEDS_CSHARP"
    ;;
  go)
    # Go detection logic from the hook
    if [[ -f "go.mod" ]] || [[ -f "go.sum" ]]; then
      LSP_PROJECT_NEEDS_GO="true"
    fi
    if [[ "$LSP_PROJECT_NEEDS_GO" != "true" ]]; then
      if ls *.go cmd/*.go pkg/*.go 2>/dev/null | head -1 | grep -q .; then
        LSP_PROJECT_NEEDS_GO="true"
      fi
    fi
    echo "GO=$LSP_PROJECT_NEEDS_GO"
    ;;
  java)
    # Java detection logic from the hook
    if [[ -f "pom.xml" ]] || [[ -f "build.gradle" ]] || [[ -f "build.gradle.kts" ]] || [[ -f "settings.gradle" ]]; then
      LSP_PROJECT_NEEDS_JAVA="true"
    fi
    if [[ "$LSP_PROJECT_NEEDS_JAVA" != "true" ]]; then
      if ls *.java src/*.java src/main/java/*.java 2>/dev/null | head -1 | grep -q .; then
        LSP_PROJECT_NEEDS_JAVA="true"
      fi
    fi
    echo "JAVA=$LSP_PROJECT_NEEDS_JAVA"
    ;;
esac
`;
    };

    // C# detection tests
    it('should detect C# from *.csproj at root', () => {
      fs.writeFileSync(path.join(tempDir, 'MyApp.csproj'), '<Project></Project>');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('csharp'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('CSHARP=true');
    });

    it('should detect C# from *.sln at root', () => {
      fs.writeFileSync(path.join(tempDir, 'MySolution.sln'), '');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('csharp'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('CSHARP=true');
    });

    it('should detect C# from *.csproj in subdirectory', () => {
      const subDir = path.join(tempDir, 'src');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'MyApp.csproj'), '<Project></Project>');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('csharp'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('CSHARP=true');
    });

    it('should detect C# from Directory.Build.props', () => {
      fs.writeFileSync(path.join(tempDir, 'Directory.Build.props'), '<Project></Project>');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('csharp'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('CSHARP=true');
    });

    it('should NOT detect C# in empty directory', () => {
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('csharp'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('CSHARP=false');
    });

    // Go detection tests
    it('should detect Go from go.mod', () => {
      fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module example.com/test');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('go'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('GO=true');
    });

    it('should detect Go from go.sum', () => {
      fs.writeFileSync(path.join(tempDir, 'go.sum'), '');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('go'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('GO=true');
    });

    it('should detect Go from *.go files', () => {
      fs.writeFileSync(path.join(tempDir, 'main.go'), 'package main');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('go'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('GO=true');
    });

    it('should NOT detect Go in empty directory', () => {
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('go'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('GO=false');
    });

    // Java detection tests
    it('should detect Java from pom.xml', () => {
      fs.writeFileSync(path.join(tempDir, 'pom.xml'), '<project></project>');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('java'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('JAVA=true');
    });

    it('should detect Java from build.gradle', () => {
      fs.writeFileSync(path.join(tempDir, 'build.gradle'), 'apply plugin: "java"');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('java'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('JAVA=true');
    });

    it('should detect Java from build.gradle.kts', () => {
      fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'plugins { java }');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('java'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('JAVA=true');
    });

    it('should detect Java from *.java files', () => {
      fs.writeFileSync(path.join(tempDir, 'Main.java'), 'public class Main {}');
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('java'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('JAVA=true');
    });

    it('should NOT detect Java in empty directory', () => {
      const scriptPath = path.join(tempDir, 'detect.sh');
      fs.writeFileSync(scriptPath, createDetectionScript('java'));
      fs.chmodSync(scriptPath, '755');

      const { execFileSync } = require('child_process');
      const result = execFileSync('bash', [scriptPath], { encoding: 'utf-8', timeout: 5000 });
      expect(result.trim()).toBe('JAVA=false');
    });
  });
});
