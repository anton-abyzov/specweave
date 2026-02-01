import fs from 'fs';
import path from 'path';
import { findProjectRoot } from '../../utils/find-project-root.js';

interface InterviewState {
  incrementId: string;
  startedAt: string;
  coveredCategories: Record<string, {
    coveredAt: string;
    summary: string;
  }>;
}

const DEFAULT_CATEGORIES = ['architecture', 'integrations', 'ui-ux', 'performance', 'security', 'edge-cases'];

/**
 * Get interview state file path for an increment
 */
function getInterviewStatePath(projectRoot: string, incrementId: string): string {
  return path.join(projectRoot, '.specweave', 'state', `interview-${incrementId}.json`);
}

/**
 * Get required categories from config
 */
function getRequiredCategories(projectRoot: string): string[] {
  try {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.planning?.deepInterview?.categories || DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

/**
 * Check if strict enforcement is enabled
 */
function isStrictEnforcement(projectRoot: string): boolean {
  try {
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.planning?.deepInterview?.enabled === true &&
           config.planning?.deepInterview?.enforcement === 'strict';
  } catch {
    return false;
  }
}

/**
 * Start interview tracking for an increment
 */
export async function interviewStart(incrementId: string): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    console.error('❌ Not in a SpecWeave project. Run `specweave init` first.');
    process.exit(1);
  }

  const stateDir = path.join(projectRoot, '.specweave', 'state');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const statePath = getInterviewStatePath(projectRoot, incrementId);

  if (fs.existsSync(statePath)) {
    console.log(`⚠️  Interview already started for ${incrementId}`);
    await interviewStatus(incrementId);
    return;
  }

  const state: InterviewState = {
    incrementId,
    startedAt: new Date().toISOString(),
    coveredCategories: {}
  };

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(`✅ Interview started for ${incrementId}`);
  console.log('');
  console.log('Cover all categories before creating spec.md:');
  const categories = getRequiredCategories(projectRoot);
  categories.forEach(cat => console.log(`   - [ ] ${cat}`));
  console.log('');
  console.log('Mark categories as covered:');
  console.log(`   specweave interview mark-covered ${incrementId} architecture "summary"`);
}

/**
 * Mark a category as covered
 */
export async function interviewMarkCovered(
  incrementId: string,
  category: string,
  summary: string
): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    console.error('❌ Not in a SpecWeave project.');
    process.exit(1);
  }

  const categories = getRequiredCategories(projectRoot);
  if (!categories.includes(category)) {
    console.error(`❌ Unknown category: ${category}`);
    console.error(`Valid categories: ${categories.join(', ')}`);
    process.exit(1);
  }

  const statePath = getInterviewStatePath(projectRoot, incrementId);

  let state: InterviewState;
  if (fs.existsSync(statePath)) {
    state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } else {
    // Auto-start interview if not started
    state = {
      incrementId,
      startedAt: new Date().toISOString(),
      coveredCategories: {}
    };
  }

  state.coveredCategories[category] = {
    coveredAt: new Date().toISOString(),
    summary: summary || 'Covered'
  };

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(`✅ Marked ${category} as covered: ${summary || 'Covered'}`);

  // Show remaining
  const covered = Object.keys(state.coveredCategories);
  const remaining = categories.filter(c => !covered.includes(c));

  if (remaining.length === 0) {
    console.log('');
    console.log('🎉 All categories covered! You can now create spec.md');
  } else {
    console.log('');
    console.log(`Remaining: ${remaining.join(', ')}`);
  }
}

/**
 * Show interview status for an increment
 */
export async function interviewStatus(incrementId?: string): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    console.error('❌ Not in a SpecWeave project.');
    process.exit(1);
  }

  const isStrict = isStrictEnforcement(projectRoot);
  const categories = getRequiredCategories(projectRoot);

  console.log('📋 Deep Interview Mode');
  console.log(`   Enforcement: ${isStrict ? '🔴 STRICT (blocks spec creation)' : '🟡 Advisory'}`);
  console.log(`   Categories: ${categories.join(', ')}`);
  console.log('');

  if (!incrementId) {
    // Show all active interviews
    const stateDir = path.join(projectRoot, '.specweave', 'state');
    if (!fs.existsSync(stateDir)) {
      console.log('No active interviews.');
      return;
    }

    const files = fs.readdirSync(stateDir).filter(f => f.startsWith('interview-'));
    if (files.length === 0) {
      console.log('No active interviews.');
      return;
    }

    console.log('Active interviews:');
    for (const file of files) {
      const state: InterviewState = JSON.parse(fs.readFileSync(path.join(stateDir, file), 'utf-8'));
      const covered = Object.keys(state.coveredCategories).length;
      const total = categories.length;
      const emoji = covered === total ? '✅' : '🔄';
      console.log(`   ${emoji} ${state.incrementId}: ${covered}/${total} categories covered`);
    }
    return;
  }

  // Show specific increment
  const statePath = getInterviewStatePath(projectRoot, incrementId);
  if (!fs.existsSync(statePath)) {
    console.log(`No interview started for ${incrementId}`);
    console.log(`Start with: specweave interview start ${incrementId}`);
    return;
  }

  const state: InterviewState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const covered = Object.keys(state.coveredCategories);

  console.log(`Interview: ${incrementId}`);
  console.log(`Started: ${state.startedAt}`);
  console.log('');
  console.log('Categories:');

  for (const cat of categories) {
    if (covered.includes(cat)) {
      const info = state.coveredCategories[cat];
      console.log(`   [x] ${cat}: ${info.summary}`);
    } else {
      console.log(`   [ ] ${cat}`);
    }
  }

  const remaining = categories.filter(c => !covered.includes(c));
  if (remaining.length === 0) {
    console.log('');
    console.log('🎉 All categories covered! Ready for spec creation.');
  } else {
    console.log('');
    console.log(`⚠️  ${remaining.length} categories remaining: ${remaining.join(', ')}`);
  }
}

/**
 * Clear interview state (after spec is created)
 */
export async function interviewClear(incrementId: string): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    console.error('❌ Not in a SpecWeave project.');
    process.exit(1);
  }

  const statePath = getInterviewStatePath(projectRoot, incrementId);
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
    console.log(`✅ Interview state cleared for ${incrementId}`);
  } else {
    console.log(`No interview state found for ${incrementId}`);
  }
}

/**
 * Main interview command handler
 */
export async function interviewCommand(
  action: string,
  incrementId?: string,
  categoryOrSummary?: string,
  summary?: string
): Promise<void> {
  switch (action) {
    case 'start':
      if (!incrementId) {
        console.error('Usage: specweave interview start <increment-id>');
        process.exit(1);
      }
      await interviewStart(incrementId);
      break;

    case 'mark-covered':
    case 'mark':
    case 'cover':
      if (!incrementId || !categoryOrSummary) {
        console.error('Usage: specweave interview mark-covered <increment-id> <category> [summary]');
        process.exit(1);
      }
      await interviewMarkCovered(incrementId, categoryOrSummary, summary || '');
      break;

    case 'status':
      await interviewStatus(incrementId);
      break;

    case 'clear':
      if (!incrementId) {
        console.error('Usage: specweave interview clear <increment-id>');
        process.exit(1);
      }
      await interviewClear(incrementId);
      break;

    default:
      console.log('Usage: specweave interview <action> [args]');
      console.log('');
      console.log('Actions:');
      console.log('  start <increment-id>                    Start interview tracking');
      console.log('  mark-covered <id> <category> [summary]  Mark category as covered');
      console.log('  status [increment-id]                   Show interview status');
      console.log('  clear <increment-id>                    Clear interview state');
      console.log('');
      console.log('Categories: architecture, integrations, ui-ux, performance, security, edge-cases');
  }
}
