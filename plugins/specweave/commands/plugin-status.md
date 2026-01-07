---
name: plugin-status
description: Show loaded plugins and their activation status
trigger: /sw:plugin-status
category: debugging
---

# Plugin Status Command

Shows detailed information about all installed plugins, their skills, and activation status.

## What It Does

1. Lists all installed SpecWeave plugins
2. Shows skill count per plugin
3. Displays last activation timestamp (if available)
4. Shows sample trigger keywords
5. Indicates whether skills are properly indexed

## Usage

```bash
/sw:plugin-status
```

## Output

```
📊 SpecWeave Plugin Status
===========================

Core Plugin: specweave (v1.0.102)
├─ Skills: 15
├─ Agents: 8
├─ Commands: 25
├─ Last Active: 2 minutes ago
└─ Status: ✅ Active

Plugin: specweave-kubernetes (v1.0.0)
├─ Skills: 5 (kubernetes-architect, k8s-manifest-generator, ...)
├─ Trigger Keywords: kubernetes, k8s, eks, aks, gke, helm, gitops
├─ Last Activation: 1 hour ago
└─ Status: ✅ Loaded

Plugin: specweave-mobile (v1.0.0)
├─ Skills: 3 (mobile-architect, react-native-expert, ...)
├─ Trigger Keywords: react native, ios, android, expo
├─ Last Activation: Never
└─ Status: ⚠️ Not activated yet

Total: 24 plugins, 119 skills
Skill Trigger Index: ✅ Generated (289KB, 2 hours ago)
```

## When to Use

- Debugging why a skill isn't activating
- Verifying plugin installation
- Checking if skill trigger index needs refresh
- Understanding which plugins are available

## See Also

- `/sw:skill-match` - Test a prompt against skill triggers
- `specweave refresh-marketplace` - Update plugins
