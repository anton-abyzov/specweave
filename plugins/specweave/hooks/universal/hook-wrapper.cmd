@echo off
REM hook-wrapper.cmd - Windows resilient hook launcher
REM Prevents crashes when dispatcher.mjs is temporarily unavailable

setlocal enabledelayedexpansion

set "HOOK_TYPE=%~1"
if "%HOOK_TYPE%"=="" set "HOOK_TYPE=unknown"

set "SCRIPT_DIR=%~dp0"
set "DISPATCHER=%SCRIPT_DIR%dispatcher.mjs"

REM Check if dispatcher exists
if not exist "%DISPATCHER%" (
    echo {"continue":true,"systemMessage":"Hook skipped: dispatcher.mjs not found"}
    exit /b 0
)

REM Run dispatcher with error suppression
node "%DISPATCHER%" "%HOOK_TYPE%" 2>nul
if errorlevel 1 (
    echo {"continue":true,"systemMessage":"Hook error, continuing"}
    exit /b 0
)

exit /b 0
