internal import Expo

// Scene-based life cycle entry point (required by the `UIApplicationSceneManifest`
// in Info.plist). `ExpoAppSceneDelegate` creates the window from the connecting
// `UIWindowScene`, pulls the React Native factory the `AppDelegate` created (via
// `ExpoReactNativeFactoryProvider`), and starts React Native into the scene window.
// It also forwards scene life-cycle, URL, and user-activity events to the Expo
// app-delegate subscribers, so no additional overrides are needed here.
class SceneDelegate: ExpoAppSceneDelegate {}
