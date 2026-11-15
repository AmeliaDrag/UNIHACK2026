# 🎭 Demo Authentication Mode

## Overview

The app now supports **Demo Authentication** - a hardcoded user that bypasses Auth0 entirely, allowing instant testing and demos without login screens or Auth0 configuration.

## ✅ What's Implemented

### Frontend (`UNIHACK2026-frontend`)

✅ **Environment Variable:** `VITE_ENABLE_DEMO_AUTH=true` in `.env`

✅ **Mock Auth Provider:** `demoAuth.js` provides a fake Auth0 interface:
- Returns hardcoded user: `{ sub: "demo-user-1", name: "Miriam Demo", email: "demo@ladymap.app" }`
- Returns demo token: `"demo-token"`
- Auto-authenticates on app startup (no login screens)

✅ **Seamless Integration:** 
- When demo mode is ON: Uses `DemoAuth0Provider` instead of `Auth0Provider`
- All app features work: map, SOS, trusted contacts, profile
- No changes needed in other components (they still use `useAuth0()`)

### Backend (`UNIHACK2026-backend`)

✅ **Environment Variable:** `app.demo-auth-enabled=true` in `application-dev.properties`

✅ **Demo Token Recognition:** `DemoAuthenticationFilter` intercepts requests with `Authorization: Bearer demo-token`

✅ **Mock JWT Creation:** Creates a valid JWT with demo user claims for Spring Security

✅ **Auto-Provisioning:** `DemoUserProvisioner` creates the demo user on startup:
```
[Demo Auth] ✓ Created demo user: Miriam Demo (demo@ladymap.app)
```

✅ **Security Integration:** Works in both `dev` and `auth` profiles

---

## 🚀 Usage

### Enable Demo Mode

**Frontend (`.env`):**
```env
VITE_ENABLE_DEMO_AUTH=true
```

**Backend (`application-dev.properties`):**
```properties
app.demo-auth-enabled=true
```

### Disable Demo Mode (Production)

**Frontend:**
```env
VITE_ENABLE_DEMO_AUTH=false
```

**Backend:**
```properties
app.demo-auth-enabled=false
```

Or remove the lines entirely.

---

## 🎯 How It Works

### Frontend Flow

1. App starts → checks `config.demoAuthEnabled`
2. If `true`:
   - Renders `<DemoAuth0Provider>` instead of `<Auth0Provider>`
   - Auto-authenticates as "Miriam Demo"
   - No login screens, no Auth0 redirects
3. All components use `useAuth0()` as normal
4. API calls include `Authorization: Bearer demo-token`

### Backend Flow

1. Request arrives with `Authorization: Bearer demo-token`
2. `DemoAuthenticationFilter` intercepts (runs before JWT validation)
3. If demo mode is enabled AND token is `"demo-token"`:
   - Creates mock JWT with demo user claims
   - Sets Spring Security authentication context
4. Request proceeds as authenticated user `demo-user-1`
5. All endpoints work normally (save contacts, send SOS, etc.)

---

## 📱 Mobile App (WebView)

Demo mode works automatically in the mobile app:
- WebView loads the frontend with demo mode enabled
- No Auth0 popups, no redirects
- App loads straight into the map

---

## 🔧 Demo User Details

**User ID:** `demo-user-1`  
**Name:** Miriam Demo  
**Email:** demo@ladymap.app  
**OAuth Provider:** `demo-auth` (not a real Auth0 tenant)  
**Token:** `demo-token` (hardcoded string)

**Backend Profile:**
- Phone: `null` (can be set through profile update)
- Dot Color: `#e91e8c` (pink)
- Wing Color: `#c62828` (red)

---

## ⚠️ Security Notes

### DO NOT USE IN PRODUCTION

- Demo mode bypasses all authentication
- Anyone can access the API with `"demo-token"`
- No rate limiting, no user isolation

### Safe for:
- ✅ Local development
- ✅ Demos and presentations
- ✅ Testing without Auth0 setup
- ✅ CI/CD test environments

### NOT safe for:
- ❌ Production deployments
- ❌ Public-facing servers
- ❌ Real user data

---

## 🛠️ Troubleshooting

### "Demo user already exists"
This is normal on restart. The backend checks if the user exists before creating it.

### Demo mode not working?
1. Check `.env` files have `VITE_ENABLE_DEMO_AUTH=true`
2. Check `application-dev.properties` has `app.demo-auth-enabled=true`
3. Restart both frontend and backend servers
4. Check browser console for `[Demo Auth]` messages
5. Check backend logs for demo user creation

### Still seeing Auth0 login screen?
- Make sure `VITE_ENABLE_DEMO_AUTH=true` is in the correct `.env` file
- Clear browser cache and reload
- Check the browser console - you should see:
  ```
  [Demo Auth] VITE_ENABLE_DEMO_AUTH=true - using hardcoded demo user
  ```

---

## 📊 Current Status

✅ **Frontend:** Running on http://localhost:5173 with demo mode **ENABLED**  
✅ **Backend:** Running on http://localhost:8081 with demo mode **ENABLED**  
✅ **Mobile:** WebView loads demo-enabled frontend  
✅ **Demo User:** Created in database: Miriam Demo (demo@ladymap.app)

**Try it:** Open http://localhost:5173 in your browser - you should see the app loaded directly without any login screen!
