# Simplified CI/CD Auto-Fix Architecture

**Problem**: The Phase 1 implementation is overcomplicated. The user wants a simple one-shot command that checks for failures and fixes them, not a long-running monitoring daemon.

---

## User's Actual Need

**Mental Model**: "Periodically check if workflows are red, and if so, ask Claude to fix and push"

**Use Case**: Run via cron or GitHub Actions schedule (every 5-10 minutes), not a long-running daemon.

---

## Proposed Simplified Architecture

### Single Command: `specweave cicd-autofix`

```bash
# Run this command periodically (cron, GitHub Actions schedule)
specweave cicd-autofix --repo anton-abyzov/specweave

# What it does (all in one shot):
# 1. Check GitHub Actions for failed workflows
# 2. Download logs for failed runs
# 3. Send logs to Claude with prompt: "Analyze this failure and propose a fix"
# 4. Apply fix to codebase (edit files)
# 5. Git commit + push with message: "fix: auto-fix workflow failure"
```

---

## Simplified Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ specweave cicd-autofix                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Check Workflow Status (GitHub API)                          │
│    GET /repos/{owner}/{repo}/actions/runs?status=completed     │
│    Filter: conclusion=failure, updated_at > last 10 minutes    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Has failed workflows?
                     /              \
                   Yes              No
                    │                │
                    ▼                ▼
┌────────────────────────────┐  ┌─────────────────────────┐
│ 2. Download Logs           │  │ Exit (nothing to fix)   │
│    GET /repos/.../runs/... │  └─────────────────────────┘
│    /logs                   │
└────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. Parse Logs                                                  │
│    Extract error messages, stack traces, relevant context      │
└────────────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. Ask Claude to Analyze & Fix (Sonnet)                       │
│                                                                 │
│    Prompt:                                                      │
│    "This GitHub Actions workflow failed:                       │
│     Workflow: {name}                                           │
│     Error logs: {logs}                                         │
│                                                                 │
│     Analyze the failure and propose a fix.                     │
│     Return:                                                     │
│     1. Root cause (1-2 sentences)                              │
│     2. Files to modify (with exact changes)                    │
│     3. Commit message                                          │
│                                                                 │
│     Format your response as JSON."                             │
└────────────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. Apply Fix                                                   │
│    Parse Claude's response (JSON)                              │
│    For each file: Edit/Write using SpecWeave tools            │
└────────────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. Git Commit + Push                                           │
│    git add .                                                    │
│    git commit -m "fix: {workflow_name} - {root_cause}"        │
│    git push origin {current_branch}                            │
└────────────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. Done!                                                        │
│    Workflow will re-run automatically and (hopefully) pass     │
└────────────────────────────────────────────────────────────────┘
```

---

## Code Architecture (Simplified)

### Single File Implementation

**File**: `src/cli/commands/cicd-autofix.ts` (~300 lines)

```typescript
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Main auto-fix command
 */
export async function autofix(options: {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
  dryRun?: boolean;
}): Promise<void> {
  console.log('🔍 Checking for failed workflows...');

  // 1. Check workflow status
  const octokit = new Octokit({ auth: options.token });
  const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
    owner: options.owner,
    repo: options.repo,
    status: 'completed',
    per_page: 10
  });

  // Filter failed runs from last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentFailures = data.workflow_runs.filter(
    (run) =>
      run.conclusion === 'failure' &&
      new Date(run.updated_at) > tenMinutesAgo
  );

  if (recentFailures.length === 0) {
    console.log('✅ No failed workflows found');
    return;
  }

  console.log(`🚨 Found ${recentFailures.length} failed workflow(s)`);

  // Process first failure only (simplicity)
  const failure = recentFailures[0];
  console.log(`   Processing: ${failure.name} (run #${failure.run_number})`);

  // 2. Download logs
  console.log('📥 Downloading logs...');
  const logsUrl = failure.logs_url;
  const logsResponse = await octokit.request(logsUrl);
  const logs = logsResponse.data; // Extract text from zip

  // 3. Parse logs (extract error messages)
  const errors = parseLogsForErrors(logs);
  console.log(`   Found ${errors.length} error(s)`);

  // 4. Ask Claude to analyze and fix
  console.log('🤖 Asking Claude to analyze and propose fix...');
  const fix = await askClaudeToFix({
    workflowName: failure.name,
    logs: errors.join('\n'),
    branch: options.branch || failure.head_branch
  });

  console.log('   Root cause:', fix.rootCause);
  console.log('   Files to modify:', fix.filesToModify.map(f => f.path).join(', '));

  if (options.dryRun) {
    console.log('🏁 Dry run mode - not applying fix');
    console.log('   Fix details:', JSON.stringify(fix, null, 2));
    return;
  }

  // 5. Apply fix
  console.log('🔧 Applying fix...');
  for (const file of fix.filesToModify) {
    await applyFileChange(file);
  }

  // 6. Git commit + push
  console.log('📤 Committing and pushing...');
  await execAsync('git add .');
  await execAsync(`git commit -m "${fix.commitMessage}"`);
  await execAsync(`git push origin ${options.branch || failure.head_branch}`);

  console.log('✅ Fix applied and pushed!');
  console.log(`   Workflow will re-run automatically`);
}

/**
 * Parse logs for error messages
 */
function parseLogsForErrors(logs: string): string[] {
  const lines = logs.split('\n');
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect error patterns
    if (
      line.includes('Error:') ||
      line.includes('ERROR') ||
      line.includes('Failed') ||
      line.includes('✗')
    ) {
      // Include context (5 lines before and after)
      const start = Math.max(0, i - 5);
      const end = Math.min(lines.length, i + 5);
      const context = lines.slice(start, end).join('\n');
      errors.push(context);
    }
  }

  return errors;
}

/**
 * Ask Claude to analyze failure and propose fix
 */
async function askClaudeToFix(params: {
  workflowName: string;
  logs: string;
  branch: string;
}): Promise<{
  rootCause: string;
  filesToModify: Array<{
    path: string;
    oldContent?: string;
    newContent: string;
  }>;
  commitMessage: string;
}> {
  const prompt = `
This GitHub Actions workflow failed:

Workflow: ${params.workflowName}
Branch: ${params.branch}

Error logs:
\`\`\`
${params.logs}
\`\`\`

Analyze the failure and propose a fix.

Return your response as JSON with this structure:
{
  "rootCause": "1-2 sentence explanation",
  "filesToModify": [
    {
      "path": "path/to/file.ts",
      "oldContent": "content to replace (optional)",
      "newContent": "new content"
    }
  ],
  "commitMessage": "fix: concise commit message"
}

Only include files that need changes. Be specific and actionable.
`;

  // Use Claude API (Sonnet model)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const content = data.content[0].text;

  // Parse JSON from Claude's response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Apply file change
 */
async function applyFileChange(file: {
  path: string;
  oldContent?: string;
  newContent: string;
}): Promise<void> {
  if (file.oldContent) {
    // Replace old content with new
    const current = await fs.readFile(file.path, 'utf-8');
    const updated = current.replace(file.oldContent, file.newContent);
    await fs.writeFile(file.path, updated, 'utf-8');
  } else {
    // Overwrite entire file
    await fs.writeFile(file.path, file.newContent, 'utf-8');
  }
}
```

---

## What to Keep from Phase 1

From the Phase 1 implementation, we can reuse:

✅ **Keep**:
- WorkflowMonitor class (simplified - just status check, no polling)
- GitHub API integration (Octokit)
- Test infrastructure

❌ **Remove**:
- StateManager (no persistent state needed)
- Notifier (just console.log is fine)
- MonitorService (too complex)
- Configuration loader (just env vars)
- CLI commands for start/stop/status (not a daemon)

---

## Deployment Options

### Option 1: Cron Job (Local)
```bash
# Run every 5 minutes
*/5 * * * * cd /path/to/repo && specweave cicd-autofix
```

### Option 2: GitHub Actions Schedule
```yaml
# .github/workflows/auto-fix.yml
name: Auto-Fix Failed Workflows

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  auto-fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install SpecWeave
        run: npm install -g specweave
      - name: Run Auto-Fix
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: specweave cicd-autofix --repo ${{ github.repository }}
```

### Option 3: Manual Trigger
```bash
# Run manually when you see a red workflow
specweave cicd-autofix
```

---

## Cost Analysis (Simplified)

### With Simplified Architecture
- **GitHub API**: FREE (5000 requests/hour)
- **Claude API**: ~$0.01 per fix (Sonnet model)
- **Storage**: $0 (no persistent state)

**Monthly Cost** (assuming 10 failures/month): ~$0.10

**Much cheaper than Phase 1's complex architecture!**

---

## Comparison: Complex vs Simple

| Aspect | Phase 1 (Complex) | Simplified |
|--------|------------------|------------|
| **Architecture** | Long-running daemon | One-shot command |
| **State** | Persistent (file-based) | Stateless |
| **Polling** | Every 60s | On-demand |
| **Notifications** | Multi-channel | Console only |
| **Configuration** | Multi-source | Env vars only |
| **Lines of Code** | ~3,200 lines | ~300 lines |
| **Tests** | 26 tests | 5 tests |
| **Deployment** | Service/daemon | Cron or GitHub Actions |
| **Cost** | $0/month | $0.10/month |
| **Complexity** | High | Low |
| **Maintenance** | High | Low |

**Winner**: Simplified architecture (10x simpler!)

---

## Recommendation

**Use the simplified architecture!**

**Why**:
1. ✅ Matches your mental model ("periodically check and fix")
2. ✅ 10x simpler (300 lines vs 3,200 lines)
3. ✅ Easier to understand and maintain
4. ✅ No persistent state (stateless = simpler)
5. ✅ Works with cron or GitHub Actions schedule
6. ✅ Costs nearly nothing ($0.10/month)

**Phase 1 is overkill** for your use case. A simple one-shot command is all you need!

---

## Next Steps

**Option A**: Build the simplified architecture from scratch (recommended)
- Single file: `src/cli/commands/cicd-autofix.ts`
- ~300 lines of code
- 5 simple tests
- Ready in ~1 hour

**Option B**: Refactor Phase 1 to be simpler
- Remove StateManager, Notifier, MonitorService
- Keep only WorkflowMonitor (simplified)
- Convert to one-shot command

**Which do you prefer?**
