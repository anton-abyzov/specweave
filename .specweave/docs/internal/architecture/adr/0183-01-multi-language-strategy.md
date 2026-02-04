# ADR-0183-01: Multi-Language Strategy Pattern

**Date**: 2026-02-04
**Status**: Accepted
**Increment**: 0183-multi-language-lsp

## Context

Current warm-up only looks for TypeScript files. C#/Go/Python/Rust projects fail with "No TypeScript files found" and fall back to grep. Each language has different:
- Project file indicators (.sln, go.mod, Cargo.toml)
- Optimal warm-up strategies (solution loading vs file opening)
- Default file counts to open

## Decision

Implement **Strategy Pattern** for language-specific warm-up:

```typescript
interface WarmupStrategy {
  languageId: string;
  projectFiles: string[];      // Detection patterns (.sln, package.json)
  sourcePatterns: string[];    // Source file globs (*.cs, *.ts)
  openCount: number;           // Default files to open
  weight: number;              // For ranking (project files > source files)

  prewarm?(root: string): Promise<void>;  // Optional pre-warm hook
  detectProjectRoot(cwd: string): Promise<string | null>;
  getFilesToOpen(root: string, count: number): Promise<string[]>;
}
```

### Built-in Strategies

| Language | Project Files | Open Count | Pre-warm |
|----------|--------------|------------|----------|
| TypeScript | tsconfig.json, package.json | 3 | - |
| C# | *.sln, *.csproj | 3 | Load solution |
| Python | pyproject.toml, requirements.txt | 3 | - |
| Go | go.mod | 3 | - |
| Rust | Cargo.toml | 2 | - |

### Project Root Detection

Search **upward** from cwd until project file found (not git root).

### Multi-.sln Handling

1. Prefer .sln matching directory name
2. If multiple at root level → interactive prompt
3. Cache choice in `.specweave/cache/lsp-choices.json`

## Alternatives Considered

1. **Single generic strategy**: Simpler but can't handle C# solution loading
2. **Plugin-based strategies**: Over-engineered for 5-10 languages
3. **Configuration-only**: Requires too much user knowledge

## Consequences

**Positive**:
- Each language can have optimized warm-up
- Easy to add new languages via new strategy class
- Supports pre-warm hooks for complex cases (C# .sln)

**Negative**:
- More code to maintain per language
- Strategy selection adds small overhead
- Interactive prompts may interrupt automation
