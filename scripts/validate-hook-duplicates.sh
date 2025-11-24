#!/bin/bash

# Hook Duplicate Validation Script
# Prevents duplicate hook registrations across plugins
# Usage: bash scripts/validate-hook-duplicates.sh

set -e

python3 << 'PYTHON'
import json
from pathlib import Path
from collections import defaultdict
import sys

hook_registry = defaultdict(list)
PLUGINS_DIR = Path("plugins")

print("🔍 Validating hook registrations...")
print()

# Scan plugin.json files
for plugin_json in sorted(PLUGINS_DIR.glob("*/.claude-plugin/plugin.json")):
    plugin = plugin_json.parent.parent.name
    
    try:
        data = json.loads(plugin_json.read_text())
        
        for event in ["PreToolUse", "PostToolUse", "UserPromptSubmit"]:
            for hook_config in data.get("hooks", {}).get(event, []):
                matcher = hook_config.get("matcher", "<global>")
                matcher_content = hook_config.get("matcher_content", "")
                
                if matcher_content:
                    key = f"{event}:{matcher}:{matcher_content}"
                else:
                    key = f"{event}:{matcher}"
                
                hook_registry[key].append(f"{plugin}(plugin.json)")
    except Exception as e:
        print(f"⚠️  Error reading {plugin}/plugin.json: {e}")

# Scan hooks.json files
for hooks_json in sorted(PLUGINS_DIR.glob("*/hooks/hooks.json")):
    plugin = hooks_json.parent.parent.name
    
    try:
        data = json.loads(hooks_json.read_text())
        
        for event in ["PreToolUse", "PostToolUse", "UserPromptSubmit"]:
            for hook_config in data.get("hooks", {}).get(event, []):
                matcher = hook_config.get("matcher", "<global>")
                matcher_content = hook_config.get("matcher_content", "")
                
                if matcher_content:
                    key = f"{event}:{matcher}:{matcher_content}"
                else:
                    key = f"{event}:{matcher}"
                
                hook_registry[key].append(f"{plugin}(hooks.json)")
    except Exception as e:
        print(f"⚠️  Error reading {plugin}/hooks/hooks.json: {e}")

# Check for duplicates
duplicates = {k: v for k, v in hook_registry.items() if len(v) > 1}

if duplicates:
    print("❌ DUPLICATE HOOKS DETECTED:")
    print()
    for hook, plugins in sorted(duplicates.items()):
        print(f"  Hook: {hook}")
        for plugin in plugins:
            print(f"    → {plugin}")
        print()
    
    print("Fix: Remove duplicate hook registrations from plugin.json or hooks.json files")
    print("Only ONE plugin should own each hook event/matcher combination")
    print()
    sys.exit(1)
else:
    print("✅ No duplicate hooks found - all registrations are unique!")
    print()
    sys.exit(0)

PYTHON
