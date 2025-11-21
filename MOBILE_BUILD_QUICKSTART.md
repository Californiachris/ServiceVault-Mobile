# 🚀 Get ServiceVault APK on Your Phone (5 Minutes)

## Fastest Option: GitHub Actions (Zero Setup Required)

1. **Push this code to GitHub** (if not already)
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/servicevault.git
   git push -u origin main
   ```

2. **Go to your GitHub repo → Actions tab**

3. **Click "Build Mobile Apps" workflow → "Run workflow"**
   - Build type: **debug**
   - Platform: **android**
   - Click green "Run workflow" button

4. **Wait 5-10 minutes** (grab coffee ☕)

5. **Download APK:**
   - Workflow completes with green checkmark
   - Click on the workflow run
   - Scroll down to "Artifacts"
   - Download `servicevault-debug.apk`

6. **Install on Android phone:**
   - Transfer APK to phone (email/USB/cloud)
   - Tap APK file on phone
   - Allow "Install from Unknown Sources" if prompted
   - Tap "Install"
   - Open ServiceVault app! 🎉

---

## Alternative: Build Locally (Requires Android Studio)

Only use this if you have Android Studio installed:

```bash
# 1. Build production web app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Build APK
cd android
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

Transfer to phone and install.

---

## ✅ What Works in Mobile App

All 4 core features are configured:

### 📸 Camera Scanning
- QR code scanning works
- Photo capture for service logs
- Gallery image selection

### 📍 GPS Check-In/Out
- Worker location tracking
- GPS-verified job site visits
- Geofencing support ready

### 🔔 Push Notifications
- Maintenance reminders
- Task assignments
- Service updates
- Backend integration required (FCM setup)

### 💾 Offline Mode
- Service worker caches pages
- Works without internet
- Auto-syncs when reconnected
- Shows offline fallback page

---

## 📱 Test These Features

After installing APK:

1. **Login** → Use demo contractor account
2. **Scan QR** → Grant camera permission, test scanning
3. **Check GPS** → Grant location permission, verify coordinates
4. **Go Offline** → Turn off WiFi, verify app still loads
5. **Notifications** → (Requires backend FCM configuration)

---

## 🚢 Next Steps for Production

See **APP_STORE_DEPLOYMENT.md** for:
- Google Play Store submission
- iOS App Store submission
- Signing keys and certificates
- Store listing guidelines
- Review process timeline

---

**Questions?** Check APP_STORE_DEPLOYMENT.md or ask!
