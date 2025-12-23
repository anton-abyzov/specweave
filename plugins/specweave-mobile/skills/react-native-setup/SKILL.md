---
name: react-native-setup
description: Expert in React Native 0.83+ and Expo SDK 54+ environment setup. Helps with Node.js 20+, Xcode 16.1+, Android Studio, watchman, CocoaPods, EAS Build, simulators, emulators, and troubleshooting. Activates for environment setup, installation issues, xcode setup, android studio, simulators, emulators, react-native init, expo init, development environment, SDK configuration, EAS Build, development builds.
---

# React Native Setup Expert (2025)

Expert in React Native 0.83+ and Expo SDK 54+ environment configuration across macOS, Windows, and Linux. Specializes in New Architecture setup, EAS Build configuration, and development environment optimization.

## What I Know

### Prerequisites & Installation (2025 Requirements)

**Node.js & npm**
- **Node.js 20.x or later required** (Node 18 EOL April 2025)
- Node.js 22 LTS recommended for best performance
- Version verification: `node --version && npm --version`
- Package managers: npm, yarn, pnpm, bun all supported
- Corepack for yarn: `corepack enable && corepack prepare yarn@stable --activate`

**Xcode (macOS - iOS Development)**
- **Xcode 16.1 or later required** (minimum for RN 0.83)
- **Xcode 26 recommended** for iOS Liquid Glass support
- Command line tools: `xcode-select --install`
- License acceptance: `sudo xcodebuild -license accept`
- iOS 15.1+ deployment target (minimum supported)
- iOS 18+ for latest features, iOS 26 for Liquid Glass

**Android Studio (Android Development)**
- **Android Studio Ladybug or later** (2024.2.1+)
- Required SDK components:
  - **Android SDK Platform 35** (API level 35)
  - Android SDK Build-Tools 35.0.0
  - Android Emulator
  - Android SDK Platform-Tools
  - **NDK 27.1.12297006** (for native modules)
  - CMake 3.22.1+ (for Turbo Modules)
- **compileSdkVersion 35, targetSdkVersion 35, minSdkVersion 24**
- ANDROID_HOME environment variable setup
- Edge-to-edge display support (Android 15+)

**Watchman**
- Installation via Homebrew (macOS): `brew install watchman`
- Purpose: File watching for fast refresh with Metro
- Critical for large codebases
- Cache clearing: `watchman watch-del-all`

### Environment Configuration

**iOS Setup**
- CocoaPods 1.15+ installation: `sudo gem install cocoapods`
- Pod install with New Architecture: `RCT_NEW_ARCH_ENABLED=1 pod install`
- Xcode project configuration for Fabric
- Provisioning profiles and certificates
- iOS Simulator management
- Device selection: `xcrun simctl list devices`
- Liquid Glass testing requires iOS 26 simulator

**Android Setup**
- Gradle 8.10+ (bundled with Android Studio Ladybug)
- Android SDK path configuration
- Environment variables (ANDROID_HOME, PATH)
- AVD creation with API 35 images
- Emulator with edge-to-edge support
- ADB troubleshooting
- New Architecture: `newArchEnabled=true` in gradle.properties

**Metro Bundler**
- Port 8081 configuration
- Cache clearing: `npx react-native start --reset-cache`
- Metro config for New Architecture
- Symlink support for monorepos
- Custom resolver configuration

**EAS Build Setup (Expo)**
- Install EAS CLI: `npm install -g eas-cli`
- Login: `eas login`
- Configure: `eas build:configure`
- Development builds for custom native code
- EAS Update for OTA updates

### Common Setup Issues

**"Command not found" Errors**
- PATH configuration for Node, Android SDK, Xcode tools
- Shell profile updates (.zshrc, .bash_profile)
- Symlink issues with nvm/fnm

**SDK Not Found**
- SDK path verification: `echo $ANDROID_HOME`
- Environment variable troubleshooting
- SDK Manager reinstallation
- NDK path for native modules

**Pod Install Failures**
- CocoaPods version issues (requires 1.15+)
- Ffi gem compilation errors on Apple Silicon
- Ruby version compatibility (use system Ruby or rbenv)
- New Architecture pod failures: clean and rebuild
- `pod deintegrate && pod install` strategy

**Build Failures**
- Clean build strategies (see Pro Tips)
- Dependency conflicts with New Architecture
- Native module compilation errors
- Xcode derived data clearing
- Gradle cache corruption

**New Architecture Issues**
- Turbo Module not found: check codegen ran
- Fabric component not rendering: verify native setup
- Bridge module compatibility: use interop layer

## When to Use This Skill

Ask me when you need help with:
- Initial React Native 0.83+ environment setup
- Installing and configuring Xcode 16.1+ or Android Studio Ladybug
- Setting up iOS simulators or Android emulators
- Troubleshooting "Command not found" errors
- Resolving SDK path or ANDROID_HOME issues
- Fixing CocoaPods installation problems
- Clearing Metro bundler cache
- Configuring development environment variables
- Troubleshooting build failures
- Setting up watchman for file watching
- Verifying development environment prerequisites
- **EAS Build configuration and troubleshooting**
- **New Architecture setup and migration**
- **Development build creation for custom native code**
- **Hermes V1 experimental setup**

## Quick Setup Commands

### iOS (macOS)
```bash
# Install Xcode command line tools
xcode-select --install

# Accept Xcode license
sudo xcodebuild -license accept

# Install CocoaPods (1.15+ required)
sudo gem install cocoapods

# Install watchman
brew install watchman

# Verify setup
xcodebuild -version  # Should be 16.1+
pod --version        # Should be 1.15+
watchman version
```

### Android (All Platforms)
```bash
# Verify Android setup
echo $ANDROID_HOME
adb --version
emulator -version

# Verify SDK version
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --list | grep "platforms;android-35"

# List available emulators
emulator -list-avds

# List connected devices
adb devices
```

### React Native CLI Project
```bash
# Create new React Native project (New Architecture enabled by default)
npx @react-native-community/cli init MyProject

# Navigate to project
cd MyProject

# Install iOS dependencies with New Architecture
cd ios && RCT_NEW_ARCH_ENABLED=1 pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS (separate terminal)
npm run ios

# Run on Android (separate terminal)
npm run android
```

### Expo Project (Recommended)
```bash
# Create new Expo project
npx create-expo-app@latest MyProject

# Navigate to project
cd MyProject

# Start development server
npx expo start

# Create development build (for custom native code)
npx expo install expo-dev-client
eas build --profile development --platform ios
eas build --profile development --platform android
```

## Pro Tips

1. **Clean Builds**: When in doubt, clean everything
   ```bash
   # iOS (nuclear option)
   cd ios && rm -rf build Pods Podfile.lock && pod install && cd ..

   # Android
   cd android && ./gradlew clean && cd ..

   # Metro + Watchman
   watchman watch-del-all
   npx react-native start --reset-cache

   # Expo
   npx expo start --clear
   ```

2. **Environment Variables**: Always verify environment variables after changes
   ```bash
   # Add to ~/.zshrc or ~/.bash_profile
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

   # Reload shell
   source ~/.zshrc
   ```

3. **Simulator Management**: List and boot specific devices
   ```bash
   # iOS
   xcrun simctl list devices
   xcrun simctl boot "iPhone 16 Pro"

   # Android (API 35 for edge-to-edge)
   emulator -list-avds
   emulator -avd Pixel_8_API_35
   ```

4. **Quick Health Check**: Verify entire environment
   ```bash
   node --version      # Should be 20+
   npm --version       # npm
   xcodebuild -version # Should be 16.1+
   pod --version       # Should be 1.15+
   adb --version       # Android tools
   watchman version    # Watchman
   eas --version       # EAS CLI (Expo)
   ```

5. **EAS Build Configuration**: Essential eas.json
   ```json
   {
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal"
       },
       "production": {}
     }
   }
   ```

6. **Hermes V1 (Experimental)**: Enable next-gen engine
   ```javascript
   // metro.config.js
   module.exports = {
     transformer: {
       hermesParser: true,
     },
   };
   ```

   ```bash
   # Verify Hermes is running
   # In app: global.HermesInternal !== undefined
   ```

## Version Compatibility Matrix (2025)

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| Node.js | 20.x | 22 LTS | Node 18 EOL April 2025 |
| React Native | 0.76+ | 0.83 | New Arch default since 0.76 |
| React | 18.3+ | 19.2 | Activity, useEffectEvent |
| Expo SDK | 52+ | 54 | Native tabs, Liquid Glass |
| Xcode | 16.1 | 26 | iOS 26 for Liquid Glass |
| Android SDK | 34 | 35 | Edge-to-edge support |
| CocoaPods | 1.14 | 1.15+ | New Arch compatibility |
| Gradle | 8.6 | 8.10+ | K2 compiler support |

## Integration with SpecWeave

This skill integrates with SpecWeave's increment workflow:
- Use during `/sw:increment` planning for environment setup tasks
- Reference in `tasks.md` for setup-related acceptance criteria
- Include in `spec.md` for mobile-specific prerequisites
- Document setup issues in increment `reports/` folder
- Use mobile-architect agent for architecture decisions
