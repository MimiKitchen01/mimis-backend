# Firebase Apple Push Notification Services (APNs) Setup Guide

## 🚨 CRITICAL: Why iOS Push Notifications Don't Work Without This

Your iOS app registers FCM tokens successfully, BUT Firebase cannot deliver push notifications to iOS devices without:
1. **APNS Certificate** - Signed by Apple Developer Account
2. **APNS Key** - Alternative to certificate (recommended)
3. **Firebase Console Configuration** - Upload certificates to Firebase project

---

## 📋 Prerequisites
- Apple Developer Account (must paid account or team)
- Firebase Console access (https://console.firebase.google.com)
- Mac with Keychain Access (for managing certificates)

---

## Step 1: Create APNS Certificate/Key in Apple Developer Console

### Option A: Using APNS Key (Recommended - Easier)

#### 1.1 Go to Apple Developer Console
- Visit: https://developer.apple.com/account
- Sign in with Apple Developer credentials
- Navigate to **Certificates, Identifiers & Profiles** → **Keys** (left sidebar)

#### 1.2 Create New Key
- Click **"+ Create a key"** (top-right)
- Enter Key Name: `Firebase_APNs_Key`
- Check the checkbox for **"Apple Push Notification service (APNs)"**
- Click **"Continue"** → **"Register"**
- Download the `.p8` file (save it safely!)

#### 1.3 Note Your Key ID
After downloading, you'll see a Key ID (e.g., `ABC123DEF4`)
- Keep this ID safe - you'll need it for Firebase

---

### Option B: Using APNS Certificate (Traditional)

#### 1.1 Create Certificate in Keychain
- Open **Keychain Access** on Mac (Applications → Utilities)
- Go to **Keychain Access** → **Certificate Assistant** → **Request a Certificate from a Certificate Authority**
- Email Address: your@email.com
- Common Name: `Mimi's Kitchen APNs`
- Requestor: `Your Name`
- Select **"Saved to disk"** → **"Continue"**
- Save the file as `MimisKitchenAPNs.certSigningRequest`

#### 1.2 Upload CSR to Apple Developer
- Visit: https://developer.apple.com/account/resources/certificates/list
- Click **"+ Create a Certificate"**
- Select **"Apple Push Notification service (APNs)"**
- Click **"Continue"**
- Upload your `.certSigningRequest` file
- Click **"Generate"**
- Download the certificate (`.cer` file)

#### 1.3 Import Certificate to Keychain
- Double-click the downloaded `.cer` file to import it to Keychain
- In Keychain, find the certificate you just imported
- Right-click → **"Export"** → Save as `MimisKitchenAPNs.p12`
- Set a password (remember it!)

---

## Step 2: Convert to APNS Format (For Certificate Option Only)

If using the `.p12` certificate, convert it to `.p8` format:

```bash
# Extract private key from p12
openssl pkcs12 -in MimisKitchenAPNs.p12 -out MimisKitchenAPNs.key -nocerts -nodes

# Create p8 file
openssl pkcs8 -topk8 -inform PEM -outform PEM -in MimisKitchenAPNs.key -out MimisKitchenAPNs.p8 -nocrypt
```

---

## Step 3: Upload to Firebase Console

#### 3.1 Open Firebase Console
- Go to: https://console.firebase.google.com
- Select your **`mimis-kitchen`** project

#### 3.2 Navigate to Project Settings
- Click the **⚙️ Settings** icon (top-left, next to project name)
- Go to **"Project Settings"** tab
- Scroll down to **"Your apps"** section
- Find your **iOS app** (look for "mimi's kitchen" or your app identifier)
- Click on it

#### 3.3 Configure APNS Certificate

**If using Key (.p8 method):**
- Scroll to **"APNs Certificates"** section
- Click **"Upload"** button
- Upload your `.p8` file
- Paste your **Key ID** (from Step 1.3)
- Paste your **Team ID** (find in Developer Account → Membership)
- Click **"Upload"**

**If using Certificate (.p8 converted):**
- Click **"Upload"** in APNs section
- Upload your converted `.p8` file
- Click **"Upload"**

---

## Step 4: Verify iOS App Configuration

#### 4.1 Check iOS App Bundle ID
In Xcode, make sure:
- Bundle Identifier matches your Firebase app
- Signing certificates are enabled
- Push Notifications capability is enabled (in Xcode: Signing & Capabilities → Add Capability → Push Notifications)

#### 4.2 Verify Firebase SDK
In your `iOS/Podfile` or `pubspec.yaml` (Flutter):
```yaml
# For Flutter
firebase_messaging: latest

# For native iOS, ensure Firebase/Messaging is in Podfile
pod 'Firebase/Messaging'
```

---

## Step 5: Update Frontend to Send Platform

### For Flutter iOS App

When registering FCM token, send `platform: 'ios'`:

```dart
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';

Future<void> registerFCMToken() async {
  final token = await FirebaseMessaging.instance.getToken();
  
  final platform = Platform.isIOS ? 'ios' : 'android';
  
  await http.post(
    Uri.parse('https://your-api.com/api/notifications/fcm-token'),
    headers: {'Authorization': 'Bearer $authToken'},
    body: jsonEncode({
      'token': token,
      'platform': platform,  // ← IMPORTANT: Send platform
      'action': 'add'
    }),
  );
}
```

### For Native iOS (Swift)

```swift
import FirebaseMessaging

func registerFCMToken() {
    InstanceID.instanceID().instanceID { (result, error) in
        guard let token = result?.token else { return }
        
        let payload: [String: Any] = [
            "token": token,
            "platform": "ios",  // ← Send platform
            "action": "add"
        ]
        
        // POST to /api/notifications/fcm-token with payload
    }
}
```

---

## Step 6: Test Push Notifications

### Using Firebase Console Test Send

1. Go to Firebase Console → Cloud Messaging
2. Click **"New Campaign"** → **"Firebase Notifications"**
3. Enter title & body
4. Click **"Test on device"**
5. Enter your device FCM token
6. Click **"Test"**

### Using Your Backend API

Make a POST request:
```bash
curl -X POST https://your-api.com/api/notifications/test-push \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "If you see this, APNs is working! 🎉"
  }'
```

---

## 🔍 Troubleshooting

### Push Works on Android But Not iOS

**Problem:** FCM tokens registered but no notifications on iOS
- ❌ APNs not configured in Firebase Console
- ❌ Wrong bundle ID in Xcode
- **Solution:** Follow Step 3 & 4 above

### Notifications Are Silent (No Badge/Sound)

**Problem:** Notifications appear but no sound/badge
- Old code sent `contentAvailable: true` (silent)
- ✅ New code sends proper `alert` structure
- **Solution:** Restart app to get new code

### "Invalid APNS Certificate"

**Problem:** Firebase rejects uploaded certificate
- Wrong file format (.cer instead of .p8)
- Corrupted certificate
- **Solution:** 
  1. Generate new certificate in Apple Developer
  2. Convert properly using openssl commands
  3. Re-upload to Firebase

### Device Not Receiving Notifications

**Checklist:**
1. ✅ APNS certificate uploaded in Firebase? (Step 3)
2. ✅ iOS app has notification permission? (Check Settings → Mimi's Kitchen → Notifications)
3. ✅ App registers FCM token? (Check logs)
4. ✅ Token has `platform: 'ios'` stored? (Check DB)
5. ✅ Push notification code updated? (Check you have latest code)
6. ✅ Device running latest app? (Rebuild and reinstall)

---

## 📞 Getting Your Team ID

1. Go to: https://developer.apple.com/account
2. Click **"Membership"** in sidebar
3. Your **Team ID** is displayed under "Membership Information"
4. Format: `ABCD123456` (10 characters)

---

## ✅ Checklist After Setup

- [ ] APNS Key or Certificate downloaded from Apple Developer
- [ ] Firebase Console updated with APNS certificate
- [ ] Flutter/iOS app updated to send `platform: 'ios'` 
- [ ] Push notification code redeployed
- [ ] iOS app reinstalled/rebuilt
- [ ] Test push sent successfully
- [ ] Push notifications appearing with sound/badge

---

## 🚀 Next Steps

1. **Complete Apple Developer setup** (Step 1)
2. **Upload to Firebase** (Step 3)
3. **Update iOS app code** (Step 5)
4. **Rebuild and test** (Step 6)

**Common Timeline:** 5-15 minutes to set up when you have Apple Developer access.

---

## Questions?

Check Firebase logs: **Firebase Console → Cloud Messaging → Logs**
