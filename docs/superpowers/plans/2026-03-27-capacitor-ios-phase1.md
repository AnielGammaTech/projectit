# Capacitor iOS App — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap ProjectIT's React/Vite web app in a native iOS shell using Capacitor, with push notifications, camera, haptic feedback, and badge count.

**Architecture:** Capacitor wraps the Vite `dist/` output into an Xcode project. Native features are accessed via Capacitor plugins, gated behind `Capacitor.isNativePlatform()` checks. The web app and Railway deploy pipeline are unchanged.

**Tech Stack:** Capacitor 6, @capacitor/push-notifications, @capacitor/camera, @capacitor/haptics, @capacitor/app, @capacitor/status-bar

---

## File Structure

```
New files:
  capacitor.config.ts                    — Capacitor project config
  src/lib/capacitor.js                   — Platform detection + initialization
  src/hooks/useHaptics.js                — Haptic feedback hook
  src/hooks/usePushNotifications.js      — Push registration + listeners
  src/hooks/useNativeCamera.js           — Native camera/gallery picker

Modified files:
  package.json                           — Add Capacitor deps + scripts
  vite.config.js                         — (no changes needed, dist/ output is correct)
  src/main.jsx                           — Initialize Capacitor on app boot
  src/App.jsx                            — Mount push notification listener
  src/utils/notifications.js             — Register device token with backend
  src/api/apiClient.js                   — Add device token registration endpoint

Generated (by Capacitor CLI):
  ios/                                   — Full Xcode project (do not manually edit)
```

---

### Task 1: Install Capacitor and Create iOS Project

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.ts`
- Generated: `ios/` directory

- [ ] **Step 1: Install Capacitor core and CLI**

```bash
cd /Users/anielreyes/Developer/projectit
npm install @capacitor/core @capacitor/cli
```

- [ ] **Step 2: Initialize Capacitor**

```bash
npx cap init "ProjectIT" "com.gammatech.projectit" --web-dir dist
```

This creates `capacitor.config.ts`. Replace its contents:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gammatech.projectit',
  appName: 'ProjectIT',
  webDir: 'dist',
  server: {
    // In production, the app loads from the bundled dist/ files.
    // For development, uncomment the url below to use live reload:
    // url: 'http://YOUR_LOCAL_IP:5173',
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0F2F44',
    },
  },
};

export default config;
```

- [ ] **Step 3: Install native platform plugins**

```bash
npm install @capacitor/app @capacitor/haptics @capacitor/camera @capacitor/push-notifications @capacitor/status-bar @capacitor/network
```

- [ ] **Step 4: Build the web app and add iOS platform**

```bash
npm run build
npx cap add ios
```

This generates the full `ios/` directory with an Xcode project.

- [ ] **Step 5: Add `.gitignore` entries for iOS build artifacts**

Append to the project's `.gitignore`:

```
# Capacitor iOS build artifacts
ios/App/App/public
ios/App/Pods
ios/App/DerivedData
```

- [ ] **Step 6: Add npm scripts for Capacitor workflow**

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "cap:sync": "npm run build && npx cap sync",
    "cap:open": "npx cap open ios",
    "cap:run": "npx cap run ios"
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Capacitor iOS project with core plugins"
```

---

### Task 2: Platform Detection Utility

**Files:**
- Create: `src/lib/capacitor.js`

- [ ] **Step 1: Create the platform detection module**

Create `src/lib/capacitor.js`:

```javascript
import { Capacitor } from '@capacitor/core';

/**
 * Returns true when running inside a native iOS/Android shell.
 * Returns false in the browser (including PWA).
 */
export function isNative() {
  return Capacitor.isNativePlatform();
}

/**
 * Returns the current platform: 'ios', 'android', or 'web'.
 */
export function getPlatform() {
  return Capacitor.getPlatform();
}

/**
 * Returns true only when running inside the iOS native shell.
 */
export function isIOS() {
  return Capacitor.getPlatform() === 'ios';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/capacitor.js
git commit -m "feat: add Capacitor platform detection utility"
```

---

### Task 3: Haptic Feedback Hook

**Files:**
- Create: `src/hooks/useHaptics.js`

- [ ] **Step 1: Create the haptics hook**

Create `src/hooks/useHaptics.js`:

```javascript
import { useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from '@/lib/capacitor';

/**
 * Hook providing haptic feedback functions.
 * All functions are no-ops on web — safe to call anywhere.
 *
 * Usage:
 *   const { tapLight, tapMedium, success, warning } = useHaptics();
 *   <Button onClick={() => { tapLight(); doSomething(); }}>
 */
export function useHaptics() {
  const tapLight = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.impact({ style: ImpactStyle.Light });
  }, []);

  const tapMedium = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
  }, []);

  const tapHeavy = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.impact({ style: ImpactStyle.Heavy });
  }, []);

  const success = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.notification({ type: NotificationType.Success });
  }, []);

  const warning = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.notification({ type: NotificationType.Warning });
  }, []);

  const error = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.notification({ type: NotificationType.Error });
  }, []);

  return { tapLight, tapMedium, tapHeavy, success, warning, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useHaptics.js
git commit -m "feat: add useHaptics hook for native haptic feedback"
```

---

### Task 4: Native Camera Hook

**Files:**
- Create: `src/hooks/useNativeCamera.js`

- [ ] **Step 1: Create the camera hook**

Create `src/hooks/useNativeCamera.js`:

```javascript
import { useCallback } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNative } from '@/lib/capacitor';

/**
 * Hook for taking photos or picking from gallery.
 * On native: uses the native camera/gallery picker.
 * On web: falls back to browser file input (handled by caller).
 *
 * Usage:
 *   const { takePhoto, pickFromGallery, isNativeCamera } = useNativeCamera();
 *   // Returns { file: File, dataUrl: string } or null if cancelled
 */
export function useNativeCamera() {
  const isNativeCamera = isNative();

  const getPhoto = useCallback(async (source) => {
    if (!isNativeCamera) return null;

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
        width: 1920,
        height: 1920,
        correctOrientation: true,
      });

      if (!photo.dataUrl) return null;

      // Convert data URL to File object for upload compatibility
      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();
      const extension = photo.format || 'jpeg';
      const file = new File([blob], `photo-${Date.now()}.${extension}`, {
        type: `image/${extension}`,
      });

      return { file, dataUrl: photo.dataUrl };
    } catch (err) {
      // User cancelled or permission denied
      if (err.message?.includes('cancelled') || err.message?.includes('User cancelled')) {
        return null;
      }
      throw err;
    }
  }, [isNativeCamera]);

  const takePhoto = useCallback(
    () => getPhoto(CameraSource.Camera),
    [getPhoto]
  );

  const pickFromGallery = useCallback(
    () => getPhoto(CameraSource.Photos),
    [getPhoto]
  );

  return { takePhoto, pickFromGallery, isNativeCamera };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useNativeCamera.js
git commit -m "feat: add useNativeCamera hook for native photo capture"
```

---

### Task 5: Push Notifications Hook

**Files:**
- Create: `src/hooks/usePushNotifications.js`
- Modify: `src/api/apiClient.js` (add device token endpoint)

- [ ] **Step 1: Add device token API method to apiClient**

In `src/api/apiClient.js`, find the `integrations` object (around line 125) and add a new method inside `Core`:

```javascript
    async RegisterDeviceToken({ token, platform }) {
      return apiFetch('/api/integrations/register-device-token', {
        method: 'POST',
        body: JSON.stringify({ token, platform }),
      });
    },
```

Add this right after the `UploadFile` method (after line 148).

- [ ] **Step 2: Create the push notifications hook**

Create `src/hooks/usePushNotifications.js`:

```javascript
import { useEffect, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from '@/lib/capacitor';
import { api } from '@/api/apiClient';

/**
 * Hook that registers for push notifications on native platforms.
 * Call once at the app root level (e.g., in App.jsx).
 *
 * @param {object} options
 * @param {string} options.userEmail - Current user's email (used to associate token)
 * @param {function} options.onNotificationReceived - Called when a push arrives while app is open
 * @param {function} options.onNotificationTapped - Called when user taps a push notification
 */
export function usePushNotifications({ userEmail, onNotificationReceived, onNotificationTapped } = {}) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isNative() || !userEmail || registeredRef.current) return;

    let registrationListener;
    let receivedListener;
    let actionListener;

    async function setup() {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') return;

      // Register with APNs
      await PushNotifications.register();

      // Listen for the device token
      registrationListener = await PushNotifications.addListener('registration', async (token) => {
        registeredRef.current = true;
        try {
          await api.integrations.Core.RegisterDeviceToken({
            token: token.value,
            platform: 'ios',
          });
        } catch (err) {
          console.error('Failed to register device token:', err);
        }
      });

      // Push received while app is in foreground
      receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      });

      // User tapped on a push notification
      actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        if (onNotificationTapped) {
          onNotificationTapped(action.notification);
        }
      });
    }

    setup();

    return () => {
      registrationListener?.remove();
      receivedListener?.remove();
      actionListener?.remove();
    };
  }, [userEmail, onNotificationReceived, onNotificationTapped]);
}

/**
 * Set the app badge count (native only).
 * @param {number} count
 */
export async function setBadgeCount(count) {
  if (!isNative()) return;
  await PushNotifications.removeAllDeliveredNotifications();
  // Badge count is typically set by the push payload from the server.
  // This is a client-side reset (e.g., when user views notifications).
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePushNotifications.js src/api/apiClient.js
git commit -m "feat: add push notifications hook + device token registration"
```

---

### Task 6: Initialize Capacitor in App Boot

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Add Capacitor status bar setup to main.jsx**

Replace the contents of `src/main.jsx`:

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { isNative } from '@/lib/capacitor'

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

// Register Service Worker for PWA support (web only — native uses Capacitor)
if (!isNative() && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('SW registered:', reg.scope);
      })
      .catch((err) => {
        console.log('SW registration failed:', err);
      });
  });
}

// Initialize native status bar styling
if (isNative()) {
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Light });
  });
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
```

- [ ] **Step 2: Mount push notification listener in App.jsx**

In `src/App.jsx`, add the import at the top with the other imports:

```javascript
import { usePushNotifications } from '@/hooks/usePushNotifications';
```

Then inside the `AuthenticatedApp` component (after the existing hooks around line 45), add:

```javascript
  const { user } = useAuth();

  // Register for native push notifications
  usePushNotifications({
    userEmail: user?.email,
    onNotificationTapped: (notification) => {
      // Navigate to the linked page if the push has a link
      const link = notification?.data?.link;
      if (link) {
        window.location.href = link;
      }
    },
  });
```

Note: `useAuth()` is already called in `AuthenticatedApp` — find the existing destructure and add `user` if not already there, then add the `usePushNotifications` call after it.

- [ ] **Step 3: Commit**

```bash
git add src/main.jsx src/App.jsx
git commit -m "feat: initialize Capacitor on app boot with push listener"
```

---

### Task 7: Sync and Open in Xcode

**Files:**
- No file changes — build and verify

- [ ] **Step 1: Build and sync to iOS**

```bash
cd /Users/anielreyes/Developer/projectit
npm run build && npx cap sync ios
```

Expected output: Vite builds to `dist/`, Capacitor copies `dist/` into `ios/App/App/public/` and syncs plugin configs.

- [ ] **Step 2: Open in Xcode**

```bash
npx cap open ios
```

This opens the Xcode project. In Xcode:
1. Select a team under Signing & Capabilities (your Apple Developer account)
2. Select a simulator (e.g., iPhone 16 Pro)
3. Click the Play button to build and run

- [ ] **Step 3: Configure push notification entitlement in Xcode**

In Xcode:
1. Select the **App** target in the project navigator
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **Push Notifications**
5. Add **Background Modes** and check **Remote notifications**

- [ ] **Step 4: Configure camera usage description**

In Xcode, open `ios/App/App/Info.plist` and verify these keys exist (Capacitor should add them, but confirm):

```xml
<key>NSCameraUsageDescription</key>
<string>ProjectIT needs camera access to take photos for project files.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>ProjectIT needs photo library access to attach images to projects.</string>
```

- [ ] **Step 5: Commit Xcode configuration changes**

```bash
git add ios/
git commit -m "feat: configure iOS entitlements for push notifications and camera"
```

---

### Task 8: Wire Haptics Into Key Interactions

**Files:**
- Modify: `src/components/modals/TaskDetailModal.jsx` (task completion)
- Modify: `src/components/ui/dialog.jsx` (swipe dismiss)

- [ ] **Step 1: Add haptics to task completion toggle**

In `src/components/modals/TaskDetailModal.jsx`, add the import at the top:

```javascript
import { useHaptics } from '@/hooks/useHaptics';
```

Inside the component function (after the existing hooks around line 53), add:

```javascript
  const { success: hapticSuccess, tapLight } = useHaptics();
```

Find the `handleStatusToggle` function (line 82) and add haptic feedback:

```javascript
  const handleStatusToggle = async () => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    if (newStatus === 'completed') await hapticSuccess();
    else await tapLight();
    await handleUpdateTask({ status: newStatus });
  };
```

- [ ] **Step 2: Add haptics to dialog swipe dismiss**

In `src/components/ui/dialog.jsx`, add the import at the top:

```javascript
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from '@/lib/capacitor';
```

In the `handleTouchEnd` callback (around line 56), add a haptic tap when the dismiss threshold is reached:

```javascript
  const handleTouchEnd = React.useCallback((e) => {
    if (!contentRef.current) return
    contentRef.current.style.transition = 'transform 0.2s ease-out'
    if (touchDeltaY.current > 100) {
      // Haptic feedback on dismiss
      if (isNative()) {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
      // Dismiss — find and click the close button
      const closeBtn = contentRef.current.querySelector('[data-dialog-close]')
      if (closeBtn) closeBtn.click()
      else {
        contentRef.current.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      }
    } else {
      contentRef.current.style.transform = 'translateY(0)'
    }
  }, [])
```

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/TaskDetailModal.jsx src/components/ui/dialog.jsx
git commit -m "feat: wire haptic feedback into task completion and swipe dismiss"
```

---

### Task 9: Wire Native Camera Into File Uploads

**Files:**
- Modify: `src/components/modals/TaskDetailModal.jsx` (comment attachments)

- [ ] **Step 1: Add camera option to task comment file upload**

In `src/components/modals/TaskDetailModal.jsx`, add the import:

```javascript
import { useNativeCamera } from '@/hooks/useNativeCamera';
```

Inside the component (near the other hooks), add:

```javascript
  const { takePhoto, pickFromGallery, isNativeCamera } = useNativeCamera();
```

Add a handler for native camera upload (after the existing `handleCommentFileUpload`):

```javascript
  const handleNativeCameraUpload = async (source) => {
    const result = source === 'camera' ? await takePhoto() : await pickFromGallery();
    if (!result) return;
    setUploadingCommentFile(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file: result.file });
      setCommentAttachments(prev => [...prev, { name: result.file.name, url: file_url, type: result.file.type }]);
    } catch (err) {
      console.error('Failed to upload photo:', err);
    }
    setUploadingCommentFile(false);
  };
```

Find the paperclip button in the comment input area (around line 258). Replace the single button with a dropdown when on native:

```javascript
{isNativeCamera ? (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" disabled={uploadingCommentFile} className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
        {uploadingCommentFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => handleNativeCameraUpload('camera')}>
        <Camera className="w-4 h-4 mr-2" />Take Photo
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleNativeCameraUpload('gallery')}>
        <Image className="w-4 h-4 mr-2" />Photo Library
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => commentFileInputRef.current?.click()}>
        <Paperclip className="w-4 h-4 mr-2" />Browse Files
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
) : (
  <button type="button" onClick={() => commentFileInputRef.current?.click()} disabled={uploadingCommentFile} className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
    {uploadingCommentFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
  </button>
)}
```

Note: `Camera` icon needs to be added to the lucide-react import at the top of the file. Check the existing import line and add `Camera` if not already there. The `Image` icon is already imported.

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/TaskDetailModal.jsx
git commit -m "feat: add native camera option to task comment attachments"
```

---

### Task 10: Final Sync, Build, and Test

**Files:**
- No new files — verification only

- [ ] **Step 1: Full build and sync**

```bash
cd /Users/anielreyes/Developer/projectit
npm run build && npx cap sync ios
```

- [ ] **Step 2: Run in Xcode simulator**

```bash
npx cap open ios
```

In Xcode, build and run on a simulator. Verify:
1. App launches and shows the login screen
2. After login, dashboard loads correctly
3. Bottom sheet modals slide up and dismiss with swipe
4. Navigation works between all pages

- [ ] **Step 3: Test on a real device (optional)**

Connect an iPhone via USB. In Xcode:
1. Select the connected device as the target
2. Build and run
3. Test haptics (won't work on simulator)
4. Test camera (won't work on simulator)
5. Test push notification permission prompt

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "feat: Capacitor iOS app Phase 1 complete — ready for TestFlight"
git push origin main
```
