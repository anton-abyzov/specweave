---
id: "configuration-example"
title: "Configuration Example"
sidebar_label: "Configuration Example"
description: ""
tags: ["nfr", "default", "0016-self-reflection-system"]
increment: "0016-self-reflection-system"
project: "default"
category: "nfr"
last_updated: "2025-11-12"
priority: "P1"
status: "abandoned"
---

## Configuration Example

```json
{
  "reflection": {
    "enabled": true,
    "mode": "auto",
    "depth": "standard",
    "model": "haiku",
    "categories": {
      "security": true,
      "quality": true,
      "testing": true,
      "performance": true,
      "technicalDebt": true
    },
    "criticalThreshold": "MEDIUM",
    "storeReflections": true,
    "autoCreateFollowUpTasks": false
  }
}
```

---

---

**Source**: [Increment 0016-self-reflection-system](../../../increments/0016-self-reflection-system/spec.md)
**Project**: Default Project
**Last Updated**: 2025-11-12
