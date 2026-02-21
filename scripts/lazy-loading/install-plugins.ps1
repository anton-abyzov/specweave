#Requires -Version 5.1
<#
.SYNOPSIS
    SpecWeave Lazy Loading - Plugin Installation Script (PowerShell)

.DESCRIPTION
    Copies plugins from cache to active skills directory for hot-reload.
    Windows-native alternative to install-plugins.sh.

.PARAMETER Plugins
    Plugin names (space-separated) or "all" for all plugins. Default: all

.PARAMETER Target
    Target AI tool: claude (default), cursor, windsurf, generic

.PARAMETER Silent
    Suppress output messages

.PARAMETER Force
    Overwrite existing plugins

.EXAMPLE
    .\install-plugins.ps1
    Install all plugins for Claude Code

.EXAMPLE
    .\install-plugins.ps1 -Plugins specweave -Target cursor
    Install core plugin for Cursor IDE

.EXAMPLE
    .\install-plugins.ps1 -Plugins "specweave specweave-github" -Force
    Force reinstall specific plugins

.NOTES
    Author: SpecWeave Team
    Version: 1.0.0
    Requires: PowerShell 5.1 or higher
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Plugins = "all",

    [Parameter()]
    [ValidateSet("claude", "cursor", "windsurf", "generic")]
    [string]$Target = "claude",

    [Parameter()]
    [switch]$Silent,

    [Parameter()]
    [switch]$Force
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = "Stop"

# Environment variable overrides
$CacheDir = if ($env:SPECWEAVE_CACHE_DIR) {
    $env:SPECWEAVE_CACHE_DIR
} else {
    Join-Path $env:USERPROFILE ".specweave\skills-cache"
}

$StateDir = Join-Path $env:USERPROFILE ".specweave\state"
$StateFile = Join-Path $StateDir "plugins-loaded.json"

# Target-specific directories
$TargetDirs = @{
    "claude"   = Join-Path $env:USERPROFILE ".claude\skills"
    "cursor"   = Join-Path $env:USERPROFILE ".cursor\skills"
    "windsurf" = Join-Path $env:USERPROFILE ".windsurf\skills"
    "generic"  = Join-Path $env:USERPROFILE ".ai-tools\skills"
}

$ActiveDir = if ($env:SPECWEAVE_SKILLS_DIR) {
    $env:SPECWEAVE_SKILLS_DIR
} else {
    $TargetDirs[$Target]
}

# =============================================================================
# Utility Functions
# =============================================================================

function Write-Log {
    param([string]$Message)
    if (-not $Silent) {
        Write-Host $Message
    }
}

function Write-Err {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

function Write-Warn {
    param([string]$Message)
    if (-not $Silent) {
        Write-Host "WARNING: $Message" -ForegroundColor Yellow
    }
}

function Get-TimeMs {
    return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
}

# =============================================================================
# Main Installation Logic
# =============================================================================

$StartTime = Get-TimeMs

# Ensure directories exist
try {
    if (-not (Test-Path $ActiveDir)) {
        New-Item -ItemType Directory -Path $ActiveDir -Force | Out-Null
    }
    if (-not (Test-Path $StateDir)) {
        New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
    }
} catch {
    Write-Err "Cannot create directories: $_"
    exit 1
}

# Check if cache exists
if (-not (Test-Path $CacheDir)) {
    Write-Err "Skills cache not found at $CacheDir"
    Write-Err "Run 'specweave refresh-plugins' first to populate the cache."
    exit 1
}

# Get list of plugins to install
if ($Plugins -eq "all") {
    $PluginList = Get-ChildItem -Path $CacheDir -Directory | Select-Object -ExpandProperty Name
    if ($PluginList.Count -eq 0) {
        Write-Err "No plugins found in cache."
        exit 1
    }
} else {
    $PluginList = $Plugins -split '\s+'
}

Write-Log "Installing SpecWeave plugins for $Target..."
Write-Log "  Cache:  $CacheDir"
Write-Log "  Target: $ActiveDir"
Write-Log ""

# Track installation results
$Installed = @()
$Skipped = @()
$Failed = @()

foreach ($plugin in $PluginList) {
    $pluginCache = Join-Path $CacheDir $plugin

    # Check if plugin exists in cache
    if (-not (Test-Path $pluginCache)) {
        Write-Warn "Plugin '$plugin' not found in cache, skipping."
        $Failed += $plugin
        continue
    }

    # Find skills directory
    $skillsSource = if (Test-Path (Join-Path $pluginCache "skills")) {
        Join-Path $pluginCache "skills"
    } else {
        $pluginCache
    }

    # Get skill subdirectories
    $skillDirs = Get-ChildItem -Path $skillsSource -Directory -ErrorAction SilentlyContinue

    if ($skillDirs.Count -eq 0) {
        # No skill subdirectories - check for direct SKILL.md
        $skillMd = Join-Path $skillsSource "SKILL.md"
        if (Test-Path $skillMd) {
            $destDir = Join-Path $ActiveDir $plugin
            if ((Test-Path $destDir) -and (-not $Force)) {
                $Skipped += $plugin
                continue
            }
            try {
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                }
                Copy-Item -Path "$skillsSource\*" -Destination $destDir -Recurse -Force
                $Installed += $plugin
            } catch {
                Write-Warn "Failed to copy plugin '$plugin': $_"
                $Failed += $plugin
            }
        } else {
            $Skipped += $plugin
        }
        continue
    }

    # Copy each skill subdirectory
    foreach ($skillDir in $skillDirs) {
        $skillName = $skillDir.Name
        $destDir = Join-Path $ActiveDir $skillName

        # Skip if already exists (idempotent) unless force flag
        if ((Test-Path $destDir) -and (-not $Force)) {
            $Skipped += $skillName
            continue
        }

        try {
            Copy-Item -Path $skillDir.FullName -Destination $ActiveDir -Recurse -Force
            $Installed += $skillName
        } catch {
            Write-Warn "Failed to copy skill '$skillName': $_"
            $Failed += $skillName
        }
    }
}

$EndTime = Get-TimeMs
$DurationMs = $EndTime - $StartTime

# =============================================================================
# State File Generation
# =============================================================================

$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$StateObject = @{
    version = "1.0.0"
    lazyMode = $true
    target = $Target
    loadedAt = $Timestamp
    installMethod = "hot-reload"
    cacheDir = $CacheDir
    skillsDir = $ActiveDir
    loadedPlugins = $Installed
    skippedPlugins = $Skipped
    failedPlugins = $Failed
    stats = @{
        installed = $Installed.Count
        skipped = $Skipped.Count
        failed = $Failed.Count
        durationMs = $DurationMs
    }
}

$StateObject | ConvertTo-Json -Depth 4 | Out-File -FilePath $StateFile -Encoding UTF8

# =============================================================================
# Output Summary
# =============================================================================

if (-not $Silent) {
    Write-Host ""
    Write-Host "SpecWeave Plugin Installation Complete"
    Write-Host "======================================="
    Write-Host "  Target:    $Target"
    Write-Host "  Installed: $($Installed.Count) skill(s)"
    Write-Host "  Skipped:   $($Skipped.Count) (already installed)"
    if ($Failed.Count -gt 0) {
        Write-Host "  Failed:    $($Failed.Count) (check cache)" -ForegroundColor Yellow
    }
    Write-Host "  Duration:  ${DurationMs}ms"
    Write-Host ""

    switch ($Target) {
        "claude" {
            Write-Host "Skills are now active via hot-reload."
            Write-Host "Use /sw:* commands or mention 'specweave' to get started."
        }
        { $_ -in "cursor", "windsurf" } {
            Write-Host "Skills copied to $ActiveDir"
            Write-Host "Configure your AI tool to read from this directory."
            Write-Host "See: https://spec-weave.com/docs/integrations/$Target"
        }
        "generic" {
            Write-Host "Skills copied to $ActiveDir"
            Write-Host "Include SKILL.md files in your AI tool's context."
            Write-Host "See: https://spec-weave.com/docs/integrations/generic"
        }
    }
}

# Exit with appropriate code
if ($Failed.Count -gt 0) {
    exit 1
} else {
    exit 0
}
