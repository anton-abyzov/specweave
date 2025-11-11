---
name: expo-workflow
description: Expert in Expo development workflows, EAS Build, EAS Update, Expo Go, dev clients, expo-cli commands, app configuration, and deployment strategies. Activates for expo, expo go, eas build, eas update, expo config, app.json, eas.json, expo dev client, expo prebuild, expo eject, over-the-air updates, expo doctor, expo install, managed workflow, bare workflow.
---

# Expo Workflow Expert

Comprehensive expertise in Expo development workflows, EAS (Expo Application Services), and optimization strategies for rapid mobile development. Specializes in modern Expo SDK features, development builds, and deployment pipelines.

## What I Know

### Expo Fundamentals

**Managed vs Bare Workflow**
- Managed workflow: Full Expo SDK, minimal native code
- Bare workflow: Full native code access with Expo modules
- When to use each approach
- Migration strategies between workflows

**Expo Go vs Development Builds**
- Expo Go: Quick testing, limited native modules
- Dev Client: Full native module support, custom builds
- When to switch from Expo Go to dev builds
- Creating custom dev clients with EAS Build

**Expo SDK & Modules**
- Core Expo modules (expo-camera, expo-location, etc.)
- Third-party native module compatibility
- Module installation best practices
- Autolinking and manual linking

### EAS Build (Cloud Builds)

**Build Profiles**
- Development builds: Fast iteration, dev client
- Preview builds: Internal testing, TestFlight/Internal Testing
- Production builds: App Store/Play Store submission
- Custom build profiles in eas.json

**Platform-Specific Configuration**
- iOS credentials management
- Android keystore handling
- Build caching strategies
- Environment variable injection

**Build Optimization**
- Caching node_modules and gradle dependencies
- Incremental builds
- Build machine types (M1, Ubuntu)
- Build time reduction strategies

### EAS Update (OTA Updates)

**Over-The-Air Updates**
- JavaScript bundle updates without app store submission
- Update channels and branches
- Rollout strategies (gradual rollout, instant rollout)
- Rollback capabilities

**Update Workflows**
- Development channel: Continuous updates
- Preview channel: QA testing
- Production channel: Staged rollouts
- Emergency hotfix workflows

**Update Best Practices**
- Version compatibility management
- Update frequency optimization
- Monitoring update adoption
- Handling update failures gracefully

### App Configuration

**app.json / app.config.js**
- App metadata (name, slug, version)
- Platform-specific configurations
- Asset and icon configuration
- Splash screen customization
- Deep linking setup (scheme, associated domains)
- Permissions configuration
- Build-time environment variables

**eas.json**
- Build profile configuration
- Submit profile setup
- Environment secrets management
- Platform-specific build settings

**Dynamic Configuration**
- Environment-specific configs (dev, staging, prod)
- Feature flags integration
- App variants (white-label apps)

### Development Workflow

**Fast Refresh & Hot Reloading**
- Understanding fast refresh behavior
- Troubleshooting fast refresh issues
- When to use full reload vs fast refresh

**Debugging Tools**
- React DevTools integration
- Remote debugging with Chrome DevTools
- Flipper for advanced debugging
- Network request inspection
- Performance profiling

**Local Development**
- Running on physical devices (QR code scanning)
- Running on simulators/emulators
- Offline development strategies
- Tunnel mode vs LAN mode

### Deployment & Distribution

**App Store Submission**
- iOS: TestFlight, App Store Connect integration
- Android: Internal testing, Play Store submission
- EAS Submit command automation
- Store metadata management

**Internal Distribution**
- Ad-hoc iOS builds
- Android APK distribution
- Enterprise distribution
- TestFlight external testing

**CI/CD Integration**
- GitHub Actions with EAS Build
- GitLab CI integration
- Automated build triggers
- Automated OTA updates on merge

## When to Use This Skill

Ask me when you need help with:
- Setting up Expo development workflow
- Creating development builds with EAS Build
- Configuring app.json or eas.json
- Setting up over-the-air updates with EAS Update
- Troubleshooting Expo Go limitations
- Optimizing build times
- Managing app credentials and secrets
- Configuring deep linking and URL schemes
- Setting up CI/CD pipelines for Expo apps
- Deploying to App Store or Play Store
- Understanding Expo SDK capabilities
- Migrating from Expo Go to dev client
- Handling native modules in Expo projects

## Essential Expo Commands

### Project Setup
```bash
# Create new Expo project
npx create-expo-app@latest MyApp

# Navigate to project
cd MyApp

# Start development server
npx expo start

# Install Expo module
npx expo install expo-camera

# Check project health
npx expo-doctor
```

### Development
```bash
# Start with cache cleared
npx expo start -c

# Start with specific mode
npx expo start --dev-client  # Development build
npx expo start --go          # Expo Go

# Run on specific platform
npx expo run:ios
npx expo run:android

# Prebuild native projects (bare workflow)
npx expo prebuild
```

### EAS Build
```bash
# Login to EAS
eas login

# Configure EAS
eas build:configure

# Build for all platforms
eas build --platform all

# Build development version
eas build --profile development --platform ios

# Build for production
eas build --profile production --platform all

# Check build status
eas build:list
```

### EAS Update
```bash
# Configure EAS Update
eas update:configure

# Publish update to default channel
eas update --branch production --message "Fix critical bug"

# Publish to specific channel
eas update --channel preview --message "QA testing"

# List published updates
eas update:list

# Rollback update
eas update:rollback
```

### EAS Submit
```bash
# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android

# Submit specific build
eas submit --platform ios --id <build-id>
```

## Pro Tips & Tricks

### 1. Development Build Optimization

Create a reusable development build once, then use EAS Update for daily changes:

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    }
  }
}
```

Build once:
```bash
eas build --profile development --platform all
```

Update JavaScript daily:
```bash
eas update --branch development --message "Daily changes"
```

### 2. Environment-Based Configuration

Use app.config.js for dynamic configuration:

```javascript
// app.config.js
export default ({ config }) => {
  const isProduction = process.env.APP_ENV === 'production';

  return {
    ...config,
    name: isProduction ? 'MyApp' : 'MyApp Dev',
    slug: 'myapp',
    extra: {
      apiUrl: isProduction
        ? 'https://api.myapp.com'
        : 'https://dev-api.myapp.com',
      analyticsKey: process.env.ANALYTICS_KEY,
    },
    updates: {
      url: 'https://u.expo.dev/your-project-id'
    }
  };
};
```

### 3. Fast Credential Setup

Let EAS manage credentials automatically:

```json
// eas.json
{
  "build": {
    "production": {
      "ios": {
        "credentialsSource": "remote"
      },
      "android": {
        "credentialsSource": "remote"
      }
    }
  }
}
```

### 4. Efficient Build Caching

Speed up builds by caching dependencies:

```json
// eas.json
{
  "build": {
    "production": {
      "cache": {
        "key": "myapp-v1",
        "paths": ["node_modules", "ios/Pods", "android/.gradle"]
      }
    }
  }
}
```

### 5. Gradual OTA Rollout

Safely deploy updates to production:

```bash
# Start with 10% rollout
eas update --branch production --message "New feature" --rollout-percentage 10

# Monitor metrics, then increase
eas update:configure-rollout --branch production --percentage 50

# Full rollout
eas update:configure-rollout --branch production --percentage 100
```

### 6. Quick Testing on Physical Devices

For Expo Go (quick testing):
```bash
# Start dev server
npx expo start

# Scan QR code with:
# - iOS: Camera app
# - Android: Expo Go app
```

For dev client (full features):
```bash
# Install dev client once
eas build --profile development --platform ios

# Daily JavaScript updates via EAS Update
eas update --branch development
```

### 7. Troubleshooting Common Issues

**"Unable to resolve module"**
```bash
# Clear Metro cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules && npm install
```

**"Build failed on EAS"**
```bash
# Check build logs
eas build:list
eas build:view <build-id>

# Run prebuild locally to catch issues early
npx expo prebuild
```

**"Update not appearing in app"**
```bash
# Check update channel matches app's channel
eas channel:list

# Verify update was published successfully
eas update:list --branch production

# Force reload in app (shake device → reload)
```

### 8. Native Module Integration

When you need a native module not in Expo SDK:

```bash
# Install the module
npm install react-native-awesome-module

# Prebuild to generate native projects
npx expo prebuild

# Rebuild dev client with new module
eas build --profile development --platform all

# Continue using EAS Update for JS changes
eas update --branch development
```

## Integration with SpecWeave

**Increment Planning**
- Document Expo setup steps in `spec.md`
- Include EAS Build/Update configuration in `plan.md`
- Track build and deployment tasks in `tasks.md`

**Testing Strategy**
- Use dev builds for feature development
- Preview builds for QA testing
- Production builds for stakeholder demos

**Living Documentation**
- Document build profiles in `.specweave/docs/internal/operations/`
- Track deployment procedures in runbooks
- Maintain credential management procedures

**Cost Optimization**
- Use EAS Update instead of rebuilding for JS-only changes
- Cache dependencies to reduce build times
- Monitor EAS usage in increment reports
