#!/bin/bash

# SpecWeave Jira Integration Test Runner
# Handles ts-node installation and test execution

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Jira Integration Test Runner                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found!"
  echo ""
  echo "Please create .env file with your Jira credentials:"
  echo ""
  echo "JIRA_API_TOKEN=your-token"
  echo "JIRA_EMAIL=your-email@example.com"
  echo "JIRA_DOMAIN=antonabyzov.atlassian.net"
  echo ""
  echo "Or run: bash scripts/setup-sync-credentials.sh"
  exit 1
fi

# Check if ts-node is installed
if ! command -v npx ts-node &> /dev/null; then
  echo "📦 ts-node not found. Installing..."
  npm install --save-dev ts-node @types/node
  echo "✅ ts-node installed"
  echo ""
fi

# Run the test
echo "🧪 Running Jira integration tests..."
echo ""

npx ts-node tests/integration/jira-sync/jira-sync.test.ts

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Test Complete!                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Check test results in: test-results/"
echo ""
