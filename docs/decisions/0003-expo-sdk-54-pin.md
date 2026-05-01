# 0003 — Pin Expo SDK to 54

Date: 2026-05-01
Status: Active

## Context

Expo SDK 55 is **incompatible with the current Expo Go app on iOS**. The latest Expo Go build available in the App Store targets SDK 54. Running an SDK 55 project in Expo Go on iOS results in a version mismatch — specifically a `TurboModuleRegistry.getEnforcing('PlatformConstants') could not be found` crash at startup.

## Decision

Pin the mobile workspace to **Expo SDK 54** with the following exact versions (as resolved by `npx expo install --fix`):

```
expo:                        ~54.0.0
react-native:                0.81.5
react / react-dom:           19.1.0
expo-blur:                   ~15.0.8
expo-font:                   ~14.0.11
expo-linear-gradient:        ~15.0.8
expo-status-bar:             ~3.0.9
react-native-reanimated:     ~4.1.1
react-native-safe-area-context: ~5.6.0
react-native-web:            ^0.21.0
@expo/vector-icons:          ^15.0.3
@types/react:                ~19.1.10
```

When adding any new Expo package, always run:

```bash
cd apps/mobile && npx expo install <package>
```

`npx expo install` resolves the version range compatible with the **current** SDK (54). Never use plain `npm install <expo-package>` for Expo-managed modules, as npm will resolve the latest version (SDK 55+) and break Expo Go compatibility.

## Consequences

- All feature branches must use the SDK 54 package versions above.
- Do **not** bump `expo` to `^55.x` or `~55.x`.
- If `npx expo install --fix` suggests upgrading beyond these versions, it means the Expo SDK needs a deliberate version bump — open a dedicated upgrade PR.
- When Expo Go on iOS ships SDK 55 support, revisit this decision and open an upgrade PR targeting all packages simultaneously.
