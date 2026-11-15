# 🔐 Auth0 Mobile Login - Quick Fix

## ✅ What Was Fixed

### 1. **Mobile App (`mobile/App.tsx`)**
- ✅ Added `sharedCookiesEnabled={true}` - preserves Auth0 session cookies
- ✅ Added `thirdPartyCookiesEnabled={true}` - allows Auth0 domain cookies  
- ✅ Added `cacheEnabled={true}` - speeds up OAuth redirects
- ✅ Added `onNavigationStateChange` - logs Auth0 navigation for debugging
- ✅ Added **fetch interceptor** - captures exact `redirect_uri` sent to Auth0
- ✅ Console logs display **EXACT URL** to paste into Auth0 Dashboard

### 2. **Frontend (`UNIHACK2026-frontend/src/main.jsx`)**
- ✅ Already using `redirect_uri: window.location.origin`
- ✅ Already using `cacheLocation: 'localstorage'` (mobile-compatible)
- ✅ Already using `useRefreshTokens: true` (persists login)

### 3. **Geolocation Fix (`UNIHACK2026-frontend/src/useGeo.js`)**
- ✅ Changed error messages to be WebView-friendly
- ✅ Increased timeout from 20s to 30s

---

## 📋 NEXT STEPS

### Step 1: Try to Log In on Mobile
1. Open the app on your phone (already launched)
2. Tap **Sign In** or **Sign Up**
3. Watch the **Metro Bundler terminal** (where Expo is running)

### Step 2: Copy the Exact URL
You'll see this in the Expo terminal:

```
════════════════════════════════════════════════════════
📋 COPY THIS to Auth0 Dashboard:
   Allowed Callback URLs:
   http://127.0.0.1:5173
   
   Allowed Logout URLs:
   http://127.0.0.1:5173
   
   Allowed Web Origins:
   http://127.0.0.1:5173
════════════════════════════════════════════════════════
```

### Step 3: Add to Auth0 Dashboard

1. Go to: **https://manage.auth0.com/dashboard/us/dev-h6e6m3uck5zb26m4/applications**

2. Click your app: **LadyMap** (Client ID: `TDOd2PiO4QsbLpB7Ho5rdPPd6Gxkqnxv`)

3. Go to **Settings** tab

4. Find these three fields and add the URL from the logs:

   **Allowed Callback URLs:**
   ```
   http://localhost:5173, http://127.0.0.1:5173
   ```

   **Allowed Logout URLs:**
   ```
   http://localhost:5173, http://127.0.0.1:5173
   ```

   **Allowed Web Origins:**
   ```
   http://localhost:5173, http://127.0.0.1:5173
   ```

5. Scroll down and click **Save Changes** 💾

### Step 4: Try Again
- Close and reopen the mobile app
- Try to log in again
- It should work! ✨

---

## 🌐 For Other Environments

If you need to run on:

### Local Network (WiFi)
Find your IP: `ipconfig` → IPv4 Address (e.g., `192.168.1.100`)

Add to Auth0:
```
http://192.168.1.100:5173
```

### Ngrok Tunnel
```bash
ngrok http 5173
```
Add the ngrok URL to Auth0:
```
https://abc123.ngrok.io
```

### Production
Add your production domain:
```
https://ladymap.app
```

---

## 🐛 Troubleshooting

### "Callback URL mismatch" still appears
- Check the Expo logs for the **exact** URL being sent
- Make sure there are **no typos** in Auth0 Dashboard
- Make sure you clicked **Save Changes** in Auth0
- Wait 30 seconds for Auth0 cache to clear

### Login popup doesn't open
- Check that all 3 servers are running (Frontend, Backend, Expo)
- Check that ADB tunnels are configured: `adb reverse --list`

### Can't see logs in Expo
- Open the Metro Bundler terminal (where you ran `npx expo start`)
- Or shake your phone → "Show Expo Menu" → "Debug Remote JS"

---

## 📱 Current Status

✅ **Mobile app is running** on phone `RF8W10DXS0V`  
✅ **All servers running:**
- Frontend: http://localhost:5173 (Terminal 3)
- Backend: http://localhost:8081 (Terminal 4)  
- Expo: exp://127.0.0.1:8082 (Terminal 1)

✅ **ADB tunnels configured:** 5173, 8081, 8082

🔍 **Watch Expo terminal for the redirect_uri!**
