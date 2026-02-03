#!/bin/bash
# Quick sync of local plugin to Claude cache for development testing

set -e

CACHE_DIR="$HOME/.claude/plugins/cache/specweave/sw/1.0.0"

echo "Syncing local plugin to Claude cache..."

# Remove old cache and copy fresh
rm -rf "$CACHE_DIR"
mkdir -p "$CACHE_DIR"
cp -r plugins/specweave/* "$CACHE_DIR/"

echo "✓ Synced to: $CACHE_DIR"
echo ""
echo "Skills count: $(ls "$CACHE_DIR/skills/" 2>/dev/null | wc -l | tr -d ' ')"
echo ""
echo "Test with: claude -p '/sw:progress' --model haiku"
