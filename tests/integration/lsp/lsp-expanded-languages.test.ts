/**
 * Integration tests for expanded LSP language support
 *
 * TDD RED PHASE: Tests for 22 languages (14 NEW languages added to existing 8)
 *
 * New languages: Bash, C/C++, Clojure, Dart, Elixir, Kotlin, Lua, Swift,
 *                Terraform, YAML, Zig, OCaml, Nix, Gleam
 *
 * @module tests/integration/lsp/lsp-expanded-languages
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  scanLanguagesAcrossRepos,
  LANGUAGE_TO_LSP_PLUGIN,
} from '../../../src/cli/commands/lsp.js';

describe('LSP Expanded Language Support (22 languages)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-expanded-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('LANGUAGE_TO_LSP_PLUGIN should have all 22 languages', () => {
    it('should have original 8 languages', () => {
      expect(LANGUAGE_TO_LSP_PLUGIN['TypeScript']).toBe('vtsls');
      expect(LANGUAGE_TO_LSP_PLUGIN['Python']).toBe('pyright');
      expect(LANGUAGE_TO_LSP_PLUGIN['C#']).toBeDefined();
      expect(LANGUAGE_TO_LSP_PLUGIN['Go']).toBe('gopls');
      expect(LANGUAGE_TO_LSP_PLUGIN['Rust']).toBe('rust-analyzer');
      expect(LANGUAGE_TO_LSP_PLUGIN['Java']).toBe('jdtls');
      expect(LANGUAGE_TO_LSP_PLUGIN['PHP']).toBe('intelephense');
      expect(LANGUAGE_TO_LSP_PLUGIN['Ruby']).toBe('solargraph');
    });

    it('should have 14 NEW languages from boostvolt/claude-code-lsps', () => {
      // Shell scripting
      expect(LANGUAGE_TO_LSP_PLUGIN['Bash']).toBe('bash-language-server');

      // Systems programming
      expect(LANGUAGE_TO_LSP_PLUGIN['C/C++']).toBe('clangd');
      expect(LANGUAGE_TO_LSP_PLUGIN['Zig']).toBe('zls');

      // Mobile development
      expect(LANGUAGE_TO_LSP_PLUGIN['Swift']).toBe('sourcekit-lsp');
      expect(LANGUAGE_TO_LSP_PLUGIN['Dart']).toBe('dart-analyzer');
      expect(LANGUAGE_TO_LSP_PLUGIN['Kotlin']).toBe('kotlin-lsp');

      // Functional languages
      expect(LANGUAGE_TO_LSP_PLUGIN['Clojure']).toBe('clojure-lsp');
      expect(LANGUAGE_TO_LSP_PLUGIN['Elixir']).toBe('elixir-ls');
      expect(LANGUAGE_TO_LSP_PLUGIN['OCaml']).toBe('ocaml-lsp');
      expect(LANGUAGE_TO_LSP_PLUGIN['Gleam']).toBe('gleam');

      // Scripting/Config
      expect(LANGUAGE_TO_LSP_PLUGIN['Lua']).toBe('lua-language-server');
      expect(LANGUAGE_TO_LSP_PLUGIN['YAML']).toBe('yaml-language-server');

      // Infrastructure
      expect(LANGUAGE_TO_LSP_PLUGIN['Terraform']).toBe('terraform-ls');
      expect(LANGUAGE_TO_LSP_PLUGIN['Nix']).toBe('nixd');
    });

    it('should have exactly 22 language mappings', () => {
      const languageCount = Object.keys(LANGUAGE_TO_LSP_PLUGIN).length;
      expect(languageCount).toBe(22);
    });
  });

  describe('scanLanguagesAcrossRepos should detect new languages', () => {
    it('should detect Bash/Shell scripts', async () => {
      fs.writeFileSync(path.join(tempDir, 'build.sh'), '#!/bin/bash\necho "hello"');
      fs.writeFileSync(path.join(tempDir, 'deploy.bash'), '#!/bin/bash');
      fs.writeFileSync(path.join(tempDir, 'init.zsh'), '#!/bin/zsh');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const bash = result.languages.find((l) => l.name === 'Bash');
      expect(bash).toBeDefined();
      expect(bash!.fileCount).toBe(3);
      expect(bash!.plugin).toBe('bash-language-server');
    });

    it('should detect C/C++ files', async () => {
      fs.writeFileSync(path.join(tempDir, 'main.c'), 'int main() {}');
      fs.writeFileSync(path.join(tempDir, 'utils.cpp'), 'void foo() {}');
      fs.writeFileSync(path.join(tempDir, 'header.h'), '#pragma once');
      fs.writeFileSync(path.join(tempDir, 'types.hpp'), '#pragma once');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const cpp = result.languages.find((l) => l.name === 'C/C++');
      expect(cpp).toBeDefined();
      expect(cpp!.fileCount).toBe(4);
      expect(cpp!.plugin).toBe('clangd');
    });

    it('should detect Kotlin files', async () => {
      fs.writeFileSync(path.join(tempDir, 'Main.kt'), 'fun main() {}');
      fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'plugins {}');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const kotlin = result.languages.find((l) => l.name === 'Kotlin');
      expect(kotlin).toBeDefined();
      expect(kotlin!.fileCount).toBe(2);
      expect(kotlin!.plugin).toBe('kotlin-lsp');
    });

    it('should detect Swift files', async () => {
      fs.writeFileSync(path.join(tempDir, 'App.swift'), 'import SwiftUI');
      fs.writeFileSync(path.join(tempDir, 'ViewModel.swift'), 'class ViewModel {}');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const swift = result.languages.find((l) => l.name === 'Swift');
      expect(swift).toBeDefined();
      expect(swift!.fileCount).toBe(2);
      expect(swift!.plugin).toBe('sourcekit-lsp');
    });

    it('should detect Dart/Flutter files', async () => {
      fs.writeFileSync(path.join(tempDir, 'main.dart'), 'void main() {}');
      fs.writeFileSync(path.join(tempDir, 'widget.dart'), 'class MyWidget {}');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const dart = result.languages.find((l) => l.name === 'Dart');
      expect(dart).toBeDefined();
      expect(dart!.fileCount).toBe(2);
      expect(dart!.plugin).toBe('dart-analyzer');
    });

    it('should detect Terraform files', async () => {
      fs.writeFileSync(path.join(tempDir, 'main.tf'), 'resource "aws_s3" {}');
      fs.writeFileSync(path.join(tempDir, 'vars.tfvars'), 'region = "us-east-1"');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const terraform = result.languages.find((l) => l.name === 'Terraform');
      expect(terraform).toBeDefined();
      expect(terraform!.fileCount).toBe(2);
      expect(terraform!.plugin).toBe('terraform-ls');
    });

    it('should detect YAML files', async () => {
      fs.writeFileSync(path.join(tempDir, 'config.yaml'), 'key: value');
      fs.writeFileSync(path.join(tempDir, 'docker-compose.yml'), 'version: "3"');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const yaml = result.languages.find((l) => l.name === 'YAML');
      expect(yaml).toBeDefined();
      expect(yaml!.fileCount).toBe(2);
      expect(yaml!.plugin).toBe('yaml-language-server');
    });

    it('should detect Elixir files', async () => {
      fs.writeFileSync(path.join(tempDir, 'app.ex'), 'defmodule App do end');
      fs.writeFileSync(path.join(tempDir, 'test.exs'), 'ExUnit.start()');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const elixir = result.languages.find((l) => l.name === 'Elixir');
      expect(elixir).toBeDefined();
      expect(elixir!.fileCount).toBe(2);
      expect(elixir!.plugin).toBe('elixir-ls');
    });

    it('should detect Clojure files', async () => {
      fs.writeFileSync(path.join(tempDir, 'core.clj'), '(ns core)');
      fs.writeFileSync(path.join(tempDir, 'app.cljs'), '(ns app)');
      fs.writeFileSync(path.join(tempDir, 'shared.cljc'), '(ns shared)');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const clojure = result.languages.find((l) => l.name === 'Clojure');
      expect(clojure).toBeDefined();
      expect(clojure!.fileCount).toBe(3);
      expect(clojure!.plugin).toBe('clojure-lsp');
    });

    it('should detect Lua files', async () => {
      fs.writeFileSync(path.join(tempDir, 'init.lua'), 'local M = {}');
      fs.writeFileSync(path.join(tempDir, 'config.lua'), 'return {}');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const lua = result.languages.find((l) => l.name === 'Lua');
      expect(lua).toBeDefined();
      expect(lua!.fileCount).toBe(2);
      expect(lua!.plugin).toBe('lua-language-server');
    });

    it('should detect Zig files', async () => {
      fs.writeFileSync(path.join(tempDir, 'main.zig'), 'pub fn main() void {}');
      fs.writeFileSync(path.join(tempDir, 'build.zon'), '.{}');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const zig = result.languages.find((l) => l.name === 'Zig');
      expect(zig).toBeDefined();
      expect(zig!.fileCount).toBe(2);
      expect(zig!.plugin).toBe('zls');
    });

    it('should detect OCaml files', async () => {
      fs.writeFileSync(path.join(tempDir, 'main.ml'), 'let () = ()');
      fs.writeFileSync(path.join(tempDir, 'types.mli'), 'type t');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const ocaml = result.languages.find((l) => l.name === 'OCaml');
      expect(ocaml).toBeDefined();
      expect(ocaml!.fileCount).toBe(2);
      expect(ocaml!.plugin).toBe('ocaml-lsp');
    });

    it('should detect Nix files', async () => {
      fs.writeFileSync(path.join(tempDir, 'flake.nix'), '{ description = ""; }');
      fs.writeFileSync(path.join(tempDir, 'shell.nix'), '{ pkgs ? import <nixpkgs> {} }');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const nix = result.languages.find((l) => l.name === 'Nix');
      expect(nix).toBeDefined();
      expect(nix!.fileCount).toBe(2);
      expect(nix!.plugin).toBe('nixd');
    });

    it('should detect Gleam files', async () => {
      fs.writeFileSync(path.join(tempDir, 'main.gleam'), 'pub fn main() {}');
      fs.writeFileSync(path.join(tempDir, 'utils.gleam'), 'pub fn util() {}');

      const result = await scanLanguagesAcrossRepos(tempDir);

      const gleam = result.languages.find((l) => l.name === 'Gleam');
      expect(gleam).toBeDefined();
      expect(gleam!.fileCount).toBe(2);
      expect(gleam!.plugin).toBe('gleam');
    });
  });

  describe('Multi-language mixed project detection', () => {
    it('should detect all 22 languages in a mega-polyglot project', async () => {
      // Create files for all 22 languages
      const files = [
        // Original 8
        { name: 'app.ts', content: 'export {};' },
        { name: 'main.py', content: 'print()' },
        { name: 'App.cs', content: 'class App {}' },
        { name: 'main.go', content: 'package main' },
        { name: 'lib.rs', content: 'fn main() {}' },
        { name: 'Main.java', content: 'class Main {}' },
        { name: 'index.php', content: '<?php' },
        { name: 'app.rb', content: 'puts "hi"' },
        // New 14
        { name: 'build.sh', content: '#!/bin/bash' },
        { name: 'main.cpp', content: 'int main() {}' },
        { name: 'core.clj', content: '(ns core)' },
        { name: 'main.dart', content: 'void main() {}' },
        { name: 'app.ex', content: 'defmodule App do end' },
        { name: 'Main.kt', content: 'fun main() {}' },
        { name: 'init.lua', content: 'local M = {}' },
        { name: 'App.swift', content: 'import Foundation' },
        { name: 'main.tf', content: 'resource {}' },
        { name: 'config.yaml', content: 'key: value' },
        { name: 'main.zig', content: 'pub fn main() {}' },
        { name: 'main.ml', content: 'let () = ()' },
        { name: 'flake.nix', content: '{}' },
        { name: 'main.gleam', content: 'pub fn main() {}' },
      ];

      for (const file of files) {
        fs.writeFileSync(path.join(tempDir, file.name), file.content);
      }

      const result = await scanLanguagesAcrossRepos(tempDir);

      expect(result.success).toBe(true);
      expect(result.languages.length).toBe(22);

      // Verify each language is detected
      const languageNames = result.languages.map((l) => l.name);
      expect(languageNames).toContain('TypeScript');
      expect(languageNames).toContain('Python');
      expect(languageNames).toContain('C#');
      expect(languageNames).toContain('Go');
      expect(languageNames).toContain('Rust');
      expect(languageNames).toContain('Java');
      expect(languageNames).toContain('PHP');
      expect(languageNames).toContain('Ruby');
      expect(languageNames).toContain('Bash');
      expect(languageNames).toContain('C/C++');
      expect(languageNames).toContain('Clojure');
      expect(languageNames).toContain('Dart');
      expect(languageNames).toContain('Elixir');
      expect(languageNames).toContain('Kotlin');
      expect(languageNames).toContain('Lua');
      expect(languageNames).toContain('Swift');
      expect(languageNames).toContain('Terraform');
      expect(languageNames).toContain('YAML');
      expect(languageNames).toContain('Zig');
      expect(languageNames).toContain('OCaml');
      expect(languageNames).toContain('Nix');
      expect(languageNames).toContain('Gleam');
    });
  });

  describe('Binary install commands for new languages', () => {
    it('should have correct install commands for all new languages', async () => {
      // Create one file for each new language
      fs.writeFileSync(path.join(tempDir, 'build.sh'), '');
      fs.writeFileSync(path.join(tempDir, 'main.cpp'), '');
      fs.writeFileSync(path.join(tempDir, 'Main.kt'), '');
      fs.writeFileSync(path.join(tempDir, 'App.swift'), '');
      fs.writeFileSync(path.join(tempDir, 'main.dart'), '');
      fs.writeFileSync(path.join(tempDir, 'main.tf'), '');
      fs.writeFileSync(path.join(tempDir, 'config.yaml'), '');
      fs.writeFileSync(path.join(tempDir, 'app.ex'), '');
      fs.writeFileSync(path.join(tempDir, 'core.clj'), '');
      fs.writeFileSync(path.join(tempDir, 'init.lua'), '');
      fs.writeFileSync(path.join(tempDir, 'main.zig'), '');
      fs.writeFileSync(path.join(tempDir, 'main.ml'), '');
      fs.writeFileSync(path.join(tempDir, 'flake.nix'), '');
      fs.writeFileSync(path.join(tempDir, 'main.gleam'), '');

      const result = await scanLanguagesAcrossRepos(tempDir);

      // Check that each language has appropriate install commands
      for (const lang of result.languages) {
        expect(lang.binaryInstallCommand).toBeDefined();
        expect(lang.binaryInstallCommand.length).toBeGreaterThan(0);
        expect(lang.pluginInstallCommand).toContain('claude plugin install');
        expect(lang.pluginInstallCommand).toContain('@claude-code-lsps');
      }

      // Verify specific commands (cross-platform)
      const bash = result.languages.find((l) => l.name === 'Bash');
      expect(bash?.binaryInstallCommand).toContain('npm install -g bash-language-server');

      const cpp = result.languages.find((l) => l.name === 'C/C++');
      // Cross-platform: supports apt (Linux), brew (macOS), choco (Windows)
      expect(cpp?.binaryInstallCommand).toMatch(/apt install|brew install|choco install/);

      const kotlin = result.languages.find((l) => l.name === 'Kotlin');
      // Cross-platform: download link + brew fallback
      expect(kotlin?.binaryInstallCommand).toMatch(/github\.com.*kotlin-language-server|brew install/);

      const swift = result.languages.find((l) => l.name === 'Swift');
      // Swift toolchain link + xcode-select
      expect(swift?.binaryInstallCommand).toMatch(/swift\.org|xcode-select/i);

      const terraform = result.languages.find((l) => l.name === 'Terraform');
      expect(terraform?.binaryInstallCommand).toContain('hashicorp');
    });
  });
});
