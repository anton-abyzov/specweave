# Implementation Plan: Credential Masking

## Architecture

### Component Design

```
┌─────────────────────────────────────────────────────────┐
│                  credential-masker.ts                    │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ SENSITIVE     │  │ maskValue()    │  │ maskCreds() │ │
│  │ PATTERNS[]    │─>│ maskCreds()    │─>│ InData()    │ │
│  │ (30+ patterns)│  │ sanitizeBash() │  │             │ │
│  └───────────────┘  └────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────┐
│                    bash-sanitizer.ts                     │
│  ┌───────────────────┐  ┌──────────────────────────────┐│
│  │ sanitizeCommand   │  │ isSensitiveCommand()         ││
│  │ Output()          │  │ sanitizedExec()              ││
│  │                   │  │ displayEnvironment()         ││
│  └───────────────────┘  └──────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────┐
│                      logger.ts                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ log() / info() / warn() / error() / debug()       │  │
│  │         (auto-mask credentials)                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Pattern Matching Strategy

1. **Environment Variables**: `KEY=value` format
2. **JSON Credentials**: `"key": "value"` format
3. **URL Credentials**: `protocol://user:pass@host` format
4. **Bearer Tokens**: `Bearer <token>` format
5. **Generic Tokens**: 40+ alphanumeric characters

### Masking Format

```
ghp_1234567890abcdefghij  →  ghp_****ghij
ATAT123456789             →  ATAT****789
user@example.com          →  user****com
```

## Implementation Phases

### Phase 1: Core Utilities
- Create credential-masker.ts with pattern detection
- Create bash-sanitizer.ts for shell outputs
- Add unit tests for all functions

### Phase 2: Logger Integration
- Update logger.ts to use credential masker
- Ensure backward compatibility
- No breaking changes to API

### Phase 3: Prompt Logger Security
- Update prompt-logger.ts
- Sanitize before writing to session logs

### Phase 4: Testing & Documentation
- Write comprehensive unit tests (56 tests)
- Update CLAUDE.md with security notes
- Create implementation summary

## Performance Considerations

- Regex compilation cached (one-time cost)
- Only processes strings (skips objects/numbers)
- Short-circuits on non-matching content
- Overhead: ~0.1ms per log call (negligible)

## Migration Strategy

**No breaking changes**:
- Logger interface unchanged
- Existing log calls work as before
- Only output format changes (credentials masked)
