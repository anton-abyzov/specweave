# Setting Up ANTHROPIC_API_KEY for Automatic Translation

## Overview

SpecWeave's translation system supports **three modes**:

1. **🚀 Fully Automatic** (Recommended) - Set `ANTHROPIC_API_KEY` for zero-touch translation
2. **🔄 Interactive** - Use translator skill in Claude Code sessions
3. **📝 Manual** - Follow on-screen instructions

## Mode 1: Fully Automatic Translation (Recommended)

### Setup Instructions

**Step 1: Get API Key**
1. Go to https://console.anthropic.com/
2. Sign in or create account
3. Navigate to "API Keys"
4. Click "Create Key"
5. Copy your key (starts with `sk-ant-api03-...`)

**Step 2: Set Environment Variable**

**macOS/Linux (Permanent)**:
```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-YOUR-KEY-HERE"' >> ~/.zshrc
source ~/.zshrc
```

**macOS/Linux (Session)**:
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-YOUR-KEY-HERE"
```

**Windows (PowerShell - Permanent)**:
```powershell
[System.Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'sk-ant-api03-YOUR-KEY-HERE', 'User')
```

**Windows (CMD - Session)**:
```cmd
set ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
```

**Step 3: Verify Setup**
```bash
echo $ANTHROPIC_API_KEY  # Should show your key
node -e "console.log(process.env.ANTHROPIC_API_KEY)"  # Test from Node
```

**Step 4: Test Translation**
```bash
# Create a test file in Russian
cat > test-ru.md << 'EOF'
# Тестовый файл
Это тест автоматического перевода.
EOF

# Translate it
node dist/hooks/lib/translate-file.js test-ru.md --verbose

# Should see: "🤖 Translating via Anthropic API (Haiku model)..."
```

### How It Works

When `ANTHROPIC_API_KEY` is set:
1. ✅ Translation happens **immediately** during hook execution
2. ✅ No manual intervention required
3. ✅ Files translated in ~2-3 seconds
4. ✅ Cost displayed in real-time (~$0.003 per file)

**Workflow**:
```
User runs: /specweave:inc "Добавить чат-бот" (in Russian)
         ↓
PM generates: spec.md, plan.md, tasks.md (in Russian)
         ↓
post-increment-planning.sh hook fires
         ↓
Detects Russian content
         ↓
Calls translate-file.js for each file
         ↓
translate-file.js uses ANTHROPIC_API_KEY → Automatic API call
         ↓
Files translated to English in 2-3 seconds
         ↓
✅ Done! All files now in English
```

### Cost Estimation

- **Per file**: ~$0.001-0.003 (using Haiku)
- **Per increment** (3 files): ~$0.003-0.009
- **100 increments**: ~$0.30-0.90
- **1000 increments**: ~$3-9

**Conclusion**: Negligible cost for massive UX benefit!

## Mode 2: Interactive (Claude Code Session)

If `ANTHROPIC_API_KEY` is not set, but running in Claude Code:

1. Hook outputs translation prompt
2. Translator skill auto-activates (if installed)
3. Claude translates interactively
4. User pastes translation back

**Use when**:
- Working in Claude Code directly
- Don't want to set API key
- Prefer manual review of translations

## Mode 3: Manual Fallback

If neither API key nor Claude Code session:

1. Hook outputs clear instructions:
   ```
   ⚠️  AUTO-TRANSLATION REQUIRES MANUAL STEP:
      Option A (Recommended): Set ANTHROPIC_API_KEY
      Option B: Run /specweave:translate <file-path>
      Option C: Manually translate the content
   ```

2. Files contain marker comments:
   ```markdown
   <!-- ⚠️ AUTO-TRANSLATION PENDING -->
   <!-- Set ANTHROPIC_API_KEY for automatic translation -->
   <!-- Or run: /specweave:translate to complete -->
   <!-- Original content below -->
   ```

**Use when**:
- CI/CD environments (set API key in secrets)
- Automated builds
- Batch processing

## Security Best Practices

**✅ DO**:
- Store API key in environment variables (not in code)
- Use `.env` files (gitignored)
- Rotate keys periodically
- Use separate keys for dev/prod

**❌ DON'T**:
- Commit API keys to git
- Share keys in chat/email
- Use production keys in development
- Hardcode keys in scripts

## Troubleshooting

### "ANTHROPIC_API_KEY not found"
- Check: `echo $ANTHROPIC_API_KEY`
- Verify shell startup file loaded: `source ~/.zshrc`
- Windows: Restart terminal after setting system variable

### "API translation failed"
- Check key validity: https://console.anthropic.com/
- Verify key starts with `sk-ant-api03-`
- Check internet connectivity
- Review Anthropic API status: https://status.anthropic.com/

### "Permission denied"
- Ensure API key has correct permissions
- Check Anthropic console for usage limits
- Verify billing is set up

### Cost concerns
- Monitor usage: https://console.anthropic.com/
- Set usage limits in Anthropic console
- Use Haiku model (cheapest, default)
- Translation is ~$0.001-0.003 per file

## Configuration

You can customize translation behavior in `.specweave/config.json`:

```json
{
  "translation": {
    "enabled": true,
    "autoTranslateInternalDocs": true,
    "translationModel": "haiku",
    "filesAlwaysInEnglish": [
      "spec.md",
      "plan.md",
      "tasks.md",
      "tests.md",
      "docs/internal/**/*.md"
    ]
  }
}
```

**Options**:
- `enabled`: Master switch for translation (default: true)
- `autoTranslateInternalDocs`: Auto-translate after increment planning (default: true)
- `translationModel`: Which model to use - "haiku" (cheap), "sonnet" (balanced), "opus" (premium)
- `filesAlwaysInEnglish`: Which files to always translate to English

## Summary

**For best experience**: Set `ANTHROPIC_API_KEY` for fully automatic translation!

**Cost**: ~$0.003-0.009 per increment (negligible)
**Time**: 2-3 seconds per file
**Benefit**: Work in your language, maintain English docs automatically

Questions? See: https://spec-weave.com/docs/i18n/translation-setup
