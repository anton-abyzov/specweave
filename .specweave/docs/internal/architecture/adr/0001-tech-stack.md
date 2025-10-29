# ADR-0001: Technology Stack Selection

**Status**: Accepted  
**Date**: 2025-01-15  
**Deciders**: Core Team  

## Context

SpecWeave needs a technology stack that is:
- Widely adopted and well-supported
- Easy to distribute as an npm package
- Compatible with Claude Code ecosystem
- Performant for CLI operations
- Type-safe to reduce bugs

## Decision

**Primary Stack**: Node.js + TypeScript

**Key Components**:
- **Runtime**: Node.js >=18.0.0
- **Language**: TypeScript 5.3+
- **CLI Framework**: Commander.js
- **Package Manager**: npm
- **Testing**: Jest + Playwright
- **Documentation**: Docusaurus (all docs - public & internal)

**User Projects**: Framework-agnostic
- Supports TypeScript, Python, Go, Rust, Java, C#
- Agents adapt to detected tech stack

## Alternatives Considered

1. **Python + Click**
   - Pros: Popular in data science, simple syntax
   - Cons: Slower startup, packaging complexity
   
2. **Go**
   - Pros: Fast, single binary distribution
   - Cons: Less familiar to web developers, smaller ecosystem
   
3. **Rust**
   - Pros: Performance, memory safety
   - Cons: Steep learning curve, slower compilation

## Consequences

### Positive
- ✅ Familiar to web developers
- ✅ npm ecosystem for distribution
- ✅ TypeScript provides type safety
- ✅ Fast CLI performance
- ✅ Compatible with Claude Code (Node.js based)
- ✅ Can support ANY language for user projects

### Negative
- ❌ Node.js required (not standalone binary)
- ❌ npm security concerns (mitigated with lockfiles)

## Implementation

- Framework CLI: `src/cli/` (TypeScript)
- Agents/Skills: Markdown with YAML frontmatter
- Templates: Language-specific (TypeScript, Python, etc.)
- Build: `tsc` → `dist/`
- Distribution: npm registry

## Related

- [ADR-0002: Context Loading](0002-context-loading.md)
- [CLAUDE.md](../../../../CLAUDE.md#installation--requirements)
