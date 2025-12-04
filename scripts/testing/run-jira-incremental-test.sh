#!/bin/bash

# Jira Incremental Sync Test Runner
# Tests granular work item management (add items, cherry-pick, grouping)

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      Jira Incremental Sync Test Runner                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo ""
    echo "Please create a .env file with your Jira credentials:"
    echo ""
    echo "JIRA_API_TOKEN=your-jira-api-token"
    echo "JIRA_EMAIL=your-email@example.com"
    echo "JIRA_DOMAIN=your-domain.atlassian.net"
    echo ""
    echo "You can also run: bash scripts/setup-sync-credentials.sh"
    exit 1
fi

# Check if ts-node is available, install if not
if ! command -v npx ts-node &> /dev/null; then
    echo "📦 Installing ts-node..."
    npm install --save-dev ts-node @types/node
fi

# Check if required packages are installed
if ! npm list js-yaml &> /dev/null; then
    echo "📦 Installing required dependencies..."
    npm install --save js-yaml
    npm install --save-dev @types/js-yaml
fi

echo "🧪 Running Jira Incremental Sync Tests..."
echo ""

# Run the test
npx ts-node tests/integration/jira-sync/jira-incremental-sync.test.ts

echo ""
echo "✅ Test execution complete!"
echo ""
echo "📊 Check test-results/ folder for detailed JSON report"
echo "📁 Check .specweave/increments/ for created increments"
