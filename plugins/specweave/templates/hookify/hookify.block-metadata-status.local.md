---
name: block-metadata-status
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: regex_match
    pattern: metadata\.json$
  - field: new_text
    operator: regex_match
    pattern: "status":\s*"completed"
---

**Direct metadata.json status edit blocked!**

Use `/sw:done <increment-id>` to properly close increments.
This ensures all quality gates are validated before marking complete.
