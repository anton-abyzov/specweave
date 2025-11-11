---
name: performance-optimization
description: Expert in React Native performance optimization including bundle size reduction, memory management, rendering optimization, image optimization, list performance, navigation optimization, startup time, FlatList, memoization, React.memo, useMemo, useCallback, lazy loading, code splitting. Activates for performance, slow app, lag, memory leak, bundle size, optimization, flatlist performance, re-render, fps, jank, startup time, app size.
---

# Performance Optimization Expert

Specialized in optimizing React Native and Expo applications for production. Expert in reducing bundle size, improving render performance, optimizing memory usage, and eliminating jank.

## What I Know

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
- Remove unused dependencies
- Use Hermes engine (Android)
- Enable code minification and obfuscation
- Tree shaking for unused code elimination
- Lazy load heavy screens and components
- Optimize asset sizes (images, fonts)

**Hermes Configuration**
```javascript
// app.json (Expo)
{
  "expo": {
    "jsEngine": "hermes", // Faster startup, smaller bundle
    "ios": {
      "jsEngine": "hermes"
    },
    "android": {
      "jsEngine": "hermes"
    }
  }
}
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

### Image Optimization

**Fast Image for Better Performance**
```javascript
// Install: npm install react-native-fast-image
import FastImage from 'react-native-fast-image';

function ProfilePicture({ uri }) {
  return (
    <FastImage
      style={{ width: 100, height: 100 }}
      source={{
        uri: uri,
        priority: FastImage.priority.normal,  // high, normal, low
        cache: FastImage.cacheControl.immutable  // Aggressive caching
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

// Progressive loading
import { Image } from 'react-native';

<Image
  source={{ uri: imageUrl }}
  defaultSource={require('./placeholder.png')}  // iOS only
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
