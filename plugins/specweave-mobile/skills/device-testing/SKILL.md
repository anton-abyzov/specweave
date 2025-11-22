---
name: device-testing
description: Expert in React Native testing strategies including unit tests with Jest, integration tests, E2E tests with Detox, component testing with React Native Testing Library, snapshot testing, mocking native modules, testing on simulators and real devices. Activates for testing, jest, detox, e2e, unit test, integration test, component test, test runner, mock, snapshot test, testing library, react native testing library, test automation.
---

# Device Testing Expert

Comprehensive expertise in React Native testing strategies, from unit tests to end-to-end testing on real devices and simulators. Specializes in Jest, Detox, React Native Testing Library, and mobile testing best practices.

## What I Know

### Testing Pyramid for Mobile

**Three Layers**
1. **Unit Tests** (70%): Fast, isolated, test logic
2. **Integration Tests** (20%): Test component integration
3. **E2E Tests** (10%): Test full user flows on devices

**Tools**
- **Jest**: Unit and integration testing
- **React Native Testing Library**: Component testing
- **Detox**: E2E testing on simulators/emulators
- **Maestro**: Alternative E2E testing (newer)

### Unit Testing with Jest

**Basic Component Test**
```javascript
// UserProfile.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import UserProfile from './UserProfile';

describe('UserProfile', () => {
  it('renders user name correctly', () => {
    const user = { name: 'John Doe', email: 'john@example.com' };
    const { getByText } = render(<UserProfile user={user} />);

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('john@example.com')).toBeTruthy();
  });

  it('calls onPress when button is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <UserProfile user={{ name: 'John' }} onPress={onPress} />
    );

    fireEvent.press(getByText('Edit Profile'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

**Testing Hooks**
```javascript
// useCounter.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import useCounter from './useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements counter', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });
});
```

**Async Testing**
```javascript
// api.test.js
import { fetchUser } from './api';

describe('fetchUser', () => {
  it('fetches user data successfully', async () => {
    const user = await fetchUser('123');

    expect(user).toEqual({
      id: '123',
      name: 'John Doe',
      email: 'john@example.com'
    });
  });

  it('handles errors gracefully', async () => {
    await expect(fetchUser('invalid')).rejects.toThrow('User not found');
  });
});
```

**Snapshot Testing**
```javascript
// Button.test.js
import React from 'react';
import { render } from '@testing-library/react-native';
import Button from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { toJSON } = render(<Button title="Press Me" />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with custom color', () => {
    const { toJSON } = render(<Button title="Press Me" color="red" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
```

### Mocking

**Mocking Native Modules**
```javascript
// __mocks__/react-native-camera.js
export const RNCamera = {
  Constants: {
    Type: {
      back: 'back',
      front: 'front'
    }
  }
};

// In test file
jest.mock('react-native-camera', () => require('./__mocks__/react-native-camera'));

// Or inline mock
jest.mock('react-native-camera', () => ({
  RNCamera: {
    Constants: {
      Type: { back: 'back', front: 'front' }
    }
  }
}));
```

**Mocking AsyncStorage**
```javascript
// Setup file (jest.setup.js)
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// In test
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Storage', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  it('stores and retrieves data', async () => {
    await AsyncStorage.setItem('key', 'value');
    const value = await AsyncStorage.getItem('key');
    expect(value).toBe('value');
  });
});
```

**Mocking Navigation**
```javascript
// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn()
  })
}));

// In test
import { useNavigation } from '@react-navigation/native';

describe('ProfileScreen', () => {
  it('navigates to settings on button press', () => {
    const navigate = jest.fn();
    useNavigation.mockReturnValue({ navigate });

    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Settings'));

    expect(navigate).toHaveBeenCalledWith('Settings');
  });
});
```

**Mocking API Calls**
```javascript
// Using jest.mock
jest.mock('./api', () => ({
  fetchUser: jest.fn(() => Promise.resolve({
    id: '123',
    name: 'Mock User'
  }))
}));

// Using MSW (Mock Service Worker)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/user/:id', (req, res, ctx) => {
    return res(ctx.json({
      id: req.params.id,
      name: 'Mock User'
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Component Testing with React Native Testing Library

**Queries**
```javascript
import { render, screen } from '@testing-library/react-native';

// By text
screen.getByText('Submit');
screen.findByText('Loading...');  // Async
screen.queryByText('Error');  // Returns null if not found

// By testID
<View testID="profile-container" />
screen.getByTestId('profile-container');

// By placeholder
<TextInput placeholder="Enter email" />
screen.getByPlaceholderText('Enter email');

// By display value
screen.getByDisplayValue('john@example.com');

// Multiple queries
screen.getAllByText('Item');  // Returns array
```

**User Interactions**
```javascript
import { render, fireEvent, waitFor } from '@testing-library/react-native';

describe('LoginForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <LoginForm onSubmit={onSubmit} />
    );

    // Type into inputs
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    // Press button
    fireEvent.press(getByText('Login'));

    // Wait for async operation
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
```

### E2E Testing with Detox

**Installation**
```bash
# Install Detox
npm install --save-dev detox

# iOS: Install dependencies
brew tap wix/brew
brew install applesimutils

# Initialize Detox
detox init

# Build app for testing (iOS)
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug
```

**Configuration (.detoxrc.js)**
```javascript
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/config.json',
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/MyApp.app',
      build: 'xcodebuild -workspace ios/MyApp.xcworkspace -scheme MyApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15 Pro' }
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_34' }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

**Writing Detox Tests**
```javascript
// e2e/login.test.js
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login successfully with valid credentials', async () => {
    // Type email
    await element(by.id('email-input')).typeText('test@example.com');

    // Type password
    await element(by.id('password-input')).typeText('password123');

    // Tap login button
    await element(by.id('login-button')).tap();

    // Verify navigation to home screen
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should show error with invalid credentials', async () => {
    await element(by.id('email-input')).typeText('invalid@example.com');
    await element(by.id('password-input')).typeText('wrong');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('Invalid credentials'))).toBeVisible();
  });

  it('should scroll to bottom of list', async () => {
    await element(by.id('user-list')).scrollTo('bottom');
    await expect(element(by.id('load-more-button'))).toBeVisible();
  });
});
```

**Advanced Detox Actions**
```javascript
// Swipe
await element(by.id('carousel')).swipe('left', 'fast', 0.75);

// Scroll
await element(by.id('scroll-view')).scroll(200, 'down');

// Long press
await element(by.id('item-1')).longPress();

// Multi-tap
await element(by.id('like-button')).multiTap(2);

// Wait for element
await waitFor(element(by.id('success-message')))
  .toBeVisible()
  .withTimeout(5000);

// Take screenshot
await device.takeScreenshot('login-success');
```

### Maestro (Alternative E2E Tool)

**Installation**
```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

**Maestro Flow (YAML-based)**
```yaml
# flows/login.yaml
appId: com.myapp

---
# Launch app
- launchApp

# Wait for login screen
- assertVisible: "Login"

# Enter credentials
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"

# Submit
- tapOn: "Login"

# Verify success
- assertVisible: "Welcome"
```

**Run Maestro Flow**
```bash
# iOS Simulator
maestro test flows/login.yaml

# Android Emulator
maestro test --platform android flows/login.yaml

# Real device (USB connected)
maestro test --device <device-id> flows/login.yaml
```

## When to Use This Skill

Ask me when you need help with:
- Setting up Jest for React Native
- Writing unit tests for components and hooks
- Mocking native modules and dependencies
- Writing integration tests
- Setting up Detox or Maestro for E2E testing
- Testing asynchronous operations
- Snapshot testing strategies
- Testing navigation flows
- Debugging test failures
- Running tests in CI/CD pipelines
- Testing on real devices
- Performance testing strategies

## Test Configuration

**Jest Configuration (jest.config.js)**
```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  }
};
```

**Jest Setup (jest.setup.js)**
```javascript
import 'react-native-gesture-handler/jestSetup';

// Mock native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Global test utilities
global.fetch = jest.fn();

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};
```

## Pro Tips & Tricks

### 1. Test IDs for E2E Testing

Add testID to components for reliable selectors:

```javascript
// In component
<TouchableOpacity testID="submit-button" onPress={handleSubmit}>
  <Text>Submit</Text>
</TouchableOpacity>

// In Detox test
await element(by.id('submit-button')).tap();

// Avoid using text or accessibility labels (can change with i18n)
```

### 2. Test Factories for Mock Data

```javascript
// testUtils/factories.js
export const createMockUser = (overrides = {}) => ({
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  ...overrides
});

// In test
const user = createMockUser({ name: 'Jane Doe' });
```

### 3. Custom Render with Providers

```javascript
// testUtils/render.js
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store } from '../store';

export function renderWithProviders(ui, options = {}) {
  return render(
    <Provider store={store}>
      <NavigationContainer>
        {ui}
      </NavigationContainer>
    </Provider>,
    options
  );
}

// In test
import { renderWithProviders } from './testUtils/render';
renderWithProviders(<MyScreen />);
```

### 4. Parallel Test Execution

```json
// package.json
{
  "scripts": {
    "test": "jest --maxWorkers=4",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Integration with SpecWeave

**Test Planning**
- Document test strategy in `spec.md`
- Include test coverage targets in `tasks.md`
- Embed test cases in tasks (BDD format)

**Coverage Tracking**
- Set coverage thresholds (80%+ for critical paths)
- Track coverage trends across increments
- Document testing gaps in increment reports

**CI/CD Integration**
- Run tests on every commit
- Block merges if tests fail
- Generate coverage reports
- Run E2E tests on staging builds
