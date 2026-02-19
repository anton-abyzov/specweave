# SpecWeave Mobile Plugin

Comprehensive **React Native** and **Expo** development support for SpecWeave. Streamlines mobile app development with expert guidance on setup, debugging, performance optimization, and testing.

**IMPORTANT**: This plugin provides patterns and architectural guidance. For version-specific APIs, always use Context7 to fetch current React Native and Expo documentation.

## Overview

The SpecWeave Mobile plugin provides specialized skills and agents for modern React Native and Expo development, covering the entire mobile development lifecycle from environment setup to production deployment.

### Key Capabilities

- **New Architecture**: Turbo Modules, Fabric, JSI
- **Modern React**: Activity component, useEffectEvent, concurrent features
- **Expo Workflows**: EAS Build, EAS Update, native tabs, file-based routing
- **Performance**: Hermes engine, FlashList, Intersection Observer, Web Performance APIs
- **Platform-Specific**: iOS blur/glass effects, Android edge-to-edge

## Features

### 7 Specialized Skills

1. **react-native-setup** - Environment setup and configuration
   - Node.js, Xcode, Android Studio setup
   - iOS simulators and Android emulators
   - CocoaPods, watchman, EAS Build setup
   - New Architecture setup and troubleshooting

2. **expo-workflow** - Expo development workflows
   - EAS Build and EAS Update
   - Native tab navigation and Expo Router
   - Platform-specific UI (iOS blur, Android edge-to-edge)
   - expo-video/expo-audio

3. **mobile-debugging** - Debugging strategies
   - React DevTools Desktop App
   - Flipper, Chrome DevTools
   - Network request debugging
   - Error boundaries and crash analysis

4. **performance-optimization** - Modern performance tuning
   - Hermes engine optimization
   - React Activity component for state preservation
   - Intersection Observer API for lazy loading
   - Web Performance APIs (performance.now, User Timing)
   - FlashList, expo-image

5. **native-modules** - New Architecture native integration
   - Turbo Modules with Codegen
   - Fabric components
   - JSI for synchronous calls
   - Expo config plugins
   - Interop layer for legacy Bridge modules

6. **device-testing** - Testing strategies
   - Jest unit and integration testing
   - React Native Testing Library
   - Detox E2E testing
   - Maestro testing
   - Mocking strategies

7. **metro-bundler** - Metro configuration and optimization
   - Custom transformers (SVG, images)
   - Bundle size analysis
   - Cache management
   - Monorepo configuration
   - Hermes bytecode optimization

### React Native Expert (Architecture + Implementation)

The `react-native-expert` skill covers both architecture and hands-on implementation:
- Application architecture design for React Native / Expo
- State management selection (Zustand, TanStack Query, Jotai, Legend State)
- Navigation with Expo Router and React Navigation
- Performance architecture with modern React features
- Platform-specific strategies (iOS design patterns, Android edge-to-edge)
- Environment setup, Metro bundler, native modules
- Device testing, debugging, and performance optimization
- Build and deployment pipelines with EAS

## Installation

The plugin is automatically installed with SpecWeave. To verify installation:

```bash
# List installed plugins
claude plugin list --installed | grep sw-mobile
```

To reinstall or update:

```bash
# Reinstall plugin
vskill add specweave --plugin sw-mobile
```

## Usage

### Skills Auto-Activate

Skills automatically activate based on conversation keywords:

```
You: "How do I set up Xcode for React Native development?"
→ react-native-setup skill activates

You: "How do I optimize FlatList performance?"
→ performance-optimization skill activates

You: "I need to debug network requests in my app"
→ mobile-debugging skill activates
```

### Invoke the React Native Expert Skill

For architectural decisions, system design, setup, and debugging:

```
Use the Skill tool to invoke the react-native-expert skill:

Skill({
  skill: "sw-mobile:react-native-expert",
  args: "Design a scalable React Native architecture for a social media app with feed, messaging, and profile features. Include state management, navigation, and performance considerations."
})
```

## Common Workflows

### 1. Initial Environment Setup

**User asks**: "Help me set up React Native development on my Mac"

**What happens**:
- `react-native-setup` skill activates
- Provides step-by-step installation guide
- Verifies prerequisites
- Troubleshoots common issues

### 2. Performance Optimization

**User asks**: "My app is laggy when scrolling the feed"

**What happens**:
- `performance-optimization` skill activates
- Analyzes FlatList usage
- Recommends optimizations (getItemLayout, removeClippedSubviews, FlashList)
- Provides code examples

### 3. Debugging Network Issues

**User asks**: "API calls are failing on Android but working on iOS"

**What happens**:
- `mobile-debugging` skill activates
- Guides through network debugging
- Checks localhost vs 10.0.2.2 configuration
- Sets up Flipper network inspector

### 4. Architecture Design

**User invokes**: react-native-expert skill

**What happens**:
- Skill analyzes requirements
- Recommends folder structure
- Selects state management solution
- Designs navigation architecture
- Provides implementation templates

## Integration with SpecWeave Workflows

### During Increment Planning

When using `/sw:increment` for mobile features:

1. **Spec Creation** - Mobile architect reviews requirements
2. **Architecture Design** - Agent recommends patterns and structure
3. **Task Generation** - Includes setup, development, testing, and optimization tasks
4. **Test Planning** - Embeds test cases in tasks.md (BDD format)

### During Implementation

When using `/sw:do`:

1. **Environment Setup** - react-native-setup skill guides configuration
2. **Development** - Skills activate based on task context
3. **Debugging** - mobile-debugging skill assists with issues
4. **Testing** - device-testing skill provides testing strategies
5. **Optimization** - performance-optimization skill reviews code

### Documentation

- **Setup Guide**: See `.specweave/docs/public/guides/mobile/react-native-setup-guide.md`
- **Architecture Decisions**: Documented in ADRs (`.specweave/docs/internal/architecture/adr/`)
- **Performance Reports**: Track bundle size and metrics in increment reports

## Skill Activation Keywords

| Skill | Activation Keywords |
|-------|-------------------|
| **react-native-setup** | environment setup, installation, xcode, android studio, simulator, emulator, sdk, cocoapods |
| **expo-workflow** | expo, eas build, eas update, expo go, dev client, app.json, eas.json |
| **mobile-debugging** | debugging, flipper, devtools, breakpoint, crash, error, network debugging |
| **performance-optimization** | performance, slow, lag, bundle size, flatlist, optimization, memory leak |
| **native-modules** | native module, bridge, turbo module, swift, kotlin, ios native, android native |
| **device-testing** | testing, jest, detox, e2e, unit test, mock, snapshot test |
| **metro-bundler** | metro, bundler, cache, transformer, port 8081, unable to resolve module |

## Examples

### Example 1: Setup iOS Simulator

```
You: "I installed Xcode but can't run the iOS simulator"

Claude (with react-native-setup skill):
Let me help you troubleshoot iOS simulator setup.

First, let's verify Xcode command line tools:
```bash
xcode-select --install
sudo xcodebuild -license accept
```

Check available simulators:
```bash
xcrun simctl list devices
```

[Provides detailed troubleshooting steps...]
```

### Example 2: Optimize Performance

```
You: "My feed is rendering slowly with 1000 items"

Claude (with performance-optimization skill):
I see you're rendering a long list. Here are optimizations:

1. Use FlashList instead of FlatList (60% faster):
```javascript
import { FlashList } from "@shopify/flash-list";

<FlashList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  estimatedItemSize={80}
/>
```

2. Implement getItemLayout for fixed heights:
[Provides implementation...]

3. Use React.memo for ItemCard:
[Provides code example...]
```

### Example 3: Architecture Design

```
User invokes: react-native-expert skill

"Design architecture for a social media app with posts, comments, and real-time chat"

Skill response:
# Architecture Recommendation: Social Media App

## Folder Structure (Feature-Based)
```
src/
├── features/
│   ├── feed/
│   ├── chat/
│   └── profile/
├── shared/
└── navigation/
```

## State Management
Recommendation: Redux Toolkit + React Query
- Redux: Global state (auth, user profile)
- React Query: Server state (feed, posts, comments)

## Navigation
React Navigation with:
- Stack Navigator (root)
- Tab Navigator (main)
- Chat Navigator (nested)

[Provides complete architecture with code examples...]
```

## Pro Tips

1. **Fast Device Testing**: Use development builds with EAS for custom native code
2. **Performance**: Enable Hermes V1 (experimental) for faster startup and smaller bundles
3. **Debugging**: Use the new React DevTools Desktop App (RN 0.83)
4. **Testing**: Start with React Native Testing Library, add Detox for critical paths
5. **Optimization**: Use Web Performance APIs (performance.now, User Timing) for profiling
6. **iOS**: Target iOS 26+ for Liquid Glass effects
7. **Android**: Use API 35 with edge-to-edge for modern UI

## Troubleshooting

### Skill Not Activating?

1. Use relevant keywords from the activation list above
2. Be specific about the problem (e.g., "iOS simulator not working" vs "help with mobile")
3. Restart Claude Code if recently installed plugin

### Need More Help?

- Check the [React Native Setup Guide](.specweave/docs/public/guides/mobile/react-native-setup-guide.md)
- Review skill documentation in `skills/*/SKILL.md`
- Invoke the react-native-expert skill for architectural questions

## Contributing

To add new skills or improve existing ones:

1. Fork the SpecWeave repository
2. Add/modify skills in `plugins/specweave-mobile/skills/`
3. Follow the skill template in existing skills
4. Test with Claude Code
5. Submit a pull request

## Version History

- **2.1.0** (January 2026)
  - Removed hardcoded version numbers from descriptions
  - Added Context7 integration for fetching current documentation
  - Skills now focus on patterns/concepts, not specific versions
  - Added instructions to verify current APIs before advising

- **2.0.0** (December 2025)
  - Added modern React patterns (Activity component, useEffectEvent)
  - Added Expo workflows (native tabs, platform effects)
  - Hermes engine optimization support
  - Turbo Modules with Codegen documentation
  - Intersection Observer and Web Performance APIs
  - expo-video/expo-audio patterns

- **1.0.0** (November 2024)
  - Initial release
  - 7 specialized skills
  - Mobile architect agent
  - Comprehensive setup guide

## Support

- **Issues**: [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
- **Discussions**: [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)
- **Documentation**: [SpecWeave Docs](https://spec-weave.com)

## License

MIT License - See [LICENSE](../../LICENSE) for details

---

**Built with ❤️ for the React Native community**
