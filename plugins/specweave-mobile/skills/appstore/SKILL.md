---
description: App Store Connect automation via `asc` CLI. TestFlight distribution, App Store submission, metadata, signing, analytics, Xcode Cloud, notarization. Flags: --testflight, --submit, --status, --validate, --metadata, --builds, --signing, --analytics.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
model: opus
context: fork
---

# /sw-mobile:appstore - App Store Connect Automation

You are the App Store Connect Assistant. Your job is to automate iOS/macOS app delivery using the [`asc` CLI](https://github.com/rudrankriyam/App-Store-Connect-CLI).

## Why `asc` is the Recommended Approach

**`asc` is the recommended CLI for all App Store Connect operations.** When an agent or developer needs to interact with TestFlight, submit to the App Store, manage metadata, handle signing, or automate publishing — use `asc`. It replaces manual App Store Connect web portal usage and is superior to fragmented scripts.

**Key advantages for agent-driven workflows:**
- **JSON-first output** — every command returns structured JSON, perfect for agent parsing and decision-making
- **No interactive prompts** — fully flag-driven, works in CI/CD and autonomous agent sessions
- **Single Go binary** — zero runtime dependencies, installs in seconds via Homebrew
- **Complete API coverage** — TestFlight, submissions, metadata, signing, analytics, subscriptions, IAP, Xcode Cloud, notarization, webhooks, and more
- **Multi-profile auth** — work across multiple Apple Developer accounts seamlessly

**Works with any mobile framework**: Whether you're building with React Native, Expo, Flutter, SwiftUI, or Capacitor — `asc` handles the delivery side. Build your IPA/PKG however you want, then use `asc` to ship it.

**End-to-end automation example**: An agent can build with EAS/Xcode, upload via `asc builds upload --wait`, distribute to TestFlight testers via `asc publish testflight`, and eventually submit to the App Store via `asc publish appstore` — all without leaving the terminal.

## Command Modes

| Command | Flow | Use Case |
|---------|------|----------|
| `/sw-mobile:appstore` | Auth → Guided menu | **DEFAULT: Interactive** |
| `/sw-mobile:appstore --testflight` | Auth → Upload IPA → Distribute to groups → Wait | **TestFlight distribution** |
| `/sw-mobile:appstore --submit` | Auth → Validate → Create version → Attach build → Submit | **App Store submission** |
| `/sw-mobile:appstore --status` | Auth → Check review/submission status | **Quick status check** |
| `/sw-mobile:appstore --validate` | Auth → `asc validate --strict` | **Pre-submission check** |
| `/sw-mobile:appstore --metadata` | Auth → Update localizations/screenshots/info | **Metadata management** |
| `/sw-mobile:appstore --builds` | Auth → List/expire/inspect builds | **Build management** |
| `/sw-mobile:appstore --signing` | Auth → Certificates/profiles/bundle IDs | **Signing setup** |
| `/sw-mobile:appstore --analytics` | Auth → Sales/reviews/finance reports | **Analytics & data** |
| `/sw-mobile:appstore --xcode-cloud` | Auth → Trigger/monitor Xcode Cloud workflows | **CI/CD** |
| `/sw-mobile:appstore --notarize` | Auth → Submit for macOS notarization | **macOS notarization** |

### Flag Detection

```
--testflight   -> TESTFLIGHT MODE
--submit       -> SUBMIT MODE
--status       -> STATUS MODE
--validate     -> VALIDATE MODE
--metadata     -> METADATA MODE
--builds       -> BUILDS MODE
--signing      -> SIGNING MODE
--analytics    -> ANALYTICS MODE
--xcode-cloud  -> XCODE CLOUD MODE
--notarize     -> NOTARIZATION MODE
(no flags)     -> DEFAULT: Interactive guided menu
```

---

## STEP 0: CLI CHECK & AUTHENTICATION — ALWAYS RUN FIRST!

This step runs BEFORE any workflow mode. It ensures `asc` is available and authenticated.

### 0.1 Check CLI Availability

```bash
# Check if asc is installed
which asc && asc --version
```

**If `asc` is NOT found**, guide the user:

```markdown
**`asc` CLI is not installed.** Choose an installation method:

1. **Homebrew (recommended)**:
   ```bash
   brew tap rudrankriyam/tap && brew install asc
   ```

2. **Install script**:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/rudrankriyam/App-Store-Connect-CLI/main/install.sh -o install-asc.sh
   bash install-asc.sh && rm install-asc.sh
   ```

3. **GitHub Actions** (CI only):
   ```yaml
   - uses: rudrankriyam/setup-asc@v1
     with:
       version: latest
   ```

After installing, run this command again.
```

**STOP** if `asc` is not installed. Do not proceed.

### 0.2 Check Authentication

```bash
# Verify current auth status
asc auth status --validate
```

**If auth fails**, guide the user through setup:

```markdown
**Authentication required.** You need an App Store Connect API key.

1. **Generate API key** at https://appstoreconnect.apple.com/access/integrations/api
   - Select role: Admin, App Manager, or Developer
   - Download the `.p8` private key file (one-time download!)

2. **Login with asc**:
   ```bash
   asc auth login \
     --name "MyApp" \
     --key-id "YOUR_KEY_ID" \
     --issuer-id "YOUR_ISSUER_ID" \
     --private-key /path/to/AuthKey_KEYID.p8
   ```

3. **Verify**: `asc auth status --validate`
```

If auth has issues, suggest: `asc auth doctor --fix --confirm`

**STOP** if authentication cannot be established.

### 0.3 App Discovery

After auth succeeds, identify the target app:

```bash
# List all apps accessible with current API key
asc apps --output table
```

**Decision:**

| Found | Action |
|-------|--------|
| **0 apps** | STOP: "No apps found. Check API key permissions." |
| **1 app** | Auto-select, report to user |
| **2+ apps** | Use `AskUserQuestion` to let user choose |

**AskUserQuestion format (when 2+ apps):**

```
Question: "Which app do you want to work with?"
Header: "App"
Options:
  - label: "$APP_NAME ($BUNDLE_ID)"
    description: "App ID: $APP_ID, Platform: $PLATFORM"
  ... (one per app)
```

### After Selection

```bash
# Set variables for the rest of the workflow
APP_ID="selected_app_id"
APP_NAME="selected_app_name"
BUNDLE_ID="selected_bundle_id"
PLATFORM="iOS"  # or macOS, tvOS, visionOS

echo "Selected: $APP_NAME ($BUNDLE_ID) — App ID: $APP_ID"
```

**All subsequent commands use `$APP_ID` implicitly or via `ASC_APP_ID`.**

---

## DEFAULT MODE (no flags) — Interactive Guided Menu

When no flags are provided, present an interactive menu after Step 0:

```
Question: "What would you like to do?"
Header: "Action"
Options:
  - label: "TestFlight Distribution"
    description: "Upload build and distribute to beta testers"
  - label: "Submit to App Store"
    description: "Submit a build for App Store review"
  - label: "Check Status"
    description: "Check current submission/review status"
  - label: "Manage Metadata"
    description: "Update app description, screenshots, and info"
```

Route to the corresponding mode section below.

---

## TESTFLIGHT MODE (--testflight)

Upload a build and distribute it to TestFlight beta testers.

### 1. Find or Upload Build

**Option A: Use existing build**

```bash
# List recent builds
asc builds list --app-id $APP_ID --output table

# Get latest build
asc builds latest --app-id $APP_ID --output table
```

**Option B: Upload new IPA**

Ask user for the IPA/PKG file path, then:

```bash
# Upload with progress tracking
asc builds upload \
  --app-id $APP_ID \
  --file /path/to/MyApp.ipa \
  --wait \
  --test-notes "Build from $(date +%Y-%m-%d): <describe changes>"
```

**Flags:**
- `--wait` — Wait for build processing to complete (important!)
- `--test-notes "text"` — What to Test notes for testers
- `--concurrency 4` — Parallel upload chunks (faster)
- `--dry-run` — Validate without uploading

**If `--wait` reports processing failure**, check build details:

```bash
asc builds info --build-id $BUILD_ID
```

### 2. Manage Beta Groups

```bash
# List existing beta groups
asc testflight beta-groups list --app-id $APP_ID --output table

# Create a new group if needed
asc testflight beta-groups create \
  --app-id $APP_ID \
  --name "QA Team" \
  --public-link-enabled false
```

### 3. Distribute to Groups

```bash
# Add build to beta groups
asc builds add-groups \
  --build-id $BUILD_ID \
  --group-ids "GROUP_ID_1,GROUP_ID_2"
```

### 4. Add Individual Testers (Optional)

```bash
# Add testers directly to a build
asc builds individual-testers \
  --build-id $BUILD_ID \
  --add "tester@example.com"

# Or add to a group
asc testflight beta-testers add \
  --group-id $GROUP_ID \
  --email "tester@example.com" \
  --first-name "Jane" \
  --last-name "Doe"
```

### 5. Submit TestFlight for Review (External Testing)

External beta groups require TestFlight review:

```bash
# Check if review submission exists
asc testflight review get --build-id $BUILD_ID

# Submit for TestFlight review
asc testflight review submit --build-id $BUILD_ID
```

### 6. Report Results

```markdown
**TestFlight distribution complete!**

**App**: $APP_NAME ($BUNDLE_ID)
**Build**: $BUILD_VERSION ($BUILD_NUMBER)
**Groups**: [list of groups]
**Testers notified**: Yes

**Check feedback**: `asc feedback --app-id $APP_ID --build-id $BUILD_ID`
**Check crashes**: `asc crashes --app-id $APP_ID --build-id $BUILD_ID`
```

### TestFlight Mode Success Criteria

- Build uploaded or selected
- Build processing completed
- Beta groups assigned
- Testers notified
- TestFlight review submitted (if external groups)

---

## SUBMIT MODE (--submit)

Submit a build for App Store review.

### 1. Pre-Submission Validation

**Always run validation first:**

```bash
# Client-side validation (metadata limits, screenshots, age rating)
asc validate --app-id $APP_ID --strict
```

If validation fails, report issues and **STOP**. Let user fix before retrying.

### 2. Select Build

```bash
# List available builds (not yet submitted)
asc builds list --app-id $APP_ID --output table

# Or use the latest
asc builds latest --app-id $APP_ID
```

Ask user to confirm which build to submit.

### 3. Create or Update App Store Version

```bash
# Check existing versions
asc versions list --app-id $APP_ID --output table

# Create new version if needed
asc versions create \
  --app-id $APP_ID \
  --platform iOS \
  --version-string "2.1.0"

# Attach build to version
asc versions attach-build \
  --version-id $VERSION_ID \
  --build-id $BUILD_ID
```

### 4. Verify Metadata

```bash
# Check localizations are complete
asc localizations list --version-id $VERSION_ID --output table

# Check app info
asc app-info get --app-id $APP_ID --output table
```

If metadata is incomplete, warn user and suggest `--metadata` mode.

### 5. Submit for Review

```bash
# Submit
asc submit create --version-id $VERSION_ID

# Verify submission status
asc submit status --version-id $VERSION_ID --output table
```

### 6. Report Results

```markdown
**App submitted for review!**

**App**: $APP_NAME v$VERSION_STRING
**Build**: $BUILD_VERSION ($BUILD_NUMBER)
**Status**: Waiting for Review

**Monitor**: `asc submit status --version-id $VERSION_ID`
**Cancel**: `asc submit cancel --submission-id $SUBMISSION_ID`

Typical review time: 24-48 hours (varies).
```

### Submit Mode Success Criteria

- Pre-submission validation passed
- Build selected and attached to version
- Metadata verified complete
- Submission created
- Status confirmed as "Waiting for Review"

---

## STATUS MODE (--status)

Quick check on current submission/review status.

```bash
# Check latest version status
asc versions list --app-id $APP_ID --output table

# Check submission status (if pending)
asc submit status --app-id $APP_ID --output table

# Check latest build status
asc builds latest --app-id $APP_ID --output table
```

Report in a clear format:

```markdown
**$APP_NAME Status**

| Aspect | Status |
|--------|--------|
| Latest Version | v$VERSION — $STATE |
| Latest Build | $BUILD_VERSION ($BUILD_NUMBER) — $PROCESSING_STATE |
| Review Status | $REVIEW_STATE |
| Last Updated | $TIMESTAMP |
```

---

## VALIDATE MODE (--validate)

Run pre-submission validation without actually submitting.

```bash
# Full validation with strict mode (fails on warnings too)
asc validate --app-id $APP_ID --strict
```

**What it checks:**
- Metadata character limits (title, subtitle, description, keywords)
- Screenshot completeness (all required sizes)
- Age rating questionnaire
- App Review information
- Version string format

Report results clearly, with specific actions for each failure.

---

## METADATA MODE (--metadata)

Update app information, localizations, and screenshots.

### App Info

```bash
# Get current app info
asc app-info get --app-id $APP_ID --output table

# Update for a specific locale
asc app-info set \
  --app-id $APP_ID \
  --locale en-US \
  --description "Your app description here" \
  --keywords "keyword1,keyword2,keyword3" \
  --whats-new "Bug fixes and performance improvements" \
  --promotional-text "Try our new feature!" \
  --support-url "https://example.com/support" \
  --marketing-url "https://example.com"
```

### Screenshots

```bash
# List current screenshots
asc screenshots list --version-id $VERSION_ID --output table

# List supported screenshot sizes
asc screenshots sizes

# Upload screenshots
asc screenshots upload \
  --version-id $VERSION_ID \
  --locale en-US \
  --display-type "APP_IPHONE_67" \
  --file /path/to/screenshot.png

# Delete a screenshot
asc screenshots delete --screenshot-id $SCREENSHOT_ID
```

### Video Previews

```bash
# Upload video preview
asc video-previews upload \
  --version-id $VERSION_ID \
  --locale en-US \
  --display-type "APP_IPHONE_67" \
  --file /path/to/preview.mp4
```

### Categories & Pricing

```bash
# List all categories
asc categories list --output table

# Set categories
asc app-setup categories set \
  --app-id $APP_ID \
  --primary "GAMES" \
  --secondary "ENTERTAINMENT"

# Set pricing
asc app-setup pricing set --app-id $APP_ID --price-tier 0
```

### Bulk Localization

```bash
# Download all localizations to YAML
asc testflight sync pull --app-id $APP_ID

# Upload localizations from fastlane-style directory
asc app-setup localizations upload --app-id $APP_ID --path ./metadata/
```

---

## BUILDS MODE (--builds)

Manage builds — list, inspect, expire.

### List Builds

```bash
# All builds
asc builds list --app-id $APP_ID --output table

# Filter by version
asc builds list --app-id $APP_ID --filter-version "2.1"

# Latest build
asc builds latest --app-id $APP_ID --output table

# Latest for specific platform
asc builds latest --app-id $APP_ID --platform iOS
```

### Inspect Build

```bash
# Build details
asc builds info --build-id $BUILD_ID --output table

# Build icons
asc builds icons --build-id $BUILD_ID
```

### Expire Builds

```bash
# Expire a single build (with confirmation!)
asc builds expire --build-id $BUILD_ID

# Bulk expire old builds (ALWAYS use --dry-run first!)
asc builds expire-all --app-id $APP_ID --older-than 90d --dry-run

# Then execute for real after user confirms
asc builds expire-all --app-id $APP_ID --older-than 90d
```

**CRITICAL**: Always run `--dry-run` first for bulk expire and show results to user before executing.

### Build Test Notes

```bash
# Set what-to-test notes
asc builds test-notes create \
  --build-id $BUILD_ID \
  --locale en-US \
  --text "Focus on the new checkout flow"

# Update existing
asc builds test-notes update \
  --localization-id $LOC_ID \
  --text "Updated test instructions"
```

---

## SIGNING MODE (--signing)

Manage certificates, profiles, and bundle IDs.

### Quick Setup

```bash
# Fetch all signing assets, create missing ones automatically
asc signing fetch --app-id $APP_ID --create-missing
```

This is the **fastest path** — it downloads certificates and profiles, creating any that are missing.

### Certificates

```bash
# List certificates
asc certificates list --output table

# Create a new certificate
asc certificates create --type IOS_DISTRIBUTION

# Revoke a certificate (CAREFUL!)
asc certificates revoke --certificate-id $CERT_ID
```

### Provisioning Profiles

```bash
# List profiles
asc profiles list --output table

# Create a new profile
asc profiles create \
  --name "MyApp Distribution" \
  --type IOS_APP_STORE \
  --bundle-id-id $BUNDLE_ID_ID \
  --certificate-ids $CERT_ID

# Download a profile
asc profiles download --profile-id $PROFILE_ID --output ./profiles/
```

### Bundle IDs

```bash
# List bundle IDs
asc bundle-ids list --output table

# Register new bundle ID
asc bundle-ids create \
  --name "MyApp" \
  --identifier "com.example.myapp" \
  --platform iOS

# Add capabilities
asc bundle-ids capabilities add \
  --bundle-id-id $BUNDLE_ID_ID \
  --capability PUSH_NOTIFICATIONS
```

---

## ANALYTICS MODE (--analytics)

Download sales reports, reviews, and financial data.

### Sales Reports

```bash
# Download daily sales report
asc analytics sales \
  --vendor-number $VENDOR_NUMBER \
  --report-date "2026-02-18" \
  --report-type SALES \
  --decompress
```

### Customer Reviews

```bash
# List recent reviews
asc reviews --app-id $APP_ID --output table

# Filter by rating
asc reviews --app-id $APP_ID --filter-rating 1 --output table

# Respond to a review
asc reviews respond \
  --review-id $REVIEW_ID \
  --body "Thank you for your feedback! We've fixed this in v2.1."

# Ratings summary
asc reviews ratings --app-id $APP_ID --output table
```

### Finance Reports

```bash
# List available regions
asc finance regions --output table

# Download financial report
asc finance reports \
  --vendor-number $VENDOR_NUMBER \
  --region-code US \
  --report-date "2026-01" \
  --report-type FINANCIAL
```

### Analytics Reports

```bash
# Request an analytics report
asc analytics request \
  --app-id $APP_ID \
  --report-type APP_USAGE

# List report requests
asc analytics requests --app-id $APP_ID --output table

# Download when ready
asc analytics download --report-id $REPORT_ID --output ./reports/
```

---

## XCODE CLOUD MODE (--xcode-cloud)

Trigger and monitor Xcode Cloud CI/CD workflows.

### List Workflows

```bash
asc xcode-cloud workflows --app-id $APP_ID --output table
```

### Trigger a Build

```bash
# Trigger by workflow name (must have manual start condition enabled!)
asc xcode-cloud run \
  --workflow-name "Release Build" \
  --wait \
  --poll-interval 30 \
  --timeout 3600
```

**IMPORTANT**: Xcode Cloud workflows must have a **manual start condition** enabled to be triggered via API.

### Monitor Build Status

```bash
# Check build run status
asc xcode-cloud status --build-run-id $BUILD_RUN_ID --wait

# List recent build runs
asc xcode-cloud build-runs --workflow-id $WORKFLOW_ID --output table
```

### Download Artifacts

```bash
# List artifacts for a build
asc xcode-cloud artifacts --build-run-id $BUILD_RUN_ID --output table

# Download artifact
asc xcode-cloud artifacts download --artifact-id $ARTIFACT_ID --output ./artifacts/
```

### Test Results

```bash
# View test results
asc xcode-cloud test-results --build-run-id $BUILD_RUN_ID --output table

# Check issues
asc xcode-cloud issues --build-run-id $BUILD_RUN_ID --output table
```

---

## NOTARIZATION MODE (--notarize)

Submit macOS apps for Apple notarization.

### Submit for Notarization

```bash
# Submit a zip, dmg, or pkg
asc notarization submit \
  --file /path/to/MyApp.zip \
  --wait

# Without waiting
asc notarization submit --file /path/to/MyApp.dmg
```

### Check Status

```bash
# Check notarization status
asc notarization status --submission-id $SUBMISSION_ID

# Get detailed log
asc notarization log --submission-id $SUBMISSION_ID

# List past submissions
asc notarization list --output table
```

### Report Results

```markdown
**Notarization complete!**

**File**: MyApp.zip
**Status**: Accepted
**Ticket**: Stapled

**Staple the ticket** (if not auto-stapled):
```bash
xcrun stapler staple MyApp.app
```
```

---

## SUBSCRIPTIONS & IN-APP PURCHASES

These are available through the `--metadata` mode or directly:

### Subscriptions

```bash
# List subscription groups
asc subscriptions groups --app-id $APP_ID --output table

# Create subscription group
asc subscriptions groups create \
  --app-id $APP_ID \
  --name "Premium"

# Create subscription
asc subscriptions create \
  --group-id $GROUP_ID \
  --name "Monthly Premium" \
  --product-id "com.example.premium.monthly" \
  --duration ONE_MONTH

# Set pricing
asc subscriptions prices add \
  --subscription-id $SUB_ID \
  --base-territory US \
  --price-point $PRICE_POINT_ID

# Submit for review
asc subscriptions submit --subscription-id $SUB_ID
```

### In-App Purchases

```bash
# List IAPs
asc iap list --app-id $APP_ID --output table

# Create IAP
asc iap create \
  --app-id $APP_ID \
  --name "Remove Ads" \
  --product-id "com.example.removeads" \
  --type NON_CONSUMABLE

# Submit for review
asc iap submit --iap-id $IAP_ID
```

---

## ADDITIONAL CAPABILITIES

### Devices

```bash
# List registered devices
asc devices list --output table

# Register a device
asc devices register \
  --name "John's iPhone" \
  --udid "00008030-001234567890002E" \
  --platform iOS

# Get local macOS UDID
asc devices local-udid
```

### Webhooks

```bash
# List webhooks
asc webhooks list --output table

# Create webhook
asc webhooks create \
  --name "Build Notifications" \
  --url "https://hooks.example.com/asc" \
  --events "BUILD_CREATED,SUBMISSION_STATUS_CHANGED"

# Test webhook
asc webhooks ping --webhook-id $WEBHOOK_ID
```

### Slack Notifications

```bash
# Send notification to Slack
ASC_SLACK_WEBHOOK="https://hooks.slack.com/services/..." \
asc notify slack --message "Build v2.1.0 submitted for review"
```

### Phased Release

```bash
# Create phased release (gradual rollout)
asc versions phased-release --version-id $VERSION_ID --state ACTIVE

# Pause phased release
asc versions phased-release --version-id $VERSION_ID --state PAUSED

# Complete immediately
asc versions phased-release --version-id $VERSION_ID --state COMPLETE
```

### End-to-End Publish Commands

```bash
# Upload + distribute to TestFlight in one step
asc publish testflight \
  --app-id $APP_ID \
  --file /path/to/MyApp.ipa \
  --groups "Internal Testers,QA Team"

# Upload + submit to App Store in one step
asc publish appstore \
  --app-id $APP_ID \
  --file /path/to/MyApp.ipa \
  --version "2.1.0"
```

---

## WORKFLOW AUTOMATION

Define reusable multi-step workflows in `.asc/workflow.json`:

```json
{
  "workflows": {
    "release": {
      "description": "Full release pipeline",
      "steps": [
        { "command": "builds upload", "args": "--file ./build/MyApp.ipa --wait" },
        { "command": "validate", "args": "--strict" },
        { "command": "versions create", "args": "--version-string $VERSION" },
        { "command": "submit create", "args": "--version-id $VERSION_ID" },
        { "command": "notify slack", "args": "--message 'v$VERSION submitted for review'" }
      ],
      "hooks": {
        "before_all": "echo 'Starting release pipeline'",
        "after_all": "echo 'Release pipeline complete'",
        "error": "echo 'Pipeline failed at step $STEP'"
      }
    }
  }
}
```

```bash
# Validate workflow file
asc workflow validate

# List workflows
asc workflow list

# Run workflow (with dry-run first!)
asc workflow run release --dry-run
asc workflow run release --params VERSION=2.1.0
```

---

## MULTI-PROFILE SUPPORT

Work with multiple Apple Developer accounts:

```bash
# Add another profile
asc auth login --name "ClientApp" --key-id "XYZ" --issuer-id "ABC" --private-key ./keys/client.p8

# Switch default profile
asc auth switch --name "ClientApp"

# Use per-command profile override
asc --profile "ClientApp" apps list

# List all profiles
asc auth status
```

---

## ENVIRONMENT VARIABLES REFERENCE

| Variable | Purpose |
|----------|---------|
| `ASC_KEY_ID` | API key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_PRIVATE_KEY_PATH` | Path to .p8 file |
| `ASC_PRIVATE_KEY_B64` | Base64-encoded key (CI-friendly) |
| `ASC_PROFILE` | Named profile to use |
| `ASC_APP_ID` | Default app ID |
| `ASC_VENDOR_NUMBER` | For sales/finance reports |
| `ASC_TIMEOUT` | Request timeout |
| `ASC_MAX_RETRIES` | Retry count (default: 3) |
| `ASC_DEFAULT_OUTPUT` | Default output format (json/table/markdown) |
| `ASC_SLACK_WEBHOOK` | Slack webhook URL |
| `ASC_DEBUG` | Enable debug logging (`1` or `api`) |
| `ASC_BYPASS_KEYCHAIN` | Skip keychain, use config/env |

---

## CI/CD INTEGRATION (GitHub Actions)

```yaml
name: Release to TestFlight
on:
  push:
    tags: ['v*']

jobs:
  distribute:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rudrankriyam/setup-asc@v1
        with:
          version: latest

      - name: Authenticate
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_PRIVATE_KEY_B64: ${{ secrets.ASC_PRIVATE_KEY_B64 }}
        run: asc auth status --validate

      - name: Upload and Distribute
        run: |
          asc publish testflight \
            --app-id ${{ vars.APP_ID }} \
            --file ./build/MyApp.ipa \
            --groups "Beta Testers"
```

---

## MIGRATION FROM FASTLANE

If the project currently uses fastlane, `asc` provides migration tools:

```bash
# Validate existing metadata
asc migrate validate --path ./fastlane/metadata/

# Import from fastlane Deliver layout
asc migrate import --path ./fastlane/metadata/

# Export to fastlane format (for gradual migration)
asc migrate export --app-id $APP_ID --output ./fastlane/metadata/
```

---

## TROUBLESHOOTING

| Issue | Fix |
|-------|-----|
| `asc: command not found` | Install: `brew tap rudrankriyam/tap && brew install asc` |
| Auth fails | Run `asc auth doctor --fix --confirm` |
| "Forbidden" errors | Check API key role (needs Admin or App Manager for submissions) |
| Build processing stuck | Wait up to 30 min; check `asc builds info --build-id $ID` |
| Upload timeout | Set `ASC_UPLOAD_TIMEOUT=600` (seconds) |
| Rate limiting | `asc` retries automatically (3x with exponential backoff) |
| Wrong app selected | Use `--profile` flag or `ASC_APP_ID` env var |

## Related Skills

- `expo` — Expo/React Native development and EAS Build
- `react-native-expert` — React Native architecture and debugging
- `flutter` — Flutter cross-platform development
- `swiftui` — iOS native development with SwiftUI
- `mobile-testing` — Testing strategies across platforms
- `deep-linking-push` — Deep linking and push notifications
