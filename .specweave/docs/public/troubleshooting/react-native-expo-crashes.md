# React Native & Expo Crash Troubleshooting

Complete guide for debugging React Native and Expo application crashes, with special focus on module-level code execution issues that cause silent failures.

---

## Module-Level Code Execution (The #1 Crash Cause)

### What Is Module-Level Code?

When JavaScript imports a file, **ALL code at the top level executes immediately**:

```typescript
// This file's top-level code runs when ANY file imports it
import SomeLibrary from 'some-library';

// This runs at IMPORT TIME, not when you call it
const result = SomeLibrary.doSomething(); // DANGER!

// This is safe - only defines, doesn't execute
export function myFunction() {
  return SomeLibrary.doSomething();
}
```

### Why This Causes Crashes

1. **React Context not available** - No providers wrapped yet
2. **Native modules not initialized** - Especially in Expo Go
3. **Device APIs not ready** - Storage, locale, notifications
4. **Hooks outside components** - `useX()` at module level = crash

### Error Signatures

Learn to recognize these patterns:

| Error Message | Cause | Fix |
|--------------|-------|-----|
| `Cannot read property 'getLocales' of null` | expo-localization at module level | Use `Intl.DateTimeFormat()` |
| `Invalid hook call` | Hook outside component | Move hook inside component |
| `Rendered more hooks than previous render` | Conditional hook | Make hooks unconditional |
| `No QueryClient set` | TanStack Query outside provider | Wrap with provider first |
| `Unable to resolve module` | Native module not available | Use dev build or alternative |
| White screen (no error) | Module crash before error boundary | Binary search debugging |

---

## Common Problematic Libraries

### expo-localization

**Problem**: Crashes in Expo Go when accessed at module level.

```typescript
// ❌ CRASHES
import * as Localization from 'expo-localization';
const locale = Localization.getLocales()[0].languageCode;

// ✅ WORKS - No native module dependency
function getLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0] || 'en';
  } catch {
    return 'en';
  }
}
```

### react-i18next

**Problem**: Uses React context internally, crashes when initialized at module level.

```typescript
// ❌ CRASHES - React dependency at module level
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
i18n.use(initReactI18next).init({...});

// ✅ WORKS - Use i18n-js instead
// i18n.ts (PURE JS - no React)
import { I18n } from 'i18n-js';
const i18n = new I18n({ en, es });
export const t = (key: string) => i18n.t(key);

// hooks.tsx (React only, separate file)
export function useTranslation() {
  const [, forceUpdate] = useState({});
  // ... pub/sub pattern for reactivity
  return { t, changeLanguage };
}
```

### AsyncStorage

**Problem**: Async operations at module level.

```typescript
// ❌ CRASHES - Can't await at module level
const theme = await AsyncStorage.getItem('theme');

// ✅ WORKS - Lazy access inside functions
async function getTheme(): Promise<string> {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return await AsyncStorage.getItem('theme') || 'light';
}
```

### Supabase

**Problem**: Auto-refresh may access storage at initialization.

```typescript
// ❌ MAY CRASH - Storage access at init
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: true }
});

// ✅ WORKS - Lazy initialization
let client: SupabaseClient | null = null;
export function getSupabase() {
  if (!client) {
    client = createClient(url, key, config);
  }
  return client;
}
```

### expo-notifications

**Problem**: Native module may not be ready.

```typescript
// ❌ MAY CRASH - Before native init
Notifications.setNotificationHandler({
  handleNotification: async () => ({...})
});

// ✅ WORKS - Inside component useEffect
useEffect(() => {
  Notifications.setNotificationHandler({...});
}, []);
```

---

## Debugging Strategies

### Binary Search Method

When your app white-screens on startup:

```typescript
// Step 1: Minimal app
export default function App() {
  return <Text>Hello</Text>;
}
// Does this work? If no, check node_modules / metro cache

// Step 2: Add providers one by one
export default function App() {
  return (
    <SafeAreaProvider>
      <Text>Hello</Text>
    </SafeAreaProvider>
  );
}
// Still works? Add next provider...

// Step 3: Keep adding until crash
// Last thing added = the problem

// Step 4: Check imports of problematic provider
// Look for module-level code in its dependencies
```

### Provider Order Debugging

Incorrect provider order causes subtle crashes:

```typescript
// CORRECT ORDER (dependencies satisfied top-down)
<GestureHandlerRootView>     {/* 1. Native gestures */}
  <SafeAreaProvider>          {/* 2. Safe area insets */}
    <QueryClientProvider>     {/* 3. Data fetching */}
      <ThemeProvider>         {/* 4. UI theming */}
        <AuthProvider>        {/* 5. Auth state */}
          <Slot />            {/* 6. App content */}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

### Console Logging

Add strategic logs to find crash location:

```typescript
console.log('1: Before imports');
import { Something } from './something';
console.log('2: After imports');

export default function App() {
  console.log('3: Component rendering');
  return <View />;
}
```

If you only see "1" in logs, the import is crashing.

---

## Expo Go vs Development Build

Many crashes happen only in Expo Go due to missing native modules:

| Feature | Expo Go | Dev Build |
|---------|---------|-----------|
| expo-localization | Limited | Full |
| AsyncStorage | Works | Works |
| Custom native modules | No | Yes |
| react-native-mmkv | No | Yes |
| Full notifications | No | Yes |
| Bluetooth/NFC | No | Yes |
| In-app purchases | No | Yes |

### Creating a Development Build

```bash
# Option 1: Local build
npx expo prebuild
npx expo run:ios
# or
npx expo run:android

# Option 2: EAS Build (cloud)
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform ios
```

---

## Quick Fixes

### Metro Cache Issues

```bash
# Clear Metro cache
npx expo start -c

# Full cache reset
rm -rf node_modules
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
npm install
npx expo start -c
```

### iOS Build Issues

```bash
# Pod reinstall
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..

# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### Android Build Issues

```bash
# Gradle clean
cd android
./gradlew clean
cd ..

# Clear Gradle cache
rm -rf ~/.gradle/caches
```

### Full Nuclear Reset

```bash
rm -rf node_modules
rm -rf ios/Pods ios/Podfile.lock
rm -rf android/.gradle android/app/build
rm -rf $TMPDIR/react-* $TMPDIR/metro-*
watchman watch-del-all 2>/dev/null || true
npm install
cd ios && pod install && cd ..
npx expo start -c
```

---

## Architecture Patterns That Work

### i18n (Internationalization)

```
src/i18n/
├── i18n.ts         # Pure JS - I18n instance
├── hooks.tsx       # React hooks only
└── locales/
    ├── en.json
    └── es.json
```

**i18n.ts** (no React):
```typescript
import { I18n } from 'i18n-js';
import en from './locales/en.json';
import es from './locales/es.json';

function getLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];
  } catch {
    return 'en';
  }
}

const i18n = new I18n({ en, es });
i18n.defaultLocale = 'en';
i18n.locale = getLocale();
i18n.enableFallback = true;

export default i18n;
export const t = (key: string, options?: object) => i18n.t(key, options);
```

**hooks.tsx** (React only):
```typescript
import { useState, useEffect, useCallback } from 'react';
import i18n, { t } from './i18n';

const listeners = new Set<() => void>();

export function useTranslation() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const update = () => forceUpdate({});
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const changeLanguage = useCallback((lang: string) => {
    i18n.locale = lang;
    listeners.forEach(l => l());
  }, []);

  return { t, i18n, changeLanguage };
}
```

### Service Initialization

```typescript
// services/index.ts
let initialized = false;

export async function initializeServices() {
  if (initialized) return;

  // Initialize in correct order with error handling
  try {
    await initStorage();
    await initAuth();
    await initNotifications();
    initialized = true;
  } catch (error) {
    console.error('Service init failed:', error);
    throw error;
  }
}

// Call in App component
export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeServices().then(() => setReady(true));
  }, []);

  if (!ready) return <SplashScreen />;
  return <MainApp />;
}
```

---

## Pre-Ship Checklist

Before deploying any React Native code:

- [ ] **No hooks at module level** - grep: `^const.*= use`
- [ ] **No expo-localization at module level** - use Intl instead
- [ ] **No react-i18next** - use i18n-js
- [ ] **No AsyncStorage at module level** - use lazy require
- [ ] **No Supabase auto-init** - use lazy getter
- [ ] **Provider order correct** - Gesture → SafeArea → Query → Theme → Auth
- [ ] **Tested in Expo Go** - catches most module issues
- [ ] **Error boundaries added** - catch render crashes
- [ ] **No conditional hooks** - same hooks every render
- [ ] **Metro cache cleared** - `npx expo start -c` before testing

---

## Getting Help

If issues persist:

1. **Check Metro logs** - Often shows the actual crash location
2. **Enable verbose logging** - `DEBUG=* npx expo start`
3. **React Native Debugger** - Step through initialization
4. **Ask in Expo Discord** - #help-expo-go channel
5. **Check GitHub Issues** - For library-specific problems

---

**Last Updated**: January 2026
**Applies To**: Expo SDK 54+, React Native 0.83+
