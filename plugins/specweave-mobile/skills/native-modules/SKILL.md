---
name: native-modules
description: Expert in React Native 0.83+ native modules, Turbo Modules with Codegen, Fabric renderer, JSI (JavaScript Interface), New Architecture migration, bridging JavaScript and native code, iOS Swift modules, Android Kotlin modules, expo config plugins. Activates for native module, native code, bridge, turbo module, JSI, fabric, autolinking, custom native module, ios module, android module, swift, kotlin, objective-c, java native code, codegen, new architecture.
---

# Native Modules Expert (RN 0.83+ New Architecture)

Specialized in React Native 0.83+ native module integration with New Architecture (enabled by default). Expert in Turbo Modules, JSI, Fabric, Codegen, and modern native development patterns.

## What I Know

### Native Module Fundamentals

**What Are Native Modules?**
- Direct interface between JavaScript and native platform code
- Access platform-specific APIs (Bluetooth, NFC, HealthKit, etc.)
- Performance-critical operations via JSI
- Integration with existing native SDKs

**New Architecture (Default in RN 0.76+)**
- **JSI** (JavaScript Interface): Direct JS ↔ Native communication (no JSON serialization)
- **Turbo Modules**: Lazy-loaded, type-safe native modules with Codegen
- **Fabric**: New concurrent rendering engine
- **Codegen**: TypeScript → Native type generation

**Key Benefits of New Architecture**
- 10-100x faster than old bridge
- Synchronous method calls possible
- Type safety across JS/Native boundary
- Lazy module loading (better startup)
- Concurrent rendering with Fabric

### Using Third-Party Native Modules

**Installation with Autolinking**
```bash
# Install module
npm install react-native-camera

# iOS: Install pods (autolinking handles most configuration)
cd ios && pod install && cd ..

# Rebuild the app
npm run ios
npm run android
```

**Manual Linking (Legacy)**
```bash
# React Native < 0.60 (rarely needed now)
react-native link react-native-camera
```

**Expo Integration**
```bash
# For Expo managed workflow, use config plugins
npx expo install react-native-camera

# Add plugin to app.json
{
  "expo": {
    "plugins": [
      [
        "react-native-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera"
        }
      ]
    ]
  }
}

# Rebuild dev client
eas build --profile development --platform all
```

### Creating Custom Native Modules

**iOS Native Module (Swift)**

```swift
// RCTCalendarModule.swift
import Foundation

@objc(CalendarModule)
class CalendarModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func createEvent(_ name: String, location: String, date: NSNumber) {
    // Native implementation
    print("Creating event: \(name) at \(location)")
  }

  @objc
  func getEvents(_ callback: @escaping RCTResponseSenderBlock) {
    let events = ["Event 1", "Event 2", "Event 3"]
    callback([NSNull(), events])
  }

  @objc
  func findEvents(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Async with Promise
    DispatchQueue.global().async {
      let events = self.fetchEventsFromNativeAPI()
      resolve(events)
    }
  }
}
```

```objectivec
// RCTCalendarModule.m (Bridge file)
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CalendarModule, NSObject)

RCT_EXTERN_METHOD(createEvent:(NSString *)name location:(NSString *)location date:(nonnull NSNumber *)date)

RCT_EXTERN_METHOD(getEvents:(RCTResponseSenderBlock)callback)

RCT_EXTERN_METHOD(findEvents:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
```

**Android Native Module (Kotlin)**

```kotlin
// CalendarModule.kt
package com.myapp

import com.facebook.react.bridge.*

class CalendarModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "CalendarModule"
    }

    @ReactMethod
    fun createEvent(name: String, location: String, date: Double) {
        // Native implementation
        println("Creating event: $name at $location")
    }

    @ReactMethod
    fun getEvents(callback: Callback) {
        val events = WritableNativeArray().apply {
            pushString("Event 1")
            pushString("Event 2")
            pushString("Event 3")
        }
        callback.invoke(null, events)
    }

    @ReactMethod
    fun findEvents(promise: Promise) {
        try {
            val events = fetchEventsFromNativeAPI()
            promise.resolve(events)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }
}
```

```kotlin
// CalendarPackage.kt
package com.myapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class CalendarPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(CalendarModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

**JavaScript Usage**

```javascript
// CalendarModule.js
import { NativeModules } from 'react-native';

const { CalendarModule } = NativeModules;

export default {
  createEvent: (name, location, date) => {
    CalendarModule.createEvent(name, location, date);
  },

  getEvents: (callback) => {
    CalendarModule.getEvents((error, events) => {
      if (error) {
        console.error(error);
      } else {
        callback(events);
      }
    });
  },

  findEvents: async () => {
    try {
      const events = await CalendarModule.findEvents();
      return events;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
};

// Usage in components
import CalendarModule from './CalendarModule';

function MyComponent() {
  const handleCreateEvent = () => {
    CalendarModule.createEvent('Meeting', 'Office', Date.now());
  };

  const handleGetEvents = async () => {
    const events = await CalendarModule.findEvents();
    console.log('Events:', events);
  };

  return (
    <View>
      <Button title="Create Event" onPress={handleCreateEvent} />
      <Button title="Get Events" onPress={handleGetEvents} />
    </View>
  );
}
```

### Turbo Modules (New Architecture - Default in RN 0.76+)

**Creating a Turbo Module with Codegen**

Step 1: Create the TypeScript spec (source of truth for types):

```typescript
// specs/NativeCalendarModule.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Sync method (fast, blocks JS thread)
  getConstants(): {
    DEFAULT_REMINDER_MINUTES: number;
  };

  // Async methods (recommended for most cases)
  createEvent(name: string, location: string, date: number): Promise<string>;
  findEvents(): Promise<string[]>;
  deleteEvent(eventId: string): Promise<boolean>;

  // Callback-based (legacy pattern, prefer Promise)
  getEventsWithCallback(callback: (events: string[]) => void): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CalendarModule');
```

Step 2: Configure Codegen in package.json:

```json
{
  "codegenConfig": {
    "name": "CalendarModuleSpec",
    "type": "modules",
    "jsSrcsDir": "specs",
    "android": {
      "javaPackageName": "com.myapp.calendar"
    }
  }
}
```

Step 3: Implement the native side (iOS - Swift):

```swift
// CalendarModule.swift
import Foundation

@objc(CalendarModule)
class CalendarModule: NSObject {

  @objc static func moduleName() -> String! {
    return "CalendarModule"
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc func getConstants() -> [String: Any] {
    return ["DEFAULT_REMINDER_MINUTES": 15]
  }

  @objc func createEvent(_ name: String, location: String, date: Double,
                         resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global().async {
      // Native implementation
      let eventId = UUID().uuidString
      resolve(eventId)
    }
  }

  @objc func findEvents(_ resolve: @escaping RCTPromiseResolveBlock,
                        reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global().async {
      let events = ["Meeting", "Lunch", "Call"]
      resolve(events)
    }
  }

  @objc func deleteEvent(_ eventId: String,
                         resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock) {
    resolve(true)
  }
}
```

Step 4: Implement the native side (Android - Kotlin):

```kotlin
// CalendarModule.kt
package com.myapp.calendar

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = CalendarModule.NAME)
class CalendarModule(reactContext: ReactApplicationContext) :
    NativeCalendarModuleSpec(reactContext) {

    companion object {
        const val NAME = "CalendarModule"
    }

    override fun getName(): String = NAME

    override fun getConstants(): MutableMap<String, Any> {
        return mutableMapOf("DEFAULT_REMINDER_MINUTES" to 15)
    }

    override fun createEvent(name: String, location: String, date: Double, promise: Promise) {
        val eventId = java.util.UUID.randomUUID().toString()
        promise.resolve(eventId)
    }

    override fun findEvents(promise: Promise) {
        val events = Arguments.createArray().apply {
            pushString("Meeting")
            pushString("Lunch")
            pushString("Call")
        }
        promise.resolve(events)
    }

    override fun deleteEvent(eventId: String, promise: Promise) {
        promise.resolve(true)
    }
}
```

**Benefits of Turbo Modules**
- **Lazy loading**: Only loaded when first accessed
- **Type safety**: Codegen generates native interfaces from TypeScript
- **10x faster**: Direct JSI calls, no JSON serialization
- **Synchronous calls**: getConstants() can be sync
- **Better DX**: TypeScript errors caught at build time

### Native UI Components

**Custom Native View (iOS - Swift)**

```swift
// RCTCustomViewManager.swift
import UIKit

@objc(CustomViewManager)
class CustomViewManager: RCTViewManager {

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func view() -> UIView! {
    return CustomView()
  }

  @objc func setColor(_ view: CustomView, color: NSNumber) {
    view.backgroundColor = RCTConvert.uiColor(color)
  }
}

class CustomView: UIView {
  override init(frame: CGRect) {
    super.init(frame: frame)
    self.backgroundColor = .blue
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }
}
```

**Custom Native View (Android - Kotlin)**

```kotlin
// CustomViewManager.kt
class CustomViewManager : SimpleViewManager<View>() {

    override fun getName(): String {
        return "CustomView"
    }

    override fun createViewInstance(reactContext: ThemedReactContext): View {
        return View(reactContext).apply {
            setBackgroundColor(Color.BLUE)
        }
    }

    @ReactProp(name = "color")
    fun setColor(view: View, color: Int) {
        view.setBackgroundColor(color)
    }
}
```

**JavaScript Usage**

```javascript
import { requireNativeComponent } from 'react-native';

const CustomView = requireNativeComponent('CustomView');

function MyComponent() {
  return (
    <CustomView
      style={{ width: 200, height: 200 }}
      color="red"
    />
  );
}
```

### Common Native Module Issues

**Module Not Found**
```bash
# iOS: Clear build and reinstall pods
cd ios && rm -rf build Pods && pod install && cd ..
npm run ios

# Android: Clean and rebuild
cd android && ./gradlew clean && cd ..
npm run android

# Clear Metro cache
npx react-native start --reset-cache
```

**Autolinking Not Working**
```bash
# Verify module in package.json
npm list react-native-camera

# Re-run pod install
cd ios && pod install && cd ..

# Check react-native.config.js for custom linking config
```

**Native Crashes**
```bash
# iOS: Check Xcode console for crash logs
# Look for:
# - Unrecognized selector sent to instance
# - Null pointer exceptions
# - Memory issues

# Android: Check logcat
adb logcat *:E
# Look for:
# - Java exceptions
# - JNI errors
# - Null pointer exceptions
```

## When to Use This Skill

Ask me when you need help with:
- Integrating third-party native modules
- Creating custom native modules
- Troubleshooting native module installation
- Writing iOS native code (Swift/Objective-C)
- Writing Android native code (Kotlin/Java)
- Debugging native crashes
- Understanding Turbo Modules and JSI
- Migrating to New Architecture
- Creating custom native UI components
- Handling platform-specific APIs
- Resolving autolinking issues
- **Setting up Codegen for type-safe modules**
- **Creating Fabric components (New Architecture UI)**
- **JSI bindings for synchronous native calls**
- **Expo config plugins for native configuration**
- **Interop layer for legacy Bridge modules**

## Essential Commands

### Module Development
```bash
# Create module template
npx create-react-native-module my-module

# Build iOS module
cd ios && xcodebuild

# Build Android module
cd android && ./gradlew assembleRelease

# Test module locally
npm link
cd ../MyApp && npm link my-module
```

### Debugging Native Code
```bash
# iOS: Run with Xcode debugger
open ios/MyApp.xcworkspace

# Android: Run with Android Studio debugger
# Open android/ folder in Android Studio

# Print native logs
# iOS
tail -f ~/Library/Logs/DiagnosticReports/*.crash

# Android
adb logcat | grep "CalendarModule"
```

## Pro Tips & Tricks

### 1. Type-Safe Native Modules with Codegen

Use Codegen (New Architecture) for type safety:

```typescript
// NativeMyModule.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getString(key: string): Promise<string>;
  setString(key: string, value: string): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MyModule');
```

### 2. Event Emitters for Native → JS Communication

```swift
// iOS - Emit events to JavaScript
import Foundation

@objc(DeviceOrientationModule)
class DeviceOrientationModule: RCTEventEmitter {

  override func supportedEvents() -> [String]! {
    return ["OrientationChanged"]
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func startObserving() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(orientationChanged),
      name: UIDevice.orientationDidChangeNotification,
      object: nil
    )
  }

  @objc
  func stopObserving() {
    NotificationCenter.default.removeObserver(self)
  }

  @objc
  func orientationChanged() {
    let orientation = UIDevice.current.orientation
    sendEvent(withName: "OrientationChanged", body: ["orientation": orientation.rawValue])
  }
}
```

```javascript
// JavaScript - Listen to native events
import { NativeEventEmitter, NativeModules } from 'react-native';

const { DeviceOrientationModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(DeviceOrientationModule);

function MyComponent() {
  useEffect(() => {
    const subscription = eventEmitter.addListener('OrientationChanged', (data) => {
      console.log('Orientation:', data.orientation);
    });

    return () => subscription.remove();
  }, []);

  return <View />;
}
```

### 3. Native Module with Callbacks

```kotlin
// Android - Pass callbacks
@ReactMethod
fun processData(data: String, successCallback: Callback, errorCallback: Callback) {
    try {
        val result = heavyProcessing(data)
        successCallback.invoke(result)
    } catch (e: Exception) {
        errorCallback.invoke(e.message)
    }
}
```

```javascript
// JavaScript
CalendarModule.processData(
  'input data',
  (result) => console.log('Success:', result),
  (error) => console.error('Error:', error)
);
```

### 4. Synchronous Native Methods (Use Sparingly)

```swift
// iOS - Synchronous method (blocks JS thread!)
@objc
func getDeviceId() -> String {
    return UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
}
```

```javascript
// JavaScript - Synchronous call
const deviceId = CalendarModule.getDeviceId();
console.log(deviceId);  // Returns immediately
```

**Warning**: Synchronous methods block the JS thread. Use only for very fast operations (<5ms).

### 5. Expo Config Plugins (SDK 54+)

For Expo projects, use config plugins to modify native code:

```typescript
// plugins/withCalendarPermission.ts
import { ConfigPlugin, withInfoPlist, withAndroidManifest } from '@expo/config-plugins';

const withCalendarPermission: ConfigPlugin = (config) => {
  // iOS: Modify Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSCalendarsUsageDescription =
      'This app needs calendar access to schedule events';
    return config;
  });

  // Android: Modify AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (mainApplication) {
      // Add permissions
      config.modResults.manifest['uses-permission'] = [
        ...(config.modResults.manifest['uses-permission'] || []),
        { $: { 'android:name': 'android.permission.READ_CALENDAR' } },
        { $: { 'android:name': 'android.permission.WRITE_CALENDAR' } },
      ];
    }
    return config;
  });

  return config;
};

export default withCalendarPermission;
```

```json
// app.json
{
  "expo": {
    "plugins": [
      "./plugins/withCalendarPermission"
    ]
  }
}
```

### 6. Interop Layer for Legacy Bridge Modules

RN 0.76+ includes an interop layer for Bridge modules in New Architecture:

```typescript
// For legacy modules that don't support Turbo Modules yet
import { NativeModules, TurboModuleRegistry } from 'react-native';

// This works in New Architecture via interop layer
const LegacyModule = NativeModules.LegacyBridgeModule;

// Or use the Turbo Module if available
const TurboModule = TurboModuleRegistry.get('ModernModule');

// Recommended: Create a wrapper that handles both
export function getCalendarModule() {
  // Try Turbo Module first
  const turbo = TurboModuleRegistry.get('CalendarModule');
  if (turbo) return turbo;

  // Fall back to Bridge module via interop
  return NativeModules.CalendarModule;
}
```

## Integration with SpecWeave

**Native Module Planning**
- Document native dependencies in `spec.md`
- Include native module setup in `plan.md`
- Add native code compilation to `tasks.md`

**Testing Strategy**
- Unit test native code separately
- Integration test JS ↔ Native bridge
- Test on both iOS and Android
- Document platform-specific behaviors

**Documentation**
- Maintain native module API documentation
- Document platform-specific quirks
- Keep runbooks for common native issues
