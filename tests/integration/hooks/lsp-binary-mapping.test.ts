/**
 * Integration tests for LSP plugin-to-binary mapping
 *
 * Tests that lsp-check.sh contains correct mappings for all official LSP plugins
 * to their required language server binaries.
 *
 * @increment 0176-lsp-plugin-dependency-auto-install
 * @task T-004 [RED]
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LSP plugin-to-binary mapping', () => {
  const lspCheckScript = path.join(
    process.cwd(),
    'plugins/specweave/scripts/lsp-check.sh'
  );

  /**
   * Official LSP plugins from claude-plugins-official marketplace
   * and their required binaries with install commands
   */
  const OFFICIAL_LSP_MAPPINGS = [
    {
      plugin: 'csharp-lsp',
      binary: 'csharp-ls',
      installCmd: 'dotnet tool install -g csharp-ls',
      fileExtension: '.cs',
    },
    {
      plugin: 'typescript-lsp',
      binary: 'typescript-language-server',
      installCmd: 'npm install -g typescript-language-server typescript',
      fileExtension: '.ts',
    },
    {
      plugin: 'pyright-lsp',
      binary: 'pyright-langserver',
      installCmd: 'pip install pyright',
      fileExtension: '.py',
    },
    {
      plugin: 'gopls-lsp',
      binary: 'gopls',
      installCmd: 'go install golang.org/x/tools/gopls@latest',
      fileExtension: '.go',
    },
    {
      plugin: 'rust-analyzer-lsp',
      binary: 'rust-analyzer',
      installCmd: 'rustup component add rust-analyzer',
      fileExtension: '.rs',
    },
  ];

  it('should have lsp-check.sh script', () => {
    expect(fs.existsSync(lspCheckScript)).toBe(true);
  });

  describe('binary detection for each official LSP plugin', () => {
    let scriptContent: string;

    beforeAll(() => {
      scriptContent = fs.readFileSync(lspCheckScript, 'utf-8');
    });

    OFFICIAL_LSP_MAPPINGS.forEach(({ plugin, binary, installCmd, fileExtension }) => {
      describe(`${plugin}`, () => {
        it(`should check for ${binary} binary`, () => {
          // Script should check if the binary exists
          expect(scriptContent).toContain(binary);
        });

        it(`should detect ${fileExtension} files`, () => {
          // Script should check for files with this extension
          const extWithoutDot = fileExtension.slice(1);
          expect(scriptContent).toMatch(new RegExp(`["']?${extWithoutDot}["']?`));
        });

        it(`should provide install command containing key parts`, () => {
          // Script should include the install command or its key parts
          // Allow for variations in command format
          const keyPart = installCmd.split(' ')[0]; // e.g., 'dotnet', 'npm', 'pip'
          expect(scriptContent).toContain(keyPart);
        });
      });
    });
  });

  describe('install command format', () => {
    let scriptContent: string;

    beforeAll(() => {
      scriptContent = fs.readFileSync(lspCheckScript, 'utf-8');
    });

    it('should include dotnet tool install for C#', () => {
      expect(scriptContent).toContain('dotnet tool install');
    });

    it('should include npm install -g for TypeScript', () => {
      expect(scriptContent).toMatch(/npm\s+(install|i)\s+-g/);
    });

    it('should include pip install for Python', () => {
      expect(scriptContent).toMatch(/pip\s+install/);
    });

    it('should include go install for Go', () => {
      expect(scriptContent).toMatch(/go\s+install/);
    });

    it('should include rustup for Rust', () => {
      expect(scriptContent).toContain('rustup');
    });
  });
});
