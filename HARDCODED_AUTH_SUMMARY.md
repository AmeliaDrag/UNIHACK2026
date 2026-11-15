# LadyMap - Hardcoded Authentication Summary

## Status: ✅ COMPLETE (with Friends & Chat Seeding)

All Auth0 logic has been **completely removed**. User "Miriam (miriam@ladymap.app)" is now **ALWAYS logged in** with **ZERO authentication barriers** and **4 pre-seeded friends with chat conversations**.

---

## Quick Start

### Frontend:
- User: **Miriam** (miriam@ladymap.app)
- Token: `demo-token`
- Friends: **Amelia, Deborah, Lara, Sofia** (with sample chat history)
- Works **immediately** even if backend is down (fallback mode)

### Backend:
- Auto-seeds Miriam + 4 friends + trusted contacts + chat messages on startup
- Dev profile: `app.demo-auth-enabled=true`
- Accepts `Bearer demo-token` from frontend

---

## Changes Made

### 1. Frontend: Hardcoded Authentication

**Files Modified:**
- `UNIHACK2026-frontend/src/demoAuth.jsx` ← Created (hardcoded auth provider)
- `UNIHACK2026-frontend/src/main.jsx` ← Uses `HardcodedAuthProvider` instead of `Auth0Provider`
- `UNIHACK2026-frontend/src/auth.js` ← Returns `isAuthenticated: true` always (no backend dependency)
- `UNIHACK2026-frontend/.env` ← `VITE_ENABLE_DEMO_AUTH=true`

**Hardcoded User:**
```javascript
{
  sub: "demo-user-1",
  name: "Miriam",
  email: "miriam@ladymap.app",
  email_verified: true
}
```

**Token:** `"demo-token"`

**Key Fix (Final):**
- In `auth.js` line 192, changed:
  ```javascript
  isAuthenticated: isAuthenticated && !!backendProfile,  // ❌ OLD (required backend)
  ```
  to:
  ```javascript
  isAuthenticated,  // ✅ NEW (always true, no backend requirement)
  ```

This ensures the frontend shows the user as authenticated **even if the backend is unreachable** or hasn't loaded the profile yet.

---

### 2. Backend: Demo Authentication Filter

**Files Modified:**
- `backend/src/main/java/app/buburu/backend/security/DemoAuthenticationFilter.java`
  - Intercepts `Authorization: Bearer demo-token`
  - Creates authenticated user with email `miriam@ladymap.app`
  
- `backend/src/main/java/app/buburu/backend/config/DemoUserProvisioner.java`
  - Provisions user "Miriam" at startup if not exists
  
- `backend/src/main/resources/application-dev.properties`
  - `app.demo-auth-enabled=true`

**Backend Log Confirms:**
```
[Hardcoded Auth] ✓ Created demo user: Miriam (miriam@ladymap.app)
```

---

### 3. Mobile App: No Changes Needed

**Mobile app (`mobile/App.tsx`) is just a WebView** that loads `http://127.0.0.1:5173` (the frontend).

- ✅ No separate login screens in mobile
- ✅ No "Sign in" buttons in mobile
- ✅ Uses native geolocation bridge (working)
- ✅ Loads frontend directly via WebView

**Since the frontend now always shows authenticated, the mobile app automatically inherits this behavior.**

---

## Testing

### Web (http://localhost:5173)
- ✅ User is always logged in as "Miriam"
- ✅ No login screens or redirects
- ✅ Account page shows Miriam's profile
- ✅ Backend accepts `Bearer demo-token`

### Mobile (via ADB)
- ✅ WebView loads frontend directly
- ✅ No login barriers
- ✅ Geolocation works via native bridge
- ✅ User appears as "Miriam" automatically

---

## Servers Running

1. **Frontend:** `http://localhost:5173` (Terminal 3)
2. **Backend:** `http://localhost:8081` (Terminal 18, dev profile)
3. **Expo:** `exp://127.0.0.1:8082` (Terminal 1)
4. **ADB Tunnels:** Ports 5173, 8081, 8082 → Android device RF8W10DXS0V

---

## User Experience

### Before Fix:
- Mobile app showed "Sign in" button
- Pressing "Sign in" did nothing (no Auth0)
- Backend profile loading blocked authentication

### After Fix:
- ✅ Frontend loads → user is **immediately** authenticated as Miriam
- ✅ No login screens anywhere
- ✅ Account page shows Miriam's profile instantly
- ✅ Mobile WebView inherits authenticated state
- ✅ All features accessible immediately

---

## Architecture

```
Mobile App (WebView)
    ↓ loads
Frontend (React + Vite)
    ↓ uses
demoAuth.jsx (hardcoded user)
    ↓ always returns
{ isAuthenticated: true, user: Miriam }
    ↓ sends
Authorization: Bearer demo-token
    ↓ to
Backend (Spring Boot)
    ↓ accepts via
DemoAuthenticationFilter
    ↓ authenticates as
miriam@ladymap.app (provisioned at startup)
```

---

## Notes

- **No Auth0 dependencies** anywhere in the codebase
- **No conditional authentication logic** - user is always logged in
- **Backend accepts demo token** when `app.demo-auth-enabled=true` (dev profile)
- **Mobile app needs no changes** - it's just a WebView wrapper

---

## Next Steps (Optional)

If you want to re-enable real authentication later:

1. Replace `HardcodedAuthProvider` with `Auth0Provider` in `main.jsx`
2. Import `useAuth0` from `@auth0/auth0-react` instead of `demoAuth.jsx`
3. Remove `DemoAuthenticationFilter` and `DemoUserProvisioner` from backend
4. Set `app.demo-auth-enabled=false` in backend config

For now, the app runs with **zero authentication barriers** and **pre-seeded friends & chat** as requested.

---

## Related Documentation

- **[DEMO_FRIENDS_CHAT_SETUP.md](./DEMO_FRIENDS_CHAT_SETUP.md)** ← Detailed guide to friends & chat seeding
