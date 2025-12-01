/**
 * Repository hosting setup
 * Handles git provider detection and configuration
 */

import chalk from 'chalk';
import { select, input, checkbox, password } from '@inquirer/prompts';
import ora from 'ora';
import type { RepositoryHosting, GitHubRemote } from './types.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { parsePatternShortcut, validateRegex } from '../selection-strategy.js';
import { getAzureDevOpsAuth } from '../../../utils/auth-helpers.js';
import { parseEnvFile, readEnvFile } from '../../../utils/env-file.js';

/**
 * Options for repository setup
 */
export interface RepositorySetupOptions {
  targetDir: string;
  isCI: boolean;
  gitHubRemote: GitHubRemote | null;
  language?: SupportedLanguage;
}

/**
 * ADO clone pattern selection strategy
 */
export type AdoCloneStrategy = 'all' | 'pattern-glob' | 'pattern-regex' | 'skip';

/**
 * ADO clone pattern result
 */
export interface AdoClonePatternResult {
  strategy: AdoCloneStrategy;
  pattern?: string;
  isRegex?: boolean;
}

/**
 * Get translated strings for repository setup
 */
function getRepoStrings(language: SupportedLanguage): {
  header: string;
  ciAutoDetected: string;
  structureQuestion: string;
  structureSingle: string;
  structureMultiple: string;
  providerQuestion: string;
  github: string;
  githubDetected: string;
  githubRecommended: string;
  bitbucket: string;
  ado: string;
  local: string;
  other: string;
  adoCloneQuestion: string;
  adoCloneSkip: string;
  // New unified selection strings
  adoSelectStrategy: string;
  adoAllRepos: string;
  adoAllReposDesc: string;
  adoPatternGlob: string;
  adoPatternGlobDesc: string;
  adoPatternRegex: string;
  adoPatternRegexDesc: string;
  adoSkipOption: string;
  adoSkipDesc: string;
  adoPatternPrompt: string;
  adoPatternHint: string;
  adoRegexPrompt: string;
  adoRegexHint: string;
  adoShortcutsHint: string;
  adoPatternRequired: string;
  adoInvalidRegex: string;
  adoSelectedAll: string;
  adoSelectedPattern: string;
  adoSelectedRegex: string;
  // ADO project selection strings
  adoOrgPrompt: string;
  adoPatPrompt: string;
  adoProjectPrompt: string;
  adoProjectsSelected: string;
  adoFetchingProjects: string;
  adoNoProjects: string;
  adoConnectionFailed: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getRepoStrings>> = {
    en: {
      header: '📦 Repository Hosting',
      ciAutoDetected: 'CI mode: Auto-detected',
      structureQuestion: 'What is your repository structure?',
      structureSingle: 'single   - One repository (monorepo or standard project)',
      structureMultiple: 'multiple - Multiple repos (microservices, EDA, parent/child)',
      providerQuestion: 'Which Git provider do you use?',
      github: 'GitHub',
      githubDetected: '(detected)',
      githubRecommended: '(recommended)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Local (no remote)',
      other: 'Other (GitLab, etc - coming soon)',
      adoCloneQuestion: 'Enter repo name pattern to clone (e.g., sw-* or leave empty to skip):',
      adoCloneSkip: 'Skipping repo cloning - you can configure later',
      // New unified selection strings
      adoSelectStrategy: 'How do you want to select repositories to clone?',
      adoAllRepos: 'All',
      adoAllReposDesc: 'Clone all repositories from the project',
      adoPatternGlob: 'Pattern (glob)',
      adoPatternGlobDesc: 'Match by pattern (e.g., "sw-*", "*-backend")',
      adoPatternRegex: 'Pattern (regex)',
      adoPatternRegexDesc: 'Regular expression (e.g., "^sw-.*$")',
      adoSkipOption: 'Skip',
      adoSkipDesc: 'Configure later',
      adoPatternPrompt: 'Enter pattern',
      adoPatternHint: 'Examples: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Enter regex pattern',
      adoRegexHint: 'Examples: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Shortcuts: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Pattern is required',
      adoInvalidRegex: 'Invalid regular expression',
      adoSelectedAll: 'All repositories will be cloned',
      adoSelectedPattern: 'Repositories matching pattern "{pattern}" will be cloned',
      adoSelectedRegex: 'Repositories matching regex "{pattern}" will be cloned',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps organization name:',
      adoPatPrompt: 'Personal Access Token (PAT):',
      adoProjectPrompt: 'Select project(s) to clone repositories from:',
      adoProjectsSelected: '{count} project(s) selected',
      adoFetchingProjects: 'Fetching projects...',
      adoNoProjects: 'No projects found in this organization',
      adoConnectionFailed: 'Failed to connect to Azure DevOps',
    },
    ru: {
      header: '📦 Хостинг репозитория',
      ciAutoDetected: 'CI режим: Автоопределено',
      structureQuestion: 'Какова структура вашего репозитория?',
      structureSingle: 'single   - Один репозиторий (монорепо или стандартный проект)',
      structureMultiple: 'multiple - Несколько репо (микросервисы, EDA, родитель/потомок)',
      providerQuestion: 'Какой Git-провайдер вы используете?',
      github: 'GitHub',
      githubDetected: '(обнаружен)',
      githubRecommended: '(рекомендуется)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Локально (без remote)',
      other: 'Другой (GitLab и т.д. - скоро)',
      adoCloneQuestion: 'Введите шаблон имени репо для клонирования (напр., sw-* или оставьте пустым):',
      adoCloneSkip: 'Пропуск клонирования - можно настроить позже',
      // New unified selection strings
      adoSelectStrategy: 'Как вы хотите выбрать репозитории для клонирования?',
      adoAllRepos: 'Все',
      adoAllReposDesc: 'Клонировать все репозитории из проекта',
      adoPatternGlob: 'Шаблон (glob)',
      adoPatternGlobDesc: 'Сопоставление по шаблону (напр., "sw-*", "*-backend")',
      adoPatternRegex: 'Шаблон (regex)',
      adoPatternRegexDesc: 'Регулярное выражение (напр., "^sw-.*$")',
      adoSkipOption: 'Пропустить',
      adoSkipDesc: 'Настроить позже',
      adoPatternPrompt: 'Введите шаблон',
      adoPatternHint: 'Примеры: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Введите регулярное выражение',
      adoRegexHint: 'Примеры: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Сокращения: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Шаблон обязателен',
      adoInvalidRegex: 'Неверное регулярное выражение',
      adoSelectedAll: 'Все репозитории будут клонированы',
      adoSelectedPattern: 'Репозитории, соответствующие шаблону "{pattern}", будут клонированы',
      adoSelectedRegex: 'Репозитории, соответствующие regex "{pattern}", будут клонированы',
      // ADO project selection strings
      adoOrgPrompt: 'Название организации Azure DevOps:',
      adoPatPrompt: 'Персональный токен доступа (PAT):',
      adoProjectPrompt: 'Выберите проект(ы) для клонирования репозиториев:',
      adoProjectsSelected: 'Выбрано проектов: {count}',
      adoFetchingProjects: 'Загрузка проектов...',
      adoNoProjects: 'Проекты не найдены в этой организации',
      adoConnectionFailed: 'Не удалось подключиться к Azure DevOps',
    },
    es: {
      header: '📦 Alojamiento del repositorio',
      ciAutoDetected: 'Modo CI: Detectado automáticamente',
      structureQuestion: '¿Cuál es la estructura de su repositorio?',
      structureSingle: 'single   - Un repositorio (monorepo o proyecto estándar)',
      structureMultiple: 'multiple - Múltiples repos (microservicios, EDA, padre/hijo)',
      providerQuestion: '¿Qué proveedor de Git usa?',
      github: 'GitHub',
      githubDetected: '(detectado)',
      githubRecommended: '(recomendado)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Local (sin remoto)',
      other: 'Otro (GitLab, etc - próximamente)',
      adoCloneQuestion: 'Ingrese patrón de nombre de repo a clonar (ej., sw-* o deje vacío):',
      adoCloneSkip: 'Omitiendo clonación - puede configurar después',
      // New unified selection strings
      adoSelectStrategy: '¿Cómo quiere seleccionar repositorios para clonar?',
      adoAllRepos: 'Todos',
      adoAllReposDesc: 'Clonar todos los repositorios del proyecto',
      adoPatternGlob: 'Patrón (glob)',
      adoPatternGlobDesc: 'Coincidir por patrón (ej., "sw-*", "*-backend")',
      adoPatternRegex: 'Patrón (regex)',
      adoPatternRegexDesc: 'Expresión regular (ej., "^sw-.*$")',
      adoSkipOption: 'Omitir',
      adoSkipDesc: 'Configurar después',
      adoPatternPrompt: 'Ingrese patrón',
      adoPatternHint: 'Ejemplos: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Ingrese expresión regular',
      adoRegexHint: 'Ejemplos: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Atajos: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'El patrón es requerido',
      adoInvalidRegex: 'Expresión regular inválida',
      adoSelectedAll: 'Todos los repositorios serán clonados',
      adoSelectedPattern: 'Repositorios que coincidan con "{pattern}" serán clonados',
      adoSelectedRegex: 'Repositorios que coincidan con regex "{pattern}" serán clonados',
      // ADO project selection strings
      adoOrgPrompt: 'Nombre de la organización Azure DevOps:',
      adoPatPrompt: 'Token de Acceso Personal (PAT):',
      adoProjectPrompt: 'Seleccione proyecto(s) para clonar repositorios:',
      adoProjectsSelected: '{count} proyecto(s) seleccionado(s)',
      adoFetchingProjects: 'Obteniendo proyectos...',
      adoNoProjects: 'No se encontraron proyectos en esta organización',
      adoConnectionFailed: 'Error al conectar con Azure DevOps',
    },
    zh: {
      header: '📦 仓库托管',
      ciAutoDetected: 'CI 模式：自动检测',
      structureQuestion: '您的仓库结构是什么？',
      structureSingle: 'single   - 单个仓库（单体仓库或标准项目）',
      structureMultiple: 'multiple - 多个仓库（微服务、EDA、父/子）',
      providerQuestion: '您使用哪个 Git 提供商？',
      github: 'GitHub',
      githubDetected: '（已检测）',
      githubRecommended: '（推荐）',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: '本地（无远程）',
      other: '其他（GitLab 等 - 即将推出）',
      adoCloneQuestion: '输入要克隆的仓库名称模式（例如 sw-* 或留空跳过）：',
      adoCloneSkip: '跳过克隆 - 稍后可以配置',
      // New unified selection strings
      adoSelectStrategy: '您想如何选择要克隆的仓库？',
      adoAllRepos: '全部',
      adoAllReposDesc: '克隆项目中的所有仓库',
      adoPatternGlob: '模式 (glob)',
      adoPatternGlobDesc: '按模式匹配（例如 "sw-*"、"*-backend"）',
      adoPatternRegex: '模式 (正则)',
      adoPatternRegexDesc: '正则表达式（例如 "^sw-.*$"）',
      adoSkipOption: '跳过',
      adoSkipDesc: '稍后配置',
      adoPatternPrompt: '输入模式',
      adoPatternHint: '示例："sw-*"、"*-backend"、"api-*-service"',
      adoRegexPrompt: '输入正则表达式',
      adoRegexHint: '示例："^sw-"、".*-backend$"、"^api-\\d+-service$"',
      adoShortcutsHint: '快捷方式："starts: sw-"、"ends: -api"、"contains: core"',
      adoPatternRequired: '模式是必需的',
      adoInvalidRegex: '无效的正则表达式',
      adoSelectedAll: '将克隆所有仓库',
      adoSelectedPattern: '匹配模式 "{pattern}" 的仓库将被克隆',
      adoSelectedRegex: '匹配正则 "{pattern}" 的仓库将被克隆',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps 组织名称：',
      adoPatPrompt: '个人访问令牌 (PAT)：',
      adoProjectPrompt: '选择要克隆仓库的项目：',
      adoProjectsSelected: '已选择 {count} 个项目',
      adoFetchingProjects: '正在获取项目...',
      adoNoProjects: '在此组织中未找到项目',
      adoConnectionFailed: '无法连接到 Azure DevOps',
    },
    de: {
      header: '📦 Repository-Hosting',
      ciAutoDetected: 'CI-Modus: Automatisch erkannt',
      structureQuestion: 'Wie ist Ihre Repository-Struktur?',
      structureSingle: 'single   - Ein Repository (Monorepo oder Standardprojekt)',
      structureMultiple: 'multiple - Mehrere Repos (Microservices, EDA, Parent/Child)',
      providerQuestion: 'Welchen Git-Anbieter verwenden Sie?',
      github: 'GitHub',
      githubDetected: '(erkannt)',
      githubRecommended: '(empfohlen)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Lokal (kein Remote)',
      other: 'Andere (GitLab, etc - kommt bald)',
      adoCloneQuestion: 'Repo-Namensmuster zum Klonen eingeben (z.B. sw-* oder leer lassen):',
      adoCloneSkip: 'Klonen übersprungen - später konfigurierbar',
      // New unified selection strings
      adoSelectStrategy: 'Wie möchten Sie Repositories zum Klonen auswählen?',
      adoAllRepos: 'Alle',
      adoAllReposDesc: 'Alle Repositories aus dem Projekt klonen',
      adoPatternGlob: 'Muster (glob)',
      adoPatternGlobDesc: 'Nach Muster filtern (z.B. "sw-*", "*-backend")',
      adoPatternRegex: 'Muster (regex)',
      adoPatternRegexDesc: 'Regulärer Ausdruck (z.B. "^sw-.*$")',
      adoSkipOption: 'Überspringen',
      adoSkipDesc: 'Später konfigurieren',
      adoPatternPrompt: 'Muster eingeben',
      adoPatternHint: 'Beispiele: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Regex eingeben',
      adoRegexHint: 'Beispiele: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Abkürzungen: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Muster ist erforderlich',
      adoInvalidRegex: 'Ungültiger regulärer Ausdruck',
      adoSelectedAll: 'Alle Repositories werden geklont',
      adoSelectedPattern: 'Repositories mit Muster "{pattern}" werden geklont',
      adoSelectedRegex: 'Repositories mit Regex "{pattern}" werden geklont',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps Organisationsname:',
      adoPatPrompt: 'Personal Access Token (PAT):',
      adoProjectPrompt: 'Projekt(e) zum Klonen von Repositories auswählen:',
      adoProjectsSelected: '{count} Projekt(e) ausgewählt',
      adoFetchingProjects: 'Projekte werden abgerufen...',
      adoNoProjects: 'Keine Projekte in dieser Organisation gefunden',
      adoConnectionFailed: 'Verbindung zu Azure DevOps fehlgeschlagen',
    },
    fr: {
      header: '📦 Hébergement du dépôt',
      ciAutoDetected: 'Mode CI: Détecté automatiquement',
      structureQuestion: 'Quelle est la structure de votre dépôt?',
      structureSingle: 'single   - Un dépôt (monorepo ou projet standard)',
      structureMultiple: 'multiple - Plusieurs dépôts (microservices, EDA, parent/enfant)',
      providerQuestion: 'Quel fournisseur Git utilisez-vous?',
      github: 'GitHub',
      githubDetected: '(détecté)',
      githubRecommended: '(recommandé)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Local (pas de remote)',
      other: 'Autre (GitLab, etc - bientôt)',
      adoCloneQuestion: 'Entrez le modèle de nom de repo à cloner (ex. sw-* ou laissez vide):',
      adoCloneSkip: 'Clonage ignoré - configurable plus tard',
      // New unified selection strings
      adoSelectStrategy: 'Comment voulez-vous sélectionner les repos à cloner?',
      adoAllRepos: 'Tous',
      adoAllReposDesc: 'Cloner tous les repos du projet',
      adoPatternGlob: 'Modèle (glob)',
      adoPatternGlobDesc: 'Correspondance par modèle (ex., "sw-*", "*-backend")',
      adoPatternRegex: 'Modèle (regex)',
      adoPatternRegexDesc: 'Expression régulière (ex., "^sw-.*$")',
      adoSkipOption: 'Ignorer',
      adoSkipDesc: 'Configurer plus tard',
      adoPatternPrompt: 'Entrez le modèle',
      adoPatternHint: 'Exemples: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Entrez le regex',
      adoRegexHint: 'Exemples: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Raccourcis: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Le modèle est requis',
      adoInvalidRegex: 'Expression régulière invalide',
      adoSelectedAll: 'Tous les repos seront clonés',
      adoSelectedPattern: 'Les repos correspondant à "{pattern}" seront clonés',
      adoSelectedRegex: 'Les repos correspondant au regex "{pattern}" seront clonés',
      // ADO project selection strings
      adoOrgPrompt: 'Nom de l\'organisation Azure DevOps:',
      adoPatPrompt: 'Jeton d\'accès personnel (PAT):',
      adoProjectPrompt: 'Sélectionnez le(s) projet(s) pour cloner les repos:',
      adoProjectsSelected: '{count} projet(s) sélectionné(s)',
      adoFetchingProjects: 'Récupération des projets...',
      adoNoProjects: 'Aucun projet trouvé dans cette organisation',
      adoConnectionFailed: 'Échec de connexion à Azure DevOps',
    },
    ja: {
      header: '📦 リポジトリホスティング',
      ciAutoDetected: 'CIモード：自動検出',
      structureQuestion: 'リポジトリの構造は？',
      structureSingle: 'single   - 1つのリポジトリ（モノレポまたは標準プロジェクト）',
      structureMultiple: 'multiple - 複数のリポジトリ（マイクロサービス、EDA、親/子）',
      providerQuestion: 'どのGitプロバイダーを使用していますか？',
      github: 'GitHub',
      githubDetected: '（検出済み）',
      githubRecommended: '（推奨）',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'ローカル（リモートなし）',
      other: 'その他（GitLabなど - 近日公開）',
      adoCloneQuestion: 'クローンするリポ名パターンを入力（例: sw-* または空白でスキップ）:',
      adoCloneSkip: 'クローンをスキップ - 後で設定可能',
      // New unified selection strings
      adoSelectStrategy: 'クローンするリポジトリをどのように選択しますか？',
      adoAllRepos: 'すべて',
      adoAllReposDesc: 'プロジェクトのすべてのリポジトリをクローン',
      adoPatternGlob: 'パターン (glob)',
      adoPatternGlobDesc: 'パターンでマッチ（例: "sw-*", "*-backend"）',
      adoPatternRegex: 'パターン (正規表現)',
      adoPatternRegexDesc: '正規表現（例: "^sw-.*$"）',
      adoSkipOption: 'スキップ',
      adoSkipDesc: '後で設定',
      adoPatternPrompt: 'パターンを入力',
      adoPatternHint: '例: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: '正規表現を入力',
      adoRegexHint: '例: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'ショートカット: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'パターンは必須です',
      adoInvalidRegex: '無効な正規表現',
      adoSelectedAll: 'すべてのリポジトリがクローンされます',
      adoSelectedPattern: '"{pattern}" に一致するリポジトリがクローンされます',
      adoSelectedRegex: '正規表現 "{pattern}" に一致するリポジトリがクローンされます',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps 組織名:',
      adoPatPrompt: '個人アクセストークン (PAT):',
      adoProjectPrompt: 'リポジトリをクローンするプロジェクトを選択:',
      adoProjectsSelected: '{count} 個のプロジェクトを選択',
      adoFetchingProjects: 'プロジェクトを取得中...',
      adoNoProjects: 'この組織にプロジェクトが見つかりません',
      adoConnectionFailed: 'Azure DevOps への接続に失敗しました',
    },
    ko: {
      header: '📦 저장소 호스팅',
      ciAutoDetected: 'CI 모드: 자동 감지됨',
      structureQuestion: '저장소 구조는 무엇입니까?',
      structureSingle: 'single   - 하나의 저장소 (모노레포 또는 표준 프로젝트)',
      structureMultiple: 'multiple - 여러 저장소 (마이크로서비스, EDA, 부모/자식)',
      providerQuestion: '어떤 Git 제공자를 사용하시나요?',
      github: 'GitHub',
      githubDetected: '(감지됨)',
      githubRecommended: '(권장)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: '로컬 (원격 없음)',
      other: '기타 (GitLab 등 - 곧 출시)',
      adoCloneQuestion: '복제할 저장소 이름 패턴 입력 (예: sw-* 또는 비워두기):',
      adoCloneSkip: '복제 건너뜀 - 나중에 설정 가능',
      // New unified selection strings
      adoSelectStrategy: '복제할 저장소를 어떻게 선택하시겠습니까?',
      adoAllRepos: '모두',
      adoAllReposDesc: '프로젝트의 모든 저장소 복제',
      adoPatternGlob: '패턴 (glob)',
      adoPatternGlobDesc: '패턴으로 매칭 (예: "sw-*", "*-backend")',
      adoPatternRegex: '패턴 (정규식)',
      adoPatternRegexDesc: '정규 표현식 (예: "^sw-.*$")',
      adoSkipOption: '건너뛰기',
      adoSkipDesc: '나중에 설정',
      adoPatternPrompt: '패턴 입력',
      adoPatternHint: '예: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: '정규식 입력',
      adoRegexHint: '예: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: '단축키: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: '패턴이 필요합니다',
      adoInvalidRegex: '잘못된 정규 표현식',
      adoSelectedAll: '모든 저장소가 복제됩니다',
      adoSelectedPattern: '"{pattern}" 패턴과 일치하는 저장소가 복제됩니다',
      adoSelectedRegex: '정규식 "{pattern}"과 일치하는 저장소가 복제됩니다',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps 조직 이름:',
      adoPatPrompt: '개인용 액세스 토큰 (PAT):',
      adoProjectPrompt: '저장소를 복제할 프로젝트 선택:',
      adoProjectsSelected: '{count}개 프로젝트 선택됨',
      adoFetchingProjects: '프로젝트 가져오는 중...',
      adoNoProjects: '이 조직에서 프로젝트를 찾을 수 없습니다',
      adoConnectionFailed: 'Azure DevOps 연결 실패',
    },
    pt: {
      header: '📦 Hospedagem do repositório',
      ciAutoDetected: 'Modo CI: Detectado automaticamente',
      structureQuestion: 'Qual é a estrutura do seu repositório?',
      structureSingle: 'single   - Um repositório (monorepo ou projeto padrão)',
      structureMultiple: 'multiple - Múltiplos repos (microsserviços, EDA, pai/filho)',
      providerQuestion: 'Qual provedor Git você usa?',
      github: 'GitHub',
      githubDetected: '(detectado)',
      githubRecommended: '(recomendado)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Local (sem remoto)',
      other: 'Outro (GitLab, etc - em breve)',
      adoCloneQuestion: 'Digite padrão de nome de repo para clonar (ex. sw-* ou deixe vazio):',
      adoCloneSkip: 'Clonagem ignorada - configurável depois',
      // New unified selection strings
      adoSelectStrategy: 'Como você quer selecionar repositórios para clonar?',
      adoAllRepos: 'Todos',
      adoAllReposDesc: 'Clonar todos os repositórios do projeto',
      adoPatternGlob: 'Padrão (glob)',
      adoPatternGlobDesc: 'Corresponder por padrão (ex., "sw-*", "*-backend")',
      adoPatternRegex: 'Padrão (regex)',
      adoPatternRegexDesc: 'Expressão regular (ex., "^sw-.*$")',
      adoSkipOption: 'Pular',
      adoSkipDesc: 'Configurar depois',
      adoPatternPrompt: 'Digite o padrão',
      adoPatternHint: 'Exemplos: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Digite a regex',
      adoRegexHint: 'Exemplos: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Atalhos: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Padrão é obrigatório',
      adoInvalidRegex: 'Expressão regular inválida',
      adoSelectedAll: 'Todos os repositórios serão clonados',
      adoSelectedPattern: 'Repositórios correspondendo a "{pattern}" serão clonados',
      adoSelectedRegex: 'Repositórios correspondendo a regex "{pattern}" serão clonados',
      // ADO project selection strings
      adoOrgPrompt: 'Nome da organização Azure DevOps:',
      adoPatPrompt: 'Token de Acesso Pessoal (PAT):',
      adoProjectPrompt: 'Selecione projeto(s) para clonar repositórios:',
      adoProjectsSelected: '{count} projeto(s) selecionado(s)',
      adoFetchingProjects: 'Buscando projetos...',
      adoNoProjects: 'Nenhum projeto encontrado nesta organização',
      adoConnectionFailed: 'Falha ao conectar ao Azure DevOps',
    },
  };
  return strings[language] || strings.en;
}

// Import from types.ts (single source of truth) and re-export for backward compatibility
import type { AdoProjectSelection } from '../issue-tracker/types.js';
export type { AdoProjectSelection };

/**
 * Result of repository setup
 */
export interface RepositorySetupResult {
  hosting: RepositoryHosting;
  isMultiRepo: boolean;
  /** ADO repo clone pattern for multi-repo (e.g., "sw-*") */
  adoClonePattern?: string;
  /** ADO clone pattern details */
  adoClonePatternResult?: AdoClonePatternResult;
  /** ADO project(s) to clone repositories from */
  adoProjectSelection?: AdoProjectSelection;
}

/**
 * Fetch all accessible projects for an ADO organization
 */
async function fetchAdoProjects(
  org: string,
  pat: string
): Promise<Array<{ name: string; id: string }>> {
  const auth = Buffer.from(`:${pat}`).toString('base64');
  const endpoint = `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`;

  const response = await fetch(endpoint, {
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.status}`);
  }

  const data: { value?: Array<{ name: string; id: string }> } = await response.json() as { value?: Array<{ name: string; id: string }> };
  return (data.value || []).map((p) => ({ name: p.name, id: p.id }));
}

/**
 * Prompt user for ADO organization, credentials, and project selection
 * For repository cloning in multi-repo setups
 */
async function promptAdoProjectSelection(
  targetDir: string,
  strings: { adoOrgPrompt: string; adoPatPrompt: string; adoProjectPrompt: string; adoProjectsSelected: string; adoFetchingProjects: string; adoNoProjects: string; adoConnectionFailed: string }
): Promise<AdoProjectSelection | null> {
  // Check for existing credentials in .env or environment
  let existingOrg: string | undefined;
  let existingPat: string | undefined;

  const envContent = readEnvFile(targetDir);
  if (envContent) {
    const parsed = parseEnvFile(envContent);
    existingOrg = parsed.AZURE_DEVOPS_ORG;
    existingPat = parsed.AZURE_DEVOPS_PAT;
  }

  // Fall back to environment variables
  if (!existingOrg || !existingPat) {
    const auth = getAzureDevOpsAuth();
    if (auth) {
      existingOrg = existingOrg || auth.org;
      existingPat = existingPat || auth.pat;
    }
  }

  // Prompt for organization
  const org = await input({
    message: strings.adoOrgPrompt,
    default: existingOrg,
    validate: (value: string) => {
      if (!value.trim()) return 'Organization name is required';
      return true;
    }
  });

  // Prompt for PAT
  const pat = await password({
    message: strings.adoPatPrompt,
    mask: true,
    validate: (value: string) => {
      if (!value.trim()) return 'Personal Access Token is required';
      return true;
    }
  });

  // Fetch projects
  const spinner = ora(strings.adoFetchingProjects).start();
  let projects: Array<{ name: string; id: string }>;

  try {
    projects = await fetchAdoProjects(org, pat);
    spinner.succeed();
  } catch (error) {
    spinner.fail(strings.adoConnectionFailed);
    console.log(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
    return null;
  }

  if (projects.length === 0) {
    console.log(chalk.yellow(`   ${strings.adoNoProjects}`));
    return null;
  }

  // Let user select projects
  const selectedProjects = await checkbox({
    message: strings.adoProjectPrompt,
    choices: projects.map((p, index) => ({
      name: p.name,
      value: p.name,
      checked: index === 0 // First project selected by default
    })),
    required: true
  });

  console.log(chalk.green(`   ✓ ${strings.adoProjectsSelected.replace('{count}', String(selectedProjects.length))}`));

  return {
    org,
    pat,
    projects: selectedProjects
  };
}

/**
 * Prompt user for repository hosting configuration
 *
 * @param options - Setup options
 * @returns Repository configuration
 */
export async function setupRepositoryHosting(options: RepositorySetupOptions): Promise<RepositorySetupResult> {
  const { isCI, gitHubRemote, language = 'en' } = options;
  const strings = getRepoStrings(language);

  console.log('');
  console.log(chalk.cyan.bold(strings.header));
  console.log('');

  let repositoryHosting: RepositoryHosting = 'github-single';
  let isMultiRepo = false;

  if (isCI) {
    // CI mode: auto-detect
    repositoryHosting = gitHubRemote ? 'github-single' : 'local';
    console.log(chalk.gray(`   → ${strings.ciAutoDetected} ${repositoryHosting} hosting\n`));
    return { hosting: repositoryHosting, isMultiRepo: false };
  }

  // Step 1: Ask about repository structure
  const structure = await select({
    message: strings.structureQuestion,
    choices: [
      {
        name: strings.structureSingle,
        value: 'single' as const
      },
      {
        name: strings.structureMultiple,
        value: 'multirepo' as const
      }
    ],
    default: 'single'
  });

  isMultiRepo = structure === 'multirepo';

  // Step 2: Ask about git provider
  const provider = await select({
    message: strings.providerQuestion,
    choices: [
      {
        name: `🐙 ${strings.github} ${gitHubRemote ? strings.githubDetected : strings.githubRecommended}`,
        value: 'github' as const
      },
      {
        name: `🪣 ${strings.bitbucket}`,
        value: 'bitbucket' as const
      },
      {
        name: `🔷 ${strings.ado}`,
        value: 'ado' as const
      },
      {
        name: `💻 ${strings.local}`,
        value: 'local' as const
      },
      {
        name: `🔧 ${strings.other}`,
        value: 'other' as const
      }
    ],
    default: 'github'  // GitHub is recommended
  });

  // Combine structure + provider
  if (provider === 'local') {
    repositoryHosting = 'local';
  } else {
    repositoryHosting = `${provider}-${structure}` as RepositoryHosting;
  }

  // Step 3: For ADO multi-repo, prompt for project selection and clone pattern
  let adoClonePattern: string | undefined;
  let adoClonePatternResult: AdoClonePatternResult | undefined;
  let adoProjectSelection: AdoProjectSelection | undefined;

  if (provider === 'ado' && isMultiRepo) {
    // Step 3a: Prompt for ADO organization and project selection
    console.log(chalk.blue('\n📁 Azure DevOps Project Selection\n'));
    console.log(chalk.gray('   Select which project(s) to clone repositories from.\n'));

    const projectSelection = await promptAdoProjectSelection(options.targetDir, strings);
    if (projectSelection) {
      adoProjectSelection = projectSelection;
    }

    // Step 3b: Show unified strategy selection
    const strategyChoices: Array<{ name: string; value: AdoCloneStrategy }> = [
      {
        name: `${chalk.green('✓')} ${strings.adoAllRepos} ${chalk.gray(`- ${strings.adoAllReposDesc}`)}`,
        value: 'all',
      },
      {
        name: `${strings.adoPatternGlob} ${chalk.gray(`- ${strings.adoPatternGlobDesc}`)}`,
        value: 'pattern-glob',
      },
      {
        name: `${strings.adoPatternRegex} ${chalk.gray(`- ${strings.adoPatternRegexDesc}`)}`,
        value: 'pattern-regex',
      },
      {
        name: `${strings.adoSkipOption} ${chalk.gray(`- ${strings.adoSkipDesc}`)}`,
        value: 'skip',
      },
    ];

    const strategy = await select<AdoCloneStrategy>({
      message: strings.adoSelectStrategy,
      choices: strategyChoices,
      default: 'all',
    });

    switch (strategy) {
      case 'all': {
        adoClonePattern = '*';
        adoClonePatternResult = { strategy: 'all', pattern: '*' };
        console.log(chalk.green(`   ✓ ${strings.adoSelectedAll}`));
        break;
      }

      case 'pattern-glob': {
        console.log(chalk.gray(`\n   💡 ${strings.adoPatternHint}`));
        console.log(chalk.gray(`   💡 ${strings.adoShortcutsHint}\n`));

        const pattern = await input({
          message: strings.adoPatternPrompt,
          validate: (value: string) => {
            if (!value.trim()) return strings.adoPatternRequired;
            return true;
          },
        });

        // Parse shortcuts (starts:, ends:, contains:)
        const parsedPattern = parsePatternShortcut(pattern.trim());
        adoClonePattern = parsedPattern;
        adoClonePatternResult = { strategy: 'pattern-glob', pattern: parsedPattern };

        const message = strings.adoSelectedPattern.replace('{pattern}', parsedPattern);
        console.log(chalk.green(`   ✓ ${message}`));
        break;
      }

      case 'pattern-regex': {
        console.log(chalk.gray(`\n   💡 ${strings.adoRegexHint}\n`));

        const pattern = await input({
          message: strings.adoRegexPrompt,
          validate: (value: string) => {
            if (!value.trim()) return strings.adoPatternRequired;
            const validation = validateRegex(value.trim());
            if (validation !== true) {
              return `${strings.adoInvalidRegex}: ${validation}`;
            }
            return true;
          },
        });

        // Store as regex: prefix for downstream processing
        adoClonePattern = `regex:${pattern.trim()}`;
        adoClonePatternResult = { strategy: 'pattern-regex', pattern: pattern.trim(), isRegex: true };

        const message = strings.adoSelectedRegex.replace('{pattern}', pattern.trim());
        console.log(chalk.green(`   ✓ ${message}`));
        break;
      }

      case 'skip': {
        adoClonePatternResult = { strategy: 'skip' };
        console.log(chalk.gray(`   → ${strings.adoCloneSkip}`));
        break;
      }
    }
  }

  return { hosting: repositoryHosting, isMultiRepo, adoClonePattern, adoClonePatternResult, adoProjectSelection };
}
