# React Native & Expo Setup Guide

Complete guide for setting up a React Native development environment for iOS and Android development.

## Prerequisites

Before setting up simulators or running apps, ensure you have the following installed.

### Required Software

#### 1. Node.js & npm

**Version Required**: Node.js 18.x or later

**Installation**: Download from [nodejs.org](https://nodejs.org/)

**Verify Installation**:
```bash
node --version
npm --version
```

#### 2. Xcode (macOS only - for iOS development)

**Version Required**: Xcode 15.x or later

**Installation**: Download from Mac App Store

**After Installation**:
```bash
# Install command line tools
xcode-select --install

# Accept license
sudo xcodebuild -license accept
```

**Important**: Check Xcode → Settings → Platforms to ensure iOS platform is installed. Look for the latest version (e.g., iOS 17.0 SDK).

#### 3. Android Studio (for Android development)

**Version Required**: Android Studio Hedgehog or later

**Installation**: Download from [developer.android.com](https://developer.android.com/studio)

**Required Components**:
- Android SDK Platform 34 or later (latest recommended)
- Android SDK Build-Tools
- Android Emulator
- Android SDK Platform-Tools

**SDK Manager Configuration**:
1. Open Android Studio
2. Go to Settings → Languages & Frameworks → Android SDK
3. In "SDK Platforms" tab, install latest Android API level (e.g., API 34)
4. In "SDK Tools" tab, ensure these are installed:
   - Android SDK Build-Tools
   - Android Emulator
   - Android SDK Platform-Tools
   - Google Play services (if using Google services)

#### 4. Watchman (Recommended for macOS)

**Installation** (macOS):
```bash
brew install watchman
```

**Purpose**: Watchman watches files and triggers actions when they change, enabling fast refresh in React Native.

---

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to your project directory
cd /path/to/your-react-native-project

# Install npm dependencies
npm install

# Install iOS pods (macOS only)
cd ios && pod install && cd ..
```

### 2. Verify Setup

```bash
# Check Expo CLI is available (if using Expo)
npx expo --version

# Check React Native CLI (if using bare React Native)
npx react-native --version
```

### 3. Environment Variables (Android)

Add these to your `~/.zshrc` or `~/.bash_profile`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**Reload shell**:
```bash
source ~/.zshrc  # or source ~/.bash_profile
```

**Verify**:
```bash
echo $ANDROID_HOME
adb --version
emulator -version
```

---

## Running on Real Device (Fastest Method)

This is the **recommended approach** for quick testing. No simulator/emulator needed!

### Step 1: Start the Development Server

Open a terminal and run:

```bash
# For Expo projects
npm start

# For bare React Native projects
npx react-native start
```

**What this does**: Starts the development server. For Expo, you'll see a QR code in the terminal.

### Step 2: Install App on Your Device

#### Option A: Using Expo Go (Quick Testing)

1. **iOS**: Install "Expo Go" from the App Store
2. **Android**: Install "Expo Go" from Google Play Store

**Note**: Some native modules may not work with Expo Go. For full functionality, use a development build from EAS Build.

#### Option B: Using Development Build (Full Functionality)

If you have a development build installed from EAS Build, use that instead for full native module support.

### Step 3: Scan the QR Code

1. **iOS**:
   - Open the Camera app
   - Point it at the QR code in the terminal
   - Tap the notification that appears

2. **Android**:
   - Open Expo Go app
   - Tap "Scan QR code"
   - Scan the QR code from the terminal

### Step 4: App Loads on Your Device

The app will download the JavaScript bundle and launch. You'll see:
1. Loading screen
2. Splash screen
3. Your app's home screen

**Benefits of Real Device Testing**:
- Fastest setup (no simulator download/installation)
- Real device performance
- Test actual touch interactions
- Test device-specific features (camera, GPS, etc.)

---

## Running on iOS Simulator

### Step 1: Start the Development Server

In **Terminal 1**, start the dev server:

```bash
npm start
```

Keep this terminal running in the background.

### Step 2: Build and Run on iOS Simulator

Open a **new terminal window (Terminal 2)** and run:

```bash
# For Expo projects
npm run ios

# For bare React Native projects
npx react-native run-ios
```

**What this does**:
- Builds the iOS app using Xcode
- Launches the iOS simulator
- Installs and opens the app

### Step 3: App Running in Simulator

The iOS Simulator will open, and your app will launch automatically.

### Alternative: Running on Specific iOS Device

```bash
# List available simulators
xcrun simctl list devices

# Run on specific device (example)
npx expo run:ios --simulator="iPhone 15 Pro"

# Or for bare React Native
npx react-native run-ios --simulator="iPhone 15 Pro"
```

**Simulator Management**:
```bash
# Boot a simulator
xcrun simctl boot "iPhone 15 Pro"

# List booted simulators
xcrun simctl list devices | grep Booted

# Shutdown all simulators
xcrun simctl shutdown all
```

---

## Running on Android Emulator

### Step 1: Create an Android Virtual Device (First Time Only)

1. Open Android Studio
2. Click **More Actions** → **Virtual Device Manager**
3. Click **Create Device**
4. Select **Pixel 6** (or any modern device)
5. Select **System Image**: API Level 34 (latest)
6. Click **Finish**

**Recommended Configuration**:
- Device: Pixel 6 or similar (1080x2400)
- System Image: Latest stable API level
- Graphics: Automatic or Hardware

### Step 2: Start the Android Emulator

**Option A: From Android Studio**
1. Open **Virtual Device Manager**
2. Click the **Play** button next to your device

**Option B: From Command Line**
```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_6_API_34
```

### Step 3: Start the Development Server

In **Terminal 1**, if not already running:

```bash
npm start
```

### Step 4: Build and Run on Android Emulator

Open a **new terminal window (Terminal 2)** and run:

```bash
# For Expo projects
npm run android

# For bare React Native projects
npx react-native run-android
```

**What this does**:
- Builds the Android app using Gradle
- Installs the APK on the running emulator
- Launches the app

### Step 5: App Running in Emulator

Your app will launch in the Android emulator.

**Emulator Tips**:
```bash
# Check connected devices
adb devices

# Restart ADB server (if device not detected)
adb kill-server && adb start-server

# Reverse port (for API calls to localhost)
adb reverse tcp:8081 tcp:8081
```

---

## Troubleshooting

### Common Issues

#### Issue: "Command not found: npm"

**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)

#### Issue: "Unable to resolve module @expo/vector-icons"

**Solution**:
```bash
# Clear watchman cache
npm run wm  # If configured in package.json
# Or: watchman watch-del-all

# Clear metro cache
npm start -- --reset-cache

# Reinstall dependencies
rm -rf node_modules
npm install
```

#### Issue: iOS Simulator - "Could not find iPhone Simulator"

**Solution**:
```bash
# Open Xcode
open -a Xcode

# Go to Xcode → Settings → Platforms
# Ensure iOS platform is installed

# List available simulators
xcrun simctl list devices

# Create a new simulator if needed (via Xcode)
```

#### Issue: Android Emulator - "No connected devices"

**Solution**:
```bash
# Check if emulator is running
adb devices

# If not listed, restart emulator
emulator -avd Pixel_6_API_34

# Or start from Android Studio Virtual Device Manager

# Verify connection
adb devices
# Should show: emulator-5554  device
```

#### Issue: "Failed to build iOS project"

**Solution**:
```bash
# Clean iOS build
cd ios
rm -rf build
pod install
cd ..

# Try building again
npm run ios

# If still failing, clean Xcode derived data:
rm -rf ~/Library/Developer/Xcode/DerivedData
```

#### Issue: "Android build failed - SDK not found"

**Solution**:

1. Open Android Studio
2. Go to **Settings** → **Languages & Frameworks** → **Android SDK**
3. Ensure SDK Path is set (usually `/Users/username/Library/Android/sdk`)
4. Add to `~/.zshrc` or `~/.bash_profile`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

5. Restart terminal

#### Issue: "Port 8081 already in use"

**Solution**:
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or start on different port
npx expo start --port 8082

# For Android, reverse new port:
adb reverse tcp:8082 tcp:8082
```

#### Issue: App shows "Unable to connect to development server"

**Solution**:
1. Ensure dev server is running (`npm start`)
2. Check firewall settings aren't blocking port 8081
3. For real devices: Ensure device and computer are on the same Wi-Fi network
4. Try clearing cache: `npm start -- --reset-cache`

---

## Available Commands

### Development Server

```bash
# Start dev server with QR code (Expo)
npm start

# Start with cache cleared
npm start -- --reset-cache

# For bare React Native
npx react-native start
npx react-native start --reset-cache
```

### iOS

```bash
# Run on iOS simulator
npm run ios

# Run on specific simulator
npx expo run:ios --simulator="iPhone 15 Pro"

# Build only (no run)
cd ios && xcodebuild -workspace MyApp.xcworkspace -scheme MyApp
```

### Android

```bash
# Run on Android emulator
npm run android

# Run on specific device
adb -s emulator-5554 install android/app/build/outputs/apk/debug/app-debug.apk

# Build only (no run)
cd android && ./gradlew assembleDebug
```

### Debugging

```bash
# Open React DevTools
react-devtools

# View iOS logs
npx react-native log-ios

# View Android logs
npx react-native log-android
adb logcat *:E  # Errors only
```

### Cache Management

```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear watchman
watchman watch-del-all

# Clear all caches (comprehensive)
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
watchman watch-del-all
rm -rf node_modules
npm install
```

---

## Performance Tips

### 1. Use Hermes (JavaScript Engine)

Hermes improves app startup time and reduces memory usage.

**Enable Hermes** (app.json for Expo):
```json
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

### 2. Enable Fast Refresh

Fast Refresh is enabled by default. To manually trigger:
- Shake device → "Reload"
- Or: `r` in Metro bundler terminal

### 3. Optimize Images

- Use WebP format for smaller file sizes
- Resize images to actual display size
- Consider using `react-native-fast-image` for better caching

### 4. Profile Performance

- Shake device → "Show Perf Monitor"
- Use React DevTools Profiler
- Monitor JS frame rate (should be 60 FPS)

---

## Next Steps

### For New Projects

1. **Choose Your Stack**:
   - Expo (managed workflow) - Recommended for most projects
   - Expo (bare workflow) - For custom native modules
   - React Native CLI - For full native control

2. **Set Up Navigation**:
   ```bash
   npm install @react-navigation/native @react-navigation/native-stack
   npx expo install react-native-screens react-native-safe-area-context
   ```

3. **Add State Management** (if needed):
   - Simple: Context + Hooks
   - Medium: Zustand
   - Complex: Redux Toolkit

4. **Configure EAS Build** (for Expo projects):
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   ```

### Recommended Tools

- **UI Components**: React Native Paper, NativeBase, or React Native Elements
- **Forms**: React Hook Form
- **HTTP Client**: Axios or React Query
- **Testing**: Jest + React Native Testing Library + Detox
- **Debugging**: Flipper or React Native Debugger
- **Analytics**: Firebase Analytics or Segment

---

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Native Directory](https://reactnative.directory/) - Find libraries
- [SpecWeave Mobile Plugin](../../../README.md) - SpecWeave integration guide

---

## Support

If you encounter issues not covered in this guide:

1. Check [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
2. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)
3. Ask in [Reactiflux Discord](https://www.reactiflux.com/) #react-native channel
4. File an issue on your project's GitHub repository

---

**Last Updated**: November 2024
**Tested With**: React Native 0.73, Expo SDK 50
