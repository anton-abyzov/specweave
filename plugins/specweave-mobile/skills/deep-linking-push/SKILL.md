---
description: Deep linking and push notification expert for mobile. iOS Universal Links, Android App Links, APNs, FCM, rich notifications, deferred deep linking, silent push, local notifications. Activates for: deep link, deep linking, Universal Links, App Links, push notification, push notifications, APNs, FCM, Firebase Messaging, notification, deferred deep link.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
context: fork
---

# Deep Linking & Push Notifications Expert

Comprehensive expertise in **deep linking** (Universal Links, App Links, deferred deep linking) and **push notifications** (APNs, FCM, rich notifications, silent push) across iOS, Android, React Native, and Flutter.

## Fetching Current Documentation

**Before providing version-specific guidance, verify current versions.** Library APIs for notifications, deep linking, and routing evolve frequently.

For library documentation, use WebSearch or install Context7 manually: `claude plugin install context7@claude-plugins-official`

---

## Part 1: Deep Linking

### iOS Universal Links

Universal Links allow your website URLs to open directly in your app when installed.

#### apple-app-site-association (AASA)

Host this JSON file at `https://yourdomain.com/.well-known/apple-app-site-association` (no `.json` extension, must be served with `application/json` content type over HTTPS).

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAMID.com.example.myapp"],
        "components": [
          { "/": "/products/*", "comment": "Product detail pages" },
          { "/": "/checkout", "comment": "Checkout flow" },
          { "/": "/invite/*", "comment": "Invitation links" },
          { "/": "/app/*", "comment": "All app routes" },
          { "/": "/login", "exclude": true, "comment": "Keep in browser" }
        ]
      }
    ]
  }
}
```

#### iOS Entitlements and Associated Domains

```xml
<!-- MyApp.entitlements -->
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:example.com</string>
  <string>applinks:www.example.com</string>
</array>
```

#### Handling Universal Links in SwiftUI

```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }

    private func handleDeepLink(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let host = components.host else { return }

        let path = components.path
        let queryItems = components.queryItems ?? []

        switch path {
        case let p where p.starts(with: "/products/"):
            let productId = String(p.dropFirst("/products/".count))
            NavigationManager.shared.navigate(to: .product(id: productId))
        case "/checkout":
            NavigationManager.shared.navigate(to: .checkout)
        case let p where p.starts(with: "/invite/"):
            let code = String(p.dropFirst("/invite/".count))
            NavigationManager.shared.navigate(to: .invite(code: code))
        default:
            NavigationManager.shared.navigate(to: .home)
        }
    }
}
```

### Android App Links

#### Digital Asset Links (assetlinks.json)

Host at `https://yourdomain.com/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.myapp",
      "sha256_cert_fingerprints": [
        "AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90"
      ]
    }
  }
]
```

```bash
# Get SHA-256 fingerprint from keystore
keytool -list -v -keystore my-release-key.keystore -alias my-key-alias

# For debug builds
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
```

#### AndroidManifest.xml Intent Filters

```xml
<activity android:name=".MainActivity"
    android:exported="true">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="example.com"
              android:pathPrefix="/products" />
        <data android:scheme="https"
              android:host="example.com"
              android:pathPrefix="/invite" />
    </intent-filter>

    <!-- Custom scheme for development -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="myapp" />
    </intent-filter>
</activity>
```

#### Handling App Links in Kotlin

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        val uri = intent.data ?: return
        val path = uri.path ?: return

        when {
            path.startsWith("/products/") -> {
                val productId = path.removePrefix("/products/")
                navController.navigate("product/$productId")
            }
            path.startsWith("/invite/") -> {
                val code = path.removePrefix("/invite/")
                navController.navigate("invite/$code")
            }
            else -> navController.navigate("home")
        }
    }
}
```

### Deferred Deep Linking

Deferred deep links route users to specific content even if the app is not yet installed (user goes to App/Play Store first, then opens the app and lands on the correct screen).

**Firebase Dynamic Links sunset**: Google deprecated Dynamic Links in 2025. Alternatives:

| Service | Pricing | Best For |
|---------|---------|----------|
| Branch | Free tier + paid | Enterprise, attribution |
| Adjust | Paid | Attribution-focused |
| AppsFlyer | Paid | Marketing analytics |
| Custom solution | Free | Simple use cases |

#### Custom Deferred Deep Link Implementation

```typescript
// Server-side: store pending deep link
app.post('/api/deferred-link', async (req, res) => {
  const { fingerprint, targetUrl } = req.body;
  await redis.set(`deeplink:${fingerprint}`, targetUrl, 'EX', 86400); // 24h TTL
  res.json({ success: true });
});

// Client-side: check on first app open
async function checkDeferredDeepLink(): Promise<string | null> {
  const fingerprint = await generateDeviceFingerprint();
  const response = await fetch(`/api/deferred-link/${fingerprint}`);
  if (response.ok) {
    const { targetUrl } = await response.json();
    return targetUrl;
  }
  return null;
}
```

### Deep Link Routing in React Native (Expo Router)

```typescript
// app.config.ts
export default {
  scheme: 'myapp',
  ios: {
    associatedDomains: ['applinks:example.com'],
  },
  android: {
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'example.com', pathPrefix: '/app' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
};
```

```typescript
// app/_layout.tsx - Expo Router handles deep links automatically
// URL: https://example.com/app/products/123
// Maps to: app/products/[id].tsx

// For custom handling:
import { useURL } from 'expo-linking';
import { router } from 'expo-router';

function DeepLinkHandler() {
  const url = useURL();

  useEffect(() => {
    if (url) {
      const parsed = Linking.parse(url);
      if (parsed.path?.startsWith('invite/')) {
        const code = parsed.path.replace('invite/', '');
        router.push(`/invite/${code}`);
      }
    }
  }, [url]);

  return null;
}
```

### Deep Link Routing in Flutter

```dart
// Using go_router
final router = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    GoRoute(
      path: '/products/:id',
      builder: (_, state) => ProductScreen(id: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/invite/:code',
      builder: (_, state) => InviteScreen(code: state.pathParameters['code']!),
    ),
  ],
);

// In MaterialApp
MaterialApp.router(routerConfig: router);
```

---

## Part 2: Push Notifications

### APNs Setup (iOS)

#### Generating APNs Key

1. Go to Apple Developer Portal > Keys > Create Key
2. Enable "Apple Push Notifications service (APNs)"
3. Download the `.p8` file (keep it secure, downloadable only once)
4. Note the Key ID and Team ID

#### Requesting Permission (Swift)

```swift
import UserNotifications

func requestNotificationPermission() async -> Bool {
    let center = UNUserNotificationCenter.current()
    do {
        let granted = try await center.requestAuthorization(
            options: [.alert, .sound, .badge, .provisional]
        )
        if granted {
            await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
        }
        return granted
    } catch {
        print("Notification permission error: \(error)")
        return false
    }
}

// AppDelegate
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    // Send token to your server
    ApiClient.shared.registerPushToken(token)
}
```

### FCM Setup (Android)

#### Firebase Configuration

```kotlin
// build.gradle.kts (app level)
dependencies {
    implementation(platform("com.google.firebase:firebase-bom:33.0.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
}
```

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Send token to your server
        CoroutineScope(Dispatchers.IO).launch {
            ApiClient.registerPushToken(token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.notification?.title ?: message.data["title"] ?: return
        val body = message.notification?.body ?: message.data["body"] ?: ""

        showNotification(title, body, message.data)
    }

    private fun showNotification(title: String, body: String, data: Map<String, String>) {
        val channelId = "default"
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("deep_link", data["deep_link"])
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
    }
}
```

### Rich Notifications

#### iOS Rich Notifications (Notification Service Extension)

```swift
// NotificationServiceExtension/NotificationService.swift
class NotificationService: UNNotificationServiceExtension {

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        guard let mutableContent = request.content.mutableCopy() as? UNMutableNotificationContent,
              let imageUrlString = mutableContent.userInfo["image_url"] as? String,
              let imageUrl = URL(string: imageUrlString) else {
            contentHandler(request.content)
            return
        }

        downloadImage(from: imageUrl) { attachment in
            if let attachment = attachment {
                mutableContent.attachments = [attachment]
            }
            contentHandler(mutableContent)
        }
    }

    private func downloadImage(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
        URLSession.shared.downloadTask(with: url) { location, _, _ in
            guard let location = location else { completion(nil); return }
            let tempDir = FileManager.default.temporaryDirectory
            let tempFile = tempDir.appendingPathComponent(UUID().uuidString + ".jpg")
            try? FileManager.default.moveItem(at: location, to: tempFile)
            let attachment = try? UNNotificationAttachment(identifier: "image", url: tempFile)
            completion(attachment)
        }.resume()
    }
}
```

#### Android Rich Notifications

```kotlin
private fun showRichNotification(title: String, body: String, imageUrl: String?) {
    val builder = NotificationCompat.Builder(this, "default")
        .setSmallIcon(R.drawable.ic_notification)
        .setContentTitle(title)
        .setContentText(body)
        .setPriority(NotificationCompat.PRIORITY_HIGH)

    if (imageUrl != null) {
        val bitmap = Glide.with(this).asBitmap().load(imageUrl).submit().get()
        builder.setLargeIcon(bitmap)
            .setStyle(NotificationCompat.BigPictureStyle()
                .bigPicture(bitmap)
                .bigLargeIcon(null as Bitmap?))
    }

    // Action buttons
    builder.addAction(R.drawable.ic_reply, "Reply",
        createReplyPendingIntent())
    builder.addAction(R.drawable.ic_dismiss, "Dismiss",
        createDismissPendingIntent())

    NotificationManagerCompat.from(this).notify(generateId(), builder.build())
}
```

### Silent Push Notifications

Silent push is used for background data sync, content prefetching, and state updates without user-visible notification.

```swift
// iOS - Background notification payload
// Server sends:
{
    "aps": {
        "content-available": 1
    },
    "data": {
        "type": "sync",
        "timestamp": "2026-01-15T10:00:00Z"
    }
}

// AppDelegate handling
func application(_ application: UIApplication,
                 didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                 fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    guard let data = userInfo["data"] as? [String: Any],
          let type = data["type"] as? String else {
        completionHandler(.noData)
        return
    }

    if type == "sync" {
        SyncManager.shared.performBackgroundSync { success in
            completionHandler(success ? .newData : .failed)
        }
    }
}
```

```kotlin
// Android - data-only message (no notification field)
// Server sends:
{
    "data": {
        "type": "sync",
        "timestamp": "2026-01-15T10:00:00Z"
    },
    "to": "device_token"
}

// Handled in onMessageReceived even when app is in background
override fun onMessageReceived(message: RemoteMessage) {
    if (message.data["type"] == "sync") {
        val workRequest = OneTimeWorkRequestBuilder<SyncWorker>().build()
        WorkManager.getInstance(this).enqueue(workRequest)
    }
}
```

### Local Notifications

```typescript
// React Native (expo-notifications)
import * as Notifications from 'expo-notifications';

// Schedule a local notification
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Reminder',
    body: 'Your workout starts in 15 minutes',
    data: { screen: 'workout', id: '123' },
    sound: 'default',
    badge: 1,
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 900, // 15 minutes
  },
});

// Repeating notification
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Daily Check-in',
    body: 'How are you feeling today?',
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: 9,
    minute: 0,
  },
});

// Cancel all scheduled
await Notifications.cancelAllScheduledNotificationsAsync();
```

### Notification Permissions: Best Practices

```typescript
// Pre-permission screen pattern (improves grant rates by 30-50%)
function NotificationPermissionScreen() {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  const checkPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);
    if (status === 'granted') {
      router.replace('/home');
    } else {
      // Show explanation and link to settings
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications in Settings to receive updates.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  return (
    <View>
      <Text>Stay Updated</Text>
      <Text>Get notified about order updates, deals, and more.</Text>
      <Button title="Enable Notifications" onPress={requestPermission} />
      <Button title="Maybe Later" onPress={() => router.replace('/home')} />
    </View>
  );
}
```

### Cross-Platform: expo-notifications

```typescript
// Full setup with response handling
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Listen for notification taps
const subscription = Notifications.addNotificationResponseReceivedListener(
  (response) => {
    const data = response.notification.request.content.data;
    if (data.screen) {
      router.push(data.screen as string);
    }
  }
);

// Listen for foreground notifications
const foregroundSub = Notifications.addNotificationReceivedListener(
  (notification) => {
    const { title, body } = notification.request.content;
    // Optionally show in-app banner instead of system notification
    showInAppBanner(title, body);
  }
);
```

### Flutter: firebase_messaging

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

// Background handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Background message: ${message.messageId}');
}

class PushNotificationService {
  final _messaging = FirebaseMessaging.instance;
  final _localNotifications = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

    // Request permission
    final settings = await _messaging.requestPermission(
      alert: true, badge: true, sound: true, provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      final token = await _messaging.getToken();
      await _registerToken(token!);
    }

    // Foreground messages
    FirebaseMessaging.onMessage.listen((message) {
      _showLocalNotification(message);
    });

    // Notification tap (app was terminated)
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) _handleNavigation(initialMessage);

    // Notification tap (app was in background)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNavigation);
  }

  void _handleNavigation(RemoteMessage message) {
    final deepLink = message.data['deep_link'];
    if (deepLink != null) {
      GoRouter.of(navigatorKey.currentContext!).go(deepLink);
    }
  }
}
```

### Server-Side: Sending Push Notifications

#### APNs HTTP/2 API

```typescript
import jwt from 'jsonwebtoken';
import http2 from 'http2';

function sendApnsPush(deviceToken: string, payload: object) {
  const key = fs.readFileSync('AuthKey_KEYID.p8');
  const token = jwt.sign({}, key, {
    algorithm: 'ES256',
    issuer: 'TEAM_ID',
    header: { alg: 'ES256', kid: 'KEY_ID' },
    expiresIn: '1h',
  });

  const client = http2.connect('https://api.push.apple.com');
  const req = client.request({
    ':method': 'POST',
    ':path': `/3/device/${deviceToken}`,
    authorization: `bearer ${token}`,
    'apns-topic': 'com.example.myapp',
    'apns-push-type': 'alert',
    'apns-priority': '10',
  });

  req.write(JSON.stringify(payload));
  req.end();
}
```

#### FCM v1 API

```typescript
import { GoogleAuth } from 'google-auth-library';

async function sendFcmPush(deviceToken: string, notification: object) {
  const auth = new GoogleAuth({
    keyFile: 'firebase-service-account.json',
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const accessToken = await auth.getAccessToken();

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification,
          data: { deep_link: '/products/123' },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        },
      }),
    }
  );
  return response.json();
}
```

### Testing Push Notifications

```bash
# Test APNs via curl (using token auth)
curl -v --http2 \
  -H "authorization: bearer $JWT_TOKEN" \
  -H "apns-topic: com.example.myapp" \
  -H "apns-push-type: alert" \
  -d '{"aps":{"alert":{"title":"Test","body":"Hello"}}}' \
  https://api.sandbox.push.apple.com/3/device/$DEVICE_TOKEN

# Test FCM via Firebase console
# Firebase Console > Messaging > New Campaign > Send test message

# Expo push notifications testing
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{"to":"ExponentPushToken[xxx]","title":"Test","body":"Hello from API"}'
```

### Analytics and Tracking

```typescript
// Track deep link attribution
function trackDeepLink(url: string, source: string) {
  analytics.track('deep_link_opened', {
    url,
    source, // email, sms, social, qr, organic
    timestamp: new Date().toISOString(),
    isFirstOpen: await isFirstAppOpen(),
  });
}

// Track notification engagement
function trackNotificationTap(notificationId: string, action: string) {
  analytics.track('notification_tapped', {
    notificationId,
    action, // 'open', 'reply', 'dismiss'
    timeToTap: calculateTimeToTap(notificationId),
  });
}
```

## Related Skills

- `appstore` - **Recommended**: App Store Connect automation via `asc` CLI (TestFlight, submissions, metadata)
- `expo` - Expo-specific notification and linking setup
- `react-native-expert` - Navigation architecture for deep link routing
- `mobile-testing` - Testing deep links and notifications
- `capacitor-ionic` - Capacitor deep linking and push setup
