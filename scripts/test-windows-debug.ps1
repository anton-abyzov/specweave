# SpecWeave Windows Debug Test Script
# Run this on Windows to diagnose installation issues

Write-Host "==================================" -ForegroundColor Cyan
Write-Host " SpecWeave Windows Debug Test" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js version
Write-Host "1. Node.js Version:" -ForegroundColor Yellow
node --version
Write-Host ""

# 2. Check NPM version
Write-Host "2. NPM Version:" -ForegroundColor Yellow
npm --version
Write-Host ""

# 3. Check SpecWeave version
Write-Host "3. SpecWeave Version:" -ForegroundColor Yellow
specweave --version
Write-Host ""

# 4. Find where SpecWeave is installed
Write-Host "4. SpecWeave Install Location:" -ForegroundColor Yellow
$specweavePath = (Get-Command specweave).Source
Write-Host "   $specweavePath"
Write-Host ""

# 5. Check npm global modules location
Write-Host "5. NPM Global Modules Location:" -ForegroundColor Yellow
$npmPrefix = npm prefix -g
Write-Host "   $npmPrefix"
Write-Host ""

# 6. Check if specweave package exists in global node_modules
Write-Host "6. SpecWeave Package Location:" -ForegroundColor Yellow
$packagePath = Join-Path $npmPrefix "node_modules\specweave"
if (Test-Path $packagePath) {
    Write-Host "   $packagePath [EXISTS]" -ForegroundColor Green

    # 7. Check package structure
    Write-Host ""
    Write-Host "7. Package Structure:" -ForegroundColor Yellow

    $srcPath = Join-Path $packagePath "src"
    $distPath = Join-Path $packagePath "dist"
    $srcCommands = Join-Path $srcPath "commands"
    $srcAgents = Join-Path $srcPath "agents"
    $srcSkills = Join-Path $srcPath "skills"

    Write-Host "   src/ exists: $(Test-Path $srcPath)" -ForegroundColor $(if (Test-Path $srcPath) { "Green" } else { "Red" })
    Write-Host "   dist/ exists: $(Test-Path $distPath)" -ForegroundColor $(if (Test-Path $distPath) { "Green" } else { "Red" })
    Write-Host "   src/commands/ exists: $(Test-Path $srcCommands)" -ForegroundColor $(if (Test-Path $srcCommands) { "Green" } else { "Red" })
    Write-Host "   src/agents/ exists: $(Test-Path $srcAgents)" -ForegroundColor $(if (Test-Path $srcAgents) { "Green" } else { "Red" })
    Write-Host "   src/skills/ exists: $(Test-Path $srcSkills)" -ForegroundColor $(if (Test-Path $srcSkills) { "Green" } else { "Red" })

    # Count files
    if (Test-Path $srcCommands) {
        $commandCount = (Get-ChildItem $srcCommands -Filter *.md).Count
        Write-Host "   src/commands/*.md count: $commandCount" -ForegroundColor Green
    }

    if (Test-Path $srcAgents) {
        $agentCount = (Get-ChildItem $srcAgents -Directory).Count
        Write-Host "   src/agents/ subdirs: $agentCount" -ForegroundColor Green
    }

    if (Test-Path $srcSkills) {
        $skillCount = (Get-ChildItem $srcSkills -Directory).Count
        Write-Host "   src/skills/ subdirs: $skillCount" -ForegroundColor Green
    }
} else {
    Write-Host "   $packagePath [NOT FOUND]" -ForegroundColor Red
}

Write-Host ""
Write-Host "8. Creating test project..." -ForegroundColor Yellow

# 8. Create test directory
$testDir = Join-Path $env:TEMP "specweave-debug-test"
if (Test-Path $testDir) {
    Remove-Item -Recurse -Force $testDir
}
New-Item -ItemType Directory -Path $testDir | Out-Null

Set-Location $testDir
Write-Host "   Test directory: $testDir"
Write-Host ""

# 9. Run specweave init with debug output
Write-Host "9. Running 'specweave init .' (with debug output):" -ForegroundColor Yellow
Write-Host ""

specweave init . --adapter claude

Write-Host ""
Write-Host "10. Checking .claude/ folders:" -ForegroundColor Yellow

$claudeCommands = Join-Path $testDir ".claude\commands"
$claudeAgents = Join-Path $testDir ".claude\agents"
$claudeSkills = Join-Path $testDir ".claude\skills"

$commandsExist = Test-Path $claudeCommands
$agentsExist = Test-Path $claudeAgents
$skillsExist = Test-Path $claudeSkills

Write-Host "   .claude/commands/ exists: $commandsExist" -ForegroundColor $(if ($commandsExist) { "Green" } else { "Red" })
Write-Host "   .claude/agents/ exists: $agentsExist" -ForegroundColor $(if ($agentsExist) { "Green" } else { "Red" })
Write-Host "   .claude/skills/ exists: $skillsExist" -ForegroundColor $(if ($skillsExist) { "Green" } else { "Red" })

if ($commandsExist) {
    $cmdCount = (Get-ChildItem $claudeCommands -Filter *.md -ErrorAction SilentlyContinue).Count
    Write-Host "   .claude/commands/*.md count: $cmdCount" -ForegroundColor $(if ($cmdCount -gt 0) { "Green" } else { "Red" })
}

if ($agentsExist) {
    $agentCount = (Get-ChildItem $claudeAgents -Directory -ErrorAction SilentlyContinue).Count
    Write-Host "   .claude/agents/ subdirs: $agentCount" -ForegroundColor $(if ($agentCount -gt 0) { "Green" } else { "Red" })
}

if ($skillsExist) {
    $skillCount = (Get-ChildItem $claudeSkills -Directory -ErrorAction SilentlyContinue).Count
    Write-Host "   .claude/skills/ subdirs: $skillCount" -ForegroundColor $(if ($skillCount -gt 0) { "Green" } else { "Red" })
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host " Test Complete" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please send the output above to help debug the issue!" -ForegroundColor Yellow
Write-Host ""
