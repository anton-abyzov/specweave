# living-docs

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

Living documentation management module that provides intelligent ID allocation, atomic registration, documentation analysis, and smart organization for SpecWeave's external tool integration and documentation health monitoring.

## Key Concepts

- Chronological ID allocation with gap-filling
- Atomic file-based locking for thread-safety
- Feature ID collision detection (FS-XXX vs FS-XXXE)
- Epic ID per-project namespace management
- Documentation health scoring and mismatch detection
- Theme-based documentation organization
- Multi-level directory structure (1-level GitHub, 2-level JIRA/ADO)
- Archive-aware scanning for ID uniqueness

## Patterns

- **File-based locking for atomic operations** (data)
- **Repository pattern for ID management** (architecture)
- **YAML frontmatter parsing with gray-matter** (data)
- **Multi-tenant directory structure** (architecture)
- **Chronological insertion with gap-filling algorithm** (architecture)
- **Health scoring with weighted metrics** (testing)
- **Glob-based file discovery** (structure)
- **Keyword-based theme classification** (architecture)
- **External tool integration abstraction** (integration)
- **Docusaurus-compatible output generation** (structure)
- **Acceptance criteria parsing and tracking** (testing)
- **Collision detection with variant checking** (data)

## External Dependencies

- gray-matter (YAML frontmatter parsing)
- glob (file pattern matching)
- Node.js fs/path modules

## Observations

- Sophisticated ID allocation prevents collisions across internal (FS-XXX) and external (FS-XXXE) features
- File-based locking provides thread-safety for concurrent import operations without external dependencies
- Archive scanning ensures ID uniqueness even across completed/archived items
- Multi-level directory structure supports complex JIRA/ADO organizational hierarchies
- Enterprise analyzer provides actionable documentation health metrics with mismatch detection
- Smart organizer generates navigation without moving files, preserving URLs
- External tool integration uses container context for proper path resolution across GitHub/JIRA/ADO