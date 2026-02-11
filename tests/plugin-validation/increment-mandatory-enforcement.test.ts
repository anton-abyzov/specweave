import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

/**
 * Validation Tests: Increment Mandatory Enforcement (Config-Based)
 *
 * Ensures that incrementAssist.mandatory config option is wired up
 * to block implementation prompts when no increment exists.
 */

describe('ISSUE-2: Config-based mandatory increment enforcement', () => {

  it('should read incrementAssist.mandatory from config in user-prompt-submit hook', () => {
    const hookPath = join(projectRoot, 'plugins', 'specweave', 'hooks', 'user-prompt-submit.sh');
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toMatch(/incrementAssist\.mandatory|INCREMENT_MANDATORY_CONFIG/i);
  });

  it('should override LLM mandatory=false when config mandatory=true', () => {
    const hookPath = join(projectRoot, 'plugins', 'specweave', 'hooks', 'user-prompt-submit.sh');
    const content = readFileSync(hookPath, 'utf-8');
    // When config says mandatory=true, INC_MANDATORY should be forced true
    expect(content).toMatch(/INCREMENT_MANDATORY_CONFIG.*true.*INC_MANDATORY|config.*mandatory.*INC_MANDATORY.*true/is);
  });

  it('should have mandatory field in incrementAssist schema', () => {
    const schemaPath = join(projectRoot, 'src', 'core', 'schemas', 'specweave-config.schema.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    // Navigate to incrementAssist properties
    const incrementAssistProps = schema.properties?.incrementAssist?.properties;
    expect(incrementAssistProps?.mandatory).toBeDefined();
    expect(incrementAssistProps?.mandatory?.type).toBe('boolean');
  });

  it('should use block decision when config-forced mandatory=true', () => {
    const hookPath = join(projectRoot, 'plugins', 'specweave', 'hooks', 'user-prompt-submit.sh');
    const content = readFileSync(hookPath, 'utf-8');
    // When incrementAssist.mandatory=true from config AND implementation detected,
    // hook must use "block" decision (not "approve")
    expect(content).toMatch(/INCREMENT_MANDATORY_CONFIG.*block|mandatory.*config.*decision.*block/is);
  });

  it('should enforce block on hotfix action when config mandatory=true', () => {
    const hookPath = join(projectRoot, 'plugins', 'specweave', 'hooks', 'user-prompt-submit.sh');
    const content = readFileSync(hookPath, 'utf-8');
    // The hotfix branch must also check INCREMENT_MANDATORY_CONFIG and use block
    // Extract the hotfix case branch content
    const hotfixMatch = content.match(/hotfix\)([\s\S]*?);;/);
    expect(hotfixMatch).toBeTruthy();
    expect(hotfixMatch![1]).toMatch(/INCREMENT_MANDATORY_CONFIG/);
  });

  it('should enforce block on small_fix action when config mandatory=true', () => {
    const hookPath = join(projectRoot, 'plugins', 'specweave', 'hooks', 'user-prompt-submit.sh');
    const content = readFileSync(hookPath, 'utf-8');
    // The small_fix branch must also check INCREMENT_MANDATORY_CONFIG and use block
    const smallFixMatch = content.match(/small_fix\)([\s\S]*?);;/);
    expect(smallFixMatch).toBeTruthy();
    expect(smallFixMatch![1]).toMatch(/INCREMENT_MANDATORY_CONFIG/);
  });
});
