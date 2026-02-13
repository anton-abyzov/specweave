# Plan: Skill Fabric

## Phase A: Terminology + Natural Language UX
1. Rename "skill layer" → "Skill Fabric" across ~14 doc files
2. Rewrite README workflow to show natural language first, commands as under-the-hood
3. Update YouTube tutorial script with natural language demo notes

## Phase B: Skill Fabric Registry Foundation
1. Static JSON registry in `fabric-registry/registry.json` (zero infrastructure)
2. Three-tier trust model: Official / Verified / Community
3. Security scanner for SKILL.md validation
4. `specweave fabric` CLI commands (search, info, install, list, publish)
5. Fabric docs section on docs site

## Architecture Decision: Static JSON Registry
- Zero infrastructure cost, git-versioned, offline-first
- Extensible to dynamic catalog in future increment
