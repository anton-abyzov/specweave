/**
 * Java Standards Parser Tests
 *
 * Tests for JavaStandardsParser class and parseJavaStandards convenience function.
 * Mocks fs operations to test parsing logic for pom.xml, build.gradle(.kts),
 * checkstyle.xml, pmd.xml, spotbugs.xml, .editorconfig, and detekt.yml files.
 *
 * @see src/core/living-docs/governance/java-standards-parser.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Logger } from '../../../../../src/utils/logger.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockReadFile, mockStat } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockStat: vi.fn(),
}));

vi.mock('fs', () => ({
  readFile: (path: string, enc: string, cb: Function) => {
    const promise = mockReadFile(path, enc);
    if (promise && typeof promise.then === 'function') {
      promise.then(
        (val: string) => setImmediate(() => cb(null, val)),
        (err: Error) => setImmediate(() => cb(err))
      );
    } else {
      setImmediate(() => cb(new Error('Mock not properly configured')));
    }
  },
  stat: (path: string, cb: Function) => {
    const promise = mockStat(path);
    if (promise && typeof promise.then === 'function') {
      promise.then(
        (val: unknown) => setImmediate(() => cb(null, val)),
        (err: Error) => setImmediate(() => cb(err))
      );
    } else {
      setImmediate(() => cb(new Error('Mock not properly configured')));
    }
  },
}));

vi.mock('../../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  JavaStandardsParser,
  parseJavaStandards,
} from '../../../../../src/core/living-docs/governance/java-standards-parser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

function allowFiles(projectPath: string, filenames: string[]) {
  mockStat.mockImplementation((filePath: string) => {
    for (const f of filenames) {
      if (filePath === `${projectPath}/${f}`) {
        return Promise.resolve({ isFile: () => true });
      }
    }
    return Promise.reject(new Error('ENOENT'));
  });
}

function setFileContents(projectPath: string, files: Record<string, string>) {
  mockReadFile.mockImplementation((filePath: string) => {
    for (const [name, content] of Object.entries(files)) {
      if (filePath === `${projectPath}/${name}`) {
        return Promise.resolve(content);
      }
    }
    return Promise.reject(new Error(`ENOENT: ${filePath}`));
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JavaStandardsParser', () => {
  let parser: JavaStandardsParser;
  const PROJECT = '/test/java-project';

  beforeEach(() => {
    vi.clearAllMocks();
    parser = new JavaStandardsParser({ logger: makeLogger() });
  });

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create instance with default logger', () => {
      const p = new JavaStandardsParser();
      expect(p).toBeInstanceOf(JavaStandardsParser);
    });

    it('should accept custom logger', () => {
      const logger = makeLogger();
      const p = new JavaStandardsParser({ logger });
      expect(p).toBeInstanceOf(JavaStandardsParser);
    });
  });

  // -------------------------------------------------------------------------
  // Default values
  // -------------------------------------------------------------------------

  describe('parse - defaults', () => {
    it('should return default naming conventions', async () => {
      allowFiles(PROJECT, []);
      setFileContents(PROJECT, {});
      const result = await parser.parse(PROJECT, []);
      expect(result.namingConventions).toEqual({
        classes: 'PascalCase (UpperCamelCase)',
        methods: 'camelCase (lowerCamelCase)',
        constants: 'UPPER_SNAKE_CASE',
        packages: 'all.lowercase.dotted',
        interfaces: 'PascalCase (often prefixed with I)',
        typeParameters: 'Single uppercase letter (T, E, K, V)',
      });
    });

    it('should return default formatting', async () => {
      allowFiles(PROJECT, []);
      setFileContents(PROJECT, {});
      const result = await parser.parse(PROJECT, []);
      expect(result.formatting).toEqual({
        indentation: 'spaces',
        indentSize: 4,
        maxLineLength: 120,
        braceStyle: 'same_line',
      });
    });

    it('should default buildTool to unknown', async () => {
      allowFiles(PROJECT, []);
      setFileContents(PROJECT, {});
      const result = await parser.parse(PROJECT, []);
      expect(result.buildTool).toBe('unknown');
    });

    it('should return empty warnings for successful parse', async () => {
      allowFiles(PROJECT, []);
      setFileContents(PROJECT, {});
      const result = await parser.parse(PROJECT, []);
      expect(result.warnings).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // pom.xml parsing
  // -------------------------------------------------------------------------

  describe('parse - pom.xml', () => {
    it('should detect maven as build tool', async () => {
      const pom = `<?xml version="1.0"?>
<project>
  <properties>
    <java.version>17</java.version>
  </properties>
</project>`;
      allowFiles(PROJECT, ['pom.xml']);
      setFileContents(PROJECT, { 'pom.xml': pom });
      const result = await parser.parse(PROJECT, ['pom.xml']);
      expect(result.buildTool).toBe('maven');
      expect(result.javaVersion).toBe('17');
    });

    it('should detect java version from maven.compiler.source', async () => {
      const pom = `<?xml version="1.0"?>
<project>
  <properties>
    <maven.compiler.source>21</maven.compiler.source>
  </properties>
</project>`;
      allowFiles(PROJECT, ['pom.xml']);
      setFileContents(PROJECT, { 'pom.xml': pom });
      const result = await parser.parse(PROJECT, ['pom.xml']);
      expect(result.javaVersion).toBe('21');
    });

    it('should detect checkstyle plugin from pom.xml', async () => {
      const pom = `<project>
  <build><plugins>
    <plugin><artifactId>maven-checkstyle-plugin</artifactId></plugin>
  </plugins></build>
</project>`;
      allowFiles(PROJECT, ['pom.xml']);
      setFileContents(PROJECT, { 'pom.xml': pom });
      const result = await parser.parse(PROJECT, ['pom.xml']);
      expect(result.checkstyle).toBeDefined();
      expect(result.checkstyle!.enabled).toBe(true);
    });

    it('should detect PMD plugin from pom.xml', async () => {
      const pom = `<project>
  <build><plugins>
    <plugin><artifactId>maven-pmd-plugin</artifactId></plugin>
  </plugins></build>
</project>`;
      allowFiles(PROJECT, ['pom.xml']);
      setFileContents(PROJECT, { 'pom.xml': pom });
      const result = await parser.parse(PROJECT, ['pom.xml']);
      expect(result.pmd).toBeDefined();
      expect(result.pmd!.enabled).toBe(true);
    });

    it('should detect SpotBugs plugin from pom.xml', async () => {
      const pom = `<project>
  <build><plugins>
    <plugin><artifactId>spotbugs-maven-plugin</artifactId></plugin>
  </plugins></build>
</project>`;
      allowFiles(PROJECT, ['pom.xml']);
      setFileContents(PROJECT, { 'pom.xml': pom });
      const result = await parser.parse(PROJECT, ['pom.xml']);
      expect(result.spotbugs).toBeDefined();
      expect(result.spotbugs!.enabled).toBe(true);
      expect(result.spotbugs!.effort).toBe('default');
      expect(result.spotbugs!.reportLevel).toBe('medium');
    });

    it('should add warning when pom.xml parsing fails', async () => {
      allowFiles(PROJECT, ['pom.xml']);
      mockReadFile.mockImplementation(() => Promise.reject(new Error('read error')));
      const result = await parser.parse(PROJECT, ['pom.xml']);
      expect(result.warnings.some((w) => w.includes('Failed to parse pom.xml'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // build.gradle parsing
  // -------------------------------------------------------------------------

  describe('parse - build.gradle', () => {
    it('should detect gradle as build tool', async () => {
      const gradle = `
plugins { id 'java' }
sourceCompatibility = '17'
`;
      allowFiles(PROJECT, ['build.gradle']);
      setFileContents(PROJECT, { 'build.gradle': gradle });
      const result = await parser.parse(PROJECT, ['build.gradle']);
      expect(result.buildTool).toBe('gradle');
      expect(result.javaVersion).toBe('17');
    });

    it('should detect java version from JavaVersion enum', async () => {
      const gradle = `
java {
    sourceCompatibility = JavaVersion.VERSION_21
}
`;
      allowFiles(PROJECT, ['build.gradle']);
      setFileContents(PROJECT, { 'build.gradle': gradle });
      const result = await parser.parse(PROJECT, ['build.gradle']);
      expect(result.javaVersion).toBe('21');
    });

    it('should prefer build.gradle.kts over build.gradle', async () => {
      const kts = `
sourceCompatibility = "17"
`;
      allowFiles(PROJECT, ['build.gradle.kts']);
      setFileContents(PROJECT, { 'build.gradle.kts': kts });
      const result = await parser.parse(PROJECT, ['build.gradle.kts']);
      expect(result.buildTool).toBe('gradle');
    });

    it('should detect checkstyle plugin in gradle', async () => {
      const gradle = `
plugins {
  id 'java'
  id 'checkstyle'
}
`;
      allowFiles(PROJECT, ['build.gradle']);
      setFileContents(PROJECT, { 'build.gradle': gradle });
      const result = await parser.parse(PROJECT, ['build.gradle']);
      expect(result.checkstyle).toBeDefined();
      expect(result.checkstyle!.enabled).toBe(true);
    });

    it('should detect PMD plugin in gradle', async () => {
      const gradle = `
plugins {
  id 'pmd'
}
`;
      allowFiles(PROJECT, ['build.gradle']);
      setFileContents(PROJECT, { 'build.gradle': gradle });
      const result = await parser.parse(PROJECT, ['build.gradle']);
      expect(result.pmd).toBeDefined();
      expect(result.pmd!.enabled).toBe(true);
    });

    it('should detect SpotBugs plugin in gradle', async () => {
      const gradle = `
plugins {
  id 'com.github.spotbugs'
}
`;
      allowFiles(PROJECT, ['build.gradle']);
      setFileContents(PROJECT, { 'build.gradle': gradle });
      const result = await parser.parse(PROJECT, ['build.gradle']);
      expect(result.spotbugs).toBeDefined();
      expect(result.spotbugs!.enabled).toBe(true);
    });

    it('should detect Kotlin from .kts extension', async () => {
      const kts = `plugins { id("java") }`;
      allowFiles(PROJECT, ['build.gradle.kts']);
      setFileContents(PROJECT, { 'build.gradle.kts': kts });
      const result = await parser.parse(PROJECT, ['build.gradle.kts']);
      expect(result.kotlin).toBeDefined();
      expect(result.kotlin!.enabled).toBe(true);
    });

    it('should detect Kotlin from kotlin keyword', async () => {
      const gradle = `
plugins {
  id 'kotlin'
}
`;
      allowFiles(PROJECT, ['build.gradle']);
      setFileContents(PROJECT, { 'build.gradle': gradle });
      const result = await parser.parse(PROJECT, ['build.gradle']);
      expect(result.kotlin).toBeDefined();
      expect(result.kotlin!.enabled).toBe(true);
    });

    it('should add warning when gradle build parsing fails', async () => {
      allowFiles(PROJECT, ['build.gradle']);
      mockReadFile.mockImplementation(() => Promise.reject(new Error('read error')));
      const result = await parser.parse(PROJECT, ['build.gradle']);
      expect(result.warnings.some((w) => w.includes('Failed to parse Gradle build file'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // checkstyle.xml parsing
  // -------------------------------------------------------------------------

  describe('parse - checkstyle.xml', () => {
    it('should detect Google style from content', async () => {
      const xml = `<?xml version="1.0"?>
<!DOCTYPE module PUBLIC "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN">
<module name="Checker">
  <!-- google_checks -->
  <module name="TreeWalker">
    <module name="LineLength">
      <property name="max" value="100"/>
    </module>
    <module name="Indentation">
      <property name="basicOffset" value="2"/>
    </module>
  </module>
</module>`;
      allowFiles(PROJECT, ['checkstyle.xml']);
      setFileContents(PROJECT, { 'checkstyle.xml': xml });
      const result = await parser.parse(PROJECT, ['checkstyle.xml']);
      expect(result.checkstyle).toBeDefined();
      expect(result.checkstyle!.configStyle).toBe('google');
      expect(result.checkstyle!.enabled).toBe(true);
    });

    it('should detect Sun style', async () => {
      const xml = `<module name="Checker"><!-- sun_checks --></module>`;
      allowFiles(PROJECT, ['checkstyle.xml']);
      setFileContents(PROJECT, { 'checkstyle.xml': xml });
      const result = await parser.parse(PROJECT, ['checkstyle.xml']);
      expect(result.checkstyle!.configStyle).toBe('sun');
    });

    it('should default to custom style', async () => {
      const xml = `<module name="Checker">
  <module name="TreeWalker">
    <module name="NeedBraces"/>
  </module>
</module>`;
      allowFiles(PROJECT, ['checkstyle.xml']);
      setFileContents(PROJECT, { 'checkstyle.xml': xml });
      const result = await parser.parse(PROJECT, ['checkstyle.xml']);
      expect(result.checkstyle!.configStyle).toBe('custom');
    });

    it('should parse modules and skip Checker/TreeWalker containers', async () => {
      const xml = `<module name="Checker">
  <module name="TreeWalker">
    <module name="NeedBraces"/>
    <module name="AvoidStarImport"/>
  </module>
</module>`;
      allowFiles(PROJECT, ['checkstyle.xml']);
      setFileContents(PROJECT, { 'checkstyle.xml': xml });
      const result = await parser.parse(PROJECT, ['checkstyle.xml']);
      const moduleNames = result.checkstyle!.rules.map((r) => r.module);
      expect(moduleNames).not.toContain('Checker');
      expect(moduleNames).not.toContain('TreeWalker');
      expect(moduleNames).toContain('NeedBraces');
      expect(moduleNames).toContain('AvoidStarImport');
    });

    it('should parse module properties', async () => {
      const xml = `<module name="Checker">
  <module name="LineLength">
    <property name="max" value="120"/>
    <property name="ignorePattern" value="^package.*"/>
  </module>
</module>`;
      allowFiles(PROJECT, ['checkstyle.xml']);
      setFileContents(PROJECT, { 'checkstyle.xml': xml });
      const result = await parser.parse(PROJECT, ['checkstyle.xml']);
      const lineLength = result.checkstyle!.rules.find((r) => r.module === 'LineLength');
      expect(lineLength).toBeDefined();
      expect(lineLength!.properties.max).toBe('120');
      expect(lineLength!.properties.ignorePattern).toBe('^package.*');
    });

    it('should update formatting maxLineLength from LineLength rule', async () => {
      const xml = `<module name="Checker">
  <module name="LineLength">
    <property name="max" value="150"/>
  </module>
</module>`;
      allowFiles(PROJECT, ['checkstyle.xml']);
      setFileContents(PROJECT, { 'checkstyle.xml': xml });
      const result = await parser.parse(PROJECT, ['checkstyle.xml']);
      expect(result.formatting.maxLineLength).toBe(150);
    });

    it('should update formatting indentSize from Indentation rule', async () => {
      const xml = `<module name="Checker">
  <module name="Indentation">
    <property name="basicOffset" value="2"/>
  </module>
</module>`;
      allowFiles(PROJECT, ['checkstyle.xml']);
      setFileContents(PROJECT, { 'checkstyle.xml': xml });
      const result = await parser.parse(PROJECT, ['checkstyle.xml']);
      expect(result.formatting.indentSize).toBe(2);
    });

    it('should parse suppressions', async () => {
      const xml = `<module name="Checker">
  <suppress files=".*Test\\.java" />
  <suppress files=".*Generated\\.java" />
</module>`;
      allowFiles(PROJECT, ['checkstyle.xml']);
      setFileContents(PROJECT, { 'checkstyle.xml': xml });
      const result = await parser.parse(PROJECT, ['checkstyle.xml']);
      expect(result.checkstyle!.suppressions).toEqual(['.*Test\\.java', '.*Generated\\.java']);
    });

    it('should support checkstyle/checkstyle.xml path', async () => {
      const xml = `<module name="Checker"><module name="NeedBraces"/></module>`;
      allowFiles(PROJECT, ['checkstyle/checkstyle.xml']);
      setFileContents(PROJECT, { 'checkstyle/checkstyle.xml': xml });
      const result = await parser.parse(PROJECT, ['checkstyle/checkstyle.xml']);
      expect(result.checkstyle).toBeDefined();
      expect(result.checkstyle!.enabled).toBe(true);
    });

    it('should add warning when checkstyle parsing fails', async () => {
      allowFiles(PROJECT, ['checkstyle.xml']);
      mockReadFile.mockImplementation(() => Promise.reject(new Error('read error')));
      const result = await parser.parse(PROJECT, ['checkstyle.xml']);
      expect(result.warnings.some((w) => w.includes('Failed to parse checkstyle.xml'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // pmd.xml parsing
  // -------------------------------------------------------------------------

  describe('parse - pmd.xml', () => {
    it('should parse ruleset references', async () => {
      const xml = `<?xml version="1.0"?>
<ruleset>
  <ruleset-ref ref="category/java/bestpractices.xml"/>
  <ruleset-ref ref="category/java/codestyle.xml"/>
</ruleset>`;
      allowFiles(PROJECT, ['pmd.xml']);
      setFileContents(PROJECT, { 'pmd.xml': xml });
      const result = await parser.parse(PROJECT, ['pmd.xml']);
      expect(result.pmd).toBeDefined();
      expect(result.pmd!.rulesets).toContain('category/java/bestpractices.xml');
      expect(result.pmd!.rulesets).toContain('category/java/codestyle.xml');
    });

    it('should parse individual rule references', async () => {
      const xml = `<ruleset>
  <rule ref="category/java/bestpractices.xml/UnusedImports"/>
</ruleset>`;
      allowFiles(PROJECT, ['pmd.xml']);
      setFileContents(PROJECT, { 'pmd.xml': xml });
      const result = await parser.parse(PROJECT, ['pmd.xml']);
      expect(result.pmd!.rulesets).toContain('UnusedImports');
    });

    it('should parse exclusions', async () => {
      const xml = `<ruleset>
  <exclude name="TooManyMethods"/>
  <exclude name="AvoidDuplicateLiterals"/>
</ruleset>`;
      allowFiles(PROJECT, ['pmd.xml']);
      setFileContents(PROJECT, { 'pmd.xml': xml });
      const result = await parser.parse(PROJECT, ['pmd.xml']);
      expect(result.pmd!.excludedRules).toEqual(['TooManyMethods', 'AvoidDuplicateLiterals']);
    });

    it('should parse minimumPriority', async () => {
      const xml = `<ruleset minimumPriority="3">
  <ruleset-ref ref="category/java/bestpractices.xml"/>
</ruleset>`;
      allowFiles(PROJECT, ['pmd.xml']);
      setFileContents(PROJECT, { 'pmd.xml': xml });
      const result = await parser.parse(PROJECT, ['pmd.xml']);
      expect(result.pmd!.minimumPriority).toBe(3);
    });

    it('should support pmd/pmd.xml path', async () => {
      const xml = `<ruleset><ruleset-ref ref="category/java/bestpractices.xml"/></ruleset>`;
      allowFiles(PROJECT, ['pmd/pmd.xml']);
      setFileContents(PROJECT, { 'pmd/pmd.xml': xml });
      const result = await parser.parse(PROJECT, ['pmd/pmd.xml']);
      expect(result.pmd).toBeDefined();
      expect(result.pmd!.enabled).toBe(true);
    });

    it('should add warning when pmd.xml parsing fails', async () => {
      allowFiles(PROJECT, ['pmd.xml']);
      mockReadFile.mockImplementation(() => Promise.reject(new Error('read error')));
      const result = await parser.parse(PROJECT, ['pmd.xml']);
      expect(result.warnings.some((w) => w.includes('Failed to parse pmd.xml'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // SpotBugs parsing
  // -------------------------------------------------------------------------

  describe('parse - spotbugs', () => {
    it('should parse spotbugs.xml', async () => {
      const xml = `<FindBugsFilter><Match/></FindBugsFilter>`;
      allowFiles(PROJECT, ['spotbugs.xml']);
      setFileContents(PROJECT, { 'spotbugs.xml': xml });
      const result = await parser.parse(PROJECT, ['spotbugs.xml']);
      expect(result.spotbugs).toBeDefined();
      expect(result.spotbugs!.enabled).toBe(true);
      expect(result.spotbugs!.effort).toBe('default');
      expect(result.spotbugs!.reportLevel).toBe('medium');
      expect(result.spotbugs!.excludeFilterFile).toBeUndefined();
    });

    it('should detect exclude filter file from spotbugs-exclude.xml', async () => {
      const xml = `<FindBugsFilter><Match/></FindBugsFilter>`;
      allowFiles(PROJECT, ['spotbugs-exclude.xml']);
      setFileContents(PROJECT, { 'spotbugs-exclude.xml': xml });
      const result = await parser.parse(PROJECT, ['spotbugs-exclude.xml']);
      expect(result.spotbugs!.excludeFilterFile).toBe('spotbugs-exclude.xml');
    });

    it('should prefer spotbugs.xml over spotbugs-exclude.xml', async () => {
      const xml = `<FindBugsFilter/>`;
      allowFiles(PROJECT, ['spotbugs.xml', 'spotbugs-exclude.xml']);
      setFileContents(PROJECT, { 'spotbugs.xml': xml, 'spotbugs-exclude.xml': xml });
      const result = await parser.parse(PROJECT, ['spotbugs.xml', 'spotbugs-exclude.xml']);
      expect(result.spotbugs!.excludeFilterFile).toBeUndefined();
    });

    it('should add warning when spotbugs parsing fails', async () => {
      allowFiles(PROJECT, ['spotbugs.xml']);
      mockReadFile.mockImplementation(() => Promise.reject(new Error('read error')));
      const result = await parser.parse(PROJECT, ['spotbugs.xml']);
      expect(result.warnings.some((w) => w.includes('Failed to parse SpotBugs config'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // .editorconfig parsing
  // -------------------------------------------------------------------------

  describe('parse - .editorconfig', () => {
    it('should parse indent_style and indent_size from *.java section', async () => {
      const content = `
[*]
indent_style = tabs
indent_size = 8

[*.java]
indent_style = spaces
indent_size = 2
`;
      allowFiles(PROJECT, ['.editorconfig']);
      setFileContents(PROJECT, { '.editorconfig': content });
      const result = await parser.parse(PROJECT, ['.editorconfig']);
      expect(result.formatting.indentation).toBe('spaces');
      expect(result.formatting.indentSize).toBe(2);
    });

    it('should fall back to [*] section when no *.java section exists', async () => {
      const content = `
[*]
indent_style = tabs
indent_size = 8
max_line_length = 80
`;
      allowFiles(PROJECT, ['.editorconfig']);
      setFileContents(PROJECT, { '.editorconfig': content });
      const result = await parser.parse(PROJECT, ['.editorconfig']);
      expect(result.formatting.indentation).toBe('tabs');
      expect(result.formatting.indentSize).toBe(8);
      expect(result.formatting.maxLineLength).toBe(80);
    });

    it('should parse max_line_length', async () => {
      const content = `
[*.java]
max_line_length = 200
`;
      allowFiles(PROJECT, ['.editorconfig']);
      setFileContents(PROJECT, { '.editorconfig': content });
      const result = await parser.parse(PROJECT, ['.editorconfig']);
      expect(result.formatting.maxLineLength).toBe(200);
    });

    it('should add warning when .editorconfig parsing fails', async () => {
      allowFiles(PROJECT, ['.editorconfig']);
      mockReadFile.mockImplementation(() => Promise.reject(new Error('read error')));
      const result = await parser.parse(PROJECT, ['.editorconfig']);
      expect(result.warnings.some((w) => w.includes('Failed to parse .editorconfig'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // detekt.yml parsing
  // -------------------------------------------------------------------------

  describe('parse - detekt.yml', () => {
    it('should detect active rule sets', async () => {
      const yml = `
complexity:
  active: true
style:
  active: true
naming:
  active: false
performance:
  active: true
`;
      allowFiles(PROJECT, ['detekt.yml']);
      setFileContents(PROJECT, { 'detekt.yml': yml });
      const result = await parser.parse(PROJECT, ['detekt.yml']);
      expect(result.kotlin).toBeDefined();
      expect(result.kotlin!.enabled).toBe(true);
      expect(result.kotlin!.detekt).toBeDefined();
      expect(result.kotlin!.detekt!.enabled).toBe(true);
      expect(result.kotlin!.detekt!.configFile).toBe('detekt.yml');
      expect(result.kotlin!.detekt!.rules).toContain('complexity');
      expect(result.kotlin!.detekt!.rules).toContain('style');
      expect(result.kotlin!.detekt!.rules).toContain('performance');
      expect(result.kotlin!.detekt!.rules).not.toContain('naming');
    });

    it('should include rule sets without explicit active flag (default true)', async () => {
      const yml = `
complexity:
  LongMethod:
    maxLines: 60
`;
      allowFiles(PROJECT, ['detekt.yml']);
      setFileContents(PROJECT, { 'detekt.yml': yml });
      const result = await parser.parse(PROJECT, ['detekt.yml']);
      expect(result.kotlin!.detekt!.rules).toContain('complexity');
    });

    it('should add warning when detekt.yml parsing fails', async () => {
      allowFiles(PROJECT, ['detekt.yml']);
      mockReadFile.mockImplementation(() => Promise.reject(new Error('read error')));
      const result = await parser.parse(PROJECT, ['detekt.yml']);
      expect(result.warnings.some((w) => w.includes('Failed to parse detekt.yml'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Combined configs
  // -------------------------------------------------------------------------

  describe('parse - combined configs', () => {
    it('should parse pom.xml + checkstyle.xml + .editorconfig together', async () => {
      const pom = `<project>
  <properties><java.version>21</java.version></properties>
  <build><plugins><plugin><artifactId>maven-checkstyle-plugin</artifactId></plugin></plugins></build>
</project>`;
      const checkstyle = `<module name="Checker">
  <module name="NeedBraces"/>
  <module name="LineLength"><property name="max" value="150"/></module>
</module>`;
      const editorconfig = `[*.java]
indent_style = spaces
indent_size = 2
`;
      allowFiles(PROJECT, ['pom.xml', 'checkstyle.xml', '.editorconfig']);
      setFileContents(PROJECT, {
        'pom.xml': pom,
        'checkstyle.xml': checkstyle,
        '.editorconfig': editorconfig,
      });
      const result = await parser.parse(PROJECT, ['pom.xml', 'checkstyle.xml', '.editorconfig']);
      expect(result.buildTool).toBe('maven');
      expect(result.javaVersion).toBe('21');
      expect(result.checkstyle!.enabled).toBe(true);
      // editorconfig overrides checkstyle indentation
      expect(result.formatting.indentSize).toBe(2);
      expect(result.formatting.indentation).toBe('spaces');
    });
  });
});

// ---------------------------------------------------------------------------
// parseJavaStandards convenience function
// ---------------------------------------------------------------------------

describe('parseJavaStandards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return JavaStandards via convenience function', async () => {
    mockStat.mockImplementation(() => Promise.reject(new Error('ENOENT')));
    mockReadFile.mockImplementation(() => Promise.reject(new Error('ENOENT')));
    const result = await parseJavaStandards('/test/project', []);
    expect(result.buildTool).toBe('unknown');
    expect(result.formatting.indentSize).toBe(4);
  });

  it('should accept custom logger option', async () => {
    const logger = makeLogger();
    mockStat.mockImplementation(() => Promise.reject(new Error('ENOENT')));
    mockReadFile.mockImplementation(() => Promise.reject(new Error('ENOENT')));
    const result = await parseJavaStandards('/test/project', [], { logger });
    expect(result).toBeDefined();
  });
});
