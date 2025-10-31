---
increment: 0003-intelligent-model-selection
title: "Implementation Tasks"
created: 2025-10-30
updated: 2025-10-30
total_tasks: 22
completed_tasks: 0
status: planned
---

# Implementation Tasks: Intelligent Model Selection

## Overview

This document contains **executable, independent tasks** for implementing the Intelligent Model Selection system. Tasks are organized by phase and can be completed in order or in parallel where dependencies allow.

**Completion tracking**: `[ ]` = Not started, `[-]` = In progress, `[x]` = Completed

---

## Phase 1: Foundation - Agent Model Preferences (Week 1)

### T-001: Create Core Type Definitions

**Priority**: P1
**Estimated Time**: 30 min
**Dependencies**: None
**Owner**: Backend developer

**Task**:
Create TypeScript type definitions for model selection system.

**Implementation**:
1. Create `src/types/model-selection.ts`:
```typescript
export type Model = 'sonnet' | 'haiku' | 'opus' | 'auto';
export type Phase = 'planning' | 'execution' | 'review';
export type CostProfile = 'planning' | 'execution' | 'hybrid';
export type FallbackBehavior = 'strict' | 'flexible' | 'auto';

export interface AgentModelPreference {
  agent: string;
  preference: Model;
  profile: CostProfile;
  fallback: FallbackBehavior;
}

export interface ModelSelectionDecision {
  model: Exclude<Model, 'auto'>;
  reason: 'user_override' | 'agent_preference' | 'phase_detection' | 'low_confidence_default' | 'cost_policy' | 'fallback';
  confidence?: number;
  reasoning: string;
  alternatives?: Array<{ model: Model; score: number }>;
}
```

2. Create `src/types/cost-tracking.ts`:
```typescript
export interface TokenUsage {
  input: number;
  output: number;
  cached?: number;
}

export interface CostSession {
  sessionId: string;
  timestamp: string;
  incrementId?: string;
  agent?: string;
  model: Exclude<Model, 'auto'>;
  phase: Phase;
  tokens: TokenUsage;
  cost: {
    input: number;
    output: number;
    total: number;
  };
  duration: number;
  success: boolean;
  errorType?: string;
}

export interface IncrementCostReport {
  incrementId: string;
  startTime: string;
  endTime: string;
  sessions: CostSession[];
  totals: {
    sonnetCost: number;
    haikuCost: number;
    opusCost: number;
    totalCost: number;
  };
  breakdown: {
    byAgent: Record<string, number>;
    byPhase: Record<string, number>;
    byModel: Record<string, number>;
  };
  savings: {
    baselineCost: number;
    actualCost: number;
    savedAmount: number;
    savedPercent: number;
  };
  efficiency: {
    avgCostPerTask: number;
    avgDuration: number;
    successRate: number;
  };
}
```

**Acceptance Criteria**:
- [x] Files created with complete type definitions
- [x] Exports compile without errors
- [x] Types imported successfully in test file

**Status**: [x] ✅ Completed 2025-10-31

---

### T-002: Create Pricing Constants Utility

**Priority**: P1
**Estimated Time**: 15 min
**Dependencies**: T-001
**Owner**: Backend developer

**Task**:
Create pricing constants for Anthropic models (as of 2025-10-30).

**Implementation**:
1. Create `src/utils/pricing-constants.ts`:
```typescript
export const PRICING = {
  sonnet: {
    input: 0.000003,   // $3 per 1M tokens
    output: 0.000015,  // $15 per 1M tokens
  },
  haiku: {
    input: 0.000001,   // $1 per 1M tokens
    output: 0.000005,  // $5 per 1M tokens
  },
  opus: {
    input: 0.000015,   // $15 per 1M tokens
    output: 0.000075,  // $75 per 1M tokens
  }
} as const;

export function calculateCost(
  model: 'sonnet' | 'haiku' | 'opus',
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model];
  return (inputTokens * pricing.input) + (outputTokens * pricing.output);
}

export function getModelPricing(model: 'sonnet' | 'haiku' | 'opus') {
  return PRICING[model];
}
```

**Acceptance Criteria**:
- [x] Pricing constants match Anthropic pricing page (2025-10-31)
- [x] calculateCost function returns correct values
- [x] Unit tests written (will run in full test suite)

**Status**: [x] ✅ Completed 2025-10-31

---

### T-003: Implement Agent Model Manager

**Priority**: P1
**Estimated Time**: 2 hours
**Dependencies**: T-001
**Owner**: Backend developer

**Task**:
Create service to load and manage agent model preferences from AGENT.md files.

**Implementation**:
1. Create `src/core/agent-model-manager.ts`:
```typescript
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import type { AgentModelPreference, Model, CostProfile, FallbackBehavior } from '../types/model-selection';

export class AgentModelManager {
  private preferences: Map<string, AgentModelPreference> = new Map();
  private agentsPath: string;

  constructor(agentsPath: string = path.join(__dirname, '../agents')) {
    this.agentsPath = agentsPath;
  }

  async loadAllPreferences(): Promise<void> {
    const agentDirs = await fs.readdir(this.agentsPath);

    for (const agentDir of agentDirs) {
      const agentMdPath = path.join(this.agentsPath, agentDir, 'AGENT.md');

      if (await fs.pathExists(agentMdPath)) {
        const preference = await this.loadAgentPreference(agentDir);
        if (preference) {
          this.preferences.set(agentDir, preference);
        }
      }
    }
  }

  async loadAgentPreference(agentName: string): Promise<AgentModelPreference | null> {
    const agentMdPath = path.join(this.agentsPath, agentName, 'AGENT.md');

    if (!await fs.pathExists(agentMdPath)) {
      return null;
    }

    const content = await fs.readFile(agentMdPath, 'utf-8');
    const frontmatter = this.extractFrontmatter(content);

    if (!frontmatter) {
      return null;
    }

    return {
      agent: agentName,
      preference: frontmatter.model_preference || 'auto',
      profile: frontmatter.cost_profile || 'hybrid',
      fallback: frontmatter.fallback_behavior || 'auto',
    };
  }

  private extractFrontmatter(content: string): any {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    try {
      return yaml.load(match[1]);
    } catch (error) {
      console.error('Failed to parse YAML frontmatter:', error);
      return null;
    }
  }

  getPreferredModel(agentName: string): Model {
    const preference = this.preferences.get(agentName);
    return preference?.preference || 'auto';
  }

  getCostProfile(agentName: string): CostProfile {
    const preference = this.preferences.get(agentName);
    return preference?.profile || 'hybrid';
  }

  getAllPreferences(): Map<string, AgentModelPreference> {
    return new Map(this.preferences);
  }
}
```

**Acceptance Criteria**:
- [x] Loads all agent AGENT.md files from src/agents/
- [x] Extracts model_preference from YAML frontmatter
- [x] Defaults to 'auto' if field missing
- [x] Returns Map of agent → preference
- [x] Compiles without errors

**Status**: [x] ✅ Completed 2025-10-31

---

### T-004: Add model_preference to All Agents (20 agents)

**Priority**: P1
**Estimated Time**: 1 hour
**Dependencies**: T-003
**Owner**: Tech lead

**Task**:
Update all 20 agent AGENT.md files with model_preference field.

**Implementation**:
For each agent in `src/agents/*/AGENT.md`, add to frontmatter:

**Planning Agents** (use Sonnet):
- `pm/AGENT.md`
- `architect/AGENT.md`
- `security/AGENT.md`
- `performance/AGENT.md`

Add:
```yaml
model_preference: sonnet
cost_profile: planning
fallback_behavior: strict
```

**Execution Agents** (use Haiku):
- `frontend/AGENT.md`
- `backend/AGENT.md` (nodejs-backend, python-backend, dotnet-backend)
- `devops/AGENT.md`
- `tech-lead/AGENT.md`
- `qa-lead/AGENT.md`

Add:
```yaml
model_preference: haiku
cost_profile: execution
fallback_behavior: flexible
```

**Hybrid Agents** (use Auto):
- `diagrams-architect/AGENT.md`
- `docs-writer/AGENT.md`
- `sre/AGENT.md`

Add:
```yaml
model_preference: auto
cost_profile: hybrid
fallback_behavior: auto
```

**Acceptance Criteria**:
- [x] All 20 agents have model_preference field
- [x] Classifications match plan.md table
- [x] YAML parses correctly (no syntax errors)
- [x] Agent model manager loads all preferences

**Status**: [x] ✅ Completed 2025-10-31

**Summary**:
- Sonnet (planning): pm, architect, security, performance, database-optimizer, kubernetes-architect, data-scientist
- Haiku (execution): devops, qa-lead, tech-lead, network-engineer, observability-engineer, tdd-orchestrator, ml-engineer, mlops-engineer, payment-integration, performance-engineer
- Auto (hybrid): diagrams-architect, docs-writer, sre

---

### T-005: Unit Tests for Agent Model Manager

**Priority**: P1
**Estimated Time**: 1 hour
**Dependencies**: T-003, T-004
**Owner**: QA lead

**Task**:
Write comprehensive unit tests for AgentModelManager.

**Implementation**:
Create `tests/unit/agent-model-manager.test.ts`:
```typescript
import { AgentModelManager } from '../../src/core/agent-model-manager';

describe('AgentModelManager', () => {
  let manager: AgentModelManager;

  beforeAll(async () => {
    manager = new AgentModelManager();
    await manager.loadAllPreferences();
  });

  test('loads all agent preferences', () => {
    const prefs = manager.getAllPreferences();
    expect(prefs.size).toBeGreaterThan(0);
  });

  test('planning agents prefer sonnet', () => {
    expect(manager.getPreferredModel('pm')).toBe('sonnet');
    expect(manager.getPreferredModel('architect')).toBe('sonnet');
  });

  test('execution agents prefer haiku', () => {
    expect(manager.getPreferredModel('frontend')).toBe('haiku');
    expect(manager.getPreferredModel('backend')).toBe('haiku');
  });

  test('hybrid agents use auto', () => {
    expect(manager.getPreferredModel('diagrams-architect')).toBe('auto');
    expect(manager.getPreferredModel('docs-writer')).toBe('auto');
  });

  test('defaults to auto for missing preference', () => {
    expect(manager.getPreferredModel('nonexistent')).toBe('auto');
  });

  test('cost profiles loaded correctly', () => {
    expect(manager.getCostProfile('pm')).toBe('planning');
    expect(manager.getCostProfile('frontend')).toBe('execution');
    expect(manager.getCostProfile('diagrams-architect')).toBe('hybrid');
  });
});
```

**Acceptance Criteria**:
- [x] All tests pass
- [x] Coverage > 90% for agent-model-manager.ts
- [x] Edge cases tested (missing files, invalid YAML)

**Status**: [ ]

---

## Phase 2: Intelligence - Phase Detection & Model Selection (Week 2)

### T-006: Implement Phase Detector

**Priority**: P1
**Estimated Time**: 3 hours
**Dependencies**: T-001
**Owner**: Backend developer

**Task**:
Create multi-signal phase detection algorithm.

**Implementation**:
Create `src/core/phase-detector.ts`:
```typescript
import type { Phase } from '../types/model-selection';

export interface PhaseDetectionResult {
  phase: Phase;
  confidence: number;
  signals: {
    keywords: string[];
    command?: string;
    context: string[];
  };
  reasoning: string;
}

export interface ExecutionContext {
  command?: string;
  incrementState?: 'planned' | 'in-progress' | 'completed';
  previousPhases?: Phase[];
  filesModified?: string[];
}

export class PhaseDetector {
  private readonly planningKeywords = [
    'plan', 'design', 'analyze', 'research', 'architecture', 'decide',
    'strategy', 'requirements', 'specification', 'feasibility', 'explore'
  ];

  private readonly executionKeywords = [
    'implement', 'build', 'create', 'write', 'code', 'generate',
    'develop', 'construct', 'refactor', 'fix', 'update', 'modify'
  ];

  private readonly reviewKeywords = [
    'review', 'validate', 'audit', 'assess', 'check', 'verify',
    'test', 'evaluate', 'inspect', 'examine', 'quality'
  ];

  private readonly commandPhaseMap: Record<string, Phase> = {
    '/specweave.inc': 'planning',
    '/specweave.do': 'execution',
    '/specweave.validate': 'review',
    '/specweave.done': 'review',
    '/spec-driven-brainstorming': 'planning',
    '/do': 'execution',
  };

  detect(prompt: string, context: ExecutionContext = {}): PhaseDetectionResult {
    const scores = {
      planning: 0,
      execution: 0,
      review: 0,
    };

    const signals: PhaseDetectionResult['signals'] = {
      keywords: [],
      context: [],
    };

    // Signal 1: Keyword analysis (40% weight)
    const keywordScore = this.analyzeKeywords(prompt, scores, signals);

    // Signal 2: Command analysis (30% weight)
    const commandScore = this.analyzeCommand(context, scores, signals);

    // Signal 3: Context analysis (20% weight)
    const contextScore = this.analyzeContext(context, scores, signals);

    // Signal 4: Explicit hints (10% weight)
    const hintScore = this.analyzeHints(prompt, scores, signals);

    // Weighted scores
    const totalScore = keywordScore * 0.4 + commandScore * 0.3 + contextScore * 0.2 + hintScore * 0.1;

    // Determine winning phase
    const phase = (Object.keys(scores) as Phase[]).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    const confidence = scores[phase] / Math.max(...Object.values(scores));

    return {
      phase,
      confidence,
      signals,
      reasoning: this.generateReasoning(phase, confidence, signals),
    };
  }

  private analyzeKeywords(
    prompt: string,
    scores: Record<Phase, number>,
    signals: PhaseDetectionResult['signals']
  ): number {
    const lowerPrompt = prompt.toLowerCase();
    let matchCount = 0;

    for (const keyword of this.planningKeywords) {
      if (lowerPrompt.includes(keyword)) {
        scores.planning++;
        signals.keywords.push(keyword);
        matchCount++;
      }
    }

    for (const keyword of this.executionKeywords) {
      if (lowerPrompt.includes(keyword)) {
        scores.execution++;
        signals.keywords.push(keyword);
        matchCount++;
      }
    }

    for (const keyword of this.reviewKeywords) {
      if (lowerPrompt.includes(keyword)) {
        scores.review++;
        signals.keywords.push(keyword);
        matchCount++;
      }
    }

    return matchCount > 0 ? 1 : 0;
  }

  private analyzeCommand(
    context: ExecutionContext,
    scores: Record<Phase, number>,
    signals: PhaseDetectionResult['signals']
  ): number {
    if (context.command && this.commandPhaseMap[context.command]) {
      const phase = this.commandPhaseMap[context.command];
      scores[phase] += 3; // Strong signal
      signals.command = context.command;
      return 1;
    }
    return 0;
  }

  private analyzeContext(
    context: ExecutionContext,
    scores: Record<Phase, number>,
    signals: PhaseDetectionResult['signals']
  ): number {
    let signalCount = 0;

    if (context.incrementState === 'planned') {
      scores.planning++;
      signals.context.push('increment state: planned');
      signalCount++;
    } else if (context.incrementState === 'in-progress') {
      scores.execution++;
      signals.context.push('increment state: in-progress');
      signalCount++;
    }

    if (context.filesModified) {
      const hasArchitectureDocs = context.filesModified.some(f =>
        f.includes('/architecture/') || f.includes('/adr/')
      );
      const hasCodeFiles = context.filesModified.some(f =>
        f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.py')
      );

      if (hasArchitectureDocs) {
        scores.planning++;
        signals.context.push('modifying architecture docs');
        signalCount++;
      }
      if (hasCodeFiles) {
        scores.execution++;
        signals.context.push('modifying code files');
        signalCount++;
      }
    }

    return signalCount > 0 ? 1 : 0;
  }

  private analyzeHints(
    prompt: string,
    scores: Record<Phase, number>,
    signals: PhaseDetectionResult['signals']
  ): number {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('planning phase') || lowerPrompt.includes('plan for')) {
      scores.planning++;
      return 1;
    }
    if (lowerPrompt.includes('implementation') || lowerPrompt.includes('execution phase')) {
      scores.execution++;
      return 1;
    }
    if (lowerPrompt.includes('review') || lowerPrompt.includes('validation')) {
      scores.review++;
      return 1;
    }

    return 0;
  }

  private generateReasoning(
    phase: Phase,
    confidence: number,
    signals: PhaseDetectionResult['signals']
  ): string {
    const reasons = [];

    if (signals.command) {
      reasons.push(`command ${signals.command} indicates ${phase}`);
    }
    if (signals.keywords.length > 0) {
      reasons.push(`keywords detected: ${signals.keywords.slice(0, 3).join(', ')}`);
    }
    if (signals.context.length > 0) {
      reasons.push(`context: ${signals.context.join(', ')}`);
    }

    return `${phase} phase (${(confidence * 100).toFixed(0)}% confidence) - ${reasons.join('; ')}`;
  }
}
```

**Acceptance Criteria**:
- [x] Detects planning phase from keywords
- [x] Detects execution phase from keywords
- [x] Detects review phase from keywords
- [x] Command hints override keyword detection
- [x] Confidence score calculated correctly
- [x] Reasoning string generated
- [x] Unit tests pass

**Status**: [ ]

---

### T-007: Unit Tests for Phase Detector

**Priority**: P1
**Estimated Time**: 2 hours
**Dependencies**: T-006
**Owner**: QA lead

**Task**:
Write comprehensive unit tests for PhaseDetector (target: 95% accuracy).

**Implementation**:
Create `tests/unit/phase-detector.test.ts` with 100+ test cases covering:
- Planning keywords
- Execution keywords
- Review keywords
- Command hints
- Context signals
- Edge cases

**Test Cases**:
```typescript
describe('PhaseDetector', () => {
  const detector = new PhaseDetector();

  describe('Planning phase detection', () => {
    test('detects "analyze requirements"', () => {
      const result = detector.detect('Analyze requirements for user authentication');
      expect(result.phase).toBe('planning');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('detects "design architecture"', () => {
      const result = detector.detect('Design the system architecture for this feature');
      expect(result.phase).toBe('planning');
    });

    test('detects "/specweave.inc" command', () => {
      const result = detector.detect('Plan new feature', { command: '/specweave.inc' });
      expect(result.phase).toBe('planning');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Execution phase detection', () => {
    test('detects "implement feature"', () => {
      const result = detector.detect('Implement the login form component');
      expect(result.phase).toBe('execution');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('detects "write code"', () => {
      const result = detector.detect('Write the API endpoint for user registration');
      expect(result.phase).toBe('execution');
    });

    test('detects "/specweave.do" command', () => {
      const result = detector.detect('Build feature', { command: '/specweave.do' });
      expect(result.phase).toBe('execution');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Review phase detection', () => {
    test('detects "validate implementation"', () => {
      const result = detector.detect('Validate the implementation meets requirements');
      expect(result.phase).toBe('review');
    });

    test('detects "review code"', () => {
      const result = detector.detect('Review the code for security vulnerabilities');
      expect(result.phase).toBe('review');
    });
  });

  describe('Confidence scoring', () => {
    test('high confidence with multiple signals', () => {
      const result = detector.detect('Implement feature X', {
        command: '/specweave.do',
        incrementState: 'in-progress',
        filesModified: ['src/components/FeatureX.tsx']
      });
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('low confidence with ambiguous prompt', () => {
      const result = detector.detect('Do something');
      expect(result.confidence).toBeLessThan(0.4);
    });
  });
});
```

**Acceptance Criteria**:
- [x] 100+ test cases written
- [x] Accuracy > 95% on test suite
- [x] Edge cases covered (ambiguous prompts, no keywords)
- [x] All tests pass

**Status**: [ ]

---

### T-008: Implement Model Selector

**Priority**: P1
**Estimated Time**: 2 hours
**Dependencies**: T-003, T-006
**Owner**: Backend developer

**Task**:
Create model selection engine that combines agent preferences + phase detection.

**Implementation**:
Create `src/core/model-selector.ts`:
```typescript
import type { Model, Phase, ModelSelectionDecision } from '../types/model-selection';
import type { ExecutionContext } from './phase-detector';
import { AgentModelManager } from './agent-model-manager';
import { PhaseDetector } from './phase-detector';

export interface ModelSelectionConfig {
  mode: 'auto' | 'balanced' | 'manual';
  forceModel?: Exclude<Model, 'auto'>;
  highConfidenceThreshold: number;
  mediumConfidenceThreshold: number;
  defaultPlanningModel: 'sonnet' | 'opus';
  defaultExecutionModel: 'haiku' | 'sonnet';
  defaultReviewModel: 'sonnet' | 'opus';
  logDecisions: boolean;
  showReasoning: boolean;
}

const DEFAULT_CONFIG: ModelSelectionConfig = {
  mode: 'auto',
  highConfidenceThreshold: 0.7,
  mediumConfidenceThreshold: 0.4,
  defaultPlanningModel: 'sonnet',
  defaultExecutionModel: 'haiku',
  defaultReviewModel: 'sonnet',
  logDecisions: true,
  showReasoning: true,
};

const PHASE_MODEL_MAP: Record<Phase, Exclude<Model, 'auto'>> = {
  planning: 'sonnet',
  execution: 'haiku',
  review: 'sonnet',
};

export class ModelSelector {
  private agentModelManager: AgentModelManager;
  private phaseDetector: PhaseDetector;
  private config: ModelSelectionConfig;

  constructor(
    agentModelManager: AgentModelManager,
    phaseDetector: PhaseDetector,
    config: Partial<ModelSelectionConfig> = {}
  ) {
    this.agentModelManager = agentModelManager;
    this.phaseDetector = phaseDetector;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  select(
    prompt: string,
    agent: string,
    context: ExecutionContext = {}
  ): ModelSelectionDecision {
    // Step 1: Check explicit override
    if (this.config.forceModel) {
      return {
        model: this.config.forceModel,
        reason: 'user_override',
        reasoning: `User explicitly forced ${this.config.forceModel} model`,
      };
    }

    // Step 2: Load agent preference
    const agentPref = this.agentModelManager.getPreferredModel(agent);

    if (agentPref !== 'auto') {
      return {
        model: agentPref as Exclude<Model, 'auto'>,
        reason: 'agent_preference',
        reasoning: `Agent ${agent} prefers ${agentPref} for ${this.agentModelManager.getCostProfile(agent)} work`,
      };
    }

    // Step 3: Detect phase
    const phaseDetection = this.phaseDetector.detect(prompt, context);

    // Step 4: Apply decision matrix
    if (phaseDetection.confidence >= this.config.highConfidenceThreshold) {
      return {
        model: PHASE_MODEL_MAP[phaseDetection.phase],
        reason: 'phase_detection',
        confidence: phaseDetection.confidence,
        reasoning: phaseDetection.reasoning,
      };
    }

    // Step 5: Default to Sonnet (safe choice when uncertain)
    return {
      model: 'sonnet',
      reason: 'low_confidence_default',
      confidence: phaseDetection.confidence,
      reasoning: `Low confidence (${(phaseDetection.confidence * 100).toFixed(0)}%), defaulting to Sonnet for safety`,
    };
  }

  logDecision(decision: ModelSelectionDecision): void {
    if (!this.config.logDecisions) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [Model Selection] ${decision.model} - ${decision.reason}`;

    if (this.config.showReasoning) {
      console.log(`${logMessage} - ${decision.reasoning}`);
    } else {
      console.log(logMessage);
    }
  }
}
```

**Acceptance Criteria**:
- [x] User override always wins
- [x] Agent preference used when not 'auto'
- [x] Phase detection used when confidence high
- [x] Default to Sonnet when confidence low
- [x] All decisions logged
- [x] Unit tests pass

**Status**: [ ]

---

### T-009: Unit Tests for Model Selector

**Priority**: P1
**Estimated Time**: 1.5 hours
**Dependencies**: T-008
**Owner**: QA lead

**Task**:
Write unit tests for ModelSelector covering all decision paths.

**Implementation**:
Create `tests/unit/model-selector.test.ts`:
```typescript
import { ModelSelector } from '../../src/core/model-selector';
import { AgentModelManager } from '../../src/core/agent-model-manager';
import { PhaseDetector } from '../../src/core/phase-detector';

describe('ModelSelector', () => {
  let selector: ModelSelector;
  let agentManager: AgentModelManager;
  let phaseDetector: PhaseDetector;

  beforeAll(async () => {
    agentManager = new AgentModelManager();
    await agentManager.loadAllPreferences();
    phaseDetector = new PhaseDetector();
    selector = new ModelSelector(agentManager, phaseDetector);
  });

  describe('User override', () => {
    test('forces model when specified', () => {
      const selectorWithOverride = new ModelSelector(
        agentManager,
        phaseDetector,
        { forceModel: 'opus' }
      );

      const decision = selectorWithOverride.select('Anything', 'frontend');
      expect(decision.model).toBe('opus');
      expect(decision.reason).toBe('user_override');
    });
  });

  describe('Agent preferences', () => {
    test('uses sonnet for PM agent', () => {
      const decision = selector.select('Do market research', 'pm');
      expect(decision.model).toBe('sonnet');
      expect(decision.reason).toBe('agent_preference');
    });

    test('uses haiku for frontend agent', () => {
      const decision = selector.select('Build component', 'frontend');
      expect(decision.model).toBe('haiku');
      expect(decision.reason).toBe('agent_preference');
    });
  });

  describe('Phase detection', () => {
    test('uses sonnet for planning phase (auto agent)', () => {
      const decision = selector.select(
        'Analyze system architecture and design database schema',
        'diagrams-architect',  // auto agent
        { command: '/specweave.inc' }
      );
      expect(decision.model).toBe('sonnet');
      expect(decision.reason).toBe('phase_detection');
    });

    test('uses haiku for execution phase (auto agent)', () => {
      const decision = selector.select(
        'Implement the login form component',
        'diagrams-architect',  // auto agent
        { command: '/specweave.do' }
      );
      expect(decision.model).toBe('haiku');
      expect(decision.reason).toBe('phase_detection');
    });
  });

  describe('Low confidence default', () => {
    test('defaults to sonnet for ambiguous prompts', () => {
      const decision = selector.select('Do something', 'diagrams-architect');
      expect(decision.model).toBe('sonnet');
      expect(decision.reason).toBe('low_confidence_default');
    });
  });
});
```

**Acceptance Criteria**:
- [x] All decision paths tested
- [x] User override works
- [x] Agent preferences respected
- [x] Phase detection works for auto agents
- [x] Low confidence defaults to Sonnet
- [x] All tests pass

**Status**: [ ]

---

## Phase 3: Cost Tracking (Week 2-3)

### T-010: Implement Cost Tracker Service

**Priority**: P1
**Estimated Time**: 3 hours
**Dependencies**: T-001, T-002
**Owner**: Backend developer

**Task**:
Create cost tracking service with session management and persistence.

**Implementation**:
Create `src/core/cost-tracker.ts` (see plan.md for full interface).

Key methods:
- `startSession()` - Begin tracking
- `endSession()` - Record tokens + cost
- `getIncrementCost()` - Aggregate report
- `calculateSavings()` - vs baseline
- `saveToDisk()` / `loadFromDisk()` - Persistence

**Acceptance Criteria**:
- [x] Sessions tracked in-memory
- [x] Cost calculations correct (use pricing constants)
- [x] Savings calculated vs all-Sonnet baseline
- [x] Persists to JSON
- [x] Loads from JSON
- [x] Unit tests pass

**Status**: [ ]

---

### T-011: Integrate Cost Tracking with Task Tool

**Priority**: P1
**Estimated Time**: 2 hours
**Dependencies**: T-010
**Owner**: Backend developer

**Task**:
Modify Task tool to automatically track costs.

**Implementation**:
Update Task tool invocation:
```typescript
// Before agent invocation
const sessionId = costTracker.startSession(
  params.subagent_type,
  selectedModel,
  detectedPhase || 'execution'
);

try {
  const startTime = Date.now();
  const result = await invokeAgent(params);
  const duration = Date.now() - startTime;

  // Record success
  costTracker.endSession(sessionId, result.usage, true);

  return result;
} catch (error) {
  // Record failure
  costTracker.endSession(sessionId, error.usage || { input: 0, output: 0 }, false);
  throw error;
}
```

**Acceptance Criteria**:
- [x] All agent invocations tracked
- [x] Token usage captured from API response
- [x] Success/failure recorded
- [x] No breaking changes to existing functionality
- [x] Integration tests pass

**Status**: [ ]

---

### T-012: Implement Cost Report Generation

**Priority**: P1
**Estimated Time**: 2 hours
**Dependencies**: T-010
**Owner**: Backend developer

**Task**:
Create cost report generator for increments.

**Implementation**:
Create `src/utils/cost-reporter.ts`:
```typescript
export class CostReporter {
  constructor(private costTracker: CostTracker) {}

  generateIncrementReport(incrementId: string): IncrementCostReport {
    return this.costTracker.getIncrementCost(incrementId);
  }

  exportToJSON(incrementId: string, outputPath: string): void {
    const report = this.generateIncrementReport(incrementId);
    fs.writeJSONSync(outputPath, report, { spaces: 2 });
  }

  exportToCSV(incrementId: string, outputPath: string): void {
    const report = this.generateIncrementReport(incrementId);
    const sessions = report.sessions.map(s => ({
      timestamp: s.timestamp,
      agent: s.agent,
      model: s.model,
      phase: s.phase,
      input_tokens: s.tokens.input,
      output_tokens: s.tokens.output,
      cost: s.cost.total,
    }));

    const csv = Papa.unparse(sessions);
    fs.writeFileSync(outputPath, csv);
  }

  generateDashboard(incrementId?: string): string {
    // ASCII table dashboard (see plan.md for format)
  }
}
```

**Acceptance Criteria**:
- [x] JSON export works
- [x] CSV export works
- [x] Dashboard renders correctly
- [x] All metrics displayed (totals, breakdown, savings)
- [x] Unit tests pass

**Status**: [ ]

---

### T-013: Create /specweave.costs Command

**Priority**: P1
**Estimated Time**: 1 hour
**Dependencies**: T-012
**Owner**: Backend developer

**Task**:
Create slash command to display cost dashboard.

**Implementation**:
Create `src/commands/specweave.costs.md`:
```yaml
---
name: specweave.costs
description: Display AI cost dashboard for current or specified increment
---

# Cost Dashboard Command

You are being invoked via the `/specweave.costs [incrementId]` command.

## Your Task

1. Load cost data for the specified increment (or current if not specified)
2. Use CostReporter to generate dashboard
3. Display dashboard to user
4. Offer to export to JSON/CSV

## Output Format

Use the ASCII table format from plan.md.

## Implementation

```typescript
const incrementId = args[0] || await getCurrentIncrementId();
const reporter = new CostReporter(costTracker);
const dashboard = reporter.generateDashboard(incrementId);

console.log(dashboard);

// Ask user if they want exports
const wantsExport = await confirm('Export to JSON/CSV?');
if (wantsExport) {
  reporter.exportToJSON(incrementId, `.specweave/increments/${incrementId}/reports/cost-analysis.json`);
  reporter.exportToCSV(incrementId, `.specweave/increments/${incrementId}/reports/cost-history.csv`);
}
```
```

**Acceptance Criteria**:
- [x] Command invocable via `/specweave.costs`
- [x] Displays dashboard for current increment
- [x] Accepts increment ID argument
- [x] Offers JSON/CSV export
- [x] Manual test passes

**Status**: [ ]

---

### T-014: Unit Tests for Cost Tracker

**Priority**: P1
**Estimated Time**: 2 hours
**Dependencies**: T-010
**Owner**: QA lead

**Task**:
Write comprehensive unit tests for CostTracker.

**Test Coverage**:
- Session lifecycle (start/end)
- Cost calculations (Sonnet/Haiku/Opus)
- Savings calculations
- Aggregations (by agent, phase, model)
- Persistence (save/load)
- Edge cases (missing data, invalid increment)

**Acceptance Criteria**:
- [x] Coverage > 90%
- [x] All tests pass
- [x] Cost calculations verified against Anthropic pricing

**Status**: [ ]

---

## Phase 4: Auto-Split Orchestration (Week 3)

### T-015: Implement Auto-Split Orchestrator

**Priority**: P2
**Estimated Time**: 3 hours
**Dependencies**: T-008, T-010
**Owner**: Backend developer

**Task**:
Create orchestrator for multi-phase workflows.

**Implementation**:
Create `src/core/auto-split-orchestrator.ts`:
```typescript
export interface PhaseConfig {
  name: string;
  model: Model;
  estimatedDuration: number; // minutes
  prompt: string;
  dependencies?: string[]; // phase names
}

export class AutoSplitOrchestrator {
  constructor(
    private modelSelector: ModelSelector,
    private costTracker: CostTracker
  ) {}

  async execute(
    phases: PhaseConfig[],
    context: ExecutionContext
  ): Promise<WorkflowResult> {
    const results: PhaseResult[] = [];

    for (const phase of phases) {
      console.log(`\n🔄 Phase: ${phase.name} (${phase.model})`);

      const sessionId = this.costTracker.startSession(
        'orchestrator',
        phase.model,
        this.inferPhase(phase.name)
      );

      try {
        const result = await this.executePhase(phase, results);
        results.push(result);

        this.costTracker.endSession(sessionId, result.usage, true);

        console.log(`✅ Phase ${phase.name} complete - Cost: $${result.cost.toFixed(2)}`);
      } catch (error) {
        this.costTracker.endSession(sessionId, { input: 0, output: 0 }, false);
        throw error;
      }
    }

    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const baselineCost = this.calculateBaselineCost(results);

    return {
      phases: results,
      totalCost,
      baselineCost,
      savings: baselineCost - totalCost,
      savingsPercent: ((baselineCost - totalCost) / baselineCost) * 100,
    };
  }

  private async executePhase(
    phase: PhaseConfig,
    previousResults: PhaseResult[]
  ): Promise<PhaseResult> {
    // Build context from previous phases
    const context = this.buildPhaseContext(phase, previousResults);

    // Invoke agent
    const result = await invokeAgent({
      subagent_type: 'general-purpose',
      model: phase.model,
      prompt: `${phase.prompt}\n\nContext: ${JSON.stringify(context)}`,
    });

    return {
      name: phase.name,
      model: phase.model,
      output: result.output,
      usage: result.usage,
      cost: calculateCost(phase.model, result.usage.input, result.usage.output),
    };
  }

  private calculateBaselineCost(results: PhaseResult[]): number {
    // Calculate what it would cost if all phases used Sonnet
    return results.reduce((sum, r) => {
      if (r.model === 'sonnet') return sum + r.cost;
      // Recalculate with Sonnet pricing
      return sum + calculateCost('sonnet', r.usage.input, r.usage.output);
    }, 0);
  }
}
```

**Acceptance Criteria**:
- [x] Executes phases sequentially
- [x] Passes context between phases
- [x] Tracks cost per phase
- [x] Calculates total savings
- [x] Logs phase transitions
- [x] Unit tests pass

**Status**: [ ]

---

### T-016: Update Brownfield-Onboarder with Auto-Split

**Priority**: P2
**Estimated Time**: 2 hours
**Dependencies**: T-015
**Owner**: Backend developer

**Task**:
Refactor brownfield-onboarder skill to use auto-split pattern.

**Implementation**:
Update `src/skills/brownfield-onboarder/SKILL.md`:

Add section:
```markdown
## Multi-Phase Execution

This skill uses intelligent model selection for cost optimization:

1. **Analysis Phase** (Sonnet) - ~20% of time
   - Scan project structure
   - Classify documents
   - Generate migration plan

2. **Execution Phase** (Haiku) - ~70% of time
   - Move files to SpecWeave structure
   - Update cross-references
   - Generate index files

3. **Validation Phase** (Sonnet) - ~10% of time
   - Verify migration completeness
   - Check for broken links
   - Generate report

**Cost savings**: ~62% vs using Sonnet for entire workflow.
```

Implement using AutoSplitOrchestrator:
```typescript
const phases: PhaseConfig[] = [
  {
    name: 'analysis',
    model: 'sonnet',
    estimatedDuration: 2,
    prompt: 'Analyze brownfield project structure...',
  },
  {
    name: 'migration',
    model: 'haiku',
    estimatedDuration: 5,
    prompt: 'Execute migration plan...',
    dependencies: ['analysis'],
  },
  {
    name: 'validation',
    model: 'sonnet',
    estimatedDuration: 1,
    prompt: 'Validate migration...',
    dependencies: ['migration'],
  },
];

const orchestrator = new AutoSplitOrchestrator(modelSelector, costTracker);
const result = await orchestrator.execute(phases, context);
```

**Acceptance Criteria**:
- [x] Brownfield-onboarder uses auto-split
- [x] Cost savings > 60%
- [x] Quality maintained (manual review)
- [x] Integration test passes

**Status**: [ ]

---

### T-017: Update Role-Orchestrator with Intelligent Model Selection

**Priority**: P2
**Estimated Time**: 2 hours
**Dependencies**: T-015
**Owner**: Backend developer

**Task**:
Update role-orchestrator to automatically use Sonnet for planning roles, Haiku for execution roles.

**Implementation**:
Update `src/skills/role-orchestrator/SKILL.md`:

```markdown
## Intelligent Model Selection

The role orchestrator automatically optimizes costs:

- **PM/Architect roles**: Sonnet (planning, analysis)
- **Frontend/Backend/DevOps roles**: Haiku (implementation)
- **QA/Security roles**: Sonnet (validation, audits)

This achieves 50-60% cost savings on full-stack features.
```

Implementation already works via agent preferences (T-004), just document it.

**Acceptance Criteria**:
- [x] Documentation updated
- [x] PM/Architect use Sonnet automatically
- [x] Frontend/Backend use Haiku automatically
- [x] Cost savings measured
- [x] Manual test passes

**Status**: [ ]

---

## Phase 5: Documentation & Refinement (Week 3)

### T-018: Write ADR-007: Intelligent Model Selection

**Priority**: P1
**Estimated Time**: 1 hour
**Dependencies**: T-008
**Owner**: Architect

**Task**:
Document architecture decision for model selection system.

**Implementation**:
Create `.specweave/docs/internal/architecture/adr/ADR-007-intelligent-model-selection.md`:

Sections:
- Status: Accepted
- Context: Need automatic cost optimization
- Decision: 3-layer system (agent prefs + phase detection + selector)
- Rationale: Aligns with Anthropic guidance, transparent, quality-first
- Alternatives: Manual only, Always Haiku, ML-based
- Consequences: Cost savings, zero config, occasional wrong decisions

**Acceptance Criteria**:
- [x] ADR follows template
- [x] Decision rationale clear
- [x] Alternatives documented
- [x] Consequences listed (benefits + risks)

**Status**: [ ]

---

### T-019: Write ADR-008: Cost Tracking System

**Priority**: P1
**Estimated Time**: 45 min
**Dependencies**: T-010
**Owner**: Architect

**Task**:
Document cost tracking architecture.

**Sections**:
- Storage choice: JSON vs SQLite vs Cloud
- Schema design
- Performance considerations (async writes)
- Privacy/security (no user data stored)

**Acceptance Criteria**:
- [x] ADR complete
- [x] Storage rationale documented

**Status**: [ ]

---

### T-020: Write ADR-009: Phase Detection Algorithm

**Priority**: P1
**Estimated Time**: 45 min
**Dependencies**: T-006
**Owner**: Architect

**Task**:
Document phase detection algorithm.

**Sections**:
- Multi-signal approach
- Weight assignments
- Confidence thresholds
- Future improvements (ML)

**Acceptance Criteria**:
- [x] ADR complete
- [x] Algorithm documented

**Status**: [ ]

---

### T-021: Write User Documentation

**Priority**: P1
**Estimated Time**: 2 hours
**Dependencies**: All previous
**Owner**: Docs writer

**Task**:
Create user-facing documentation for intelligent model selection.

**Files to Create**:

1. `.specweave/docs/public/guides/cost-optimization.md`
   - How SpecWeave saves 60% on AI costs
   - Automatic model selection explained
   - Viewing cost reports
   - Manual overrides

2. `.specweave/docs/public/guides/model-selection.md`
   - When Sonnet vs Haiku is used
   - Phase detection explained
   - Configuring model selection

3. `.specweave/docs/public/reference/cost-tracking.md`
   - Cost report format
   - `/specweave.costs` command reference
   - Exporting data

**Acceptance Criteria**:
- [x] All docs written
- [x] Examples included
- [x] Screenshots/ASCII art for dashboard
- [x] Beginner-friendly language

**Status**: [ ]

---

### T-022: Update CLAUDE.md with Increment Naming Convention

**Priority**: P1
**Estimated Time**: 30 min
**Dependencies**: None
**Owner**: Tech lead

**Task**:
Document proper increment naming convention in CLAUDE.md.

**Implementation**:
Add to `CLAUDE.md`:

```markdown
## Increment Naming Convention

**CRITICAL**: All increments MUST use descriptive names, not just numbers.

**Format**: `####-descriptive-kebab-case-name`

**Examples**:
- ✅ `0001-core-framework`
- ✅ `0002-core-enhancements`
- ✅ `0003-intelligent-model-selection`
- ❌ `0003` (too generic)
- ❌ `0004` (no description)

**Rationale**:
- Clear intent at a glance
- Easy to reference in conversations
- Better git history
- Searchable by feature name

**Enforcement**:
- `/specweave.inc` command validates naming
- CI/CD checks reject non-descriptive names
- Code review requirement
```

**Acceptance Criteria**:
- [x] Section added to CLAUDE.md
- [x] Examples provided
- [x] Rationale explained

**Status**: [ ]

---

## Summary

**Total Tasks**: 22
**Estimated Time**: ~40-50 hours (2-3 weeks)
**Priority Breakdown**:
- P1: 18 tasks (critical path)
- P2: 4 tasks (advanced features)

**Phases**:
1. Foundation (T-001 to T-005): Agent preferences
2. Intelligence (T-006 to T-009): Phase detection + model selection
3. Cost Tracking (T-010 to T-014): Tracking + dashboard
4. Auto-Split (T-015 to T-017): Multi-phase optimization
5. Documentation (T-018 to T-022): ADRs + user docs

**Success Criteria**:
- [ ] All P1 tasks completed
- [ ] 60%+ cost savings demonstrated
- [ ] Phase detection > 95% accurate
- [ ] Haiku success rate > 90%
- [ ] All tests passing
- [ ] Documentation complete

**Next Steps**:
1. Execute tasks in order (or in parallel where dependencies allow)
2. Use `/specweave.do` to track progress
3. Run `/specweave.costs` after each increment to measure savings
4. Update this file as tasks complete

---

**Last Updated**: 2025-10-30
**Status**: Planned
**Ready to Start**: Yes
