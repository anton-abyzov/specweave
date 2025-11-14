#!/usr/bin/env python3
"""
Analyze SpecWeave skills for duplicates and overlaps.
"""
import os
import re
from pathlib import Path
from typing import Dict, List, Set

def extract_yaml_frontmatter(file_path: str) -> Dict[str, str]:
    """Extract YAML frontmatter from SKILL.md file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract YAML between --- markers
    match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL | re.MULTILINE)
    if not match:
        return {}

    yaml_content = match.group(1)

    # Parse name and description
    name_match = re.search(r'^name:\s*(.+)$', yaml_content, re.MULTILINE)
    desc_match = re.search(r'^description:\s*(.+)$', yaml_content, re.MULTILINE)

    return {
        'name': name_match.group(1).strip() if name_match else 'UNKNOWN',
        'description': desc_match.group(1).strip() if desc_match else 'NO DESCRIPTION',
        'file': file_path
    }

def extract_keywords(description: str) -> Set[str]:
    """Extract activation keywords from description."""
    # Common patterns for keywords
    keywords = set()

    # Look for "Activates for:" or "Keywords:" sections
    if 'Keywords:' in description:
        kw_section = description.split('Keywords:')[1].split('.')[0]
        keywords.update(kw.strip().lower() for kw in kw_section.split(','))

    if 'Activates for:' in description:
        kw_section = description.split('Activates for:')[1].split('.')[0]
        keywords.update(kw.strip().lower() for kw in kw_section.split(','))

    # Extract common action verbs
    action_verbs = [
        'implement', 'complete', 'build', 'add', 'develop', 'create',
        'work on', 'continue', 'resume', 'finish', 'fix', 'resolve',
        'plan', 'planning', 'increment', 'feature', 'validate', 'quality',
        'translate', 'sync', 'brownfield', 'plugin', 'detect', 'optimize'
    ]

    desc_lower = description.lower()
    for verb in action_verbs:
        if verb in desc_lower:
            keywords.add(verb)

    return keywords

def main():
    """Main analysis function."""
    skills_dir = Path('plugins/specweave/skills')

    # Collect all skills
    skills = []
    for skill_file in skills_dir.glob('*/SKILL.md'):
        metadata = extract_yaml_frontmatter(str(skill_file))
        if metadata:
            metadata['keywords'] = extract_keywords(metadata['description'])
            skills.append(metadata)

    print(f"Found {len(skills)} skills\n")
    print("=" * 100)

    # Print all skills with their keywords
    for skill in sorted(skills, key=lambda s: s['name']):
        print(f"\n{skill['name']}")
        print(f"  Keywords: {', '.join(sorted(skill['keywords']))}")
        print(f"  Description: {skill['description'][:150]}...")

    print("\n" + "=" * 100)
    print("\nKEYWORD OVERLAP ANALYSIS")
    print("=" * 100)

    # Find overlapping keywords
    keyword_to_skills = {}
    for skill in skills:
        for keyword in skill['keywords']:
            if keyword not in keyword_to_skills:
                keyword_to_skills[keyword] = []
            keyword_to_skills[keyword].append(skill['name'])

    # Print keywords used by multiple skills
    overlaps = {k: v for k, v in keyword_to_skills.items() if len(v) > 1}

    print(f"\nFound {len(overlaps)} keywords shared by multiple skills:\n")
    for keyword, skill_names in sorted(overlaps.items()):
        print(f"'{keyword}' → {', '.join(skill_names)}")

    print("\n" + "=" * 100)
    print("\nPOTENTIAL DUPLICATES")
    print("=" * 100)

    # Find skills with high keyword overlap
    for i, skill1 in enumerate(skills):
        for skill2 in skills[i+1:]:
            shared = skill1['keywords'] & skill2['keywords']
            if len(shared) >= 3:  # 3+ shared keywords = potential duplicate
                overlap_pct = len(shared) / max(len(skill1['keywords']), len(skill2['keywords'])) * 100
                print(f"\n{skill1['name']} <-> {skill2['name']}")
                print(f"  Shared keywords ({overlap_pct:.0f}%): {', '.join(sorted(shared))}")

if __name__ == '__main__':
    main()
