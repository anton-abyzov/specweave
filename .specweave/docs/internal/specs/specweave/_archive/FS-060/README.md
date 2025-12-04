---
id: FS-060-specweave
title: "Migrate Inquirer to Modular API - SpecWeave Implementation"
feature: FS-060
project: specweave
type: feature-context
status: completed
---

# Migrate Inquirer to Modular API

**Feature**: [FS-060](./FEATURE.md)

## Overview

The v0.26.14 "fix" for inquirer prompts broke all interactive selection prompts. The fix incorrectly changed `type: 'list'` to `type: 'select'` in the **legacy** `inquirer.prompt()` API, where `'select'` is not a valid type.

## User Stories

See user story files in this directory.
