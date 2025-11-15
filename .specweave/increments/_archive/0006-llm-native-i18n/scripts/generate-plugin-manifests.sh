#!/bin/bash

# ============================================================================
# Generate Plugin Manifests for All 17 SpecWeave Plugins
# ============================================================================
# Creates both plugin.json (Claude native) and manifest.json (SpecWeave custom)
# for all plugins in the marketplace.
# ============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
PLUGINS_DIR="$ROOT_DIR/plugins"

echo "🔧 Generating plugin manifests..."
echo "Root: $ROOT_DIR"
echo ""

# ============================================================================
# Helper Functions
# ============================================================================

create_plugin_json() {
  local plugin_path=$1
  local name=$2
  local description=$3

  cat > "$plugin_path/.claude-plugin/plugin.json" << EOF
{
  "name": "$name",
  "description": "$description",
  "version": "1.0.0",
  "author": {
    "name": "SpecWeave Team"
  }
}
EOF

  echo "✅ Created plugin.json for $name"
}

create_manifest_json() {
  local plugin_path=$1
  local name=$2
  local description=$3
  local skills=$4
  local agents=$5
  local commands=$6
  local auto_detect_files=$7
  local auto_detect_packages=$8
  local auto_detect_env=$9
  local triggers=${10}

  # Build skills array
  local skills_json=""
  if [ -n "$skills" ]; then
    IFS=',' read -ra SKILL_ARRAY <<< "$skills"
    skills_json=$(printf ',\n      "%s"' "${SKILL_ARRAY[@]}")
    skills_json="[${skills_json:1}\n    ]"
  else
    skills_json="[]"
  fi

  # Build agents array
  local agents_json=""
  if [ -n "$agents" ]; then
    IFS=',' read -ra AGENT_ARRAY <<< "$agents"
    agents_json=$(printf ',\n      "%s"' "${AGENT_ARRAY[@]}")
    agents_json="[${agents_json:1}\n    ]"
  else
    agents_json="[]"
  fi

  # Build commands array
  local commands_json=""
  if [ -n "$commands" ]; then
    IFS=',' read -ra COMMAND_ARRAY <<< "$commands"
    commands_json=$(printf ',\n      "%s"' "${COMMAND_ARRAY[@]}")
    commands_json="[${commands_json:1}\n    ]"
  else
    commands_json="[]"
  fi

  # Build auto_detect
  local auto_detect_json="{"

  if [ -n "$auto_detect_files" ]; then
    IFS=',' read -ra FILE_ARRAY <<< "$auto_detect_files"
    local files_json=$(printf ',\n      "%s"' "${FILE_ARRAY[@]}")
    files_json="[${files_json:1}\n    ]"
    auto_detect_json="$auto_detect_json\n    \"files\": $files_json"
  fi

  if [ -n "$auto_detect_packages" ]; then
    if [[ $auto_detect_json != *"{"* ]] || [[ $auto_detect_json != *"}"* ]]; then
      auto_detect_json="$auto_detect_json,"
    fi
    IFS=',' read -ra PACKAGE_ARRAY <<< "$auto_detect_packages"
    local packages_json=$(printf ',\n      "%s"' "${PACKAGE_ARRAY[@]}")
    packages_json="[${packages_json:1}\n    ]"
    auto_detect_json="$auto_detect_json\n    \"packages\": $packages_json"
  fi

  if [ -n "$auto_detect_env" ]; then
    if [[ $auto_detect_json != "{" ]]; then
      auto_detect_json="$auto_detect_json,"
    fi
    IFS=',' read -ra ENV_ARRAY <<< "$auto_detect_env"
    local env_json=$(printf ',\n      "%s"' "${ENV_ARRAY[@]}")
    env_json="[${env_json:1}\n    ]"
    auto_detect_json="$auto_detect_json\n    \"env_vars\": $env_json"
  fi

  auto_detect_json="$auto_detect_json\n  }"

  # Build triggers array
  local triggers_json=""
  if [ -n "$triggers" ]; then
    IFS=',' read -ra TRIGGER_ARRAY <<< "$triggers"
    triggers_json=$(printf ',\n    "%s"' "${TRIGGER_ARRAY[@]}")
    triggers_json="[${triggers_json:1}\n  ]"
  else
    triggers_json="[]"
  fi

  cat > "$plugin_path/.claude-plugin/manifest.json" << EOF
{
  "\$schema": "https://spec-weave.com/schemas/plugin-manifest.json",
  "name": "$name",
  "version": "1.0.0",
  "description": "$description",
  "author": "SpecWeave Team",
  "license": "MIT",
  "specweave_core_version": ">=0.6.0",
  "auto_detect": $auto_detect_json,
  "provides": {
    "skills": $skills_json,
    "agents": $agents_json,
    "commands": $commands_json
  },
  "triggers": $triggers_json
}
EOF

  echo "✅ Created manifest.json for $name"
}

# ============================================================================
# Plugin Definitions
# ============================================================================

# 1. JIRA Plugin
mkdir -p "$PLUGINS_DIR/specweave-jira/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-jira" \
  "specweave-jira" \
  "JIRA integration for SpecWeave increments. Bidirectional sync between SpecWeave increments and JIRA epics/stories. Automatically creates JIRA issues from increments, tracks progress, and updates status."

create_manifest_json \
  "$PLUGINS_DIR/specweave-jira" \
  "specweave-jira" \
  "JIRA integration for SpecWeave increments. Bidirectional sync between SpecWeave increments and JIRA epics/stories. Automatically creates JIRA issues from increments, tracks progress, and updates status." \
  "jira-sync,specweave-jira-mapper" \
  "" \
  "" \
  ".jira/,.atlassian/" \
  "jira" \
  "JIRA_API_TOKEN,JIRA_HOST" \
  "jira,JIRA,atlassian,Atlassian,epic,story,sprint"

# 2. ADO Plugin
mkdir -p "$PLUGINS_DIR/specweave-ado/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-ado" \
  "specweave-ado" \
  "Azure DevOps integration for SpecWeave increments. Bidirectional sync between SpecWeave increments and ADO work items (epics/features/user stories). Automatically creates work items, tracks progress, and updates status."

create_manifest_json \
  "$PLUGINS_DIR/specweave-ado" \
  "specweave-ado" \
  "Azure DevOps integration for SpecWeave increments. Bidirectional sync between SpecWeave increments and ADO work items (epics/features/user stories). Automatically creates work items, tracks progress, and updates status." \
  "ado-sync,specweave-ado-mapper" \
  "" \
  "" \
  ".azuredevops/,.ado/" \
  "azure-devops-cli" \
  "AZURE_DEVOPS_PAT,ADO_TOKEN" \
  "ado,ADO,azure devops,Azure DevOps,work item,epic,feature,user story"

# 3. Kubernetes Plugin
mkdir -p "$PLUGINS_DIR/specweave-kubernetes/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-kubernetes" \
  "specweave-kubernetes" \
  "Kubernetes deployment and management for SpecWeave projects. Generate K8s manifests, Helm charts, and GitOps workflows. Includes security policies (NetworkPolicy, RBAC) and best practices for production deployments."

create_manifest_json \
  "$PLUGINS_DIR/specweave-kubernetes" \
  "specweave-kubernetes" \
  "Kubernetes deployment and management for SpecWeave projects. Generate K8s manifests, Helm charts, and GitOps workflows. Includes security policies (NetworkPolicy, RBAC) and best practices for production deployments." \
  "k8s-manifest-generator,k8s-security-policies,helm-chart-scaffolding,gitops-workflow" \
  "" \
  "" \
  "kubernetes/,k8s/,helm/,.kube/" \
  "@kubernetes/client-node,helm" \
  "KUBECONFIG,KUBE_CONTEXT" \
  "kubernetes,k8s,kubectl,helm,pod,deployment,service,ingress,configmap,secret"

# 4. Infrastructure Plugin
mkdir -p "$PLUGINS_DIR/specweave-infrastructure/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-infrastructure" \
  "specweave-infrastructure" \
  "Cloud infrastructure provisioning and monitoring. Includes Hetzner Cloud provisioning, Prometheus/Grafana setup, distributed tracing (Jaeger/Tempo), and SLO implementation. Focus on cost-effective, production-ready infrastructure."

create_manifest_json \
  "$PLUGINS_DIR/specweave-infrastructure" \
  "specweave-infrastructure" \
  "Cloud infrastructure provisioning and monitoring. Includes Hetzner Cloud provisioning, Prometheus/Grafana setup, distributed tracing (Jaeger/Tempo), and SLO implementation. Focus on cost-effective, production-ready infrastructure." \
  "hetzner-provisioner,prometheus-configuration,grafana-dashboards,distributed-tracing,slo-implementation" \
  "" \
  "" \
  "terraform/,infrastructure/,monitoring/" \
  "terraform,prometheus,grafana,hcloud" \
  "HCLOUD_TOKEN,TF_VAR_hcloud_token" \
  "infrastructure,infra,terraform,prometheus,grafana,monitoring,observability,hetzner"

# 5. Figma Plugin
mkdir -p "$PLUGINS_DIR/specweave-figma/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-figma" \
  "specweave-figma" \
  "Figma design system integration. Connect to Figma via MCP servers, extract design tokens, convert designs to code (React/Angular), and implement design systems. Supports both official Figma MCP and community Framelink MCP."

create_manifest_json \
  "$PLUGINS_DIR/specweave-figma" \
  "specweave-figma" \
  "Figma design system integration. Connect to Figma via MCP servers, extract design tokens, convert designs to code (React/Angular), and implement design systems. Supports both official Figma MCP and community Framelink MCP." \
  "figma-designer,figma-implementer,figma-mcp-connector,figma-to-code" \
  "" \
  "" \
  "figma/,design-system/" \
  "figma,@figma/plugin-typings" \
  "FIGMA_ACCESS_TOKEN,FIGMA_FILE_KEY" \
  "figma,Figma,design system,design tokens,MCP,framelink,design,mockup,prototype"

# 6. Frontend Plugin
mkdir -p "$PLUGINS_DIR/specweave-frontend/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-frontend" \
  "specweave-frontend" \
  "Frontend development for React, Vue, and Angular projects. Includes Next.js 14+ App Router support, design system architecture (Atomic Design), and UI component best practices. Focus on modern frontend patterns and performance."

create_manifest_json \
  "$PLUGINS_DIR/specweave-frontend" \
  "specweave-frontend" \
  "Frontend development for React, Vue, and Angular projects. Includes Next.js 14+ App Router support, design system architecture (Atomic Design), and UI component best practices. Focus on modern frontend patterns and performance." \
  "frontend,nextjs,design-system-architect" \
  "" \
  "" \
  "src/components/,components/,pages/,app/" \
  "react,next,vue,@angular/core" \
  "" \
  "react,React,vue,Vue,angular,Angular,nextjs,Next.js,frontend,UI,components"

# 7. Backend Plugin
mkdir -p "$PLUGINS_DIR/specweave-backend/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-backend" \
  "specweave-backend" \
  "Backend API development for Node.js, Python, and .NET stacks. Includes Express, NestJS, FastAPI, Django, Flask, ASP.NET Core, and Entity Framework Core. Focus on REST APIs, authentication, database operations, and background services."

create_manifest_json \
  "$PLUGINS_DIR/specweave-backend" \
  "specweave-backend" \
  "Backend API development for Node.js, Python, and .NET stacks. Includes Express, NestJS, FastAPI, Django, Flask, ASP.NET Core, and Entity Framework Core. Focus on REST APIs, authentication, database operations, and background services." \
  "nodejs-backend,python-backend,dotnet-backend" \
  "" \
  "" \
  "src/api/,api/,src/controllers/,controllers/" \
  "express,@nestjs/core,fastapi,django,flask,Microsoft.AspNetCore" \
  "" \
  "backend,API,express,nestjs,fastapi,django,flask,.NET,ASP.NET"

# 8. Payments Plugin
mkdir -p "$PLUGINS_DIR/specweave-payments/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-payments" \
  "specweave-payments" \
  "Payment processing integration for Stripe, PayPal, and billing automation. Includes checkout flows, subscription lifecycle management, PCI DSS compliance guidance, and recurring billing. Focus on production-ready payment systems."

create_manifest_json \
  "$PLUGINS_DIR/specweave-payments" \
  "specweave-payments" \
  "Payment processing integration for Stripe, PayPal, and billing automation. Includes checkout flows, subscription lifecycle management, PCI DSS compliance guidance, and recurring billing. Focus on production-ready payment systems." \
  "stripe-integration,paypal-integration,pci-compliance,billing-automation" \
  "" \
  "" \
  "src/payments/,payments/" \
  "stripe,@paypal/checkout-server-sdk" \
  "STRIPE_SECRET_KEY,PAYPAL_CLIENT_ID" \
  "stripe,Stripe,paypal,PayPal,payment,payments,billing,subscription,PCI"

# 9. ML Plugin
mkdir -p "$PLUGINS_DIR/specweave-ml/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-ml" \
  "specweave-ml" \
  "Machine learning pipeline workflows for data preparation, model training, validation, and production deployment. End-to-end MLOps practices with focus on reproducibility and scalability. Supports TensorFlow, PyTorch, and modern ML frameworks."

create_manifest_json \
  "$PLUGINS_DIR/specweave-ml" \
  "specweave-ml" \
  "Machine learning pipeline workflows for data preparation, model training, validation, and production deployment. End-to-end MLOps practices with focus on reproducibility and scalability. Supports TensorFlow, PyTorch, and modern ML frameworks." \
  "ml-pipeline-workflow" \
  "" \
  "" \
  "ml/,models/,notebooks/" \
  "tensorflow,torch,scikit-learn" \
  "" \
  "machine learning,ML,MLOps,tensorflow,pytorch,model,training,pipeline"

# 10. Testing Plugin
mkdir -p "$PLUGINS_DIR/specweave-testing/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-testing" \
  "specweave-testing" \
  "End-to-end browser testing with Playwright and TDD workflow orchestration. Validates user flows, captures screenshots, checks accessibility, and enforces test-driven development best practices. SpecWeave-aware for increment testing."

create_manifest_json \
  "$PLUGINS_DIR/specweave-testing" \
  "specweave-testing" \
  "End-to-end browser testing with Playwright and TDD workflow orchestration. Validates user flows, captures screenshots, checks accessibility, and enforces test-driven development best practices. SpecWeave-aware for increment testing." \
  "e2e-playwright,tdd-workflow" \
  "" \
  "" \
  "tests/e2e/,e2e/,playwright.config" \
  "playwright,@playwright/test" \
  "" \
  "testing,test,playwright,E2E,TDD,browser,automation"

# 11. Docs Plugin
mkdir -p "$PLUGINS_DIR/specweave-docs/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-docs" \
  "specweave-docs" \
  "Documentation generation and spec-driven workflows. Includes Docusaurus site generation from SpecWeave structure, spec-driven brainstorming for feature ideation, and spec-driven debugging. Focus on living documentation and knowledge management."

create_manifest_json \
  "$PLUGINS_DIR/specweave-docs" \
  "specweave-docs" \
  "Documentation generation and spec-driven workflows. Includes Docusaurus site generation from SpecWeave structure, spec-driven brainstorming for feature ideation, and spec-driven debugging. Focus on living documentation and knowledge management." \
  "docusaurus,spec-driven-brainstorming,spec-driven-debugging" \
  "" \
  "" \
  "docs-site/,docusaurus.config.js" \
  "docusaurus,@docusaurus/core" \
  "" \
  "docusaurus,documentation,docs,spec-driven,brainstorming,debugging"

# 12. Tooling Plugin
mkdir -p "$PLUGINS_DIR/specweave-tooling/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-tooling" \
  "specweave-tooling" \
  "SpecWeave skill development and orchestration tools. Create new skills with proper structure, test cases, and activation triggers. Includes skill router for intelligent skill activation based on context. Meta-tooling for extending SpecWeave."

create_manifest_json \
  "$PLUGINS_DIR/specweave-tooling" \
  "specweave-tooling" \
  "SpecWeave skill development and orchestration tools. Create new skills with proper structure, test cases, and activation triggers. Includes skill router for intelligent skill activation based on context. Meta-tooling for extending SpecWeave." \
  "skill-creator,skill-router" \
  "" \
  "" \
  "" \
  "" \
  "" \
  "skill,skills,create skill,skill creator,router,orchestration,meta"

# 13. BMAD Plugin
mkdir -p "$PLUGINS_DIR/specweave-bmad/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-bmad" \
  "specweave-bmad" \
  "BMAD (Business Model Analysis & Design) methodology expertise and SpecKit integration. Provides comparative analysis between BMAD and SpecWeave approaches, gap analysis, and benefits comparison. For projects using BMAD method."

create_manifest_json \
  "$PLUGINS_DIR/specweave-bmad" \
  "specweave-bmad" \
  "BMAD (Business Model Analysis & Design) methodology expertise and SpecKit integration. Provides comparative analysis between BMAD and SpecWeave approaches, gap analysis, and benefits comparison. For projects using BMAD method." \
  "bmad-method-expert,spec-kit-expert" \
  "" \
  "" \
  "bmad/,BMAD/" \
  "" \
  "" \
  "bmad,BMAD,bmad method,spec-kit,SpecKit,business model,gap analysis"

# 14. Cost Optimizer Plugin
mkdir -p "$PLUGINS_DIR/specweave-cost-optimizer/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-cost-optimizer" \
  "specweave-cost-optimizer" \
  "Cloud cost optimization and platform comparison. Analyzes infrastructure requirements and recommends cheapest cloud platform (Hetzner, Vercel, AWS, Railway, Fly.io, DigitalOcean). Shows cost breakdown and savings calculations."

create_manifest_json \
  "$PLUGINS_DIR/specweave-cost-optimizer" \
  "specweave-cost-optimizer" \
  "Cloud cost optimization and platform comparison. Analyzes infrastructure requirements and recommends cheapest cloud platform (Hetzner, Vercel, AWS, Railway, Fly.io, DigitalOcean). Shows cost breakdown and savings calculations." \
  "cost-optimizer" \
  "" \
  "" \
  "" \
  "" \
  "" \
  "cost,cost optimization,cheapest,budget,compare platforms,cloud cost,savings"

# 15. Diagrams Plugin
mkdir -p "$PLUGINS_DIR/specweave-diagrams/.claude-plugin"
create_plugin_json \
  "$PLUGINS_DIR/specweave-diagrams" \
  "specweave-diagrams" \
  "Architecture diagram generation with Mermaid following C4 Model conventions. Creates C4 Context/Container/Component diagrams, sequence diagrams, ER diagrams, and deployment diagrams. SpecWeave-aware for HLD/LLD documentation."

create_manifest_json \
  "$PLUGINS_DIR/specweave-diagrams" \
  "specweave-diagrams" \
  "Architecture diagram generation with Mermaid following C4 Model conventions. Creates C4 Context/Container/Component diagrams, sequence diagrams, ER diagrams, and deployment diagrams. SpecWeave-aware for HLD/LLD documentation." \
  "diagrams-architect,diagrams-generator" \
  "" \
  "" \
  "docs/architecture/diagrams/" \
  "" \
  "" \
  "diagram,diagrams,mermaid,C4,architecture,visualization,sequence,ER"

echo ""
echo "✅ All 15 new plugin manifests created!"
echo ""
echo "Summary:"
echo "  - specweave-jira"
echo "  - specweave-ado"
echo "  - specweave-kubernetes"
echo "  - specweave-infrastructure"
echo "  - specweave-figma"
echo "  - specweave-frontend"
echo "  - specweave-backend"
echo "  - specweave-payments"
echo "  - specweave-ml"
echo "  - specweave-testing"
echo "  - specweave-docs"
echo "  - specweave-tooling"
echo "  - specweave-bmad"
echo "  - specweave-cost-optimizer"
echo "  - specweave-diagrams"
echo ""
echo "Note: specweave-github already has manifests ✅"
echo "Note: specweave-ui is placeholder (no skills yet)"
