internal import Expo
import React
import ReactAppDependencyProvider
import UIKit

@main
class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?

  // The RN app registers under this name (see index.js / app.json). The default
  // provided by `ExpoReactNativeFactoryProvider` is "main", so it must be overridden.
  var reactNativeFactoryModuleName: String { "CardboardApp" }

  // Under the scene-based life cycle the app delegate only *creates* and owns the
  // React Native factory. `SceneDelegate` (an `ExpoAppSceneDelegate`) creates the
  // window from the connecting `UIWindowScene` and starts React Native into it.
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeFactory = ExpoReactNativeFactory(delegate: delegate)

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
