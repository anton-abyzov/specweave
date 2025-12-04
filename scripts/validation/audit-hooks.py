#!/usr/bin/env python3
import json
import os
from pathlib import Path
from collections import defaultdict

PLUGINS_DIR = Path("/Users/antonabyzov/Projects/github/specweave/plugins")

print("═" * 80)
print("  🔍 COMPLETE HOOK AUDIT - plugin.json + hooks.json")
print("═" * 80)
print()

# Store hook registrations
hook_registry = defaultdict(list)
all_hooks_found = []

def process_hooks(hooks_dict, plugin_name, source):
    """Process hooks from a hooks dictionary"""
    if not hooks_dict:
        return False
    
    found_hooks = False
    
    for event_type in ["PreToolUse", "PostToolUse", "UserPromptSubmit", "SessionStart", 
                       "SessionEnd", "Notification", "PermissionRequest", "Stop", 
                       "SubagentStop", "PreCompact"]:
        event_hooks = hooks_dict.get(event_type, [])
        
        if event_hooks:
            found_hooks = True
            
            for hook_config in event_hooks:
                if isinstance(hook_config, dict):
                    matcher = hook_config.get("matcher", "<global>")
                    matcher_content = hook_config.get("matcher_content", "")
                    hook_commands = hook_config.get("hooks", [])
                    
                    # Create unique key for this hook
                    if matcher_content:
                        key = f"{event_type}:{matcher}:{matcher_content}"
                    else:
                        key = f"{event_type}:{matcher}"
                    
                    # Track registration
                    hook_registry[key].append({
                        "plugin": plugin_name,
                        "source": source,
                        "commands": len(hook_commands)
                    })
    
    return found_hooks

# Scan all plugins
print("Phase 1: Scanning plugin.json files...")
print()

for plugin_json_path in sorted(PLUGINS_DIR.glob("*/.claude-plugin/plugin.json")):
    plugin_name = plugin_json_path.parent.parent.name
    
    try:
        with open(plugin_json_path) as f:
            data = json.load(f)
        
        hooks = data.get("hooks", {})
        
        if process_hooks(hooks, plugin_name, "plugin.json"):
            all_hooks_found.append((plugin_name, "plugin.json"))
    
    except Exception as e:
        print(f"❌ Error reading {plugin_name}/plugin.json: {e}")

print("\nPhase 2: Scanning hooks.json files...")
print()

for hooks_json_path in sorted(PLUGINS_DIR.glob("*/hooks/hooks.json")):
    plugin_name = hooks_json_path.parent.parent.name
    
    try:
        with open(hooks_json_path) as f:
            data = json.load(f)
        
        hooks = data.get("hooks", {})
        
        if process_hooks(hooks, plugin_name, "hooks/hooks.json"):
            all_hooks_found.append((plugin_name, "hooks/hooks.json"))
    
    except Exception as e:
        print(f"❌ Error reading {plugin_name}/hooks/hooks.json: {e}")

print()
print("═" * 80)
print("  📊 HOOKS SUMMARY")
print("═" * 80)
print()

# Group by plugin
from collections import defaultdict
plugins_grouped = defaultdict(list)
for plugin, source in all_hooks_found:
    plugins_grouped[plugin].append(source)

for plugin, sources in sorted(plugins_grouped.items()):
    print(f"✅ {plugin}:")
    for source in sources:
        print(f"   → {source}")

print()
print("═" * 80)
print("  🔎 DUPLICATE DETECTION")
print("═" * 80)
print()

duplicates_found = False
for hook_key, registrations in sorted(hook_registry.items()):
    if len(registrations) > 1:
        duplicates_found = True
        print(f"⚠️  DUPLICATE: {hook_key}")
        for reg in registrations:
            print(f"   → {reg['plugin']} ({reg['source']}) - {reg['commands']} command(s)")
        print()

if not duplicates_found:
    print("✅ NO DUPLICATES FOUND - All hooks are unique!")
    print()

print("═" * 80)
print("  📋 COMPLETE HOOK REGISTRY")
print("═" * 80)
print()

for hook_key, registrations in sorted(hook_registry.items()):
    status = "⚠️ " if len(registrations) > 1 else "✅"
    plugins = [f"{r['plugin']}({r['source'].split('/')[0]})" for r in registrations]
    print(f"{status} {hook_key:50} → {', '.join(plugins)}")

print()
print("═" * 80)
