#!/bin/bash

# ============================================================================
# Post Living Docs Update Hook - Azure DevOps Sync
# ============================================================================
#
# Triggered after living docs are updated to sync with Azure DevOps.
# CRITICAL: External tool status ALWAYS wins in conflicts!
#
# Triggers:
# 1. After /specweave:done (increment completion)
# 2. After /specweave:sync-docs update
# 3. After manual spec edits
# 4. After webhook from ADO
#
# ============================================================================

set +e  # EMERGENCY FIX: Prevents Claude Code crashes

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LIVING_DOCS_DIR="$PROJECT_ROOT/.specweave/docs/internal/specs"
LOG_FILE="$PROJECT_ROOT/.specweave/logs/ado-sync.log"
DEBUG=${DEBUG:-0}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# ============================================================================
# Logging
# ============================================================================

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    [ "$DEBUG" -eq 1 ] && echo "[$level] $message" >&2
}

log_info() {
    log "INFO" "$@"
}

log_error() {
    log "ERROR" "$@"
}

log_debug() {
    [ "$DEBUG" -eq 1 ] && log "DEBUG" "$@"
}

# ============================================================================
# External Tool Detection
# ============================================================================

detect_external_tool() {
    local spec_path=$1

    # Check for external links in spec metadata
    if grep -q "externalLinks:" "$spec_path"; then
        if grep -q "ado:" "$spec_path"; then
            echo "ado"
        elif grep -q "jira:" "$spec_path"; then
            echo "jira"
        elif grep -q "github:" "$spec_path"; then
            echo "github"
        fi
    fi
}

# ============================================================================
# Status Mapping
# ============================================================================

map_ado_status_to_local() {
    local ado_status=$1

    case "$ado_status" in
        "New")
            echo "draft"
            ;;
        "Active")
            echo "in-progress"
            ;;
        "Resolved")
            echo "implemented"
            ;;
        "Closed")
            echo "complete"
            ;;
        "In Review"|"In QA")
            echo "in-qa"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

map_local_status_to_ado() {
    local local_status=$1

    case "$local_status" in
        "draft")
            echo "New"
            ;;
        "in-progress")
            echo "Active"
            ;;
        "implemented")
            echo "Resolved"
            ;;
        "complete")
            echo "Closed"
            ;;
        "in-qa")
            echo "In Review"
            ;;
        *)
            echo "Active"
            ;;
    esac
}

# ============================================================================
# ADO API Functions
# ============================================================================

get_ado_work_item_status() {
    local work_item_id=$1
    local org="${AZURE_DEVOPS_ORG}"
    local project="${AZURE_DEVOPS_PROJECT}"
    local pat="${AZURE_DEVOPS_PAT}"

    if [ -z "$org" ] || [ -z "$pat" ]; then
        log_error "ADO credentials not configured"
        return 1
    fi

    local api_url="https://dev.azure.com/${org}/${project}/_apis/wit/workitems/${work_item_id}?api-version=7.0"

    log_debug "Fetching ADO work item $work_item_id status"

    local response=$(curl -s -u ":${pat}" \
        -H "Content-Type: application/json" \
        "$api_url")

    if [ $? -ne 0 ]; then
        log_error "Failed to fetch ADO work item status"
        return 1
    fi

    # Extract status from response
    local status=$(echo "$response" | jq -r '.fields["System.State"]')

    if [ "$status" = "null" ] || [ -z "$status" ]; then
        log_error "Could not extract status from ADO response"
        return 1
    fi

    echo "$status"
}

update_ado_work_item() {
    local work_item_id=$1
    local spec_content=$2
    local org="${AZURE_DEVOPS_ORG}"
    local project="${AZURE_DEVOPS_PROJECT}"
    local pat="${AZURE_DEVOPS_PAT}"

    if [ -z "$org" ] || [ -z "$pat" ]; then
        log_error "ADO credentials not configured"
        return 1
    fi

    # Extract current status from spec
    local local_status=$(echo "$spec_content" | grep "^status:" | cut -d: -f2 | tr -d ' ')
    local ado_status=$(map_local_status_to_ado "$local_status")

    local api_url="https://dev.azure.com/${org}/${project}/_apis/wit/workitems/${work_item_id}?api-version=7.0"

    # Create update payload
    local payload=$(cat <<EOF
[
    {
        "op": "add",
        "path": "/fields/System.State",
        "value": "$ado_status"
    },
    {
        "op": "add",
        "path": "/fields/System.History",
        "value": "Updated from SpecWeave living docs"
    }
]
EOF
)

    log_debug "Updating ADO work item $work_item_id with status: $ado_status"

    curl -s -X PATCH \
        -u ":${pat}" \
        -H "Content-Type: application/json-patch+json" \
        -d "$payload" \
        "$api_url" > /dev/null

    if [ $? -ne 0 ]; then
        log_error "Failed to update ADO work item"
        return 1
    fi

    log_info "Updated ADO work item $work_item_id"
}

# ============================================================================
# Conflict Resolution - CRITICAL: External Wins!
# ============================================================================

resolve_status_conflict() {
    local spec_path=$1
    local local_status=$2
    local external_status=$3

    local mapped_external=$(map_ado_status_to_local "$external_status")

    if [ "$local_status" != "$mapped_external" ]; then
        log_info "Status conflict detected:"
        log_info "  Local: $local_status"
        log_info "  External: $external_status (mapped: $mapped_external)"
        log_info "  Resolution: EXTERNAL WINS - applying $mapped_external"

        # Update local spec with external status
        sed -i.bak "s/^status: .*/status: $mapped_external/" "$spec_path"

        # Add sync metadata
        local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

        # Check if syncedAt exists, update or add
        if grep -q "syncedAt:" "$spec_path"; then
            sed -i.bak "s/syncedAt: .*/syncedAt: \"$timestamp\"/" "$spec_path"
        else
            # Add after externalLinks section
            sed -i.bak "/externalLinks:/a\\
    syncedAt: \"$timestamp\"" "$spec_path"
        fi

        # Clean up backup files
        rm -f "${spec_path}.bak"

        log_info "Local spec updated with external status: $mapped_external"
        return 0
    else
        log_debug "No status conflict - local and external match: $local_status"
        return 0
    fi
}

# ============================================================================
# Main Sync Function
# ============================================================================

sync_spec_with_ado() {
    local spec_path=$1

    if [ ! -f "$spec_path" ]; then
        log_error "Spec file not found: $spec_path"
        return 1
    fi

    local spec_name=$(basename "$spec_path")
    log_info "Syncing spec: $spec_name"

    # Read spec content
    local spec_content=$(cat "$spec_path")

    # Extract ADO work item ID from metadata
    local work_item_id=$(echo "$spec_content" | grep -A5 "externalLinks:" | grep -A3 "ado:" | grep "featureId:" | cut -d: -f2 | tr -d ' ')

    if [ -z "$work_item_id" ]; then
        log_debug "No ADO work item linked to spec, skipping sync"
        return 0
    fi

    log_info "Found ADO work item ID: $work_item_id"

    # Step 1: Push updates to ADO (content changes)
    update_ado_work_item "$work_item_id" "$spec_content"

    # Step 2: CRITICAL - Pull status from ADO (external wins!)
    local external_status=$(get_ado_work_item_status "$work_item_id")

    if [ -z "$external_status" ]; then
        log_error "Could not fetch ADO status"
        return 1
    fi

    log_info "ADO status: $external_status"

    # Step 3: Extract local status
    local local_status=$(echo "$spec_content" | grep "^status:" | cut -d: -f2 | tr -d ' ')

    log_info "Local status: $local_status"

    # Step 4: Resolve conflicts - EXTERNAL WINS
    resolve_status_conflict "$spec_path" "$local_status" "$external_status"

    log_info "Sync completed for $spec_name"
}

# ============================================================================
# Entry Point
# ============================================================================

main() {
    log_info "=== Post Living Docs Update Hook Started ==="

    # Get the spec path from arguments or environment
    local spec_path="${1:-$SPECWEAVE_UPDATED_SPEC}"

    if [ -z "$spec_path" ]; then
        log_error "No spec path provided"
        exit 1
    fi

    # Detect external tool
    local tool=$(detect_external_tool "$spec_path")

    if [ "$tool" != "ado" ]; then
        log_debug "Not an ADO-linked spec, skipping"
        exit 0
    fi

    log_info "Detected ADO integration for spec"

    # Perform sync
    sync_spec_with_ado "$spec_path"

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        log_info "=== Sync completed successfully ==="
    else
        log_error "=== Sync failed with exit code: $exit_code ==="
    fi

    exit $exit_code
}

# Run main function
main "$@"
# ALWAYS exit 0 - NEVER let hook errors crash Claude Code
exit 0
