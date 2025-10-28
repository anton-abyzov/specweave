#!/bin/bash

# SpecWeave Jira Bidirectional Sync Test Runner
# Tests full workflow: Jira Epic → SpecWeave Increment → RFC/docs integration

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      Jira Bidirectional Sync Test Runner                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found!"
  echo ""
  echo "Please create .env file with your Jira credentials:"
  echo "   JIRA_API_TOKEN=your-token"
  echo "   JIRA_EMAIL=your-email@example.com"
  echo "   JIRA_DOMAIN=antonabyzov.atlassian.net"
  echo ""
  exit 1
fi

# Check if ts-node is available
if ! command -v npx ts-node &> /dev/null; then
  echo "📦 Installing ts-node..."
  npm install --save-dev ts-node @types/node
fi

# Run the test
echo "🧪 Running Jira Bidirectional Sync test..."
echo ""

npx ts-node tests/integration/jira-sync/jira-bidirectional-sync.test.ts

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Test Complete!                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Check results in: test-results/"
echo "📁 Check increment in: .specweave/increments/"
echo "📄 Check RFC in: .specweave/docs/rfcs/"
echo ""
