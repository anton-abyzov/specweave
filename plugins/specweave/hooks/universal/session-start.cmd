@echo off
:: Universal Session Start Hook for Windows
:: Calls the Node.js dispatcher

:: Find node.exe
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo {"continue": true, "error": "Node.js not found"}
    exit /b 0
)

:: Get the directory of this script
set "SCRIPT_DIR=%~dp0"

:: Run the dispatcher
node "%SCRIPT_DIR%dispatcher.mjs" session-start
