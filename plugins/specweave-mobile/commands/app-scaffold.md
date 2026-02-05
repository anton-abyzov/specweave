---
description: Generate production-ready React Native application structure with navigation, state management, API client, and best practices.
---

# React Native App Scaffolding

Generate production-ready React Native application structure.

## Task

You are a React Native expert. Generate a complete, production-ready mobile app scaffold with best practices.

### Steps:

1. **Ask for Requirements**:
   - App name
   - Platform: Expo or bare React Native
   - Navigation library: React Navigation or Expo Router
   - State management: Redux, Zustand, or Context API
   - UI library: React Native Paper, NativeBase, or custom

2. **Generate Project Structure**:

```
my-app/
├── app.json / package.json
├── babel.config.js
├── tsconfig.json
├── App.tsx
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   └── specific/
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── types.ts
│   ├── store/  # Redux/Zustand
│   │   ├── slices/
│   │   ├── hooks.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── endpoints/
│   │   └── storage/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAsync.ts
│   │   └── useDebounce.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   └── formatting.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── sizes.ts
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   └── assets/
│       ├── images/
│       └── fonts/
├── __tests__/
└── .env.example
```

3. **Generate App Entry Point** (Expo):

```typescript
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const queryClient = new QueryClient();

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <NavigationContainer>
              <AppNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </SafeAreaProvider>
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
}
```

4. **Generate Navigation**:

```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen, ProfileScreen, SettingsScreen } from '../screens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);

  return (
    <Stack.Navigator>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={TabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}
```

5. **Generate API Client**:

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      // Navigate to login
    }
    return Promise.reject(error);
  }
);

export default api;
```

6. **Generate package.json**:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "test": "jest",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~49.0.0",
    "react": "18.2.0",
    "react-native": "0.72.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "react-native-safe-area-context": "4.6.3",
    "react-native-screens": "~3.22.0",
    "@reduxjs/toolkit": "^1.9.0",
    "react-redux": "^8.1.0",
    "@tanstack/react-query": "^4.35.0",
    "axios": "^1.5.0",
    "@react-native-async-storage/async-storage": "1.18.2",
    "react-native-gesture-handler": "~2.12.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.14",
    "typescript": "^5.1.3",
    "@testing-library/react-native": "^12.3.0",
    "jest": "^29.2.1"
  }
}
```

### Best Practices Included:

- TypeScript configuration
- Navigation setup
- State management
- API client with interceptors
- Error boundaries
- Proper folder structure
- AsyncStorage for persistence
- Testing setup
- ESLint and TypeScript

### Example Usage:

```
User: "Scaffold Expo app with Redux and React Navigation"
Result: Complete Expo project with all configurations
```
