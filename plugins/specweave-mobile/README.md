# SpecWeave Mobile Plugin

Comprehensive React Native and Expo development support for SpecWeave. Streamlines mobile app development with expert guidance on setup, debugging, performance optimization, and testing.

## Overview

The SpecWeave Mobile plugin provides specialized skills and agents for React Native and Expo development, covering the entire mobile development lifecycle from environment setup to production deployment.

## Features

### 7 Specialized Skills

1. **react-native-setup** - Environment setup and configuration
   - Node.js, Xcode, Android Studio installation
   - iOS simulators and Android emulators setup
   - CocoaPods, watchman, SDK configuration
   - Troubleshooting common setup issues

2. **expo-workflow** - Expo development workflows
   - EAS Build and EAS Update
   - Expo Go vs Development Builds
   - OTA updates and deployment
   - app.json and eas.json configuration

3. **mobile-debugging** - Debugging strategies
   - React DevTools, Flipper, Chrome DevTools
   - Network request debugging
   - Error boundaries and crash analysis
   - Platform-specific debugging

4. **performance-optimization** - Performance tuning
   - Bundle size reduction
   - FlatList optimization
   - Image optimization
   - Memory leak prevention
   - Animation performance

5. **native-modules** - Native module integration
   - Third-party native module installation
   - Custom native module development
   - iOS (Swift/Objective-C) and Android (Kotlin/Java)
   - Turbo Modules and JSI

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
   - Performance optimization

### Mobile Architect Agent

The `mobile-architect` agent specializes in:
- Application architecture design
- State management selection (Redux, Zustand, MobX, React Query)
- Navigation patterns and deep linking
- Performance architecture
- Platform-specific strategies
- Testing architecture
- Build and deployment pipelines

## Installation

The plugin is automatically installed with SpecWeave. To verify installation:

```bash
# List installed plugins
claude plugin list --installed | grep specweave-mobile
```

To reinstall or update:

```bash
# Reinstall from marketplace
claude plugin install specweave-mobile
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

### Invoke the Mobile Architect Agent

For architectural decisions and system design:

```
Use the Task tool to invoke the mobile-architect agent:

Task(
  subagent_type: "mobile-architect",
  description: "Design architecture for social media app",
  prompt: "Design a scalable React Native architecture for a social media app
  with feed, messaging, and profile features. Include state management,
  navigation, and performance considerations."
)
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

**User invokes**: mobile-architect agent

**What happens**:
- Agent analyzes requirements
- Recommends folder structure
- Selects state management solution
- Designs navigation architecture
- Provides implementation templates

## Integration with SpecWeave Workflows

### During Increment Planning

When using `/specweave:increment` for mobile features:

1. **Spec Creation** - Mobile architect reviews requirements
2. **Architecture Design** - Agent recommends patterns and structure
3. **Task Generation** - Includes setup, development, testing, and optimization tasks
4. **Test Planning** - Embeds test cases in tasks.md (BDD format)

### During Implementation

When using `/specweave:do`:

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
User invokes: mobile-architect agent

"Design architecture for a social media app with posts, comments, and real-time chat"

Agent response:
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

1. **Fast Device Testing**: Use real devices with Expo Go for quickest iteration
2. **Performance**: Enable Hermes for faster startup and smaller bundles
3. **Debugging**: Use Flipper for network and layout debugging
4. **Testing**: Start with React Native Testing Library, add Detox for critical paths
5. **Optimization**: Profile before optimizing - use React DevTools Profiler

## Troubleshooting

### Skill Not Activating?

1. Use relevant keywords from the activation list above
2. Be specific about the problem (e.g., "iOS simulator not working" vs "help with mobile")
3. Restart Claude Code if recently installed plugin

### Need More Help?

- Check the [React Native Setup Guide](.specweave/docs/public/guides/mobile/react-native-setup-guide.md)
- Review skill documentation in `skills/*/SKILL.md`
- Invoke the mobile-architect agent for architectural questions

## Contributing

To add new skills or improve existing ones:

1. Fork the SpecWeave repository
2. Add/modify skills in `plugins/specweave-mobile/skills/`
3. Follow the skill template in existing skills
4. Test with Claude Code
5. Submit a pull request

## Version History

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
