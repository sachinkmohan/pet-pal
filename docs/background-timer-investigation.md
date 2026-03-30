# Background Timer Investigation

## Goal
Show a live countdown ("14:32 remaining") in the Android notification while a focus session runs.

## Approach Tried
`react-native-background-actions` — runs a JS foreground service that updates the notification every second.

## Problems Hit

**1. App crash — MissingForegroundServiceTypeException**
Android 14+ (targetSDK 34+) requires every foreground service to declare an `android:foregroundServiceType` in the manifest. The library doesn't set this itself. Fix attempted: Expo config plugin to inject `android:foregroundServiceType="dataSync"` with `tools:replace` to override the library's own manifest. Two build cycles spent on this.

**2. Config plugin not applying**
First version of the plugin crashed `npx expo config` due to missing null checks on `config.modResults.manifest`. Fixed, but the manifest merge still didn't apply correctly because the library's declared service won over our override without `tools:replace`.

**3. Still crashing after two rebuilds**
Even with `tools:replace`, the crash persisted. Each fix required a full EAS cloud build cycle (~10 min each).

## Root Cause
The library requires a native Android foreground service, which Android 14 enforces strictly. Getting it right requires precise manifest merging — non-trivial in an Expo managed workflow.

## Decision
**Drop `react-native-background-actions` for MVP.**

The live countdown is cosmetic. The notification can instead show the session end time ("Session ends at 3:45 PM"), which is calculated at start and requires no background service or foreground service type.

## MVP Notification Plan
- Use `expo-notifications` (already implemented, works in Expo Go)
- Show static persistent notification with session end time on start
- Cancel on session complete / give up / failed

## Deferred
Live countdown in notification — revisit post-launch only if users request it. Will require `react-native-background-actions` + a proper Expo bare workflow or a tested config plugin.
