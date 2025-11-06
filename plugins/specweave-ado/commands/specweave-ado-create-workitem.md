---
name: specweave-ado:create-workitem
description: Create Azure DevOps work item from SpecWeave increment
---

# Create ADO Work Item Command

**Usage**: `/specweave-ado:create-workitem <increment-id>`

**Purpose**: Create an Epic, Feature, or User Story in Azure DevOps from a SpecWeave increment

---

## Command Behavior

When user runs this command, Claude should:

1. **Validate Prerequisites**:
   - Check ADO plugin installed
   - Check AZURE_DEVOPS_PAT environment variable set
   - Check ADO configured in .specweave/config.json

2. **Invoke ADO Manager Agent**:
   ```
   Use Task tool with subagent_type: "ado-manager"

   Prompt: "Create ADO work item for increment 0005-payment-integration.

   Steps:
   1. Read .specweave/increments/0005-payment-integration/spec.md
   2. Extract title and description
   3. Load ADO config from .specweave/config.json
   4. Create work item via ADO REST API
   5. Store work item ID in increment-metadata.json
   6. Display: Work Item ID, URL, and confirmation"
   ```

3. **Display Result**:
   ```
   ✅ Created ADO Epic

   Work Item: #12345
   URL: https://dev.azure.com/myorg/MyProject/_workitems/edit/12345

   Linked to increment: 0005-payment-integration
   ```

---

## Example Usage

```
User: /specweave-ado:create-workitem 0005