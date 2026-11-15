# Auth0 Configuration for Mobile App

## Problem
When logging in via the mobile app (WebView in Expo Go), Auth0 shows:
```
Callback URL mismatch. The provided redirect_uri is not in the list of allowed callback URLs.
```

## Solution

### 1. Find the EXACT redirect_uri

The mobile app now logs the **EXACT** `redirect_uri` that is being sent to Auth0. 

To see it:
1. Open the mobile app in Expo Go
2. Try to log in
3. Check the **Expo Go logs** (Metro Bundler terminal or Expo Go app console)
4. Look for this output:

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

### 2. Add to Auth0 Dashboard

Go to: https://manage.auth0.com/dashboard/us/dev-h6e6m3uck5zb26m4/applications

1. Select your application: **`XxhQ8q4O7OO9RwYX79tc5j6ocdbcDzaB`**

2. Go to **Settings** tab

3. Add the logged URL to these three fields (separated by commas if multiple):

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

4. Scroll down and click **Save Changes**

### 3. For Production / Network Access

If you need to access the app from:
- **Local network** (e.g., `http://192.168.1.100:5173`)
- **Tunnel** (e.g., `https://abc123.ngrok.io`)
- **Production** (e.g., `https://ladymap.app`)

Add those URLs to the same three fields in Auth0 Dashboard:

```
http://localhost:5173,
http://127.0.0.1:5173,
http://192.168.1.100:5173,
https://abc123.ngrok.io,
https://ladymap.app
```

### 4. How it Works

- The frontend uses `window.location.origin` as `redirect_uri`
- When running on `http://127.0.0.1:5173`, that's what Auth0 receives
- WebView preserves this through cookies/localStorage/thirdPartyCookies
- After successful login, Auth0 redirects back to the same origin
- Auth0Provider handles the callback automatically

### 5. Debugging

The mobile app now:
- ✅ Logs `window.location.origin` on startup
- ✅ Intercepts all Auth0 API calls
- ✅ Extracts and logs the exact `redirect_uri` parameter
- ✅ Has `sharedCookiesEnabled`, `domStorageEnabled`, `thirdPartyCookiesEnabled` enabled
- ✅ Uses `cacheLocation: 'localstorage'` in Auth0Provider for mobile compatibility

Check Expo Metro Bundler terminal for all debug logs.
