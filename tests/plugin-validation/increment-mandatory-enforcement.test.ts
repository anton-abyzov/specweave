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
 * Ensures that incrementAssist.mandatory config option forces SKILL FIRST
 * instructions via additionalContext (approve decision, not block).
 *
 * History: Previously used "block" decision which prevented Claude from
 * following the SKILL FIRST instructions. Changed to "approve" with
 * additionalContext so Claude can read and execute the Skill() call.
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

  it('should use approve+additionalContext for mandatory enforcement (not block)', () => {
    const hookPath = join(projectRoot, 'plugins', 'specweave', 'hooks', 'user-prompt-submit.sh');
    const content = readFileSync(hookPath, 'utf-8');
    // When INCREMENT_MANDATORY_CONFIG=true forces INC_MANDATORY=true,
    // the hook uses output_approve_with_context (not block) so Claude
    // can read and follow the SKILL FIRST instructions.
    // The mandatory enforcement happens via strong additionalContext directives.
    expect(content).toMatch(/INC_MANDATORY.*true[\s\S]*?output_approve_with_context/);
  });

  it('should use output_approve_with_context in hotfix branch', () => {
    const hookPath = join(projectRoot, 'plugins', 'specweave', 'hooks', 'user-prompt-submit.sh');
    const content = readFileSync(hookPath, 'utf-8');
    // The hotfix branch uses approve+additionalContext
    const hotfixMatch = content.match(/hotfix\)([\s\S]*?);;/);
    expect(hotfixMatch).toBeTruthy();
    expect(hotfixMatch![1]).toMatch(/output_approve_with_context/);
  });

  it('should use output_approve_with_context in small_fix branch', () => {
    const hookPath = join(projectRoot, 'plugins', 'specweave', 'hooks', 'user-prompt-submit.sh');
    const content = readFileSync(hookPath, 'utf-8');
    // The small_fix branch uses approve+additionalContext
    const smallFixMatch = content.match(/small_fix\)([\s\S]*?);;/);
    expect(smallFixMatch).toBeTruthy();
    expect(smallFixMatch![1]).toMatch(/output_approve_with_context/);
  });
});
