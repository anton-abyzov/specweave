#!/usr/bin/env python3
"""
Convert AGENT.md files to SKILL.md with context: fork.

This script converts all agent definitions in SpecWeave plugins to skills,
which is the recommended pattern per Claude Code official documentation.

Skills with `context: fork` provide the same isolated subagent behavior
as custom agents, but with additional benefits:
- Auto-activation by keywords
- User-invocable via /skill-name
- On-demand loading (token efficient)

Usage:
    python scripts/convert-agents-to-skills.py [--dry-run] [--delete-agents]
"""

import os
import re
import sys
import argparse
from pathlib import Path
from typing import Optional

def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith('---'):
        return {}, content

    # Find the closing ---
    end_match = re.search(r'\n---\n', content[3:])
    if not end_match:
        return {}, content

    frontmatter_text = content[4:end_match.start() + 3]
    body = content[end_match.end() + 4:]

    # Simple YAML parsing for our needs
    frontmatter = {}
    current_key = None
    current_value = []

    for line in frontmatter_text.split('\n'):
        # Check for key: value
        match = re.match(r'^(\w[\w-]*):\s*(.*)$', line)
        if match:
            # Save previous key if exists
            if current_key:
                frontmatter[current_key] = '\n'.join(current_value).strip() if len(current_value) > 1 else (current_value[0] if current_value else '')

            current_key = match.group(1)
            value = match.group(2).strip()
            current_value = [value] if value else []
        elif current_key and line.strip():
            # Continuation of previous value
            current_value.append(line)

    # Save last key
    if current_key:
        frontmatter[current_key] = '\n'.join(current_value).strip() if len(current_value) > 1 else (current_value[0] if current_value else '')

    return frontmatter, body

def convert_tools_format(content: str) -> str:
    """Convert tools: list to allowed-tools: format."""
    lines = content.split('\n')
    result = []
    in_tools = False
    tools_list = []

    for i, line in enumerate(lines):
        # Check for tools: with list items following
        if re.match(r'^tools:\s*$', line):
            in_tools = True
            continue
        elif in_tools:
            # Check for list item
            match = re.match(r'^\s+-\s+(.+)$', line)
            if match:
                tools_list.append(match.group(1).strip())
                continue
            else:
                # End of tools list
                if tools_list:
                    result.append(f"allowed-tools: {', '.join(tools_list)}")
                in_tools = False
                tools_list = []

        # Convert inline tools: to allowed-tools:
        if re.match(r'^tools:\s+.+$', line):
            result.append(re.sub(r'^tools:', 'allowed-tools:', line))
            continue

        result.append(line)

    # Handle case where tools list is at the end
    if tools_list:
        result.append(f"allowed-tools: {', '.join(tools_list)}")

    return '\n'.join(result)

def remove_agent_specific_fields(content: str) -> str:
    """Remove fields that are agent-specific and not valid for skills."""
    lines = content.split('\n')
    result = []
    skip_fields = ['model_preference', 'cost_profile', 'fallback_behavior', 'max_response_tokens', 'visibility']

    for line in lines:
        skip = False
        for field in skip_fields:
            if re.match(rf'^{field}:', line):
                skip = True
                break
        if not skip:
            result.append(line)

    return '\n'.join(result)

def add_context_fork(content: str) -> str:
    """Add context: fork after the model line."""
    lines = content.split('\n')
    result = []
    added = False

    for line in lines:
        result.append(line)
        # Add context: fork after model line
        if re.match(r'^model:\s+', line) and not added:
            result.append('context: fork')
            added = True

    # If no model line found, add before closing ---
    if not added:
        for i, line in enumerate(result):
            if line == '---' and i > 0:
                result.insert(i, 'context: fork')
                break

    return '\n'.join(result)

def remove_invoke_section(content: str) -> str:
    """Remove the 'How to Invoke This Agent' section."""
    # Pattern to match the section and everything after it
    patterns = [
        r'\n## 🚀 How to Invoke This Agent.*$',
        r'\n## How to Invoke This Agent.*$',
        r'\n## How to Invoke.*$',
    ]

    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.DOTALL)

    return content.rstrip() + '\n'

def convert_agent_to_skill(agent_path: Path, skill_path: Path, dry_run: bool = False) -> bool:
    """Convert a single AGENT.md to SKILL.md."""
    try:
        with open(agent_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Step 1: Convert tools: to allowed-tools:
        content = convert_tools_format(content)

        # Step 2: Remove agent-specific fields
        content = remove_agent_specific_fields(content)

        # Step 3: Add context: fork
        content = add_context_fork(content)

        # Step 4: Remove "How to Invoke" section
        content = remove_invoke_section(content)

        # Step 5: Clean up any double blank lines
        content = re.sub(r'\n{3,}', '\n\n', content)

        if dry_run:
            print(f"  Would create: {skill_path}")
            return True

        # Create skill directory
        skill_path.parent.mkdir(parents=True, exist_ok=True)

        # Write skill file
        with open(skill_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"  Created: {skill_path}")
        return True

    except Exception as e:
        print(f"  ERROR: {e}")
        return False

def find_agents(plugins_dir: Path) -> list[tuple[Path, Path]]:
    """Find all AGENT.md files and their corresponding skill paths."""
    agents = []

    for agent_file in plugins_dir.rglob('*/agents/*/AGENT.md'):
        # Extract paths
        plugin_dir = agent_file.parent.parent.parent
        agent_name = agent_file.parent.name
        skill_dir = plugin_dir / 'skills' / agent_name
        skill_file = skill_dir / 'SKILL.md'

        agents.append((agent_file, skill_file))

    return agents

def main():
    parser = argparse.ArgumentParser(description='Convert AGENT.md files to SKILL.md')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--delete-agents', action='store_true', help='Delete old agent directories after conversion')
    parser.add_argument('--plugins-dir', default='plugins', help='Plugins directory path')
    args = parser.parse_args()

    plugins_dir = Path(args.plugins_dir)
    if not plugins_dir.exists():
        print(f"Error: Plugins directory not found: {plugins_dir}")
        sys.exit(1)

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Converting agents to skills...")
    print(f"Scanning: {plugins_dir.absolute()}")
    print()

    agents = find_agents(plugins_dir)

    if not agents:
        print("No AGENT.md files found.")
        return

    print(f"Found {len(agents)} agent(s) to convert:\n")

    success_count = 0
    skip_count = 0
    error_count = 0

    for agent_path, skill_path in agents:
        relative_agent = agent_path.relative_to(plugins_dir)
        relative_skill = skill_path.relative_to(plugins_dir)

        # Check if skill already exists
        if skill_path.exists():
            print(f"[SKIP] {relative_agent}")
            print(f"  Skill already exists: {relative_skill}")
            skip_count += 1
            continue

        print(f"[CONVERT] {relative_agent}")

        if convert_agent_to_skill(agent_path, skill_path, args.dry_run):
            success_count += 1
        else:
            error_count += 1

    print()
    print("=" * 60)
    print(f"Conversion complete!")
    print(f"  Converted: {success_count}")
    print(f"  Skipped (already exists): {skip_count}")
    print(f"  Errors: {error_count}")
    print()

    if args.delete_agents and not args.dry_run:
        print("Deleting old agent directories...")
        deleted = 0
        for agent_path, _ in agents:
            agent_dir = agent_path.parent
            if agent_dir.exists():
                import shutil
                shutil.rmtree(agent_dir)
                deleted += 1
                print(f"  Deleted: {agent_dir}")
        print(f"Deleted {deleted} agent directories.")
    elif args.delete_agents and args.dry_run:
        print("[DRY RUN] Would delete agent directories after conversion")
    else:
        print("Note: Old agent directories were NOT deleted.")
        print("Run with --delete-agents to remove them after verification.")

if __name__ == '__main__':
    main()
