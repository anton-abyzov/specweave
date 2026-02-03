# Azure DevOps Integration Plugin

**Version**: 1.0.0
**Author**: SpecWeave Contributors
**License**: MIT

## Description

Seamless integration between SpecWeave increments and Azure DevOps work items. Enables bidirectional synchronization of specs, tasks, and progress updates between SpecWeave and ADO projects. Supports multiple ADO configurations including project-per-team, area-path-based, and team-based organizational structures.

## Skills

| Skill | Description |
|-------|-------------|
| ado-mapper | Bidirectional conversion between SpecWeave increments and Azure DevOps work items (Epic/Feature/User Story/Task hierarchy) |
| ado-multi-project | Organize specs and tasks across multiple Azure DevOps projects with intelligent content-based mapping |
| ado-resource-validator | Validate Azure DevOps projects, area paths, and teams exist with auto-creation of missing resources |
| ado-sync | Help and guidance for Azure DevOps synchronization with SpecWeave increments |

## Commands

| Command | Description |
|---------|-------------|
| /sw-ado:create-workitem | Create ADO work item from SpecWeave increment |
| /sw-ado:sync | Sync increment progress with ADO work item |
| /sw-ado:close-workitem | Close ADO work item when increment complete |
| /sw-ado:status | Check ADO sync status for increment |

## Installation

```bash
claude plugin install sw-ado@specweave
```

## Requirements

- SpecWeave core plugin (sw@specweave)
- Azure DevOps Personal Access Token (PAT)
- Azure DevOps organization and project(s)
