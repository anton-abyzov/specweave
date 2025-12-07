# Implementation Plan: EDA Hooks Architecture

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Claude Code                                │
│                            │                                      │
│                    PostToolUse Hook                              │
│                            │                                      │
│              ┌─────────────▼─────────────┐                       │
│              │    Lightweight Dispatcher  │  (<10ms)             │
│              │    (post-tool-use.sh)     │                       │
│              └─────────────┬─────────────┘                       │
│                            │                                      │
│         ┌──────────────────┼──────────────────┐                  │
│         │                  │                  │                  │
│   ┌─────▼─────┐     ┌──────▼──────┐    ┌─────▼─────┐            │
│   │ Lifecycle │     │  US Compl.  │    │  Event    │            │
│   │ Detector  │     │  Detector   │    │  Enqueue  │            │
│   └─────┬─────┘     └──────┬──────┘    └─────┬─────┘            │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                      │
│              ┌─────────────▼─────────────┐                       │
│              │    Event Queue (Async)     │                      │
│              │  .specweave/state/events/  │                      │
│              └─────────────┬─────────────┘                       │
│                            │                                      │
│              ┌─────────────▼─────────────┐                       │
│              │  Background Processor     │  (daemon)             │
│              │  - flock for locking      │                       │
│              │  - Coalescing (10s)       │                       │
│              │  - 60s idle timeout       │                       │
│              └─────────────┬─────────────┘                       │
│                            │                                      │
│    ┌───────────────────────┼───────────────────────┐             │
│    │                       │                       │             │
│ ┌──▼──────────┐     ┌──────▼──────┐      ┌────────▼────────┐    │
│ │Living Specs │     │ Status Line │      │  Other Handlers │    │
│ │  Handler    │     │   Handler   │      │  (GitHub, etc)  │    │
│ └─────────────┘     └─────────────┘      └─────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Event Types

### Lifecycle Events
- `increment.created` - metadata.json created with status=planning
- `increment.done` - status changed to completed
- `increment.archived` - folder moved to _archive/
- `increment.reopened` - status changed from completed to active

### User Story Events
- `user-story.completed` - All ACs + tasks for US completed
- `user-story.reopened` - US status reverted

## Implementation Steps

### Phase 1: Lifecycle Detector
1. Create `lifecycle-detector.sh` - Detects increment lifecycle changes
2. Compare previous vs current metadata.json status
3. Store previous state in `.specweave/state/.prev-metadata-<inc-id>`

### Phase 2: US Completion Detector
1. Create `us-completion-detector.sh` - Detects US completion
2. Parse tasks.md for T-XXX with "Satisfies ACs: AC-USXXX"
3. Parse spec.md for AC-USXXX checkboxes
4. Store previous completion state in `.specweave/state/.prev-us-<inc-id>`

### Phase 3: Enhanced Event Queue
1. Add event coalescing (same event type+data within 10s = skip)
2. Add file locking with flock
3. Add event priority (lifecycle > us-completion > others)

### Phase 4: Handlers
1. Create `living-specs-handler.sh` - Updates specs/ folder
2. Create `status-line-handler.sh` - Updates status line
3. Both with 60s throttle and error handling

### Phase 5: Safety
1. Timeout wrapper for all operations
2. Graceful exit on all errors
3. Logging without blocking
4. Environment variable disable switch

## File Structure

```
plugins/specweave/hooks/v2/
├── dispatchers/
│   ├── post-tool-use.sh      # Main dispatcher (updated)
│   └── session-start.sh      # Processor launcher
├── detectors/
│   ├── lifecycle-detector.sh  # NEW
│   └── us-completion-detector.sh  # NEW
├── queue/
│   ├── enqueue.sh            # Updated with coalescing
│   ├── dequeue.sh            # Unchanged
│   └── processor.sh          # Updated with flock
└── handlers/
    ├── living-specs-handler.sh  # NEW
    ├── status-line-handler.sh   # NEW (replaces status-update.sh)
    └── ... existing handlers
```

## Testing Strategy

1. Manual testing with various scenarios
2. Test disable switch (SPECWEAVE_DISABLE_HOOKS=1)
3. Test race conditions with rapid edits
4. Test graceful degradation on errors
5. Test Claude Code doesn't crash
