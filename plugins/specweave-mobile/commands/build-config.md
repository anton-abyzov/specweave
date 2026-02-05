---
description: Generate build configurations for iOS and Android mobile apps including Expo, EAS Build, environment variables, and CI/CD pipelines.
---

# Build Configuration

Generate build configurations for iOS and Android.

## Task

You are a React Native build expert. Generate complete build configurations for production releases.

### Steps:

1. **Ask for Requirements**:
   - App identifier/bundle ID
   - Environment (dev, staging, prod)
   - Code signing details
   - Push notification setup

2. **Generate app.json** (Expo):

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.company.myapp",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to...",
        "NSPhotoLibraryUsageDescription": "This app accesses photos to...",
        "NSLocationWhenInUseUsageDescription": "This app uses location to..."
      },
      "config": {
        "googleMapsApiKey": "YOUR_KEY_HERE"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.company.myapp",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION"
      ],
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_KEY_HERE"
        }
      }
    },
    "plugins": [
      "expo-camera",
      "expo-location",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

3. **Generate eas.json** (Expo EAS Build):

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "autoIncrement BuildNumber": true
      },
      "android": {
        "buildType": "app-bundle",
        "autoIncrement VersionCode": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account.json",
        "track": "production"
      }
    }
  }
}
```

4. **Generate Environment Variables**:

```typescript
// config/env.ts
import Constants from 'expo-constants';

const ENV = {
  dev: {
    apiUrl: 'http://localhost:3000',
    environment: 'development',
  },
  staging: {
    apiUrl: 'https://staging-api.example.com',
    environment: 'staging',
  },
  prod: {
    apiUrl: 'https://api.example.com',
    environment: 'production',
  },
};

const getEnvVars = (env = Constants.manifest?.releaseChannel) => {
  if (__DEV__) return ENV.dev;
  if (env === 'staging') return ENV.staging;
  return ENV.prod;
};

export default getEnvVars();
```

5. **Generate Build Scripts**:

```json
// package.json scripts
{
  "scripts": {
    "build:dev:ios": "eas build --profile development --platform ios",
    "build:dev:android": "eas build --profile development --platform android",
    "build:preview:ios": "eas build --profile preview --platform ios",
    "build:preview:android": "eas build --profile preview --platform android",
    "build:prod:ios": "eas build --profile production --platform ios",
    "build:prod:android": "eas build --profile production --platform android",
    "build:prod:all": "eas build --profile production --platform all",
    "submit:ios": "eas submit --platform ios",
    "submit:android": "eas submit --platform android"
  }
}
```

6. **Generate CI/CD Configuration** (GitHub Actions):

```yaml
name: EAS Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build iOS
        run: eas build --profile production --platform ios --non-interactive
        if: github.ref == 'refs/heads/main'

      - name: Build Android
        run: eas build --profile production --platform android --non-interactive
        if: github.ref == 'refs/heads/main'

      - name: Submit to stores
        run: |
          eas submit --platform ios --non-interactive
          eas submit --platform android --non-interactive
        if: github.ref == 'refs/heads/main'
```

### Best Practices Included:

- Multi-environment configuration
- Proper permissions setup
- Code signing automation
- CI/CD integration
- Auto-increment version numbers
- Proper asset management
- Push notification setup

### Example Usage:

```
User: "Set up production build for iOS and Android"
Result: Complete build configuration with EAS, CI/CD, environment management
```
