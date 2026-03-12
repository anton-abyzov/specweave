/**
 * AC Gate
 *
 * Determines whether external sync should fire after a task completion.
 * Only triggers when a NEW acceptance criteria transitions to fully satisfied.
 *
 * @module core/sync/ac-gate
 */

export interface ACGateResult {
  shouldSync: boolean;
  transitionedACs: string[];
  affectedStoryIds: string[];
}

export class ACGate {
  /**
   * Determine whether external sync should fire.
   *
   * Logic:
   * 1. Find which ACs the completed task references
   * 2. If no AC tags → shouldSync true (backward compat)
   * 3. For each referenced AC, check if ALL tasks with that AC are now complete
   * 4. For each newly-complete AC, check if spec.md already had it checked
   * 5. If any AC is newly complete AND not already checked in spec → shouldSync true
   */
  static shouldSyncExternal(
    specContent: string,
    tasksContent: string,
    taskId: string,
  ): ACGateResult {
    // Parse which ACs the completed task references
    const taskACs = ACGate.getTaskACs(tasksContent, taskId);

    // Backward compat: if task has no AC references, always sync
    if (taskACs.length === 0) {
      return { shouldSync: true, transitionedACs: [], affectedStoryIds: [] };
    }

    // Parse all task→AC mappings and completion status
    const acTaskMap = ACGate.buildACTaskMap(tasksContent);

    // Parse which ACs are already checked in spec.md
    const specCheckedACs = ACGate.parseSpecCheckedACs(specContent);

    const transitionedACs: string[] = [];

    for (const acId of taskACs) {
      // Skip if already checked in spec (no transition)
      if (specCheckedACs.has(acId)) continue;

      // Check if all tasks referencing this AC are now complete
      const tasks = acTaskMap.get(acId);
      if (!tasks) continue;

      const allComplete = tasks.every((t) => t.completed);
      if (allComplete) {
        transitionedACs.push(acId);
      }
    }

    if (transitionedACs.length === 0) {
      return { shouldSync: false, transitionedACs: [], affectedStoryIds: [] };
    }

    // Extract story IDs from AC IDs (AC-US1-01 → US-001, AC-US2-01 → US-002)
    const storyIds = new Set<string>();
    for (const acId of transitionedACs) {
      const match = acId.match(/AC-US(\d+)-/);
      if (match) {
        storyIds.add(`US-${match[1].padStart(3, '0')}`);
      }
    }

    return {
      shouldSync: true,
      transitionedACs,
      affectedStoryIds: [...storyIds],
    };
  }

  private static getTaskACs(tasksContent: string, taskId: string): string[] {
    const lines = tasksContent.split('\n');
    let inTask = false;

    for (const line of lines) {
      if (line.match(new RegExp(`###\\s+${taskId}:`))) {
        inTask = true;
        continue;
      }
      if (inTask && line.match(/^###\s+T-\d+:/)) {
        break; // Next task
      }
      if (inTask) {
        const acMatch = line.match(/\*\*Satisfies ACs?\*\*:\s*(.+)/);
        if (acMatch) {
          return acMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
    }

    return [];
  }

  private static buildACTaskMap(
    tasksContent: string,
  ): Map<string, { taskId: string; completed: boolean }[]> {
    const map = new Map<string, { taskId: string; completed: boolean }[]>();
    const lines = tasksContent.split('\n');
    let currentTaskId: string | null = null;
    let currentACs: string[] = [];
    let currentCompleted = false;

    const flush = () => {
      if (currentTaskId && currentACs.length > 0) {
        for (const acId of currentACs) {
          if (!map.has(acId)) map.set(acId, []);
          map.get(acId)!.push({ taskId: currentTaskId, completed: currentCompleted });
        }
      }
    };

    for (const line of lines) {
      const taskMatch = line.match(/^###\s+(T-\d+):/);
      if (taskMatch) {
        flush();
        currentTaskId = taskMatch[1];
        currentACs = [];
        currentCompleted = false;
        continue;
      }

      if (currentTaskId) {
        const acMatch = line.match(/\*\*Satisfies ACs?\*\*:\s*(.+)/);
        if (acMatch) {
          currentACs = acMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
        }

        const statusMatch = line.match(/\*\*Status\*\*:\s*\[([ x])\]/);
        if (statusMatch) {
          currentCompleted = statusMatch[1] === 'x';
        }
      }
    }

    flush(); // Last task
    return map;
  }

  private static parseSpecCheckedACs(specContent: string): Set<string> {
    const checked = new Set<string>();
    const lines = specContent.split('\n');

    for (const line of lines) {
      const match = line.match(/^-\s+\[x\]\s+\*{0,2}(AC-[A-Z0-9-]+)\*{0,2}:/);
      if (match) {
        checked.add(match[1]);
      }
    }

    return checked;
  }
}
