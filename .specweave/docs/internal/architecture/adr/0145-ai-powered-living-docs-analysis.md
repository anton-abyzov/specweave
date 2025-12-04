# ADR-0145: AI-Powered Living Docs Deep Analysis

**Status**: PROPOSED
**Date**: 2025-12-03
**Decision Makers**: @antonabyzov
**Category**: Architecture / AI Integration

## Context

The Living Docs Builder currently uses **Node.js-only** file scanning:
- Discovery: File counting, tech stack detection
- Module analysis: Export/import extraction via regex
- No semantic understanding of code or documentation

Users expect "Deep" analysis mode to provide **AI-powered semantic analysis** that:
1. Understands code patterns and architecture
2. Correlates imported specs with codebase modules
3. Analyzes imported documentation (Notion exports, etc.)
4. Generates intelligent recommendations
5. Could run for hours/days on large codebases

### Current Limitations

1. **Background workers are detached Node.js processes** - no Claude Code access
2. **No LLM SDK integration** in the codebase (by design - Claude Code is native interface)
3. **Deep mode** currently just analyzes ALL modules vs top 5/10 - same non-AI logic

### Requirements

1. Must support **Claude Code** users (primary use case)
2. Must support **non-Claude scenarios** (Cursor, VS Code, CI/CD, Codex, etc.)
3. Should show **progress bar**, not time estimates
4. Large codebases may take **hours to days** - must be interruptible/resumable
5. Analysis should correlate: **codebase + specs + imported docs**

---

## Options Explored

### Option 1: Claude Code Interactive Mode (Session-Based)

**Concept**: Use Claude Code's native agents for analysis within the active session.

```
User runs: /specweave:deep-analyze

Claude Code:
  ├── Load checkpoint (if resuming)
  ├── For each module (with progress bar):
  │     ├── Task({ subagent_type: 'Explore', prompt: 'Analyze module X...' })
  │     ├── Save checkpoint
  │     └── Update progress.json
  └── Generate final SUGGESTIONS.md
```

**Pros**:
- No additional API cost (within Claude Code subscription)
- Access to all Claude Code tools (Read, Grep, Glob)
- Native progress display in terminal
- Can leverage Opus 4.5 for complex analysis
- Context accumulates naturally

**Cons**:
- Only works in active Claude Code session
- Session timeouts may interrupt long analysis
- Can't run in CI/CD or automation

**Best for**: Claude Code users doing interactive development

---

### Option 2: Background Worker with LLM API

**Concept**: Add optional LLM SDK integration to background workers.

```
# .specweave/config.json
{
  "llm": {
    "provider": "anthropic",  // or "openai", "azure", "ollama", "bedrock"
    "model": "claude-sonnet-4-20250514",
    "apiKeyEnv": "ANTHROPIC_API_KEY"
  }
}
```

```
Background Worker:
  ├── Read config → LLMProviderFactory.create()
  ├── For each module:
  │     ├── Read files (Node.js)
  │     ├── llm.analyze(prompt + code) → semantic analysis
  │     ├── Save checkpoint
  │     └── Update progress.json
  └── Generate final docs
```

**Pros**:
- True background execution (survives session close)
- Works in CI/CD, non-Claude environments
- User chooses provider and model
- Cost control (can use cheaper models)

**Cons**:
- Requires API key and incurs costs
- No access to Claude Code tools (must read files directly)
- Need to implement/maintain multiple provider SDKs

**Best for**: Automation, CI/CD, non-Claude Code environments

---

### Option 3: Hybrid - Two Deep Modes

**Concept**: Offer both approaches as distinct options.

```
? How deep should the analysis go?
  ○ Quick (~5-10 min)       - Structure scan + tech detection
  ○ Standard (~15-30 min)   - Module analysis + exports + dependencies
  ○ Deep - Interactive      - AI analysis in current session (Claude Code)
  ○ Deep - Background       - AI analysis via configured LLM API
```

**Implementation**:
- `deep-interactive`: Uses skill/command that drives Claude Code agents
- `deep-background`: Uses worker with LLM provider abstraction

**Pros**:
- Users choose based on their environment
- Each mode optimized for its use case
- Clear expectations

**Cons**:
- Two code paths to maintain
- User must understand the difference

---

### Option 4: Checkpoint-Resumable Interactive Mode

**Concept**: Interactive mode with robust checkpointing that survives session restarts.

```
Session 1:
  /specweave:deep-analyze
  → Processes modules 1-15 (progress: 30%)
  → User closes terminal
  → Checkpoint saved: { phase: 'analysis', completedModules: [...] }

Session 2:
  /specweave:deep-analyze --resume
  → Loads checkpoint
  → Continues from module 16
  → Completes to 100%
```

**Pros**:
- Long-running analysis doesn't need single session
- No API costs
- Natural fit with Claude Code

**Cons**:
- Requires user to manually resume
- Progress only advances when session active

---

### Option 5: Agent SDK Background Process

**Concept**: Use Claude Agent SDK to create autonomous background agents.

```typescript
import { Agent, AgentLoop } from '@anthropic-ai/agent-sdk';

const agent = new Agent({
  model: 'claude-sonnet-4-20250514',
  tools: [FileReadTool, FileWriteTool, GlobTool],
  system: 'You are a code analyzer...'
});

// Run in background process
const loop = new AgentLoop(agent);
await loop.run('Analyze codebase at /path/to/project');
```

**Pros**:
- Autonomous operation
- Full tool access
- Could run for hours

**Cons**:
- Still needs API key (SDK wraps API)
- More complex than direct API calls
- SDK adds dependency

---

### Option 6: Split Processing (Hybrid Scanning + AI Summary)

**Concept**: Worker does heavy scanning, Claude Code does AI synthesis.

```
Phase 1 (Background Worker - No LLM):
  ├── Scan all files
  ├── Extract exports, imports, dependencies
  ├── Identify patterns and anomalies
  └── Generate structured summary JSON

Phase 2 (Claude Code Session):
  ├── Load summary from Phase 1
  ├── AI analyzes summary (not raw files)
  ├── Generates semantic documentation
  └── Creates recommendations
```

**Pros**:
- Background does I/O-heavy work
- AI only processes summaries (faster, cheaper)
- Clear separation of concerns

**Cons**:
- Two-phase flow is more complex
- AI doesn't see raw code (may miss nuances)

---

## BREAKTHROUGH DISCOVERY: Claude Code Native Provider! 🚀

During investigation, we discovered that **Claude Code CLI can be invoked programmatically**:

```bash
claude --print "Your prompt here" --output-format json --model sonnet
```

**Key findings:**
1. Works from detached background processes
2. Uses cached MAX subscription credentials from `~/.claude/`
3. **NO API KEY NEEDED** - leverages existing MAX subscription!
4. Full Claude capabilities (Opus, Sonnet, Haiku)
5. Returns structured JSON with usage stats

**Test results:**
```bash
# Works perfectly!
(cd /tmp && claude --print "2+2?" --output-format text)
# Output: 4
```

This changes everything - we can have TRUE background processing at NO EXTRA COST!

---

## Decision: THREE Deep Modes with Claude Code Native as Default

Implement **three analysis modes**:

### 1. Deep - Background Native (Claude Code CLI) ⭐ RECOMMENDED

- Uses `claude --print` CLI in background worker
- **NO API KEY NEEDED** - uses cached MAX subscription!
- True detached background process
- Full Claude capabilities (Opus, Sonnet, Haiku)
- Progress tracking via `/specweave:jobs`
- **Cost: $0** (included in MAX subscription)

```typescript
// Background worker uses Claude Code CLI
const result = execSync(
  `claude --print "${prompt}" --output-format json --model sonnet`
);
```

### 2. Deep - Interactive (Session-Based)

- New command: `/specweave:deep-analyze`
- Uses Claude Code agents within current session
- Checkpoints after each module (resumable)
- Shows progress bar via TodoWrite
- **Cost: $0** (uses current Claude Code session)

### 3. Deep - Background API (External Providers)

- For non-Claude environments (CI/CD, other tools)
- LLM Provider abstraction layer
- Supports: Anthropic API, OpenAI, Azure, Bedrock, Vertex AI, Ollama
- Runs as detached Node.js process
- **Cost: Per-token billing** (user's API key)

---

## Implementation Plan

### Phase 1: LLM Provider Abstraction

```
src/core/llm/
├── types.ts                    # LLMProvider interface, LLMConfig
├── provider-factory.ts         # Creates provider from config
├── providers/
│   ├── anthropic-provider.ts   # @anthropic-ai/sdk
│   ├── openai-provider.ts      # openai sdk
│   ├── azure-provider.ts       # Azure OpenAI
│   ├── ollama-provider.ts      # Local Ollama
│   └── bedrock-provider.ts     # AWS Bedrock
└── index.ts
```

**Interface**:
```typescript
interface LLMProvider {
  name: string;
  analyze(prompt: string, options?: AnalyzeOptions): Promise<string>;
  analyzeWithSchema<T>(prompt: string, schema: JSONSchema): Promise<T>;
  estimateCost(inputTokens: number, outputTokens: number): number;
  isAvailable(): Promise<boolean>;
}

interface AnalyzeOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;  // Override default model
}
```

### Phase 2: Enhanced Living Docs Worker

Update `living-docs-worker.ts`:

```typescript
// Phase: Deep Analysis (with LLM)
if (jobConfig.userInputs.analysisDepth === 'deep') {
  const llmConfig = loadLLMConfig(projectPath);

  if (llmConfig) {
    const provider = LLMProviderFactory.create(llmConfig);

    for (const module of modules) {
      const analysis = await analyzeModuleWithLLM(module, provider);
      saveModuleAnalysis(projectPath, analysis);
      updateProgress('deep-analysis', i / modules.length * 100);
      saveCheckpoint(projectPath, jobId, { completedModule: module.name });
    }
  } else {
    log('No LLM configured - falling back to basic analysis');
    // Existing non-LLM flow
  }
}
```

### Phase 3: Claude Code Interactive Mode

New skill: `specweave:deep-analyze`

```markdown
# Deep Analysis Skill

When user runs `/specweave:deep-analyze`:

1. Load checkpoint if exists:
   - `.specweave/state/deep-analysis/checkpoint.json`

2. Show progress bar via TodoWrite

3. For each unprocessed module:
   a. Use Task tool with Explore agent:
      - "Analyze module {name}: understand purpose, key exports,
         patterns, correlate with specs in .specweave/docs/"
   b. Save analysis to `.specweave/docs/modules/{name}.md`
   c. Update checkpoint
   d. Update todo progress

4. Generate final SUGGESTIONS.md with priorities

5. Clear checkpoint on completion
```

### Phase 4: Config Schema Update

```json
// .specweave/config.json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "apiKeyEnv": "ANTHROPIC_API_KEY",
    "baseUrl": null,  // Custom endpoint for Azure/Ollama
    "maxTokensPerRequest": 4096,
    "costTracking": true
  }
}
```

```bash
# .env (secrets - gitignored)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://....openai.azure.com
```

### Phase 5: Updated Preflight Options

```typescript
const analysisDepth = await select<'quick' | 'standard' | 'deep-interactive' | 'deep-background'>({
  message: strings.analysisDepthPrompt,
  choices: [
    {
      value: 'quick',
      name: 'Quick (~5-10 min) - Structure scan + tech detection',
    },
    {
      value: 'standard',
      name: 'Standard (~15-30 min) - Module analysis + exports',
    },
    {
      value: 'deep-interactive',
      name: 'Deep - Interactive - AI analysis in current session',
      description: 'Uses Claude Code agents. Checkpoint/resume supported.',
    },
    {
      value: 'deep-background',
      name: 'Deep - Background - AI analysis via configured LLM',
      description: 'Requires LLM config in .specweave/config.json',
      disabled: !hasLLMConfig(projectPath),
    },
  ],
});
```

---

## Cost Considerations

### Claude Code (Interactive Mode)
- **Cost**: Included in Claude Code subscription
- **No per-token charges** for API calls
- **Best for**: Individual developers

### LLM API (Background Mode)
- **Anthropic Claude Sonnet**: ~$3/1M input, ~$15/1M output
- **Anthropic Claude Haiku**: ~$1/1M input, ~$5/1M output
- **OpenAI GPT-4o**: ~$5/1M input, ~$15/1M output
- **Ollama (local)**: Free (but slower, less capable)

### Cost Tracking

Worker tracks and reports costs:
```json
// .specweave/state/jobs/{jobId}/costs.json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "inputTokens": 245000,
  "outputTokens": 89000,
  "estimatedCost": "$2.07",
  "requestCount": 47
}
```

---

## Progress Display

### Interactive Mode (Claude Code)
- TodoWrite updates show progress bar
- Each module completion logged
- Checkpoint status in terminal

### Background Mode
- `/specweave:jobs` shows progress
- `progress.json` updated per-module
- ETA calculated from processing rate

```
$ specweave jobs

Living Docs Builder [452de2d3]
├─ Status: Running
├─ Progress: ████████░░░░░░░░ 47%
├─ Current: Analyzing module 'auth-service'
├─ Completed: 23/49 modules
├─ ETA: ~35 minutes
└─ Cost: $1.24 (47 API calls)
```

---

## Migration Path

1. **v0.31.x**: Implement LLM provider abstraction
2. **v0.32.x**: Add deep-background mode to worker
3. **v0.33.x**: Add deep-interactive skill for Claude Code
4. **v0.34.x**: Add cost tracking and optimization

---

## Alternatives Considered

1. **Single unified mode** - Rejected: Too different use cases
2. **Only API mode** - Rejected: Loses Claude Code native advantage
3. **Only interactive mode** - Rejected: Doesn't support CI/CD
4. **WebSocket streaming** - Deferred: Adds complexity for v1

---

## References

- Living Docs Worker: `src/cli/workers/living-docs-worker.ts`
- Job Launcher: `src/core/background/job-launcher.ts`
- Model Selection: `src/utils/model-selection.ts`
- Adapter Pattern: `src/adapters/`
