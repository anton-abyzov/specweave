#!/bin/bash

# SpecWeave ADO/Jira Sync Credentials Setup Script
# This script helps you configure credentials for Azure DevOps and Jira integrations

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     SpecWeave - ADO/Jira Sync Credentials Setup             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env already exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists. Do you want to:"
  echo "  1) Edit existing .env"
  echo "  2) Backup and create new .env"
  echo "  3) Cancel"
  read -p "Choose (1/2/3): " choice

  case $choice in
    1)
      echo "Opening .env in default editor..."
      ${EDITOR:-nano} .env
      exit 0
      ;;
    2)
      backup=".env.backup.$(date +%s)"
      cp .env "$backup"
      echo "✅ Backed up existing .env to: $backup"
      ;;
    3)
      echo "❌ Cancelled."
      exit 0
      ;;
    *)
      echo "❌ Invalid choice."
      exit 1
      ;;
  esac
fi

echo ""
echo "Let's set up your credentials. Press Enter to skip any service."
echo ""

# Azure DevOps Setup
echo "═══════════════════════════════════════════════════════════════"
echo "1. Azure DevOps Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📖 How to get your Azure DevOps PAT:"
echo "   1. Go to: https://dev.azure.com/{org}/_usersSettings/tokens"
echo "   2. Click '+ New Token'"
echo "   3. Select scopes: Work Items (Read, Write, Manage)"
echo "   4. Copy the token (52 characters)"
echo ""

read -p "Azure DevOps PAT (52 chars): " ado_pat
read -p "Organization name: " ado_org
read -p "Project name: " ado_project

# Jira Setup
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "2. Jira Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📖 How to get your Jira API Token:"
echo "   1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens"
echo "   2. Click 'Create API token'"
echo "   3. Copy the token"
echo ""

read -p "Jira API Token: " jira_token
read -p "Jira Email: " jira_email
read -p "Jira Domain (e.g., company.atlassian.net): " jira_domain

# Create .env file
echo ""
echo "💾 Creating .env file..."

cat > .env << EOF
# Azure DevOps
AZURE_DEVOPS_PAT=${ado_pat}
AZURE_DEVOPS_ORG=${ado_org}
AZURE_DEVOPS_PROJECT=${ado_project}

# Jira
JIRA_API_TOKEN=${jira_token}
JIRA_EMAIL=${jira_email}
JIRA_DOMAIN=${jira_domain}
EOF

echo "✅ .env file created!"
echo ""

# Ensure .env is in .gitignore
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
  echo ".env" >> .gitignore
  echo "✅ Added .env to .gitignore"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✨ Setup Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Run tests to verify credentials:"
echo "     npm run test:integration:ado"
echo "     npm run test:integration:jira"
echo ""
echo "  2. View test results in: test-results/"
echo ""
echo "  3. Read the docs: docs/integrations/SYNC_INTEGRATIONS_README.md"
echo ""
echo "🔐 Security note:"
echo "  - Your .env file is gitignored (never committed)"
echo "  - Rotate tokens every 90 days"
echo "  - Use separate tokens for test and production"
echo ""
