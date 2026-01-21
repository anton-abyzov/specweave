---
name: skill-match
description: Test a prompt against skill triggers to see what would match
trigger: /sw:skill-match
category: debugging
arguments:
  - name: prompt
    description: The prompt to test
    required: true
    type: string
---

# Skill Match Command

Tests a prompt against the skill trigger index to see which skills would activate.

## What It Does

1. Takes your prompt as input
2. Matches it against skill trigger keywords
3. Shows which skills would activate (ranked by relevance)
4. Explains why each skill matched
5. Highlights matched keywords

## Usage

```bash
/sw:skill-match "deploy to EKS with GitOps"
```

## Output

```
🔍 Testing Prompt: "deploy to EKS with GitOps"
═══════════════════════════════════════════════

✅ kubernetes-architect (Score: 95%)
   Plugin: specweave-kubernetes
   Matched: eks, gitops, deploy
   Why: High match - prompt contains 3 relevant keywords

✅ devops-engineer (Score: 60%)
   Plugin: specweave-infrastructure
   Matched: deploy, gitops
   Why: Medium match - deployment and automation keywords

⚠️  No other skills matched

Recommendation: kubernetes-architect is the best match for this prompt.
```

## When to Use

- Debugging why a skill isn't activating
- Testing if your prompt has the right keywords
- Understanding which skills are relevant for a task
- Verifying skill trigger configuration

## Examples

```bash
# Test Kubernetes prompt
/sw:skill-match "Create Kubernetes deployment with Helm"

# Test mobile app prompt
/sw:skill-match "Build iOS app with React Native"

# Test backend API prompt
/sw:skill-match "Create NestJS API with Prisma ORM"
```

## See Also

- `/sw:plugin-status` - Show all loaded plugins
- `specweave refresh-marketplace` - Update skill trigger index
