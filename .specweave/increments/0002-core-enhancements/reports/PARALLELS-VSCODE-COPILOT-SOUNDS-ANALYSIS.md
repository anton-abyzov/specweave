# Parallels VS Code GitHub Copilot Sounds Analysis

**Date**: 2025-10-30
**Issue**: "In progress" sounds playing during GitHub Copilot execution in VS Code (Parallels Windows VM)
**Status**: Analysis Complete

---

## Problem Statement

When using GitHub Copilot in VS Code running inside a Parallels Windows VM, the user hears "in progress" or command execution sounds. Need to identify the source and disable them.

---

## Potential Sources (Ranked by Likelihood)

### 1. GitHub Copilot Extension Settings ⭐⭐⭐⭐⭐

**Most Likely Source**: GitHub Copilot has audio notifications for inline suggestions.

**Evidence**:
- User specifically mentions sounds occur "while it's executing in gh copilot"
- Copilot has built-in audio feedback for suggestions
- This is a common complaint from Copilot users

**Solution**:

#### Option A: Disable via VS Code Settings UI
1. Open VS Code
2. Go to **File > Preferences > Settings** (or `Ctrl+,`)
3. Search for: `copilot audio`
4. Find: **"GitHub Copilot: Enable Audio Cue"**
5. Uncheck/disable it

#### Option B: Disable via settings.json
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `Preferences: Open User Settings (JSON)`
3. Add:
```json
{
  "github.copilot.editor.enableAutoCompletions": true,
  "audioCues.chatRequestSent": "off",
  "audioCues.chatResponseReceived": "off",
  "accessibility.signals.chatRequestSent": "off",
  "accessibility.signals.chatResponseReceived": "off"
}
```

#### Option C: Disable All VS Code Audio Cues
```json
{
  "audioCues.lineHasBreakpoint": "off",
  "audioCues.lineHasError": "off",
  "audioCues.lineHasWarning": "off",
  "audioCues.onDebugBreak": "off",
  "audioCues.chatRequestSent": "off",
  "audioCues.chatResponseReceived": "off",
  "audioCues.clear": "off",
  "audioCues.diffLineDeleted": "off",
  "audioCues.diffLineInserted": "off",
  "audioCues.diffLineModified": "off",
  "audioCues.notebookCellCompleted": "off",
  "audioCues.notebookCellFailed": "off",
  "audioCues.taskCompleted": "off",
  "audioCues.taskFailed": "off",
  "audioCues.terminalQuickFix": "off"
}
```

---

### 2. VS Code Accessibility Signals ⭐⭐⭐⭐

**Likely Source**: VS Code's accessibility features include audio signals.

**Evidence**:
- VS Code has extensive audio cue system
- Enabled by default for various editor events
- Can be triggered by typing, errors, completions

**Solution**:

#### Global Disable
1. Open Settings (`Ctrl+,`)
2. Search: `audio cues`
3. Set all to "Off" or "Auto" (Auto = only when screen reader detected)

#### settings.json Method
```json
{
  "accessibility.signals.lineHasBreakpoint": "off",
  "accessibility.signals.lineHasError": "off",
  "accessibility.signals.lineHasWarning": "off",
  "accessibility.signals.onDebugBreak": "off",
  "accessibility.signals.chatRequestSent": "off",
  "accessibility.signals.chatResponseReceived": "off",
  "accessibility.signals.clear": "off",
  "accessibility.signals.diffLineDeleted": "off",
  "accessibility.signals.diffLineInserted": "off",
  "accessibility.signals.diffLineModified": "off",
  "accessibility.signals.notebookCellCompleted": "off",
  "accessibility.signals.notebookCellFailed": "off",
  "accessibility.signals.taskCompleted": "off",
  "accessibility.signals.taskFailed": "off"
}
```

---

### 3. Windows System Sounds ⭐⭐⭐

**Possible Source**: Windows plays sounds for various system events.

**Evidence**:
- Windows has default sounds for errors, notifications, commands
- PowerShell/terminal commands can trigger sounds
- User is running Windows VM in Parallels

**Solution**:

#### Option A: Disable All System Sounds
1. Open **Settings** in Windows
2. Go to **System > Sound**
3. Scroll down to **Advanced**
4. Click **More sound settings**
5. Go to **Sounds** tab
6. Select **Sound Scheme: No Sounds**
7. Click **Apply** then **OK**

#### Option B: Disable Specific Event Sounds
1. Open **Control Panel > Hardware and Sound > Sound**
2. Go to **Sounds** tab
3. Scroll through **Program Events** list
4. For each event (especially "Default Beep", "Notification", "Exclamation"):
   - Select the event
   - Set **Sounds:** dropdown to **(None)**
5. Click **Apply**

#### Option C: Disable "Default Beep" (Terminal Sounds)
1. Open **Registry Editor** (`Win+R`, type `regedit`)
2. Navigate to: `HKEY_CURRENT_USER\Control Panel\Sound`
3. Set `Beep` value to `no`
4. Restart Windows

**PowerShell Method** (quick):
```powershell
# Disable system beep
Set-ItemProperty -Path 'HKCU:\Control Panel\Sound' -Name 'Beep' -Value 'no'
```

---

### 4. VS Code Terminal Sounds ⭐⭐

**Possible Source**: VS Code integrated terminal has bell/beep sounds.

**Evidence**:
- Terminal bell can trigger sounds
- Some commands output bell character (`\a`)
- Git operations might trigger bells

**Solution**:

#### Disable Terminal Bell in VS Code
Add to settings.json:
```json
{
  "terminal.integrated.enableBell": false
}
```

Or via UI:
1. Settings (`Ctrl+,`)
2. Search: `terminal bell`
3. Uncheck **"Terminal > Integrated: Enable Bell"**

---

### 5. Parallels Desktop ⭐

**Unlikely Source**: Parallels itself playing sounds for VM events.

**Evidence**:
- Parallels has minimal audio notifications
- Typically only for USB/device connections
- Unlikely to play sounds for guest OS activity

**Solution** (if needed):

1. Open **Parallels Desktop** (on macOS)
2. Go to **Parallels Desktop > Preferences**
3. Click **General**
4. Uncheck **"Play sound effects"**
5. Close and restart VM

---

## Recommended Troubleshooting Steps

### Step 1: Quick Test (Most Likely Fix)
```json
// Add to VS Code settings.json
{
  "audioCues.chatRequestSent": "off",
  "audioCues.chatResponseReceived": "off",
  "accessibility.signals.chatRequestSent": "off",
  "accessibility.signals.chatResponseReceived": "off"
}
```

**Test**: Trigger GitHub Copilot suggestion. If sound persists, continue.

---

### Step 2: Disable All VS Code Audio Cues
```json
{
  "audioCues.lineHasBreakpoint": "off",
  "audioCues.lineHasError": "off",
  "audioCues.lineHasWarning": "off",
  "audioCues.onDebugBreak": "off",
  "audioCues.chatRequestSent": "off",
  "audioCues.chatResponseReceived": "off",
  "accessibility.signals.lineHasBreakpoint": "off",
  "accessibility.signals.lineHasError": "off",
  "accessibility.signals.lineHasWarning": "off",
  "accessibility.signals.onDebugBreak": "off",
  "accessibility.signals.chatRequestSent": "off",
  "accessibility.signals.chatResponseReceived": "off",
  "terminal.integrated.enableBell": false
}
```

**Test**: If sound persists, it's Windows system sounds.

---

### Step 3: Disable Windows System Sounds

**Quick PowerShell Fix**:
```powershell
# Disable system beep
Set-ItemProperty -Path 'HKCU:\Control Panel\Sound' -Name 'Beep' -Value 'no'

# Restart audio service
Restart-Service -Name Audiosrv -Force
```

**Or via GUI**:
1. Control Panel > Sound > Sounds tab
2. Sound Scheme: **No Sounds**
3. Apply

---

## Identification Test

To identify which source is causing the sounds:

### Test 1: Is it GitHub Copilot?
1. Disable GitHub Copilot extension temporarily
2. Try typing and triggering autocomplete
3. If sound stops → It's Copilot
4. Re-enable and apply Copilot settings fix

### Test 2: Is it VS Code?
1. Close VS Code
2. Open Notepad or another editor
3. If no sounds → It's VS Code
4. Apply VS Code audio cues fix

### Test 3: Is it Windows?
1. Open PowerShell
2. Type: `echo [char]7` (sends bell character)
3. If you hear sound → It's Windows system sounds
4. Disable Windows beep via Registry/PowerShell

---

## Complete Fix (Nuclear Option)

If you want to disable ALL sounds from all sources:

### settings.json (VS Code)
```json
{
  // Disable Copilot audio
  "audioCues.chatRequestSent": "off",
  "audioCues.chatResponseReceived": "off",
  "accessibility.signals.chatRequestSent": "off",
  "accessibility.signals.chatResponseReceived": "off",

  // Disable all audio cues
  "audioCues.lineHasBreakpoint": "off",
  "audioCues.lineHasError": "off",
  "audioCues.lineHasWarning": "off",
  "audioCues.onDebugBreak": "off",
  "audioCues.clear": "off",
  "audioCues.diffLineDeleted": "off",
  "audioCues.diffLineInserted": "off",
  "audioCues.diffLineModified": "off",
  "audioCues.notebookCellCompleted": "off",
  "audioCues.notebookCellFailed": "off",
  "audioCues.taskCompleted": "off",
  "audioCues.taskFailed": "off",
  "audioCues.terminalQuickFix": "off",

  // Disable all accessibility signals
  "accessibility.signals.lineHasBreakpoint": "off",
  "accessibility.signals.lineHasError": "off",
  "accessibility.signals.lineHasWarning": "off",
  "accessibility.signals.onDebugBreak": "off",
  "accessibility.signals.clear": "off",
  "accessibility.signals.diffLineDeleted": "off",
  "accessibility.signals.diffLineInserted": "off",
  "accessibility.signals.diffLineModified": "off",
  "accessibility.signals.notebookCellCompleted": "off",
  "accessibility.signals.notebookCellFailed": "off",
  "accessibility.signals.taskCompleted": "off",
  "accessibility.signals.taskFailed": "off",

  // Disable terminal bell
  "terminal.integrated.enableBell": false
}
```

### PowerShell (Windows System)
```powershell
# Disable system beep
Set-ItemProperty -Path 'HKCU:\Control Panel\Sound' -Name 'Beep' -Value 'no'

# Restart audio service
Restart-Service -Name Audiosrv -Force
```

---

## Summary

**Most Likely Culprit**: GitHub Copilot audio cues for chat/suggestions

**Quick Fix**:
1. Open VS Code Settings (`Ctrl+,`)
2. Search: `copilot audio` or `audio cues`
3. Disable all found settings
4. Add to settings.json:
```json
{
  "audioCues.chatRequestSent": "off",
  "audioCues.chatResponseReceived": "off",
  "accessibility.signals.chatRequestSent": "off",
  "accessibility.signals.chatResponseReceived": "off"
}
```

**If That Doesn't Work**: Disable Windows system sounds via Control Panel > Sound > Sounds tab > Sound Scheme: "No Sounds"

---

## References

- **VS Code Audio Cues**: https://code.visualstudio.com/docs/editor/accessibility#_audio-cues
- **GitHub Copilot Settings**: VS Code Settings > Extensions > GitHub Copilot
- **Windows Sound Settings**: Control Panel > Hardware and Sound > Sound
- **VS Code Accessibility**: https://code.visualstudio.com/docs/editor/accessibility

---

**Author**: Claude Code
**Date**: 2025-10-30
**Increment**: 0002-core-enhancements
**Status**: Analysis Complete - Solutions Provided
