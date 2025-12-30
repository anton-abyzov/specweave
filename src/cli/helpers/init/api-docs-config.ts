/**
 * API Documentation configuration prompts
 * Handles OpenAPI and Postman collection settings for API projects
 *
 * @module api-docs-config
 * @since v1.0.58
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select, confirm, input } from '@inquirer/prompts';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { WIZARD_BACK, createGoBackChoice, type WizardResult } from './wizard-navigation.js';

/**
 * API Documentation configuration
 */
export interface ApiDocsConfig {
  /** Enable API documentation features */
  enabled: boolean;

  /** OpenAPI spec location */
  openApiPath: string;

  /** Auto-generate OpenAPI from code decorators */
  autoGenerateOpenApi: boolean;

  /** Generate Postman collection from OpenAPI */
  generatePostman: boolean;

  /** Postman collection output path */
  postmanPath: string;

  /** When to regenerate API docs */
  generateOn: 'on-increment-done' | 'on-api-change' | 'manual';

  /** API file patterns to watch */
  watchPatterns: string[];

  /** Base URL for the API */
  baseUrl: string;
}

/**
 * Detected API framework
 */
export interface DetectedApiFramework {
  name: string;
  openApiSupport: 'built-in' | 'plugin' | 'manual';
  setupInstructions: string;
}

/**
 * Get translated strings for API docs configuration
 */
function getApiDocsStrings(language: SupportedLanguage): {
  header: string;
  subheader: string;
  apiDetected: string;
  noApiDetected: string;
  enableApiDocs: string;
  skipApiDocs: string;
  selectTiming: string;
  timingIncrement: string;
  timingChange: string;
  timingManual: string;
  enterBaseUrl: string;
  generatePostman: string;
  configComplete: string;
  skipped: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getApiDocsStrings>> = {
    en: {
      header: '📡 API Documentation Configuration',
      subheader: 'Configure OpenAPI and Postman collection generation',
      apiDetected: '✅ Detected API framework:',
      noApiDetected: 'No API framework detected',
      enableApiDocs: 'Enable API documentation (OpenAPI + Postman)?',
      skipApiDocs: 'Skip - this project has no APIs',
      selectTiming: 'When should API docs be regenerated?',
      timingIncrement: 'On increment close (recommended)',
      timingChange: 'On API file changes (hook-based)',
      timingManual: 'Manual only (/sw:api-docs)',
      enterBaseUrl: 'Enter API base URL:',
      generatePostman: 'Generate Postman collection from OpenAPI?',
      configComplete: '✔ API Documentation configured',
      skipped: '✔ API Documentation skipped (no APIs)',
    },
    ru: {
      header: '📡 Конфигурация документации API',
      subheader: 'Настройка генерации OpenAPI и коллекции Postman',
      apiDetected: '✅ Обнаружен API фреймворк:',
      noApiDetected: 'API фреймворк не обнаружен',
      enableApiDocs: 'Включить документацию API (OpenAPI + Postman)?',
      skipApiDocs: 'Пропустить - в проекте нет API',
      selectTiming: 'Когда следует обновлять документацию API?',
      timingIncrement: 'При закрытии инкремента (рекомендуется)',
      timingChange: 'При изменении файлов API (через хуки)',
      timingManual: 'Только вручную (/sw:api-docs)',
      enterBaseUrl: 'Введите базовый URL API:',
      generatePostman: 'Генерировать коллекцию Postman из OpenAPI?',
      configComplete: '✔ Документация API настроена',
      skipped: '✔ Документация API пропущена (нет API)',
    },
    es: {
      header: '📡 Configuración de documentación API',
      subheader: 'Configure la generación de OpenAPI y colección Postman',
      apiDetected: '✅ Framework API detectado:',
      noApiDetected: 'No se detectó framework API',
      enableApiDocs: '¿Habilitar documentación API (OpenAPI + Postman)?',
      skipApiDocs: 'Omitir - este proyecto no tiene APIs',
      selectTiming: '¿Cuándo se debe regenerar la documentación API?',
      timingIncrement: 'Al cerrar incremento (recomendado)',
      timingChange: 'Al cambiar archivos API (basado en hooks)',
      timingManual: 'Solo manual (/sw:api-docs)',
      enterBaseUrl: 'Ingrese URL base de API:',
      generatePostman: '¿Generar colección Postman desde OpenAPI?',
      configComplete: '✔ Documentación API configurada',
      skipped: '✔ Documentación API omitida (sin APIs)',
    },
    zh: {
      header: '📡 API文档配置',
      subheader: '配置OpenAPI和Postman集合生成',
      apiDetected: '✅ 检测到API框架:',
      noApiDetected: '未检测到API框架',
      enableApiDocs: '启用API文档（OpenAPI + Postman）？',
      skipApiDocs: '跳过 - 此项目没有API',
      selectTiming: '何时应该重新生成API文档？',
      timingIncrement: '关闭增量时（推荐）',
      timingChange: 'API文件更改时（基于钩子）',
      timingManual: '仅手动（/sw:api-docs）',
      enterBaseUrl: '输入API基础URL:',
      generatePostman: '从OpenAPI生成Postman集合？',
      configComplete: '✔ API文档已配置',
      skipped: '✔ API文档已跳过（无API）',
    },
    de: {
      header: '📡 API-Dokumentation Konfiguration',
      subheader: 'Konfigurieren Sie die OpenAPI- und Postman-Collection-Generierung',
      apiDetected: '✅ API-Framework erkannt:',
      noApiDetected: 'Kein API-Framework erkannt',
      enableApiDocs: 'API-Dokumentation aktivieren (OpenAPI + Postman)?',
      skipApiDocs: 'Überspringen - dieses Projekt hat keine APIs',
      selectTiming: 'Wann soll die API-Dokumentation neu generiert werden?',
      timingIncrement: 'Beim Inkrement-Abschluss (empfohlen)',
      timingChange: 'Bei API-Dateiänderungen (hook-basiert)',
      timingManual: 'Nur manuell (/sw:api-docs)',
      enterBaseUrl: 'API-Basis-URL eingeben:',
      generatePostman: 'Postman-Collection aus OpenAPI generieren?',
      configComplete: '✔ API-Dokumentation konfiguriert',
      skipped: '✔ API-Dokumentation übersprungen (keine APIs)',
    },
    fr: {
      header: '📡 Configuration de la documentation API',
      subheader: 'Configurer la génération OpenAPI et collection Postman',
      apiDetected: '✅ Framework API détecté :',
      noApiDetected: 'Aucun framework API détecté',
      enableApiDocs: 'Activer la documentation API (OpenAPI + Postman) ?',
      skipApiDocs: 'Ignorer - ce projet n\'a pas d\'APIs',
      selectTiming: 'Quand la documentation API doit-elle être régénérée ?',
      timingIncrement: 'À la clôture de l\'incrément (recommandé)',
      timingChange: 'Lors des modifications de fichiers API (basé sur hooks)',
      timingManual: 'Manuel uniquement (/sw:api-docs)',
      enterBaseUrl: 'Entrez l\'URL de base de l\'API :',
      generatePostman: 'Générer la collection Postman depuis OpenAPI ?',
      configComplete: '✔ Documentation API configurée',
      skipped: '✔ Documentation API ignorée (pas d\'APIs)',
    },
    ja: {
      header: '📡 APIドキュメント設定',
      subheader: 'OpenAPIとPostmanコレクションの生成を設定',
      apiDetected: '✅ 検出されたAPIフレームワーク:',
      noApiDetected: 'APIフレームワークが検出されませんでした',
      enableApiDocs: 'APIドキュメントを有効化（OpenAPI + Postman）？',
      skipApiDocs: 'スキップ - このプロジェクトにはAPIがありません',
      selectTiming: 'APIドキュメントをいつ再生成しますか？',
      timingIncrement: 'インクリメント完了時（推奨）',
      timingChange: 'APIファイル変更時（フックベース）',
      timingManual: '手動のみ（/sw:api-docs）',
      enterBaseUrl: 'APIベースURLを入力:',
      generatePostman: 'OpenAPIからPostmanコレクションを生成？',
      configComplete: '✔ APIドキュメント設定完了',
      skipped: '✔ APIドキュメントスキップ（APIなし）',
    },
    ko: {
      header: '📡 API 문서 구성',
      subheader: 'OpenAPI 및 Postman 컬렉션 생성 구성',
      apiDetected: '✅ 감지된 API 프레임워크:',
      noApiDetected: 'API 프레임워크를 감지하지 못했습니다',
      enableApiDocs: 'API 문서 활성화 (OpenAPI + Postman)?',
      skipApiDocs: '건너뛰기 - 이 프로젝트에는 API가 없습니다',
      selectTiming: 'API 문서를 언제 재생성해야 합니까?',
      timingIncrement: '증분 완료 시 (권장)',
      timingChange: 'API 파일 변경 시 (훅 기반)',
      timingManual: '수동만 (/sw:api-docs)',
      enterBaseUrl: 'API 기본 URL 입력:',
      generatePostman: 'OpenAPI에서 Postman 컬렉션 생성?',
      configComplete: '✔ API 문서 구성 완료',
      skipped: '✔ API 문서 건너뜀 (API 없음)',
    },
    pt: {
      header: '📡 Configuração de Documentação API',
      subheader: 'Configure a geração de OpenAPI e coleção Postman',
      apiDetected: '✅ Framework API detectado:',
      noApiDetected: 'Nenhum framework API detectado',
      enableApiDocs: 'Habilitar documentação API (OpenAPI + Postman)?',
      skipApiDocs: 'Pular - este projeto não tem APIs',
      selectTiming: 'Quando a documentação API deve ser regenerada?',
      timingIncrement: 'Ao fechar incremento (recomendado)',
      timingChange: 'Ao alterar arquivos API (baseado em hooks)',
      timingManual: 'Apenas manual (/sw:api-docs)',
      enterBaseUrl: 'Digite URL base da API:',
      generatePostman: 'Gerar coleção Postman do OpenAPI?',
      configComplete: '✔ Documentação API configurada',
      skipped: '✔ Documentação API pulada (sem APIs)',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Detect API framework from project files
 */
export function detectApiFramework(targetDir: string): DetectedApiFramework | null {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const requirementsTxtPath = path.join(targetDir, 'requirements.txt');
  const pyprojectPath = path.join(targetDir, 'pyproject.toml');
  const goModPath = path.join(targetDir, 'go.mod');
  const pomXmlPath = path.join(targetDir, 'pom.xml');
  const buildGradlePath = path.join(targetDir, 'build.gradle');

  // Check package.json for JS/TS frameworks
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = fs.readJsonSync(packageJsonPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['@nestjs/core'] || deps['@nestjs/common']) {
        return {
          name: 'NestJS',
          openApiSupport: 'plugin',
          setupInstructions: 'npm install @nestjs/swagger swagger-ui-express',
        };
      }
      if (deps['express']) {
        return {
          name: 'Express',
          openApiSupport: 'plugin',
          setupInstructions: 'npm install swagger-jsdoc swagger-ui-express',
        };
      }
      if (deps['fastify']) {
        return {
          name: 'Fastify',
          openApiSupport: 'plugin',
          setupInstructions: 'npm install @fastify/swagger @fastify/swagger-ui',
        };
      }
      if (deps['hono']) {
        return {
          name: 'Hono',
          openApiSupport: 'plugin',
          setupInstructions: 'npm install @hono/zod-openapi',
        };
      }
      if (deps['next']) {
        // Next.js API routes
        return {
          name: 'Next.js API Routes',
          openApiSupport: 'manual',
          setupInstructions: 'npm install next-swagger-doc swagger-ui-react',
        };
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Check Python frameworks
  if (fs.existsSync(requirementsTxtPath) || fs.existsSync(pyprojectPath)) {
    try {
      let content = '';
      if (fs.existsSync(requirementsTxtPath)) {
        content = fs.readFileSync(requirementsTxtPath, 'utf-8');
      } else if (fs.existsSync(pyprojectPath)) {
        content = fs.readFileSync(pyprojectPath, 'utf-8');
      }

      if (content.includes('fastapi')) {
        return {
          name: 'FastAPI',
          openApiSupport: 'built-in',
          setupInstructions: 'Built-in: Access at /openapi.json',
        };
      }
      if (content.includes('django')) {
        return {
          name: 'Django REST Framework',
          openApiSupport: 'plugin',
          setupInstructions: 'pip install drf-spectacular',
        };
      }
      if (content.includes('flask')) {
        return {
          name: 'Flask',
          openApiSupport: 'plugin',
          setupInstructions: 'pip install flask-openapi3',
        };
      }
    } catch {
      // Ignore read errors
    }
  }

  // Check Go frameworks
  if (fs.existsSync(goModPath)) {
    try {
      const content = fs.readFileSync(goModPath, 'utf-8');
      if (content.includes('gin-gonic/gin')) {
        return {
          name: 'Gin',
          openApiSupport: 'plugin',
          setupInstructions: 'go install github.com/swaggo/swag/cmd/swag@latest',
        };
      }
      if (content.includes('labstack/echo')) {
        return {
          name: 'Echo',
          openApiSupport: 'plugin',
          setupInstructions: 'go install github.com/swaggo/swag/cmd/swag@latest',
        };
      }
    } catch {
      // Ignore read errors
    }
  }

  // Check Java/Kotlin frameworks
  if (fs.existsSync(pomXmlPath) || fs.existsSync(buildGradlePath)) {
    try {
      let content = '';
      if (fs.existsSync(pomXmlPath)) {
        content = fs.readFileSync(pomXmlPath, 'utf-8');
      } else {
        content = fs.readFileSync(buildGradlePath, 'utf-8');
      }

      if (content.includes('spring-boot') || content.includes('springframework')) {
        return {
          name: 'Spring Boot',
          openApiSupport: 'plugin',
          setupInstructions: 'Add springdoc-openapi-starter-webmvc-ui dependency',
        };
      }
    } catch {
      // Ignore read errors
    }
  }

  return null;
}

/**
 * Result of API docs configuration
 */
export interface ApiDocsConfigResult {
  config: ApiDocsConfig | null;
  /** Signal to go back to previous step */
  goBack?: typeof WIZARD_BACK;
}

/**
 * Prompt user for API documentation configuration
 *
 * @param targetDir - Project directory
 * @param language - Language for translations
 * @returns API docs configuration or null if skipped
 */
export async function promptApiDocsConfig(
  targetDir: string,
  language: SupportedLanguage = 'en'
): Promise<ApiDocsConfigResult> {
  const strings = getApiDocsStrings(language);
  const detectedFramework = detectApiFramework(targetDir);

  console.log('');
  console.log(chalk.cyan.bold(strings.header));
  console.log(chalk.gray('   ' + strings.subheader));
  console.log('');

  // Show detected framework
  if (detectedFramework) {
    console.log(chalk.green(`   ${strings.apiDetected} ${detectedFramework.name}`));
    console.log(chalk.gray(`   Setup: ${detectedFramework.setupInstructions}`));
    console.log('');
  } else {
    console.log(chalk.gray(`   ${strings.noApiDetected}`));
    console.log('');
  }

  // Ask if user wants to enable API docs
  const enableChoice = await select<'enable' | 'skip' | 'back'>({
    message: strings.enableApiDocs,
    choices: [
      {
        name: detectedFramework
          ? `✅ Yes - Configure for ${detectedFramework.name}`
          : '✅ Yes - Enable API documentation',
        value: 'enable',
      },
      {
        name: strings.skipApiDocs,
        value: 'skip',
      },
      createGoBackChoice(language) as { name: string; value: 'enable' | 'skip' | 'back' },
    ],
    default: detectedFramework ? 'enable' : 'skip',
  });

  if (enableChoice === 'back') {
    return { config: null, goBack: WIZARD_BACK };
  }

  if (enableChoice === 'skip') {
    console.log('');
    console.log(chalk.gray(`   ${strings.skipped}`));
    console.log('');
    return { config: null };
  }

  // Ask for timing
  const generateOn = await select<'on-increment-done' | 'on-api-change' | 'manual'>({
    message: strings.selectTiming,
    choices: [
      {
        name: strings.timingIncrement,
        value: 'on-increment-done',
      },
      {
        name: strings.timingChange,
        value: 'on-api-change',
      },
      {
        name: strings.timingManual,
        value: 'manual',
      },
    ],
    default: 'on-increment-done',
  });

  // Ask for base URL
  const baseUrl = await input({
    message: strings.enterBaseUrl,
    default: 'http://localhost:3000',
  });

  // Ask if Postman should be generated
  const generatePostman = await confirm({
    message: strings.generatePostman,
    default: true,
  });

  const config: ApiDocsConfig = {
    enabled: true,
    openApiPath: 'openapi.yaml',
    autoGenerateOpenApi: detectedFramework?.openApiSupport === 'built-in',
    generatePostman,
    postmanPath: 'postman-collection.json',
    generateOn,
    watchPatterns: [
      '**/routes/**',
      '**/controllers/**',
      '**/api/**',
      '**/endpoints/**',
    ],
    baseUrl,
  };

  console.log('');
  console.log(chalk.green(`   ${strings.configComplete}`));
  console.log(chalk.gray(`   OpenAPI: ${config.openApiPath}`));
  if (generatePostman) {
    console.log(chalk.gray(`   Postman: ${config.postmanPath}`));
  }
  console.log(chalk.gray(`   Generate: ${config.generateOn}`));
  console.log('');

  return { config };
}

/**
 * Update config.json with API docs configuration
 *
 * @param targetDir - Project directory
 * @param config - API docs configuration
 * @param language - Language for translations
 */
export function updateConfigWithApiDocs(
  targetDir: string,
  config: ApiDocsConfig,
  language: SupportedLanguage = 'en'
): void {
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('⚠️  config.json not found, cannot update API docs configuration'));
    return;
  }

  const existingConfig = fs.readJsonSync(configPath);
  existingConfig.apiDocs = config;
  fs.writeJsonSync(configPath, existingConfig, { spaces: 2 });
}
