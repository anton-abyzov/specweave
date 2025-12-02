# Universal Session Start Hook for Windows PowerShell
# Calls the Node.js dispatcher for cross-platform compatibility

# Find node.exe
$nodePath = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodePath) {
    Write-Host '{"continue": true, "error": "Node.js not found"}'
    exit 0
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Run the dispatcher
& node "$scriptDir\dispatcher.mjs" session-start
