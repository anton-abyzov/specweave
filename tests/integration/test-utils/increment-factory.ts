import path from 'path';
import fs from 'fs-extra';

export interface IncrementConfig {
  status: string;
  title: string;
  tasksComplete?: boolean;
  acsChecked?: boolean;
  priority?: string;
  type?: string;
}

export class IncrementFactory {
  static async create(
    testRoot: string,
    incrementId: string,
    config: IncrementConfig
  ): Promise<void> {
    const incrementDir = path.join(
      testRoot,
      '.specweave/increments',
      incrementId
    );

    await fs.ensureDir(incrementDir);

    // Create spec.md
    const specContent = `---
increment: ${incrementId}
title: ${config.title}
priority: ${config.priority || 'P1'}
status: ${config.status}
type: ${config.type || 'feature'}
created: ${new Date().toISOString()}
test_mode: TDD
coverage_target: 90
---

# ${config.title}

Test increment for integration testing.

## User Stories

### US-001: Test User Story

**As a** developer
**I want** to test the system
**So that** I can validate it works

**Acceptance Criteria**:
- [${config.acsChecked ? 'x' : ' '}] **AC-US1-01**: First acceptance criterion
- [${config.acsChecked ? 'x' : ' '}] **AC-US1-02**: Second acceptance criterion
`;

    await fs.writeFile(
      path.join(incrementDir, 'spec.md'),
      specContent,
      'utf-8'
    );

    // Create metadata.json
    const metadata = {
      id: incrementId,
      status: config.status,
      priority: config.priority || 'P1',
      type: config.type || 'feature',
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    await fs.writeJSON(
      path.join(incrementDir, 'metadata.json'),
      metadata,
      { spaces: 2 }
    );

    // Create tasks.md if needed
    if (config.tasksComplete !== undefined) {
      const tasksContent = `# Tasks

- [${config.tasksComplete ? 'x' : ' '}] T-001: First task
- [${config.tasksComplete ? 'x' : ' '}] T-002: Second task
`;
      await fs.writeFile(
        path.join(incrementDir, 'tasks.md'),
        tasksContent,
        'utf-8'
      );
    }
  }
}
