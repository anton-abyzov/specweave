/**
 * The one provider list for spec-weave.com. Every page that names the coding agents
 * SpecWithCode runs reads it from here, so the site never lists a different set.
 *
 * Checked against the specwithcode source at v1.0.44 (18 October 2026; builtInDrivers.ts unchanged from v1.0.43):
 * - built-in drivers: apps/server/src/provider/builtInDrivers.ts
 *   (Codex, Claude Code, Cursor, Grok, Muse Code, OpenCode, Pi, Antigravity)
 * - ACP registry agents: docs/user/providers-acp.md and docs/studio/copilot-and-grok.md
 *   (GitHub Copilot CLI and Gemini CLI, plus any other registry agent)
 * When a release adds or drops a driver, change it here and nowhere else.
 */
export type Provider = {
  name: string;
  /** How SpecWithCode runs it: its own built-in driver, or through the ACP registry. */
  via: 'built-in' | 'acp-registry';
};

export const SPECWITHCODE_PROVIDERS: readonly Provider[] = [
  {name: 'Claude Code', via: 'built-in'},
  {name: 'Codex', via: 'built-in'},
  {name: 'Cursor', via: 'built-in'},
  {name: 'Gemini CLI', via: 'acp-registry'},
  {name: 'GitHub Copilot CLI', via: 'acp-registry'},
  {name: 'Grok', via: 'built-in'},
  {name: 'OpenCode', via: 'built-in'},
  {name: 'Muse Code', via: 'built-in'},
  {name: 'Antigravity', via: 'built-in'},
  {name: 'Pi', via: 'built-in'},
];

export const PROVIDERS_CHECKED = {version: '1.0.44', date: '18 October 2026'} as const;

/** Every provider name in display order. */
export const providerNames: string[] = SPECWITHCODE_PROVIDERS.map(p => p.name);

/** "Claude Code, Codex, Cursor and 7 more": the short form for heroes and meta descriptions. */
export function providerSummary(lead = 3): string {
  const rest = providerNames.length - lead;
  const head = providerNames.slice(0, lead).join(', ');
  return rest > 0 ? `${head} and ${rest} more` : head;
}

/** A list as one sentence fragment: "Claude Code, Codex, ... and Pi". */
export function providerSentence(names: string[] = providerNames): string {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Coding agents shown in the home page's "Works with" row: the agents SpecWithCode
 * runs, from the list above. The SpecWeave CLI's record works with any agent that
 * reads files and runs commands.
 */
export const tools: string[] = providerNames;
