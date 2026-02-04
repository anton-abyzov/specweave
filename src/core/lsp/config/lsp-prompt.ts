/**
 * LspPrompt - Interactive LSP server suggestion prompt
 *
 * @see spec.md US-003: Language-Aware Warm-up Strategies
 * @satisfies AC-US3-03, AC-US3-04, AC-US3-05
 */

/**
 * Maximum number of LSP servers to enable
 */
export const MAX_SERVERS = 3;

/**
 * LSP server suggestion from analyzer
 */
export interface LspSuggestion {
  /** Language identifier */
  language: string;
  /** Server name */
  server: string;
  /** Score from analyzer (0-100) */
  score: number;
  /** Whether server is installed */
  installed?: boolean;
  /** Command to install the server */
  installCommand?: string;
}

/**
 * Result of prompt interaction
 */
export interface PromptResult {
  /** Selected/enabled languages */
  enabled: string[];
  /** Install commands for missing servers (keyed by language) */
  installCommands?: Record<string, string>;
}

/**
 * Prompt adapter interface for testing
 */
export interface PromptAdapter {
  prompt(config: {
    message: string;
    choices: Array<{ name: string; value: string }>;
    maxSelections?: number;
  }): Promise<string[]>;
}

/**
 * Interactive prompt for LSP server suggestions
 */
export class LspPrompt {
  private readonly promptAdapter: PromptAdapter;

  constructor(promptAdapter: PromptAdapter) {
    this.promptAdapter = promptAdapter;
  }

  /**
   * Show suggestions and prompt user for selection
   *
   * @param suggestions - LSP suggestions from analyzer
   * @returns Promise resolving to prompt result
   */
  async show(suggestions: LspSuggestion[]): Promise<PromptResult> {
    const choices = suggestions.map((s) => ({
      name: this.formatChoice(s),
      value: s.language,
    }));

    const selected = await this.promptAdapter.prompt({
      message: 'Select LSP servers to enable (max 3):',
      choices,
      maxSelections: MAX_SERVERS,
    });

    // Limit to max servers
    const enabled = selected.slice(0, MAX_SERVERS);

    // Collect install commands for selected missing servers
    const installCommands: Record<string, string> = {};
    for (const lang of enabled) {
      const suggestion = suggestions.find((s) => s.language === lang);
      if (suggestion && !suggestion.installed && suggestion.installCommand) {
        installCommands[lang] = suggestion.installCommand;
      }
    }

    return {
      enabled,
      installCommands: Object.keys(installCommands).length > 0 ? installCommands : undefined,
    };
  }

  /**
   * Format a choice for display
   */
  private formatChoice(suggestion: LspSuggestion): string {
    const installedIndicator = suggestion.installed ? '✓' : '○';
    return `${installedIndicator} ${suggestion.language} (${suggestion.server}) - score: ${suggestion.score}`;
  }
}
