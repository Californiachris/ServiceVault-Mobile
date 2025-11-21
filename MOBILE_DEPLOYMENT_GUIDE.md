# ServiceVault Mobile Deployment Guide

## Overview
ServiceVault is now ready for iOS and Android deployment using Capacitor. This guide covers building, testing, and publishing your native mobile apps.

## Prerequisites
- Node.js 16+
- Xcode (for iOS) or Android Studio (for Android)
- iOS: macOS 11+, CocoaPods
- Android: JDK 11+, Android SDK 31+

## Quick Start: Sideload Android APK for Testing

### 1. Build APK for Testing
```bash
npm run build
npx cap sync
npx cap copy android
cd android
./gradlew assembleDebug
# APK output: android/app/build/outputs/apk/debug/app-debug.apk
```

### 2. Install on Physical Device
```bash
# Enable USB Debugging on Android device first
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Test Login Flow
- Launch ServiceVault on device
- Sign up with email/password
- Verify email (check terminal for verification link in dev mode)
- Test asset scanning with QR codes
- Try camera and GPS features

## iOS Build

### 1. Build iOS App
```bash
npm run build
npx cap sync ios
npx cap open ios
# Xcode opens automatically
```

### 2. In Xcode
- Select your signing team (Apple Developer Account)
- Connect iPhone via USB
- Select device from top menu
- Click "Run" (Play button)

### 3. Test on Device
- Install TestFlight for beta testing
- Or export .ipa file for internal distribution

## Android Google Play Store Submission

### 1. Generate Signed APK/AAB
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 2. Upload to Play Console
- Go to https://play.google.com/console
- Create new app
- Upload .aab file to Internal Testing track first
- Add testers' Google accounts
- Move to Beta/Production after testing

### 3. App Store Listing
- Add app screenshots (take from TestFlight on iPad)
- Write app description: "Professional asset tracking with QR/NFC stickers"
- Set price (or free with in-app subscriptions)
- Submit for review (3-5 days typical)

## iOS App Store Submission

### 1. Build Archive
```bash
npx cap open ios
# In Xcode: Product → Archive
```

### 2. Upload to TestFlight
- Click "Distribute App"
- Select "TestFlight and the App Store"
- Follow prompts to upload
- Wait for processing (15-30 min)

### 3. Create App Store Listing
- Go to https://appstoreconnect.apple.com
- Add screenshots (need 5 different iPhone sizes minimum)
- Write description: "Professional asset tracking for contractors"
- Set age rating and keywords
- Submit for review

### 4. App Review Guidelines
- Privacy policy required (https://yoursite.com/privacy)
- Terms of service required
- Clear explanation of camera/GPS usage
- Data deletion process documented

## Testing Checklist Before Submission

- [ ] Email/password signup works
- [ ] Password reset email arrives
- [ ] QR code scanning works
- [ ] Camera photo capture works
- [ ] GPS location tracking works
- [ ] Push notifications display
- [ ] Dark mode renders correctly
- [ ] All buttons/forms responsive on mobile
- [ ] Network errors handled gracefully
- [ ] Session persistence works (don't get logged out randomly)

## Environment Variables for Builds

Create `.env.production` for production builds:
```
VITE_API_URL=https://servicevault.app/api
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

## Troubleshooting

### Build Fails with "Pod install error"
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
```

### Android Build Error
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

### App Crashes on Startup
- Check logs: `adb logcat` (Android) or Xcode console (iOS)
- Ensure auth endpoint is reachable
- Check API_URL is correct in environment

### Camera Permission Denied
- Android: Grant permissions in Settings → Apps → ServiceVault
- iOS: Open Settings → ServiceVault → Camera/Location and enable

## Release Schedule

1. **Week 1**: Private testing (internal team)
2. **Week 2**: Beta testing (TestFlight/Google Play beta)
3. **Week 3**: App Store submission review
4. **Week 4**: Public release

## Support & Updates

- **Bug Reports**: users@servicevault.app
- **Updates**: Released every 2 weeks
- **Backwards Compatibility**: Maintained 2 versions back
- **API Stability**: v1 endpoint guaranteed for 1 year

## Next Steps

1. Configure signing certificates
2. Set up app icons and screenshots
3. Create privacy policy
4. Submit to app stores
5. Monitor crash reports and ratings
6. Plan feature updates

---
**Last Updated**: November 2025
**Version**: 1.0.0
