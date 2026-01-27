---
name: performance-optimization
description: React Native performance with Hermes V1, FlashList, expo-image v2, concurrent rendering. Use for slow app, memory leaks, or FPS issues.
---

# Performance Optimization Expert (RN 0.83+)

Specialized in optimizing React Native 0.83+ and Expo SDK 54+ applications for production. Expert in Hermes V1, React 19.2 concurrent features, Intersection Observer API, Web Performance APIs, and modern optimization strategies.

## What I Know

### React Native 0.83 Performance Features

**Hermes V1 (Experimental)**
- Next-generation JavaScript engine
- Improved garbage collection
- Better startup performance
- Enhanced debugging with DevTools
- Enable in metro.config.js:

```javascript
// metro.config.js
module.exports = {
  transformer: {
    hermesParser: true, // Enable Hermes V1 parser
  },
};
```

**React 19.2 Concurrent Features**
- Activity component for state preservation
- useEffectEvent for stable event handlers
- Improved concurrent rendering
- Better memory management during transitions

```typescript
// Preserve state while hidden (React 19.2)
import { Activity } from 'react';

function TabContent({ isActive, children }) {
  return (
    <Activity mode={isActive ? 'visible' : 'hidden'}>
      {children}
    </Activity>
  );
}
```

**Intersection Observer API (Canary)**
- Web-like lazy loading for React Native
- Visibility detection without scroll events
- More efficient than manual scroll tracking

```typescript
import { IntersectionObserver } from 'react-native';

// Lazy load when element enters viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      loadContent();
    }
  });
});
```

**Web Performance APIs (Stable)**
- performance.now() for precise timing
- User Timing API for custom marks
- PerformanceObserver for monitoring

```typescript
// Performance measurement
const start = performance.now();
await heavyOperation();
const duration = performance.now() - start;

// User Timing API
performance.mark('loadStart');
await loadData();
performance.mark('loadEnd');
performance.measure('dataLoad', 'loadStart', 'loadEnd');

// PerformanceObserver
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});
observer.observe({ entryTypes: ['measure'] });
```

### Bundle Size Optimization

**Analyzing Bundle Size**
```bash
# Generate bundle stats (Expo)
npx expo export --dump-sourcemap

# Analyze with source-map-explorer
npx source-map-explorer bundles/**/*.map

# Check production bundle size
npx expo export --platform ios
du -sh dist/

# Metro bundle visualizer
npx react-native-bundle-visualizer
```

**Reducing Bundle Size**
- Remove unused dependencies with depcheck
- Use Hermes V1 for smaller bytecode
- Enable code minification and obfuscation
- Tree shaking for unused code elimination
- Lazy load heavy screens and components
- Optimize asset sizes (images, fonts)
- Use expo-image instead of react-native-fast-image

**Hermes Configuration (RN 0.83)**
```javascript
// app.json (Expo SDK 54+)
{
  "expo": {
    "jsEngine": "hermes", // Default in SDK 54
    "ios": {
      "jsEngine": "hermes"
    },
    "android": {
      "jsEngine": "hermes"
    }
  }
}

// For Hermes V1 experimental
// metro.config.js
module.exports = {
  transformer: {
    hermesParser: true,
  },
};
```

### Rendering Performance

**React.memo for Component Optimization**
```javascript
import React, { memo } from 'react';

// Without memo: Re-renders on every parent render
const UserCard = ({ user }) => (
  <View>
    <Text>{user.name}</Text>
  </View>
);

// With memo: Only re-renders when user prop changes
const UserCard = memo(({ user }) => (
  <View>
    <Text>{user.name}</Text>
  </View>
));

// Custom comparison function
const UserCard = memo(
  ({ user }) => <View><Text>{user.name}</Text></View>,
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id
);
```

**useMemo and useCallback**
```javascript
import { useMemo, useCallback } from 'react';

function UserList({ users, onUserPress }) {
  // Expensive calculation - only recalculates when users changes
  const sortedUsers = useMemo(() => {
    console.log('Sorting users...');
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // Stable callback reference - prevents child re-renders
  const handlePress = useCallback((userId) => {
    console.log('User pressed:', userId);
    onUserPress(userId);
  }, [onUserPress]);

  return (
    <FlatList
      data={sortedUsers}
      renderItem={({ item }) => (
        <UserItem user={item} onPress={handlePress} />
      )}
      keyExtractor={item => item.id}
    />
  );
}
```

**Avoiding Inline Functions and Objects**
```javascript
// ❌ BAD: Creates new function on every render
<TouchableOpacity onPress={() => handlePress(item.id)}>
  <Text style={{ color: 'blue' }}>Press</Text>
</TouchableOpacity>

// ✅ GOOD: Stable references
const styles = StyleSheet.create({
  buttonText: { color: 'blue' }
});

const handleItemPress = useCallback(() => {
  handlePress(item.id);
}, [item.id]);

<TouchableOpacity onPress={handleItemPress}>
  <Text style={styles.buttonText}>Press</Text>
</TouchableOpacity>
```

### List Performance (FlatList/SectionList)

**Optimized FlatList Configuration**
```javascript
import { FlatList } from 'react-native';

function OptimizedList({ data }) {
  const renderItem = useCallback(({ item }) => (
    <UserCard user={item} />
  ), []);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}

      // Performance optimizations
      initialNumToRender={10}          // Render 10 items initially
      maxToRenderPerBatch={10}         // Render 10 items per batch
      windowSize={5}                   // Keep 5 screens worth of items
      removeClippedSubviews={true}     // Unmount off-screen items
      updateCellsBatchingPeriod={50}   // Batch updates every 50ms

      // Memoization
      getItemLayout={getItemLayout}    // For fixed-height items

      // Optional: Performance monitor
      onEndReachedThreshold={0.5}      // Load more at 50% scroll
      onEndReached={loadMoreData}
    />
  );
}

// For fixed-height items (huge performance boost)
const ITEM_HEIGHT = 80;
const getItemLayout = (data, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});
```

**FlashList (Better than FlatList)**
```javascript
// Install: npm install @shopify/flash-list
import { FlashList } from "@shopify/flash-list";

function SuperFastList({ data }) {
  return (
    <FlashList
      data={data}
      renderItem={({ item }) => <UserCard user={item} />}
      estimatedItemSize={80}  // Required: approximate item height
    />
  );
}
```

**Intersection Observer for Lazy Loading (RN 0.83 Canary)**
```typescript
import { useRef, useEffect, useState } from 'react';
import { View } from 'react-native';

function LazyLoadItem({ onVisible, children }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <View ref={ref}>
      {isVisible ? children : <Placeholder />}
    </View>
  );
}
```

### Image Optimization

**expo-image v2 (Recommended for Expo SDK 54+)**
```typescript
// expo-image is the recommended solution for Expo projects
import { Image, useImage } from 'expo-image';

// Basic usage with blurhash placeholder
function OptimizedImage({ uri, blurhash }) {
  return (
    <Image
      source={{ uri }}
      placeholder={{ blurhash }}
      contentFit="cover"
      transition={200}
      style={{ width: 100, height: 100 }}
      cachePolicy="memory-disk" // Aggressive caching
    />
  );
}

// Imperative loading with useImage hook (v2)
function PreloadedImage({ uri }) {
  const image = useImage(uri, {
    onError: (error) => console.error('Image load failed:', error),
  });

  if (!image) {
    return <ActivityIndicator />;
  }

  return (
    <Image
      source={image}
      style={{ width: image.width / 2, height: image.height / 2 }}
      contentFit="cover"
    />
  );
}
```

**Fast Image for Bare RN Projects**
```javascript
// For bare React Native projects without Expo
// Install: npm install react-native-fast-image
import FastImage from 'react-native-fast-image';

function ProfilePicture({ uri }) {
  return (
    <FastImage
      style={{ width: 100, height: 100 }}
      source={{
        uri: uri,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable
      }}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
}
```

**Image Optimization Best Practices**
```javascript
// Use appropriate sizes (not 4K images for thumbnails)
<Image
  source={{ uri: 'https://example.com/image.jpg?w=200&h=200' }}
  style={{ width: 100, height: 100 }}
/>

// Use local images when possible (bundled)
<Image source={require('./assets/logo.png')} />

// Progressive loading with blurhash
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
  contentFit="cover"
  transition={300}
  style={{ width: 200, height: 200 }}
/>
```

### Memory Management

**Preventing Memory Leaks**
```javascript
import { useEffect } from 'react';

function Component() {
  useEffect(() => {
    // Set up subscription
    const subscription = api.subscribe(data => {
      console.log(data);
    });

    // Clean up on unmount (CRITICAL!)
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Timers
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('Tick');
    }, 1000);

    return () => clearInterval(timer);  // Clean up timer
  }, []);
}
```

**Image Memory Management**
```javascript
// Clear image cache when memory warning
import { Platform, Image } from 'react-native';
import FastImage from 'react-native-fast-image';

if (Platform.OS === 'ios') {
  // iOS: Clear cache on memory warning
  DeviceEventEmitter.addListener('RCTMemoryWarning', () => {
    FastImage.clearMemoryCache();
  });
}

// Manual cache clearing
FastImage.clearMemoryCache();
FastImage.clearDiskCache();
```

### Navigation Performance

**Lazy Loading Screens**
```javascript
import { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

// Lazy load heavy screens
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));

function App() {
  return (
    <Suspense fallback={<ActivityIndicator />}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </Suspense>
  );
}
```

**React Navigation Optimization**
```javascript
// Freeze inactive screens (React Navigation v6+)
import { enableScreens } from 'react-native-screens';
enableScreens();

// Detach inactive screens
<Stack.Navigator
  screenOptions={{
    detachPreviousScreen: true,  // Unmount inactive screens
  }}
>
  <Stack.Screen name="Home" component={HomeScreen} />
</Stack.Navigator>
```

### Startup Time Optimization

**Reducing Initial Load Time**
```javascript
// app.json - Optimize splash screen
{
  "expo": {
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    }
  }
}

// Use Hermes for faster startup
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

**Defer Non-Critical Initialization**
```javascript
import { InteractionManager } from 'react-native';

function App() {
  useEffect(() => {
    // Critical initialization
    initializeAuth();

    // Defer non-critical tasks until after animations
    InteractionManager.runAfterInteractions(() => {
      initializeAnalytics();
      initializeCrashReporting();
      preloadImages();
    });
  }, []);

  return <AppContent />;
}
```

### Animation Performance

**Use Native Driver**
```javascript
import { Animated } from 'react-native';

function FadeInView({ children }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,  // Runs on native thread (60fps)
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity }}>
      {children}
    </Animated.View>
  );
}
```

**Reanimated for Complex Animations**
```javascript
// Install: npm install react-native-reanimated
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function DraggableBox() {
  const offset = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handlePress = () => {
    offset.value = withSpring(offset.value + 50);
  };

  return (
    <Animated.View style={[styles.box, animatedStyle]}>
      <Text>Drag me</Text>
    </Animated.View>
  );
}
```

## When to Use This Skill

Ask me when you need help with:
- Reducing app bundle size
- Optimizing FlatList/SectionList performance
- Fixing memory leaks
- Improving app startup time
- Eliminating jank and frame drops
- Optimizing image loading and caching
- Reducing component re-renders
- Implementing lazy loading
- Optimizing navigation performance
- Analyzing performance bottlenecks
- Using React.memo, useMemo, useCallback effectively
- Implementing 60fps animations
- **Configuring Hermes V1 for better performance**
- **Using React 19.2 Activity component for state preservation**
- **Implementing Intersection Observer for lazy loading**
- **Using Web Performance APIs for profiling**
- **Migrating to expo-image v2**

## Performance Monitoring

### React Native Performance Monitor
```javascript
// In app, shake device → Show Perf Monitor
// Shows:
// - JS frame rate
// - UI frame rate
// - RAM usage
```

### Production Performance Monitoring
```javascript
// Install: npm install @react-native-firebase/perf
import perf from '@react-native-firebase/perf';

// Custom trace
const trace = await perf().startTrace('user_profile_load');
await loadUserProfile();
await trace.stop();

// HTTP monitoring (automatic with Firebase)
import '@react-native-firebase/perf/lib/modular/index';
```

## Pro Tips & Tricks

### 1. Profile with React DevTools Profiler

```javascript
import { Profiler } from 'react';

function onRender(id, phase, actualDuration) {
  if (actualDuration > 16) {  // Slower than 60fps
    console.warn(`Slow render in ${id}: ${actualDuration}ms`);
  }
}

<Profiler id="UserList" onRender={onRender}>
  <UserList users={users} />
</Profiler>
```

### 2. Debounce Expensive Operations

```javascript
import { debounce } from 'lodash';
import { useCallback } from 'react';

function SearchScreen() {
  const debouncedSearch = useCallback(
    debounce((query) => {
      performSearch(query);
    }, 300),
    []
  );

  return (
    <TextInput
      onChangeText={debouncedSearch}
      placeholder="Search..."
    />
  );
}
```

### 3. Virtualize Long Lists

Use FlashList or RecyclerListView instead of ScrollView with many items:

```javascript
// ❌ BAD: Renders all 1000 items
<ScrollView>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</ScrollView>

// ✅ GOOD: Only renders visible items
<FlashList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  estimatedItemSize={100}
/>
```

### 4. Optimize StyleSheets

```javascript
// ❌ BAD: Creates new style object on every render
<View style={{ backgroundColor: 'red', padding: 10 }} />

// ✅ GOOD: Reuses style object
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'red',
    padding: 10
  }
});

<View style={styles.container} />
```

## Integration with SpecWeave

**Performance Requirements**
- Document performance targets in `spec.md` (e.g., <2s startup)
- Include performance testing in `tasks.md` test plans
- Measure before/after optimization in increment reports

**Performance Metrics**
- Bundle size: Track in increment completion reports
- Startup time: Measure and document improvements
- FPS: Target 60fps for critical UI interactions
- Memory usage: Set thresholds and monitor

**Living Documentation**
- Document performance optimization strategies
- Track bundle size trends across increments
- Maintain performance runbooks for common issues
