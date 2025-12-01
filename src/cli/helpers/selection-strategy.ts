/**
 * Unified Selection Strategy Helper
 *
 * Provides consistent selection UI across all platforms (GitHub, JIRA, Azure DevOps)
 * for selecting repositories, projects, area paths, etc.
 *
 * Strategies:
 * - all: Select everything
 * - pattern-glob: Glob pattern matching (e.g., "sw-*", "*-backend")
 * - pattern-regex: Regular expression matching (e.g., "^sw-.*$")
 * - select-specific: Checkbox selection from list
 * - manual-entry: Comma-separated text input
 *
 * Pattern Shortcuts:
 * - "starts: prefix" → "prefix*"
 * - "ends: suffix" → "*suffix"
 * - "contains: text" → "*text*"
 *
 * @module cli/helpers/selection-strategy
 */

import { select, input, checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { minimatch } from 'minimatch';
import type { SupportedLanguage } from '../../core/i18n/types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Selection strategy options
 */
export type SelectionStrategy =
  | 'all'
  | 'pattern-glob'
  | 'pattern-regex'
  | 'select-specific'
  | 'manual-entry';

/**
 * Generic selectable item interface
 */
export interface SelectableItem {
  /** Display name for the item */
  name: string;
  /** Unique identifier/value */
  value: string;
  /** Optional: full path or additional context */
  path?: string;
  /** Optional: additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Selection result
 */
export interface SelectionResult<T extends SelectableItem = SelectableItem> {
  /** Selected strategy */
  strategy: SelectionStrategy;
  /** Selected items */
  items: T[];
  /** Pattern used (for pattern strategies) */
  pattern?: string;
  /** Whether selection was cancelled */
  cancelled: boolean;
}

/**
 * Options for the selection prompt
 */
export interface SelectionPromptOptions<T extends SelectableItem = SelectableItem> {
  /** All available items to select from */
  items: T[];
  /** Type of items being selected (for display) */
  itemType: 'repositories' | 'projects' | 'area paths' | 'boards' | 'items';
  /** Optional: source/context name (e.g., org name, project name) */
  sourceName?: string;
  /** Language for i18n */
  language?: SupportedLanguage;
  /** Whether to show "All" option (default: true) */
  showAllOption?: boolean;
  /** Whether to show preview before confirmation (default: true) */
  showPreview?: boolean;
  /** Maximum items to show in preview (default: 20) */
  previewLimit?: number;
  /** Custom validator for manual entry */
  manualEntryValidator?: (value: string) => boolean | string;
  /** Whether to transform manual entry to uppercase (for JIRA keys) */
  uppercaseManualEntry?: boolean;
  /** Field to match patterns against (default: 'name') */
  matchField?: keyof T;
}

// ============================================================================
// I18n Strings
// ============================================================================

interface SelectionStrings {
  header: string;
  strategyQuestion: string;
  allOption: string;
  allDescription: string;
  patternGlobOption: string;
  patternGlobDescription: string;
  patternRegexOption: string;
  patternRegexDescription: string;
  selectSpecificOption: string;
  selectSpecificDescription: string;
  manualEntryOption: string;
  manualEntryDescription: string;
  patternPrompt: string;
  patternGlobHint: string;
  patternRegexHint: string;
  patternShortcutsHint: string;
  manualEntryPrompt: string;
  manualEntryHint: string;
  checkboxPrompt: string;
  previewHeader: string;
  previewMore: string;
  confirmSelection: string;
  noMatches: string;
  tryAgain: string;
  cancelled: string;
  selected: string;
  invalidPattern: string;
  invalidRegex: string;
  patternRequired: string;
  entryRequired: string;
  available: string;
  source: string;
}

function getSelectionStrings(language: SupportedLanguage): SelectionStrings {
  const strings: Record<SupportedLanguage, SelectionStrings> = {
    en: {
      header: 'Selection',
      strategyQuestion: 'How do you want to select',
      allOption: 'All',
      allDescription: 'Import everything',
      patternGlobOption: 'Pattern (glob)',
      patternGlobDescription: 'Match by pattern (e.g., "sw-*", "*-backend")',
      patternRegexOption: 'Pattern (regex)',
      patternRegexDescription: 'Regular expression (e.g., "^sw-.*$")',
      selectSpecificOption: 'Select specific',
      selectSpecificDescription: 'Choose from list (checkbox)',
      manualEntryOption: 'Manual entry',
      manualEntryDescription: 'Enter names directly (comma-separated)',
      patternPrompt: 'Enter pattern',
      patternGlobHint: 'Examples: "sw-*", "*-backend", "api-*-service"',
      patternRegexHint: 'Examples: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      patternShortcutsHint: 'Shortcuts: "starts: sw-", "ends: -api", "contains: core"',
      manualEntryPrompt: 'Enter names (comma-separated)',
      manualEntryHint: 'Example: "repo1, repo2, repo3"',
      checkboxPrompt: 'Select items (space to toggle, enter to confirm)',
      previewHeader: 'Preview',
      previewMore: 'and {count} more',
      confirmSelection: 'Confirm selection of {count} {itemType}?',
      noMatches: 'No items match pattern "{pattern}"',
      tryAgain: 'Try a different pattern?',
      cancelled: 'Selection cancelled',
      selected: 'Selected {count} {itemType}',
      invalidPattern: 'Invalid pattern format',
      invalidRegex: 'Invalid regular expression: {error}',
      patternRequired: 'Pattern is required',
      entryRequired: 'At least one entry is required',
      available: 'Available',
      source: 'Source',
    },
    ru: {
      header: 'Выбор',
      strategyQuestion: 'Как вы хотите выбрать',
      allOption: 'Все',
      allDescription: 'Импортировать всё',
      patternGlobOption: 'Шаблон (glob)',
      patternGlobDescription: 'Сопоставление по шаблону (напр., "sw-*", "*-backend")',
      patternRegexOption: 'Шаблон (regex)',
      patternRegexDescription: 'Регулярное выражение (напр., "^sw-.*$")',
      selectSpecificOption: 'Выбрать конкретные',
      selectSpecificDescription: 'Выбрать из списка (чекбоксы)',
      manualEntryOption: 'Ручной ввод',
      manualEntryDescription: 'Ввести имена напрямую (через запятую)',
      patternPrompt: 'Введите шаблон',
      patternGlobHint: 'Примеры: "sw-*", "*-backend", "api-*-service"',
      patternRegexHint: 'Примеры: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      patternShortcutsHint: 'Сокращения: "starts: sw-", "ends: -api", "contains: core"',
      manualEntryPrompt: 'Введите имена (через запятую)',
      manualEntryHint: 'Пример: "repo1, repo2, repo3"',
      checkboxPrompt: 'Выберите элементы (пробел - переключить, enter - подтвердить)',
      previewHeader: 'Предпросмотр',
      previewMore: 'и ещё {count}',
      confirmSelection: 'Подтвердить выбор {count} {itemType}?',
      noMatches: 'Нет элементов, соответствующих шаблону "{pattern}"',
      tryAgain: 'Попробовать другой шаблон?',
      cancelled: 'Выбор отменён',
      selected: 'Выбрано {count} {itemType}',
      invalidPattern: 'Неверный формат шаблона',
      invalidRegex: 'Неверное регулярное выражение: {error}',
      patternRequired: 'Шаблон обязателен',
      entryRequired: 'Требуется хотя бы одна запись',
      available: 'Доступно',
      source: 'Источник',
    },
    es: {
      header: 'Selección',
      strategyQuestion: 'Cómo desea seleccionar',
      allOption: 'Todos',
      allDescription: 'Importar todo',
      patternGlobOption: 'Patrón (glob)',
      patternGlobDescription: 'Coincidir por patrón (ej., "sw-*", "*-backend")',
      patternRegexOption: 'Patrón (regex)',
      patternRegexDescription: 'Expresión regular (ej., "^sw-.*$")',
      selectSpecificOption: 'Seleccionar específicos',
      selectSpecificDescription: 'Elegir de lista (casillas)',
      manualEntryOption: 'Entrada manual',
      manualEntryDescription: 'Ingresar nombres directamente (separados por coma)',
      patternPrompt: 'Ingrese patrón',
      patternGlobHint: 'Ejemplos: "sw-*", "*-backend", "api-*-service"',
      patternRegexHint: 'Ejemplos: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      patternShortcutsHint: 'Atajos: "starts: sw-", "ends: -api", "contains: core"',
      manualEntryPrompt: 'Ingrese nombres (separados por coma)',
      manualEntryHint: 'Ejemplo: "repo1, repo2, repo3"',
      checkboxPrompt: 'Seleccione elementos (espacio para alternar, enter para confirmar)',
      previewHeader: 'Vista previa',
      previewMore: 'y {count} más',
      confirmSelection: '¿Confirmar selección de {count} {itemType}?',
      noMatches: 'Ningún elemento coincide con el patrón "{pattern}"',
      tryAgain: '¿Intentar con otro patrón?',
      cancelled: 'Selección cancelada',
      selected: 'Seleccionado {count} {itemType}',
      invalidPattern: 'Formato de patrón inválido',
      invalidRegex: 'Expresión regular inválida: {error}',
      patternRequired: 'El patrón es requerido',
      entryRequired: 'Se requiere al menos una entrada',
      available: 'Disponible',
      source: 'Fuente',
    },
    zh: {
      header: '选择',
      strategyQuestion: '您想如何选择',
      allOption: '全部',
      allDescription: '导入所有内容',
      patternGlobOption: '模式 (glob)',
      patternGlobDescription: '按模式匹配（例如 "sw-*"、"*-backend"）',
      patternRegexOption: '模式 (正则)',
      patternRegexDescription: '正则表达式（例如 "^sw-.*$"）',
      selectSpecificOption: '选择特定项',
      selectSpecificDescription: '从列表中选择（复选框）',
      manualEntryOption: '手动输入',
      manualEntryDescription: '直接输入名称（逗号分隔）',
      patternPrompt: '输入模式',
      patternGlobHint: '示例："sw-*"、"*-backend"、"api-*-service"',
      patternRegexHint: '示例："^sw-"、".*-backend$"、"^api-\\d+-service$"',
      patternShortcutsHint: '快捷方式："starts: sw-"、"ends: -api"、"contains: core"',
      manualEntryPrompt: '输入名称（逗号分隔）',
      manualEntryHint: '示例："repo1, repo2, repo3"',
      checkboxPrompt: '选择项目（空格切换，回车确认）',
      previewHeader: '预览',
      previewMore: '还有 {count} 个',
      confirmSelection: '确认选择 {count} 个{itemType}？',
      noMatches: '没有项目匹配模式 "{pattern}"',
      tryAgain: '尝试其他模式？',
      cancelled: '选择已取消',
      selected: '已选择 {count} 个{itemType}',
      invalidPattern: '无效的模式格式',
      invalidRegex: '无效的正则表达式：{error}',
      patternRequired: '模式是必需的',
      entryRequired: '至少需要一个条目',
      available: '可用',
      source: '来源',
    },
    de: {
      header: 'Auswahl',
      strategyQuestion: 'Wie möchten Sie auswählen',
      allOption: 'Alle',
      allDescription: 'Alles importieren',
      patternGlobOption: 'Muster (glob)',
      patternGlobDescription: 'Nach Muster filtern (z.B. "sw-*", "*-backend")',
      patternRegexOption: 'Muster (regex)',
      patternRegexDescription: 'Regulärer Ausdruck (z.B. "^sw-.*$")',
      selectSpecificOption: 'Spezifische auswählen',
      selectSpecificDescription: 'Aus Liste wählen (Kontrollkästchen)',
      manualEntryOption: 'Manuelle Eingabe',
      manualEntryDescription: 'Namen direkt eingeben (kommagetrennt)',
      patternPrompt: 'Muster eingeben',
      patternGlobHint: 'Beispiele: "sw-*", "*-backend", "api-*-service"',
      patternRegexHint: 'Beispiele: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      patternShortcutsHint: 'Abkürzungen: "starts: sw-", "ends: -api", "contains: core"',
      manualEntryPrompt: 'Namen eingeben (kommagetrennt)',
      manualEntryHint: 'Beispiel: "repo1, repo2, repo3"',
      checkboxPrompt: 'Elemente auswählen (Leertaste zum Umschalten, Enter zum Bestätigen)',
      previewHeader: 'Vorschau',
      previewMore: 'und {count} weitere',
      confirmSelection: 'Auswahl von {count} {itemType} bestätigen?',
      noMatches: 'Keine Elemente entsprechen dem Muster "{pattern}"',
      tryAgain: 'Anderes Muster versuchen?',
      cancelled: 'Auswahl abgebrochen',
      selected: '{count} {itemType} ausgewählt',
      invalidPattern: 'Ungültiges Musterformat',
      invalidRegex: 'Ungültiger regulärer Ausdruck: {error}',
      patternRequired: 'Muster ist erforderlich',
      entryRequired: 'Mindestens ein Eintrag ist erforderlich',
      available: 'Verfügbar',
      source: 'Quelle',
    },
    fr: {
      header: 'Sélection',
      strategyQuestion: 'Comment voulez-vous sélectionner',
      allOption: 'Tous',
      allDescription: 'Tout importer',
      patternGlobOption: 'Modèle (glob)',
      patternGlobDescription: 'Correspondance par modèle (ex., "sw-*", "*-backend")',
      patternRegexOption: 'Modèle (regex)',
      patternRegexDescription: 'Expression régulière (ex., "^sw-.*$")',
      selectSpecificOption: 'Sélection spécifique',
      selectSpecificDescription: 'Choisir dans la liste (cases à cocher)',
      manualEntryOption: 'Entrée manuelle',
      manualEntryDescription: 'Entrer les noms directement (séparés par virgule)',
      patternPrompt: 'Entrez le modèle',
      patternGlobHint: 'Exemples: "sw-*", "*-backend", "api-*-service"',
      patternRegexHint: 'Exemples: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      patternShortcutsHint: 'Raccourcis: "starts: sw-", "ends: -api", "contains: core"',
      manualEntryPrompt: 'Entrez les noms (séparés par virgule)',
      manualEntryHint: 'Exemple: "repo1, repo2, repo3"',
      checkboxPrompt: 'Sélectionnez les éléments (espace pour basculer, entrée pour confirmer)',
      previewHeader: 'Aperçu',
      previewMore: 'et {count} de plus',
      confirmSelection: 'Confirmer la sélection de {count} {itemType}?',
      noMatches: 'Aucun élément ne correspond au modèle "{pattern}"',
      tryAgain: 'Essayer un autre modèle?',
      cancelled: 'Sélection annulée',
      selected: '{count} {itemType} sélectionné(s)',
      invalidPattern: 'Format de modèle invalide',
      invalidRegex: 'Expression régulière invalide: {error}',
      patternRequired: 'Le modèle est requis',
      entryRequired: 'Au moins une entrée est requise',
      available: 'Disponible',
      source: 'Source',
    },
    ja: {
      header: '選択',
      strategyQuestion: '選択方法を選んでください',
      allOption: 'すべて',
      allDescription: 'すべてインポート',
      patternGlobOption: 'パターン (glob)',
      patternGlobDescription: 'パターンでマッチ（例: "sw-*", "*-backend"）',
      patternRegexOption: 'パターン (正規表現)',
      patternRegexDescription: '正規表現（例: "^sw-.*$"）',
      selectSpecificOption: '特定を選択',
      selectSpecificDescription: 'リストから選択（チェックボックス）',
      manualEntryOption: '手動入力',
      manualEntryDescription: '名前を直接入力（カンマ区切り）',
      patternPrompt: 'パターンを入力',
      patternGlobHint: '例: "sw-*", "*-backend", "api-*-service"',
      patternRegexHint: '例: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      patternShortcutsHint: 'ショートカット: "starts: sw-", "ends: -api", "contains: core"',
      manualEntryPrompt: '名前を入力（カンマ区切り）',
      manualEntryHint: '例: "repo1, repo2, repo3"',
      checkboxPrompt: '項目を選択（スペースで切替、Enterで確認）',
      previewHeader: 'プレビュー',
      previewMore: '他 {count} 件',
      confirmSelection: '{count} 件の{itemType}の選択を確認しますか？',
      noMatches: 'パターン "{pattern}" に一致する項目がありません',
      tryAgain: '別のパターンを試しますか？',
      cancelled: '選択がキャンセルされました',
      selected: '{count} 件の{itemType}を選択しました',
      invalidPattern: '無効なパターン形式',
      invalidRegex: '無効な正規表現: {error}',
      patternRequired: 'パターンは必須です',
      entryRequired: '少なくとも1つのエントリが必要です',
      available: '利用可能',
      source: 'ソース',
    },
    ko: {
      header: '선택',
      strategyQuestion: '선택 방법을 고르세요',
      allOption: '모두',
      allDescription: '모두 가져오기',
      patternGlobOption: '패턴 (glob)',
      patternGlobDescription: '패턴으로 매칭 (예: "sw-*", "*-backend")',
      patternRegexOption: '패턴 (정규식)',
      patternRegexDescription: '정규 표현식 (예: "^sw-.*$")',
      selectSpecificOption: '특정 항목 선택',
      selectSpecificDescription: '목록에서 선택 (체크박스)',
      manualEntryOption: '수동 입력',
      manualEntryDescription: '이름 직접 입력 (쉼표로 구분)',
      patternPrompt: '패턴 입력',
      patternGlobHint: '예: "sw-*", "*-backend", "api-*-service"',
      patternRegexHint: '예: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      patternShortcutsHint: '단축키: "starts: sw-", "ends: -api", "contains: core"',
      manualEntryPrompt: '이름 입력 (쉼표로 구분)',
      manualEntryHint: '예: "repo1, repo2, repo3"',
      checkboxPrompt: '항목 선택 (스페이스로 전환, Enter로 확인)',
      previewHeader: '미리보기',
      previewMore: '외 {count}개',
      confirmSelection: '{count}개의 {itemType} 선택을 확인하시겠습니까?',
      noMatches: '패턴 "{pattern}"과 일치하는 항목이 없습니다',
      tryAgain: '다른 패턴을 시도하시겠습니까?',
      cancelled: '선택이 취소되었습니다',
      selected: '{count}개의 {itemType} 선택됨',
      invalidPattern: '잘못된 패턴 형식',
      invalidRegex: '잘못된 정규 표현식: {error}',
      patternRequired: '패턴이 필요합니다',
      entryRequired: '최소 하나의 항목이 필요합니다',
      available: '사용 가능',
      source: '소스',
    },
    pt: {
      header: 'Seleção',
      strategyQuestion: 'Como você quer selecionar',
      allOption: 'Todos',
      allDescription: 'Importar tudo',
      patternGlobOption: 'Padrão (glob)',
      patternGlobDescription: 'Corresponder por padrão (ex., "sw-*", "*-backend")',
      patternRegexOption: 'Padrão (regex)',
      patternRegexDescription: 'Expressão regular (ex., "^sw-.*$")',
      selectSpecificOption: 'Selecionar específicos',
      selectSpecificDescription: 'Escolher da lista (caixas de seleção)',
      manualEntryOption: 'Entrada manual',
      manualEntryDescription: 'Digitar nomes diretamente (separados por vírgula)',
      patternPrompt: 'Digite o padrão',
      patternGlobHint: 'Exemplos: "sw-*", "*-backend", "api-*-service"',
      patternRegexHint: 'Exemplos: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      patternShortcutsHint: 'Atalhos: "starts: sw-", "ends: -api", "contains: core"',
      manualEntryPrompt: 'Digite os nomes (separados por vírgula)',
      manualEntryHint: 'Exemplo: "repo1, repo2, repo3"',
      checkboxPrompt: 'Selecione itens (espaço para alternar, enter para confirmar)',
      previewHeader: 'Visualização',
      previewMore: 'e mais {count}',
      confirmSelection: 'Confirmar seleção de {count} {itemType}?',
      noMatches: 'Nenhum item corresponde ao padrão "{pattern}"',
      tryAgain: 'Tentar outro padrão?',
      cancelled: 'Seleção cancelada',
      selected: '{count} {itemType} selecionado(s)',
      invalidPattern: 'Formato de padrão inválido',
      invalidRegex: 'Expressão regular inválida: {error}',
      patternRequired: 'Padrão é obrigatório',
      entryRequired: 'Pelo menos uma entrada é necessária',
      available: 'Disponível',
      source: 'Fonte',
    },
  };

  return strings[language] || strings.en;
}

// ============================================================================
// Pattern Utilities
// ============================================================================

/**
 * Parse pattern shortcuts into glob/regex patterns
 *
 * Shortcuts:
 * - "starts: prefix" → "prefix*" (glob)
 * - "ends: suffix" → "*suffix" (glob)
 * - "contains: text" → "*text*" (glob)
 * - Raw patterns are passed through as-is
 *
 * @param input - User input (may contain shortcuts)
 * @returns Parsed pattern
 */
export function parsePatternShortcut(input: string): string {
  const trimmed = input.trim();

  // Check for shortcuts (case-insensitive)
  const startsMatch = trimmed.match(/^starts?:\s*(.+)$/i);
  if (startsMatch) {
    return `${startsMatch[1].trim()}*`;
  }

  const endsMatch = trimmed.match(/^ends?:\s*(.+)$/i);
  if (endsMatch) {
    return `*${endsMatch[1].trim()}`;
  }

  const containsMatch = trimmed.match(/^contains?:\s*(.+)$/i);
  if (containsMatch) {
    return `*${containsMatch[1].trim()}*`;
  }

  // No shortcut, return as-is
  return trimmed;
}

/**
 * Match items by glob pattern
 *
 * @param items - Items to filter
 * @param pattern - Glob pattern (e.g., "sw-*", "*-backend")
 * @param field - Field to match against (default: 'name')
 * @returns Matching items
 */
export function matchByGlob<T extends SelectableItem>(
  items: T[],
  pattern: string,
  field: keyof T = 'name'
): T[] {
  const parsedPattern = parsePatternShortcut(pattern);
  return items.filter(item => {
    const value = String(item[field] || '');
    return minimatch(value, parsedPattern, { nocase: true });
  });
}

/**
 * Match items by regular expression
 *
 * @param items - Items to filter
 * @param pattern - Regex pattern (e.g., "^sw-.*$")
 * @param field - Field to match against (default: 'name')
 * @returns Object with matching items or error
 */
export function matchByRegex<T extends SelectableItem>(
  items: T[],
  pattern: string,
  field: keyof T = 'name'
): { items: T[]; error?: string } {
  try {
    const regex = new RegExp(pattern, 'i'); // Case-insensitive
    const matched = items.filter(item => {
      const value = String(item[field] || '');
      return regex.test(value);
    });
    return { items: matched };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate regex pattern
 *
 * @param pattern - Pattern to validate
 * @returns True if valid, error message if invalid
 */
export function validateRegex(pattern: string): true | string {
  try {
    new RegExp(pattern);
    return true;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid regex';
  }
}

// ============================================================================
// Preview & Display
// ============================================================================

/**
 * Show selection preview table
 *
 * @param items - Items to preview
 * @param strings - I18n strings
 * @param limit - Maximum items to show
 */
function showPreview<T extends SelectableItem>(
  items: T[],
  strings: SelectionStrings,
  limit: number = 20
): void {
  console.log(chalk.blue(`\n📋 ${strings.previewHeader}:\n`));

  const header = `${chalk.bold('Name')}${' '.repeat(45)}${chalk.bold('Value/Path')}`;
  console.log(header);
  console.log('-'.repeat(80));

  items.slice(0, limit).forEach(item => {
    const name = (item.name.length > 45
      ? item.name.slice(0, 42) + '...'
      : item.name
    ).padEnd(50);
    const value = item.path || item.value;
    console.log(`${name}${value}`);
  });

  if (items.length > limit) {
    const moreText = strings.previewMore.replace('{count}', String(items.length - limit));
    console.log(chalk.gray(`\n... ${moreText}\n`));
  } else {
    console.log('');
  }
}

// ============================================================================
// Main Selection Prompt
// ============================================================================

/**
 * Main selection prompt - unified across all platforms
 *
 * @param options - Selection options
 * @returns Selection result
 */
export async function promptSelection<T extends SelectableItem>(
  options: SelectionPromptOptions<T>
): Promise<SelectionResult<T>> {
  const {
    items,
    itemType,
    sourceName,
    language = 'en',
    showAllOption = true,
    showPreview: shouldShowPreview = true,
    previewLimit = 20,
    manualEntryValidator,
    uppercaseManualEntry = false,
    matchField = 'name' as keyof T,
  } = options;

  const strings = getSelectionStrings(language);

  // Header
  console.log(chalk.blue(`\n🔗 ${strings.header}\n`));
  if (sourceName) {
    console.log(chalk.gray(`   ${strings.source}: ${sourceName}`));
  }
  console.log(chalk.gray(`   ${strings.available}: ${items.length} ${itemType}\n`));

  if (items.length === 0) {
    console.log(chalk.yellow(`⚠️  No ${itemType} found.\n`));
    return { strategy: 'all', items: [], cancelled: true };
  }

  // Build strategy choices
  const strategyChoices: Array<{ name: string; value: SelectionStrategy }> = [];

  if (showAllOption) {
    strategyChoices.push({
      name: `${chalk.green('✓')} ${strings.allOption} ${chalk.gray(`- ${strings.allDescription}`)}`,
      value: 'all',
    });
  }

  strategyChoices.push(
    {
      name: `${strings.patternGlobOption} ${chalk.gray(`- ${strings.patternGlobDescription}`)}`,
      value: 'pattern-glob',
    },
    {
      name: `${strings.patternRegexOption} ${chalk.gray(`- ${strings.patternRegexDescription}`)}`,
      value: 'pattern-regex',
    },
    {
      name: `${strings.selectSpecificOption} ${chalk.gray(`- ${strings.selectSpecificDescription}`)}`,
      value: 'select-specific',
    },
    {
      name: `${strings.manualEntryOption} ${chalk.gray(`- ${strings.manualEntryDescription}`)}`,
      value: 'manual-entry',
    }
  );

  // Prompt for strategy
  const strategy = await select<SelectionStrategy>({
    message: `${strings.strategyQuestion} ${itemType}?`,
    choices: strategyChoices,
    default: showAllOption ? 'all' : 'pattern-glob',
  });

  let selectedItems: T[] = [];
  let pattern: string | undefined;

  // Execute strategy
  switch (strategy) {
    case 'all': {
      selectedItems = [...items];
      break;
    }

    case 'pattern-glob': {
      // Show example items for context
      const exampleNames = items.slice(0, 3).map(i => i.name);
      const exampleHint = exampleNames.length > 0
        ? ` (examples: ${exampleNames.join(', ')}...)`
        : '';

      console.log(chalk.gray(`\n💡 ${strings.patternGlobHint}`));
      console.log(chalk.gray(`   ${strings.patternShortcutsHint}\n`));

      pattern = await input({
        message: `${strings.patternPrompt}${exampleHint}:`,
        validate: (value: string) => {
          if (!value.trim()) return strings.patternRequired;
          return true;
        },
      });

      selectedItems = matchByGlob(items, pattern.trim(), matchField);

      if (selectedItems.length === 0) {
        console.log(chalk.yellow(`\n⚠️  ${strings.noMatches.replace('{pattern}', pattern)}\n`));

        const retry = await confirm({
          message: strings.tryAgain,
          default: true,
        });

        if (retry) {
          return promptSelection(options); // Recursive retry
        }
        return { strategy, items: [], pattern, cancelled: true };
      }
      break;
    }

    case 'pattern-regex': {
      console.log(chalk.gray(`\n💡 ${strings.patternRegexHint}\n`));

      pattern = await input({
        message: `${strings.patternPrompt}:`,
        validate: (value: string) => {
          if (!value.trim()) return strings.patternRequired;
          const validation = validateRegex(value.trim());
          if (validation !== true) {
            return strings.invalidRegex.replace('{error}', validation);
          }
          return true;
        },
      });

      const regexResult = matchByRegex(items, pattern.trim(), matchField);
      if (regexResult.error) {
        console.log(chalk.red(`\n❌ ${strings.invalidRegex.replace('{error}', regexResult.error)}\n`));
        return { strategy, items: [], pattern, cancelled: true };
      }

      selectedItems = regexResult.items;

      if (selectedItems.length === 0) {
        console.log(chalk.yellow(`\n⚠️  ${strings.noMatches.replace('{pattern}', pattern)}\n`));

        const retry = await confirm({
          message: strings.tryAgain,
          default: true,
        });

        if (retry) {
          return promptSelection(options); // Recursive retry
        }
        return { strategy, items: [], pattern, cancelled: true };
      }
      break;
    }

    case 'select-specific': {
      const checkboxChoices = items.map(item => ({
        name: item.path ? `${item.name} ${chalk.gray(`(${item.path})`)}` : item.name,
        value: item,
        checked: false, // User explicitly selects
      }));

      selectedItems = await checkbox({
        message: strings.checkboxPrompt,
        choices: checkboxChoices,
        pageSize: 15,
        required: true,
      });

      if (selectedItems.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No ${itemType} selected.\n`));
        return { strategy, items: [], cancelled: true };
      }
      break;
    }

    case 'manual-entry': {
      console.log(chalk.gray(`\n💡 ${strings.manualEntryHint}\n`));

      const entryInput = await input({
        message: strings.manualEntryPrompt,
        validate: (value: string) => {
          if (!value.trim()) return strings.entryRequired;
          if (manualEntryValidator) {
            return manualEntryValidator(value);
          }
          return true;
        },
      });

      // Parse comma-separated entries
      let entries = entryInput.split(',').map(s => s.trim()).filter(Boolean);
      if (uppercaseManualEntry) {
        entries = entries.map(e => e.toUpperCase());
      }

      // Match against available items
      const entrySet = new Set(entries.map(e => e.toLowerCase()));
      selectedItems = items.filter(item => {
        const name = String(item[matchField] || item.name).toLowerCase();
        return entrySet.has(name);
      });

      // Also create items for entries not found (for manual entry flexibility)
      const foundNames = new Set(selectedItems.map(i => String(i[matchField] || i.name).toLowerCase()));
      const notFoundEntries = entries.filter(e => !foundNames.has(e.toLowerCase()));

      if (notFoundEntries.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Not found in list: ${notFoundEntries.join(', ')}`));
        console.log(chalk.gray(`   These will be used as-is (if valid).\n`));

        // Add not-found entries as new items (for flexibility)
        for (const entry of notFoundEntries) {
          selectedItems.push({
            name: entry,
            value: entry,
          } as T);
        }
      }

      if (selectedItems.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No valid ${itemType} found.\n`));
        return { strategy, items: [], cancelled: true };
      }
      break;
    }
  }

  // Show preview
  if (shouldShowPreview && selectedItems.length > 0) {
    showPreview(selectedItems, strings, previewLimit);
  }

  // Confirm selection
  const confirmMessage = strings.confirmSelection
    .replace('{count}', String(selectedItems.length))
    .replace('{itemType}', itemType);

  const confirmed = await confirm({
    message: confirmMessage,
    default: true,
  });

  if (!confirmed) {
    console.log(chalk.gray(`\n✓ ${strings.cancelled}\n`));
    return { strategy, items: [], pattern, cancelled: true };
  }

  const selectedMessage = strings.selected
    .replace('{count}', String(selectedItems.length))
    .replace('{itemType}', itemType);

  console.log(chalk.green(`\n✅ ${selectedMessage}\n`));

  return {
    strategy,
    items: selectedItems,
    pattern,
    cancelled: false,
  };
}

// ============================================================================
// Convenience Functions for Specific Platforms
// ============================================================================

/**
 * Convert array of strings to SelectableItem array
 */
export function toSelectableItems(items: string[]): SelectableItem[] {
  return items.map(item => ({
    name: item,
    value: item,
  }));
}

/**
 * Convert array of objects with name/value to SelectableItem array
 */
export function toSelectableItemsFromObjects<T extends { name: string; [key: string]: unknown }>(
  items: T[],
  valueField: keyof T = 'name'
): SelectableItem[] {
  return items.map(item => ({
    name: item.name,
    value: String(item[valueField]),
    metadata: item as unknown as Record<string, unknown>,
  }));
}

// ============================================================================
// Repository Filtering (for ADO/GitHub clone operations)
// ============================================================================

/**
 * Clone pattern result (from repository-setup.ts)
 */
export interface ClonePatternResult {
  strategy: 'all' | 'pattern-glob' | 'pattern-regex' | 'skip';
  pattern?: string;
  isRegex?: boolean;
}

/**
 * Filter repositories by clone pattern
 *
 * Used during init to filter ADO/GitHub repos before cloning.
 *
 * @param repos - Array of repositories with name field
 * @param clonePattern - Clone pattern configuration
 * @returns Filtered repositories
 *
 * @example
 * ```typescript
 * const repos = [{ name: 'sw-fe' }, { name: 'sw-be' }, { name: 'other' }];
 * const pattern = { strategy: 'pattern-glob', pattern: 'sw-*' };
 * const filtered = filterRepositoriesByPattern(repos, pattern);
 * // Result: [{ name: 'sw-fe' }, { name: 'sw-be' }]
 * ```
 */
export function filterRepositoriesByPattern<T extends { name: string }>(
  repos: T[],
  clonePattern: ClonePatternResult
): T[] {
  switch (clonePattern.strategy) {
    case 'all':
      return repos;

    case 'skip':
      return [];

    case 'pattern-glob': {
      if (!clonePattern.pattern) return repos;
      const selectableItems = repos.map(r => ({ name: r.name, value: r.name }));
      const matched = matchByGlob(selectableItems, clonePattern.pattern);
      const matchedNames = new Set(matched.map(m => m.name));
      return repos.filter(r => matchedNames.has(r.name));
    }

    case 'pattern-regex': {
      if (!clonePattern.pattern) return repos;
      const selectableItems = repos.map(r => ({ name: r.name, value: r.name }));
      const result = matchByRegex(selectableItems, clonePattern.pattern);
      if (result.error) {
        // Log error but don't crash - return empty array
        console.error(`Invalid regex pattern "${clonePattern.pattern}": ${result.error}`);
        return [];
      }
      const matchedNames = new Set(result.items.map(m => m.name));
      return repos.filter(r => matchedNames.has(r.name));
    }

    default:
      return repos;
  }
}
