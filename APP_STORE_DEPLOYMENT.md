# ServiceVault - App Store & Play Store Deployment Guide

## 🚀 Quick Start: Get Your APK in 5 Minutes

### Option 1: GitHub Actions (Recommended - Zero Local Setup)

1. **Push code to GitHub** (if not already there)
2. **Go to GitHub → Actions tab**
3. **Click "Build Mobile Apps" workflow**
4. **Click "Run workflow"**
   - Build type: `debug`
   - Platform: `android`
5. **Wait 5-10 minutes**
6. **Download APK** from workflow artifacts
7. **Install on phone:** Transfer APK via USB/email and tap to install

### Option 2: Build Locally (Requires Android Studio)

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Transfer to phone and install (enable "Install from Unknown Sources" first).

---

## 📱 Feature Verification Checklist

Before submitting to app stores, verify all 4 core features work:

### ✅ Camera Scanning
- Open app → Navigate to scan page
- Grant camera permission when prompted
- Point at QR code → Should detect and navigate to asset

### ✅ GPS Check-In/Out
- Open worker dashboard
- Start visit → Grant location permission
- Verify GPS coordinates captured
- Check-out → Verify location logged

### ✅ Push Notifications
- Register device token (auto on first launch)
- Backend sends test notification
- Verify notification appears in system tray
- Tap notification → App opens to correct page

### ✅ Offline Mode
- Open app while online
- Navigate through a few pages (caches data)
- Turn off WiFi and cellular
- Navigate → Should show cached pages
- Try network request → Should show offline message
- Reconnect → Should sync data

---

## 🤖 Android: Google Play Store Submission

### Prerequisites
- Google Play Developer Account ($25 one-time fee)
- App icons (512x512 PNG)
- Screenshots (4-8 images, various device sizes)
- Privacy policy URL
- App description

### Step 1: Create Signing Key

```bash
# Generate release keystore
keytool -genkey -v -keystore release.keystore -alias servicevault \
  -keyalg RSA -keysize 2048 -validity 10000

# Save these securely:
# - Keystore file (release.keystore)
# - Keystore password
# - Key alias (servicevault)
# - Key password
```

⚠️ **CRITICAL:** Back up this keystore file! If you lose it, you can NEVER update your app on Play Store.

### Step 2: Configure Build for Release

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build Release AAB

```bash
# Set environment variables
export KEYSTORE_PASSWORD="your_keystore_password"
export KEY_ALIAS="servicevault"
export KEY_PASSWORD="your_key_password"

# Build production web app
npm run build

# Sync to Android
npx cap sync android

# Build signed AAB (Android App Bundle)
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Step 4: Upload to Play Console

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in app details:
   - **App name:** ServiceVault
   - **Category:** Productivity
   - **Content rating:** Everyone
4. Go to "Testing → Internal testing"
5. Create new release
6. Upload `app-release.aab`
7. Add release notes
8. Add testers (use their Gmail addresses)
9. Click "Review release" → "Start rollout"

### Step 5: Internal Testing (1-2 weeks)

- Share opt-in link with testers
- Collect feedback on crashes/bugs
- Fix issues and upload new AAB version
- Test payment flows thoroughly

### Step 6: Production Release

1. Go to "Production"
2. Create new release
3. Upload same AAB from internal testing
4. Add store listing:
   - **Title:** ServiceVault - Asset Tracking
   - **Short description:** Professional QR/NFC asset management for contractors
   - **Full description:** (See template below)
   - **App icon:** 512x512 PNG
   - **Feature graphic:** 1024x500 PNG
   - **Screenshots:** 4-8 images (phone + tablet)
5. Set pricing (Free with in-app subscriptions)
6. Submit for review

**Review time:** 1-7 days (usually 2-3 days)

---

## 🍎 iOS: App Store Submission

### Prerequisites
- Apple Developer Account ($99/year)
- Mac with Xcode 15+
- App icons (1024x1024 PNG)
- Screenshots (5 iPhone sizes + iPad)
- Privacy policy URL

### Step 1: Add iOS Platform

```bash
npx cap add ios
npx cap sync ios
cd ios/App
pod install
```

### Step 2: Open in Xcode

```bash
npx cap open ios
```

### Step 3: Configure Signing

1. In Xcode, select project root
2. Go to "Signing & Capabilities"
3. Select your development team
4. Enable "Automatically manage signing"
5. Change bundle identifier if needed: `com.servicevault.app`

### Step 4: Add Capabilities

1. Click "+ Capability"
2. Add:
   - Push Notifications
   - Background Modes (Background fetch, Remote notifications)
   - App Groups (for shared storage)

### Step 5: Configure Info.plist

Add usage descriptions:

```xml
<key>NSCameraUsageDescription</key>
<string>ServiceVault needs camera access to scan QR codes on asset stickers</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>ServiceVault uses your location to verify worker check-ins at job sites</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>ServiceVault needs photo access to attach images to service reports</string>
```

### Step 6: Build Archive

1. Select "Any iOS Device" as build target
2. Product → Archive
3. Wait for build to complete (~5-10 min)
4. Archive window opens automatically

### Step 7: Upload to App Store Connect

1. Click "Distribute App"
2. Select "App Store Connect"
3. Select "Upload"
4. Follow prompts
5. Wait for processing (15-30 min)

### Step 8: Create App Store Listing

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+"
3. Fill in details:
   - **Name:** ServiceVault
   - **Bundle ID:** com.servicevault.app
   - **SKU:** servicevault-001
   - **Primary language:** English
4. Add screenshots (iPhone 6.7", 6.5", 5.5" required)
5. Add app preview video (optional but recommended)
6. Write description (see template below)
7. Set keywords: "qr code, asset tracking, contractor, property management"
8. Set category: Productivity
9. Set age rating: 4+

### Step 9: Submit for Review

1. Select build from TestFlight
2. Add export compliance info (No encryption)
3. Submit for review
4. Answer review questions honestly

**Review time:** 1-5 days (usually 24-48 hours)

---

## 📝 App Store Listing Templates

### Short Description (80 chars)
```
Professional asset tracking with QR stickers for contractors & property managers
```

### Full Description

```
ServiceVault is the premium asset management platform for contractors, homeowners, and property managers.

🏷️ QR/NFC STICKER TRACKING
• Order custom-branded stickers with your logo
• Scan to instantly view complete asset history
• Tamper-resistant hash-chain logging

🤖 AI-POWERED WARRANTY PARSING
• Snap a photo of warranty documents
• AI extracts dates, terms, and coverage
• Never miss an expiration date

🔔 SMART MAINTENANCE REMINDERS
• Predictive maintenance scheduling
• SMS and email notifications
• Reduce downtime and emergency repairs

👷 PROPERTY MANAGEMENT TOOLS
• GPS-verified worker check-ins
• Task assignment and tracking
• Tenant reporting portal

💼 CONTRACTOR FEATURES
• Professional branded QR stickers
• Service history timeline
• Client portal access
• Logo customization

🏠 HOMEOWNER BENEFITS
• Complete home asset inventory
• From jewelry to furnace installs
• Transfer history when selling
• Immutable service records

🔒 ENTERPRISE-GRADE SECURITY
• Tamper-resistant event logging
• Blockchain-style hash verification
• SOC 2 compliant infrastructure

💳 FLEXIBLE PRICING
• Free tier for personal use
• Pro: $69/month for contractors
• Enterprise: Custom pricing

Start your 14-day free trial today!

---

Support: support@servicevault.app
Privacy: https://servicevault.app/privacy
Terms: https://servicevault.app/terms
```

### Keywords (Google Play)
```
qr code scanner, asset tracking, contractor tools, property management, maintenance log, warranty tracker, equipment management, inventory system, service history, nfc tags
```

### What's New (Update Notes)
```
• Added GPS-verified worker check-ins
• Improved QR code scanning speed
• Enhanced offline mode support
• Bug fixes and performance improvements
```

---

## 🔐 GitHub Actions Setup (Automated Builds)

### Configure GitHub Secrets

Go to GitHub → Settings → Secrets and variables → Actions

**For Android:**
```
ANDROID_KEYSTORE_FILE = base64 -w 0 < release.keystore
ANDROID_KEYSTORE_PASSWORD = your_keystore_password
ANDROID_KEY_ALIAS = servicevault
ANDROID_KEY_PASSWORD = your_key_password
```

**For iOS:**
```
IOS_EXPORT_OPTIONS_PLIST = base64 -w 0 < ExportOptions.plist
APPLE_CERTIFICATE = (P12 certificate base64)
APPLE_CERTIFICATE_PASSWORD = your_cert_password
```

### Trigger Builds

```bash
# Push to GitHub
git push origin main

# Go to Actions tab → Build Mobile Apps → Run workflow
# Select build type (debug/release) and platform
# Download artifacts when complete
```

---

## 🐛 Common Issues & Solutions

### Android: "SDK location not found"
```bash
# Create local.properties
echo "sdk.dir=/Users/YOU/Library/Android/sdk" > android/local.properties
```

### iOS: "Pod install failed"
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
```

### Build fails with "OutOfMemoryError"
```bash
# Add to android/gradle.properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=1024m
```

### App crashes on startup
- Check logs: `adb logcat` (Android) or Xcode console (iOS)
- Verify API URL is correct in environment
- Ensure backend is reachable from device

### Camera not working
- Check AndroidManifest.xml has camera permissions
- Check Info.plist has camera usage description
- Test on physical device (emulator cameras are unreliable)

### Push notifications not working
- Verify FCM/APNs credentials are correct
- Check device has granted notification permission
- Test on physical device (simulators don't support push)

---

## 📊 Release Checklist

Before submitting to production:

- [ ] All 4 core features tested (camera, GPS, push, offline)
- [ ] No console errors or warnings
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support email active (support@servicevault.app)
- [ ] Screenshots look professional
- [ ] App icon is high quality (no transparency issues)
- [ ] Test in-app purchases work (if applicable)
- [ ] Analytics configured
- [ ] Crash reporting configured (Sentry/Firebase)
- [ ] Rate limiting tested
- [ ] Security audit completed
- [ ] Performance tested on low-end devices
- [ ] Dark mode renders correctly
- [ ] Accessibility features work (VoiceOver, TalkBack)

---

## 🚢 Post-Launch

### Week 1: Monitor Closely
- Check crash reports daily
- Respond to reviews within 24 hours
- Monitor server load and API errors
- Fix critical bugs immediately

### Ongoing: Monthly Updates
- New features every 4-6 weeks
- Bug fixes every 2 weeks
- Test new OS versions (iOS/Android betas)
- Update dependencies quarterly

### Growth Strategy
1. ASO (App Store Optimization): Iterate on keywords/screenshots
2. Reviews: Ask satisfied users to leave reviews
3. Referrals: Add referral program ($10 credit)
4. Content: Blog posts for contractor audience
5. Partnerships: Integrate with industry tools

---

**Last Updated:** November 2025  
**App Version:** 1.0.0  
**Minimum iOS:** 14.0  
**Minimum Android:** 8.0 (API 26)
