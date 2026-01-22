/**
 * Claude Code Native Provider
 *
 * Uses the Claude Code CLI (`claude --print`) as an LLM provider.
 * This leverages the user's existing MAX subscription - NO API KEY NEEDED!
 *
 * How it works:
 * 1. User is authenticated to Claude Code (MAX subscription)
 * 2. Auth is cached in ~/.claude/ (Unix) or %USERPROFILE%\.claude\ (Windows)
 * 3. We spawn `claude --print` subprocesses
 * 4. These use the cached auth automatically
 * 5. Result: Full Claude capabilities at no extra cost!
 *
 * Cross-platform support:
 * - Uses canonical detectClaudeCli() from utils/claude-cli-detector.ts
 * - Handles: PATH binaries, shell functions/aliases, nvm versions
 *
 * Best for:
 * - Claude MAX subscribers
 * - Background processing without API costs
 * - Full Claude capabilities (Opus, Sonnet, Haiku)
 */

import { execSync, spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
// Use canonical Claude CLI detector (handles shell functions, nvm, etc.)
// CRITICAL: Import getCleanEnv to remove NODE_OPTIONS debugger flags from child processes
import { detectClaudeCli, getCleanEnv } from '../../../utils/claude-cli-detector.js';
import type {
  LLMProvider,
  LLMProviderType,
  AnalyzeOptions,
  AnalyzeResult,
  StructuredOptions,
} from '../types.js';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import { extractJson, extractRequiredFieldsFromSchema } from '../../../utils/llm-json-extractor.js';

/**
 * Platform detection for cross-platform support
 */
const IS_WINDOWS = process.platform === 'win32';

export interface ClaudeCodeProviderConfig {
  /** Model alias: 'opus' (default), 'sonnet', 'haiku' or full model ID */
  model?: string;
  /** Max tokens for response */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** Timeout in ms (default: 120000 = 2 min) */
  timeout?: number;
  /** Logger instance */
  logger?: Logger;
  /** Working directory for claude command */
  cwd?: string;
  /**
   * Skip permission prompts for non-interactive background processing.
   * Uses --dangerously-skip-permissions flag.
   * Default: true (required for background/detached processes)
   */
  skipPermissions?: boolean;
}

/**
 * Claude Code JSON output structure
 */
interface ClaudeCodeOutput {
  type: 'result';
  subtype: 'success' | 'error';
  is_error: boolean;
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  result: string;
  session_id: string;
  total_cost_usd: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  };
}

/**
 * Claude Code Native Provider
 *
 * Uses `claude --print` CLI for LLM calls - leverages MAX subscription!
 */
export class ClaudeCodeProvider implements LLMProvider {
  readonly name: LLMProviderType = 'claude-code';
  readonly defaultModel: string;

  private model: string;
  private maxTokens: number;
  private timeout: number;
  private logger: Logger;
  private cwd?: string;
  private skipPermissions: boolean;

  constructor(config: ClaudeCodeProviderConfig = {}) {
    this.model = config.model || 'opus';  // Use Opus 4.5 by default for best quality
    this.defaultModel = this.model;
    this.maxTokens = config.maxTokens || 4096;
    this.timeout = config.timeout || 120000;
    this.logger = config.logger || consoleLogger;
    this.cwd = config.cwd;
    // Default to true for background processing - essential for non-interactive use
    this.skipPermissions = config.skipPermissions ?? true;
  }

  /**
   * Execute claude --print command
   *
   * Cross-platform: Works on Windows, macOS, and Linux
   * Background-safe: Uses --dangerously-skip-permissions for non-interactive use
   */
  private async executeClaudeCommand(
    prompt: string,
    options: AnalyzeOptions = {}
  ): Promise<ClaudeCodeOutput> {
    const model = options.model || this.model;
    const timeout = options.timeout || this.timeout;

    // Build command arguments
    const args: string[] = [];

    // CRITICAL: Add --dangerously-skip-permissions FIRST for non-interactive background use
    // Without this flag, claude may hang waiting for permission prompts
    if (this.skipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    args.push(
      '--print',
      prompt,
      '--output-format', 'json',
      '--model', model,
    );

    // Add system prompt if provided
    if (options.systemPrompt) {
      args.push('--system-prompt', options.systemPrompt);
    }

    // Determine the command name (cross-platform)
    const command = IS_WINDOWS ? 'claude.cmd' : 'claude';

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // CRITICAL: Use getCleanEnv() to remove NODE_OPTIONS debugger flags
      // Without this, spawning claude from VSCode debug mode fails silently (exit code 1, empty output)
      const proc = spawn(command, args, {
        cwd: this.cwd || process.cwd(),
        env: getCleanEnv(),
        // Use 'ignore' for stdin to prevent Claude from waiting for input
        // This is essential for non-interactive background use
        stdio: ['ignore', 'pipe', 'pipe'],
        // Windows-specific: use shell to resolve .cmd files
        shell: IS_WINDOWS,
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Claude Code command timed out after ${timeout}ms`));
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          reject(new Error(`Claude Code exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const output = JSON.parse(stdout) as ClaudeCodeOutput;
          resolve(output);
        } catch (parseError) {
          // Sometimes output has extra text, try to extract JSON
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const output = JSON.parse(jsonMatch[0]) as ClaudeCodeOutput;
              resolve(output);
            } catch {
              reject(new Error(`Failed to parse Claude Code output: ${stdout}`));
            }
          } else {
            reject(new Error(`Failed to parse Claude Code output: ${stdout}`));
          }
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }

  /**
   * Analyze text using Claude Code CLI
   */
  async analyze(prompt: string, options: AnalyzeOptions = {}): Promise<AnalyzeResult> {
    const startTime = Date.now();
    const model = options.model || this.model;

    let lastError: Error | null = null;
    const retries = options.retries ?? 2;
    let wasRetry = false;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const output = await this.executeClaudeCommand(prompt, options);

        if (output.is_error) {
          throw new Error(`Claude Code returned error: ${output.result}`);
        }

        const inputTokens = output.usage?.input_tokens || 0;
        const outputTokens = output.usage?.output_tokens || 0;

        return {
          content: output.result,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
          },
          // Note: MAX subscription means this is already paid!
          estimatedCost: 0, // Free with MAX
          model,
          durationMs: Date.now() - startTime,
          wasRetry,
        };
      } catch (error: any) {
        lastError = error;
        wasRetry = true;

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          this.logger.warn(`Claude Code request failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Claude Code request failed after retries');
  }

  /**
   * Analyze with structured JSON output
   */
  async analyzeStructured<T>(
    prompt: string,
    options: StructuredOptions<T>
  ): Promise<{ data: T; usage: AnalyzeResult['usage']; estimatedCost: number }> {
    // Add JSON instruction to prompt
    const jsonPrompt = `${prompt}

IMPORTANT: Respond with valid JSON matching this schema:
${JSON.stringify(options.schema, null, 2)}

Return ONLY the JSON object, no markdown formatting, no explanation, no code blocks.`;

    const result = await this.analyze(jsonPrompt, {
      ...options,
    });

    // Extract required fields from schema for validation
    const requiredFields = extractRequiredFieldsFromSchema(options.schema);

    // Use robust JSON extraction (handles prose + JSON, code blocks, nested structures)
    const extraction = extractJson<T>(result.content, { requiredFields });

    if (extraction.success && extraction.data) {
      return {
        data: extraction.data,
        usage: result.usage,
        estimatedCost: 0, // Free with MAX
      };
    }

    // Extraction failed
    if (options.strict) {
      throw new Error(`Failed to parse structured response: ${extraction.error}\nRaw: ${result.content}`);
    }

    return {
      data: { error: 'parse_failed', raw: result.content } as unknown as T,
      usage: result.usage,
      estimatedCost: 0,
    };
  }

  /**
   * Estimate cost - always 0 for MAX subscription!
   */
  estimateCost(): number {
    return 0; // MAX subscription = already paid!
  }

  /**
   * Check if Claude Code CLI is available and authenticated
   */
  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.available;
    } catch {
      return false;
    }
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<{ available: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();

    try {
      // Quick test with minimal prompt
      // Note: First call can take 15-20s due to cache creation, so use longer timeout
      const output = await this.executeClaudeCommand(
        'Reply with just: ok',
        { timeout: 45000 }
      );

      return {
        available: !output.is_error,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        available: false,
        error: error.message || 'Claude Code CLI not available',
      };
    }
  }
}

/**
 * Get the Claude auth directory path (cross-platform)
 */
function getClaudeAuthDir(): string {
  if (IS_WINDOWS) {
    return path.join(process.env.USERPROFILE || os.homedir(), '.claude');
  }
  return path.join(os.homedir(), '.claude');
}

/**
 * Check if Claude Code CLI is installed (cross-platform)
 *
 * REFACTORED: Uses canonical implementation from utils/claude-cli-detector.ts
 * which handles all edge cases:
 * - Binary in PATH
 * - Shell functions in .zshrc/.bashrc
 * - Shell aliases
 * - npm global paths (including nvm versions)
 */
function isClaudeCliInstalled(): boolean {
  const status = detectClaudeCli();
  return status.commandExists;
}

/**
 * Check if Claude auth credentials exist
 */
function hasClaudeAuth(): boolean {
  const authDir = getClaudeAuthDir();
  // Check for auth file or credentials
  return fs.existsSync(authDir) && (
    fs.existsSync(path.join(authDir, 'credentials.json')) ||
    fs.existsSync(path.join(authDir, 'auth.json')) ||
    fs.existsSync(path.join(authDir, '.credentials'))
  );
}

/**
 * Check if Claude Code CLI is installed and authenticated
 *
 * Cross-platform support:
 * - Windows: Uses `where claude` and checks %USERPROFILE%\.claude\
 * - macOS/Linux: Uses `which claude` and checks ~/.claude/
 */
export async function isClaudeCodeAvailable(): Promise<boolean> {
  try {
    // Step 1: Check if CLI is installed
    if (!isClaudeCliInstalled()) {
      return false;
    }

    // Step 2: Quick check for auth directory (fast, no subprocess)
    // Note: Auth might be stored differently, so this is just a hint
    const hasAuth = hasClaudeAuth();
    if (!hasAuth) {
      // Auth directory doesn't exist, but CLI might still work
      // (e.g., auth stored elsewhere or in environment)
    }

    // Step 3: Actually test if it works (slow but definitive)
    // Note: First call can take 15-20s due to cache creation, so use 45s timeout
    const provider = new ClaudeCodeProvider({
      timeout: 45000,  // 45s for first-time cache creation
      skipPermissions: true,  // Essential for non-interactive check
    });
    return await provider.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Get detailed Claude Code availability info
 */
export async function getClaudeCodeStatus(): Promise<{
  available: boolean;
  cliInstalled: boolean;
  authExists: boolean;
  error?: string;
  platform: string;
}> {
  const platform = process.platform;

  const cliInstalled = isClaudeCliInstalled();
  if (!cliInstalled) {
    return {
      available: false,
      cliInstalled: false,
      authExists: false,
      error: `Claude CLI not found. Install from: https://claude.ai/download`,
      platform,
    };
  }

  const authExists = hasClaudeAuth();

  try {
    const provider = new ClaudeCodeProvider({
      timeout: 45000,  // 45s for first-time cache creation
      skipPermissions: true,
    });
    const status = await provider.getStatus();

    return {
      available: status.available,
      cliInstalled: true,
      authExists,
      error: status.error,
      platform,
    };
  } catch (error: any) {
    return {
      available: false,
      cliInstalled: true,
      authExists,
      error: error.message || 'Failed to check Claude Code status',
      platform,
    };
  }
}
