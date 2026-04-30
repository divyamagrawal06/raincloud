# 0003 — Pin Expo SDK to 54

Date: 2026-05-01
Status: Active

## Context

Expo SDK 55 was released but is **incompatible with the current Expo Go app on iOS**. The latest Expo Go build available in the App Store targets SDK 54. Running an SDK 55 project in Expo Go on iOS results in a version mismatch error and the app fails to load entirely.

Until Expo Go for iOS ships with SDK 55 support (or the project migrates to a custom dev client / standalone build), SDK 55 cannot be used for development or testing.

## Decision

Pin the mobile workspace to **Expo SDK 54**:

```
expo:              ~54.0.0
react-native:      0.76.9
react:             18.3.1
expo-status-bar:   ~2.0.0
react-native-web:  ~0.19.13
@types/react:      ~18.3.12
```

When adding any new Expo package, always run:

```bash
cd apps/mobile && npx expo install <package>
```

`npx expo install` resolves the version range compatible with the **current** SDK (54), not the latest. Never use plain `npm install <expo-package>` for Expo-managed modules, as npm will resolve the latest version (SDK 55+) and break Expo Go compatibility.

## Consequences

- All feature branches must use SDK 54 packages.
- Do **not** bump `expo` to `^55.x` or `~55.x`. If you see a version mismatch warning from Expo CLI, resolve it downward, not upward.
- When Expo Go on iOS is updated to ship SDK 55 support, revisit this decision and open a dedicated upgrade PR.
- The `feature/home-screen` branch (PR #6) was initially scaffolded against SDK 55 and must be rebased/updated to use SDK 54 before merge.
