/**
 * Skill Match Command
 *
 * Tests a prompt against skill triggers to debug activation.
 *
 * Usage: /sw:skill-match "your prompt here"
 */

import chalk from 'chalk';
import { SkillTriggerIndexManager } from '../../core/plugins/skill-trigger-index.js';

export interface SkillMatchOptions {
  prompt: string;
  verbose?: boolean;
  minScore?: number;
}

/**
 * Main skill-match command handler
 */
export async function skillMatchCommand(options: SkillMatchOptions): Promise<void> {
  const projectRoot = process.cwd();

  if (!options.prompt) {
    console.log(chalk.red('Error: Prompt is required'));
    console.log(chalk.gray('Usage: /sw:skill-match "your prompt here"'));
    return;
  }

  console.log(chalk.bold.blue(`\n🔍 Testing Prompt: "${options.prompt}"`));
  console.log(chalk.gray('═'.repeat(options.prompt.length + 20)) + '\n');

  // Load skill trigger index
  const indexManager = new SkillTriggerIndexManager(projectRoot);
  let index;

  try {
    index = await indexManager.loadIndex();
  } catch (error) {
    console.log(chalk.red('❌ Skill trigger index not found'));
    console.log(chalk.gray('   Run: specweave refresh-marketplace\n'));
    return;
  }

  if (!index) {
    console.log(chalk.red('❌ Skill trigger index not found'));
    console.log(chalk.gray('   Run: specweave refresh-marketplace\n'));
    return;
  }

  // Match prompt against index
  const matches = await indexManager.matchPrompt(options.prompt, index);
  const minScore = options.minScore || 0.3;

  if (matches.length === 0) {
    console.log(chalk.yellow('⚠️  No skills matched this prompt\n'));
    console.log(chalk.gray('Tips:'));
    console.log(chalk.gray('  - Try using more specific keywords'));
    console.log(chalk.gray('  - Run: claude plugin list to see available plugins'));
    console.log(chalk.gray('  - Run: specweave refresh-marketplace to update index\n'));
    return;
  }

  // Filter by minimum score
  const relevantMatches = matches.filter(m => m.score >= minScore);

  if (relevantMatches.length === 0) {
    console.log(chalk.yellow(`⚠️  No skills matched with score >= ${minScore * 100}%\n`));
    console.log(chalk.gray(`Showing top ${Math.min(3, matches.length)} low-score matches:\n`));
  }

  // Display top matches
  const displayMatches = relevantMatches.length > 0 ? relevantMatches : matches.slice(0, 3);

  displayMatches.forEach((match, index) => {
    displayMatch(match, index === 0);
  });

  // Show count of other matches
  if (matches.length > displayMatches.length) {
    const remaining = matches.length - displayMatches.length;
    console.log(chalk.gray(`\n... and ${remaining} more match${remaining > 1 ? 'es' : ''}`));
  }

  // Recommendation
  if (displayMatches.length > 0) {
    const best = displayMatches[0];
    const skillName = best.fqn.split(':')[1] || best.fqn;
    console.log(chalk.bold.green(`\n✨ Recommendation: ${skillName} is the best match for this prompt.\n`));
  }
}

/**
 * Get score display properties based on percentage
 */
function getScoreDisplay(scorePercent: number): { icon: string; color: typeof chalk.green; explanation: string } {
  if (scorePercent >= 70) {
    return { icon: '✅', color: chalk.green, explanation: 'High match - prompt contains multiple relevant keywords' };
  }
  if (scorePercent >= 50) {
    return { icon: '⚠️', color: chalk.yellow, explanation: 'Medium match - some relevant keywords found' };
  }
  return { icon: '❌', color: chalk.red, explanation: 'Low match - few keywords matched' };
}

/**
 * Display a single match result
 */
function displayMatch(match: any, isBest: boolean): void {
  const scorePercent = Math.round(match.score * 100);
  const { icon, color: scoreColor, explanation } = getScoreDisplay(scorePercent);

  const skillName = match.fqn.split(':')[1] || match.fqn;
  const pluginName = match.fqn.split(':')[0] || 'unknown';

  console.log(`${icon} ${chalk.bold(skillName)} ${scoreColor(`(Score: ${scorePercent}%)`)}`);
  console.log(`   ${chalk.gray('Plugin:')} ${pluginName}`);

  if (match.matchedKeywords && match.matchedKeywords.length > 0) {
    const keywords = match.matchedKeywords.slice(0, 5).join(', ');
    console.log(`   ${chalk.gray('Matched:')} ${chalk.cyan(keywords)}`);
  }

  console.log(`   ${chalk.gray('Why:')} ${explanation}\n`);
}

/**
 * Export for CLI integration
 */
export default skillMatchCommand;
