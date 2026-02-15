/**
 * External API Key Cost Consent Management
 *
 * Two-layer consent system ensuring users are never surprised by extra API charges.
 * Free providers (claude-code, ollama) bypass consent. Paid providers require explicit permission.
 *
 * @since v1.0.265
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import type { ConsentMode, ConsentStatus, ExternalModelsConfig } from './types.js';

/** Providers that do NOT cost extra money */
export const FREE_PROVIDERS: ReadonlySet<string> = new Set(['claude-code', 'ollama']);

const DEFAULT_EXTERNAL_MODELS: ExternalModelsConfig = {
  consent: 'ask',
  allowedProviders: [],
};

/**
 * Check if a provider is external (costs money)
 */
export function isExternalProvider(provider: string): boolean {
  return !FREE_PROVIDERS.has(provider);
}

/**
 * Check consent status for an external provider
 *
 * @returns 'granted' if allowed, 'denied' if blocked, 'ask' if user should be prompted
 */
export function checkConsent(provider: string, projectRoot: string): ConsentStatus {
  if (!isExternalProvider(provider)) {
    return 'granted';
  }

  const config = readExternalModelsConfig(projectRoot);

  switch (config.consent) {
    case 'always-allow':
      return 'granted';
    case 'never':
      return 'denied';
    case 'ask':
      return config.allowedProviders.includes(provider) ? 'granted' : 'ask';
    default:
      return 'ask';
  }
}

/**
 * Grant standing consent for a provider (persists to config.json)
 */
export function grantStandingConsent(provider: string, projectRoot: string): void {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  let fullConfig: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      fullConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      fullConfig = {};
    }
  }

  const externalModels = (fullConfig.externalModels as ExternalModelsConfig | undefined) ?? { ...DEFAULT_EXTERNAL_MODELS };

  if (!externalModels.allowedProviders.includes(provider)) {
    externalModels.allowedProviders = [...externalModels.allowedProviders, provider];
  }

  fullConfig.externalModels = externalModels;
  writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
}

/**
 * Custom error for consent denied scenarios
 */
export class ExternalApiConsentDeniedError extends Error {
  public readonly provider: string;

  constructor(provider: string) {
    super(
      `External API consent denied for provider "${provider}". ` +
      'Configure externalModels.consent in .specweave/config.json or grant standing permission.'
    );
    this.provider = provider;
  }
}

function readExternalModelsConfig(projectRoot: string): ExternalModelsConfig {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  if (!existsSync(configPath)) {
    return DEFAULT_EXTERNAL_MODELS;
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    const em = raw.externalModels;
    if (!em) return DEFAULT_EXTERNAL_MODELS;

    return {
      consent: (em.consent as ConsentMode) ?? 'ask',
      allowedProviders: Array.isArray(em.allowedProviders) ? em.allowedProviders : [],
    };
  } catch {
    return DEFAULT_EXTERNAL_MODELS;
  }
}
