---
description: React Native and Expo expert for environment setup, Metro bundler, native modules, device testing, performance optimization, and debugging. Use for RN setup, build issues, or mobile debugging.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
context: fork
---

# React Native Expert - Setup, Build, Debug, Performance

Comprehensive React Native and Expo expertise covering environment setup, Metro bundler, native modules, device testing, performance optimization, and debugging.

## Quick Setup Commands

### Expo (Recommended)

```bash
# Create new project
npx create-expo-app@latest MyProject
cd MyProject
npx expo start

# Development build (custom native code)
npx expo install expo-dev-client
eas build --profile development --platform ios
```

### React Native CLI

```bash
# Create project (New Architecture enabled by default)
npx @react-native-community/cli init MyProject
cd MyProject

# Install iOS deps with New Architecture
cd ios && RCT_NEW_ARCH_ENABLED=1 pod install && cd ..

# Run
npm run ios
npm run android
```

## Environment Requirements (2025)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 20.x | 22 LTS |
| React Native | 0.76+ | 0.83 |
| Expo SDK | 52+ | 54 |
| Xcode | 16.1 | 26 |
| Android SDK | 34 | 35 |
| CocoaPods | 1.14 | 1.15+ |

## Common Build Issues

### Metro Cache Issues

```bash
# Clear everything
watchman watch-del-all
npx react-native start --reset-cache

# Expo
npx expo start --clear
```

### iOS Pod Issues

```bash
# Nuclear option
cd ios && rm -rf build Pods Podfile.lock && pod install && cd ..
```

### Android Gradle Issues

```bash
cd android && ./gradlew clean && cd ..
```

## Native Modules

### Creating Turbo Module

```typescript
// specs/NativeCalculator.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  add(a: number, b: number): number;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCalculator');
```

### Linking Native Code

```bash
# Auto-linking (RN 0.60+)
cd ios && pod install
cd android && ./gradlew build
```

## Performance Optimization

### Enable Hermes

```json
// android/app/build.gradle
hermesEnabled = true

// ios: Already default with New Architecture
```

### Performance Monitoring

```typescript
import { PerformanceObserver } from 'react-native-performance';

new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
}).observe({ entryTypes: ['measure'] });
```

### Image Optimization

```typescript
// Use FastImage for better caching
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: 'https://example.com/image.jpg' }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

## Device Testing

### iOS Simulator

```bash
# List devices
xcrun simctl list devices

# Boot specific device
xcrun simctl boot "iPhone 16 Pro"

# Run on device
npx react-native run-ios --device "My iPhone"
```

### Android Emulator

```bash
# List AVDs
emulator -list-avds

# Run emulator
emulator -avd Pixel_8_API_35

# Run on device
npx react-native run-android --deviceId <device-id>
```

## Debugging

### Flipper (Deprecated)

```bash
# Use Chrome DevTools instead (RN 0.73+)
# Press 'j' in Metro to open debugger
```

### React DevTools

```bash
npx react-devtools
```

### Common Debug Patterns

```typescript
// Native crash on iOS
// Check: Xcode → Device and Simulators → View Device Logs

// Bridge error
// Clear Metro cache and rebuild
watchman watch-del-all
npx react-native start --reset-cache

// Android build failure
cd android && ./gradlew clean && cd ..
```

## Environment Variables

```bash
# ~/.zshrc or ~/.bash_profile
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Reload
source ~/.zshrc
```

## Health Check

```bash
node --version      # 20+
xcodebuild -version # 16.1+
pod --version       # 1.15+
adb --version
watchman version
eas --version       # Expo
```

## Related Skills

- `mobile-architect` - Architecture decisions
