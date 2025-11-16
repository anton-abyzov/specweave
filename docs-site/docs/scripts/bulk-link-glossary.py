#!/usr/bin/env python3
"""
Bulk Glossary Linking Script
Scans all markdown files and identifies opportunities to add glossary links.
"""

import os
import re
from pathlib import Path
from collections import defaultdict
import json

# Configuration
DOCS_ROOT = Path("/Users/antonabyzov/Projects/github/specweave/.specweave/docs/public")
GLOSSARY_DIR = DOCS_ROOT / "glossary" / "terms"
OUTPUT_REPORT = DOCS_ROOT / "scripts" / "linking-report.md"

# Load all available glossary terms
def load_glossary_terms():
    """Load all available glossary term files."""
    terms = {}
    if not GLOSSARY_DIR.exists():
        print(f"❌ Glossary directory not found: {GLOSSARY_DIR}")
        return terms

    for md_file in GLOSSARY_DIR.glob("*.md"):
        term_id = md_file.stem  # e.g., "adr" from "adr.md"

        # Read the first few lines to get the term name
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read(500)
            # Extract title (first # heading)
            title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            if title_match:
                term_name = title_match.group(1).strip()
                terms[term_id] = {
                    'name': term_name,
                    'file': md_file,
                    'patterns': generate_search_patterns(term_name, term_id)
                }

    return terms

def generate_search_patterns(term_name, term_id):
    """Generate regex patterns to find this term in text."""
    patterns = []

    # Create variations
    # E.g., "TDD (Test-Driven Development)" -> ["TDD", "Test-Driven Development"]

    # Extract acronym if present (e.g., "TDD")
    acronym_match = re.match(r'^([A-Z]+)\s*\(', term_name)
    if acronym_match:
        acronym = acronym_match.group(1)
        patterns.append(r'\b' + re.escape(acronym) + r'\b')

    # Extract full name (e.g., "Test-Driven Development")
    full_name_match = re.search(r'\(([^)]+)\)', term_name)
    if full_name_match:
        full_name = full_name_match.group(1)
        patterns.append(re.escape(full_name))

    # Use the term_id as a pattern (e.g., "typescript", "react")
    if term_id not in ['e2e', 'api']:  # Special cases
        patterns.append(r'\b' + term_id.replace('-', r'[-\s]?') + r'\b')

    # Clean term name (remove parenthetical)
    clean_name = re.sub(r'\s*\([^)]*\)', '', term_name)
    if clean_name not in [p.replace(r'\b', '').replace(r'\\', '') for p in patterns]:
        patterns.append(re.escape(clean_name))

    return patterns

def scan_markdown_file(file_path, glossary_terms):
    """Scan a markdown file for linkable terms."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find already linked terms (to avoid double-linking)
    already_linked = set()
    link_pattern = r'\[([^\]]+)\]\(/docs/glossary/terms/([^)]+)\)'
    for match in re.finditer(link_pattern, content):
        already_linked.add(match.group(2))  # term_id

    # Find linkable terms
    linkable = defaultdict(list)

    for term_id, term_data in glossary_terms.items():
        if term_id in already_linked:
            continue  # Already linked, skip

        for pattern in term_data['patterns']:
            # Skip if inside existing link
            for match in re.finditer(pattern, content, re.IGNORECASE):
                matched_text = match.group(0)
                start = match.start()
                end = match.end()

                # Check if inside code block
                if is_inside_code_block(content, start):
                    continue

                # Check if inside existing link
                if is_inside_existing_link(content, start, end):
                    continue

                # Get context (line number and surrounding text)
                line_num = content[:start].count('\n') + 1
                line_start = content.rfind('\n', 0, start) + 1
                line_end = content.find('\n', end)
                if line_end == -1:
                    line_end = len(content)
                line_text = content[line_start:line_end]

                linkable[term_id].append({
                    'line': line_num,
                    'text': line_text.strip(),
                    'matched': matched_text
                })

    return linkable, already_linked

def is_inside_code_block(content, position):
    """Check if position is inside a code block."""
    # Count triple backticks before position
    before = content[:position]
    triple_backticks = before.count('```')
    # If odd number, we're inside a code block
    return triple_backticks % 2 == 1

def is_inside_existing_link(content, start, end):
    """Check if position is inside an existing markdown link."""
    # Look backwards for [ and forwards for ]
    before = content[:start]
    after = content[end:]

    # Find last [ before position
    last_bracket = before.rfind('[')
    if last_bracket == -1:
        return False

    # Find first ] after position
    next_bracket = after.find(']')
    if next_bracket == -1:
        return False

    # Check if there's a (link) after the ]
    link_part = after[next_bracket:next_bracket + 50]
    if link_part.startswith(']('):
        return True

    return False

def generate_report(scan_results, glossary_terms):
    """Generate a markdown report of linking opportunities."""
    report_lines = [
        "# Glossary Linking Opportunities Report",
        "",
        f"**Generated:** {Path.cwd()}",
        f"**Total Files Scanned:** {len(scan_results)}",
        "",
        "## Summary",
        ""
    ]

    # Calculate totals
    total_opportunities = 0
    files_with_opportunities = 0

    for file_path, data in scan_results.items():
        if data['linkable']:
            files_with_opportunities += 1
            for term_id, occurrences in data['linkable'].items():
                total_opportunities += len(occurrences)

    report_lines.extend([
        f"- **Total Linking Opportunities:** {total_opportunities}",
        f"- **Files with Opportunities:** {files_with_opportunities}",
        f"- **Already Linked Terms:** {sum(len(d['already_linked']) for d in scan_results.values())}",
        "",
        "---",
        "",
        "## By File",
        ""
    ])

    # Sort by number of opportunities (most first)
    sorted_files = sorted(
        scan_results.items(),
        key=lambda x: sum(len(occs) for occs in x[1]['linkable'].values()),
        reverse=True
    )

    for file_path, data in sorted_files:
        if not data['linkable']:
            continue

        rel_path = file_path.relative_to(DOCS_ROOT)
        total_opps = sum(len(occs) for occs in data['linkable'].values())

        report_lines.extend([
            f"### `{rel_path}` ({total_opps} opportunities)",
            ""
        ])

        if data['already_linked']:
            linked_list = ', '.join(f"`{t}`" for t in sorted(data['already_linked']))
            report_lines.append(f"**Already linked:** {linked_list}\n")

        for term_id, occurrences in sorted(data['linkable'].items()):
            term_name = glossary_terms[term_id]['name']
            report_lines.extend([
                f"#### {term_name} (→ `/docs/glossary/terms/{term_id}`)",
                ""
            ])

            for occ in occurrences[:5]:  # Limit to 5 examples per term
                report_lines.append(f"- **Line {occ['line']}:** `{occ['text'][:100]}...`")

            if len(occurrences) > 5:
                report_lines.append(f"- *...and {len(occurrences) - 5} more occurrences*")

            report_lines.append("")

        report_lines.append("---\n")

    return '\n'.join(report_lines)

def main():
    """Main execution."""
    print("🔍 Bulk Glossary Linking Script")
    print("=" * 60)

    # Load glossary terms
    print("\n📚 Loading glossary terms...")
    glossary_terms = load_glossary_terms()
    print(f"   Found {len(glossary_terms)} glossary terms")

    # Scan all markdown files
    print("\n📄 Scanning markdown files...")
    scan_results = {}

    for md_file in DOCS_ROOT.rglob("*.md"):
        # Skip glossary files themselves
        if GLOSSARY_DIR in md_file.parents:
            continue

        # Skip scripts directory
        if 'scripts' in md_file.parts:
            continue

        linkable, already_linked = scan_markdown_file(md_file, glossary_terms)
        scan_results[md_file] = {
            'linkable': dict(linkable),
            'already_linked': already_linked
        }

    print(f"   Scanned {len(scan_results)} files")

    # Generate report
    print("\n📊 Generating report...")
    report = generate_report(scan_results, glossary_terms)

    # Ensure scripts directory exists
    OUTPUT_REPORT.parent.mkdir(parents=True, exist_ok=True)

    # Write report
    with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"   Report saved to: {OUTPUT_REPORT}")

    # Summary
    total_opps = sum(
        sum(len(occs) for occs in data['linkable'].values())
        for data in scan_results.values()
    )

    print("\n✅ Complete!")
    print(f"   Total linking opportunities: {total_opps}")
    print(f"   Report: {OUTPUT_REPORT}")

if __name__ == "__main__":
    main()
