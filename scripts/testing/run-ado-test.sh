#!/bin/bash

# SpecWeave ADO Integration Test Runner
# Handles ts-node installation and test execution

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Azure DevOps Integration Test Runner                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found!"
  echo ""
  echo "Please create .env file with your ADO credentials:"
  echo ""
  echo "AZURE_DEVOPS_PAT=your-52-char-token"
  echo "AZURE_DEVOPS_ORG=your-organization"
  echo "AZURE_DEVOPS_PROJECT=your-project"
  echo ""
  echo "Or run: bash scripts/sync/setup-sync-credentials.sh"
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
echo "🧪 Running Azure DevOps integration tests..."
echo ""

npx ts-node tests/integration/ado-sync/ado-sync.test.ts

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Test Complete!                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Check test results in: test-results/"
echo ""
