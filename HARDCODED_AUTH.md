# 🔐 Hardcoded Authentication - NO Auth0

## ✅ Complete Implementation

**Auth0 has been completely removed.** The app now uses a single hardcoded user that is ALWAYS logged in.

---

## 👤 Hardcoded User

**Name:** Miriam  
**Email:** miriam@ladymap.app  
**User ID:** demo-user-1  
**Token:** `demo-token`

**This user is:**
- ✅ Always authenticated (no login screen)
- ✅ Created automatically in the database on backend startup
- ✅ Available instantly on app load (web and mobile)

---

## 🎯 What Was Changed

### Frontend (`UNIHACK2026-frontend`)

#### **Removed:**
- ❌ `@auth0/auth0-react` dependency usage
- ❌ `Auth0Provider` wrapper
- ❌ Auth0 login/logout flows
- ❌ All Auth0 redirect logic
- ❌ Conditional auth logic

#### **Added:**
- ✅ `src/demoAuth.jsx` - Mock Auth0 interface (always returns authenticated user)
- ✅ `HardcodedAuthProvider` - Drop-in replacement for `Auth0Provider`
- ✅ Mock `useAuth0()` hook - Always returns `isAuthenticated: true`
- ✅ Hardcoded `getAccessTokenSilently()` - Always returns `"demo-token"`

#### **Updated:**
- ✅ `main.jsx` - Uses `HardcodedAuthProvider` instead of `Auth0Provider`
- ✅ `auth.js` - Imports from `demoAuth.jsx` instead of `@auth0/auth0-react`
- ✅ `.env` - Marked Auth0 credentials as optional/unused

### Backend (`UNIHACK2026-backend`)

#### **Added:**
- ✅ `DemoAuthenticationFilter.java` - Recognizes `Bearer demo-token`
- ✅ `DemoUserProvisioner.java` - Creates Miriam user on startup
- ✅ `application-dev.properties` - `app.demo-auth-enabled=true`

#### **Security Flow:**
1. Request arrives with `Authorization: Bearer demo-token`
2. `DemoAuthenticationFilter` intercepts (before JWT validation)
3. Creates mock JWT with Miriam's claims
4. Sets Spring Security authentication context
5. Request proceeds as authenticated user

---

## 🚀 How It Works

### On App Startup:

**Frontend:**
```javascript
1. App loads → main.jsx renders HardcodedAuthProvider
2. useAuth0() immediately returns: { isAuthenticated: true, user: { name: "Miriam", email: "miriam@ladymap.app" } }
3. No login screens, no Auth0 popups, no redirects
4. App renders normally with full user context
```

**Backend:**
```java
1. Spring Boot starts
2. DemoUserProvisioner runs @PostConstruct
3. Checks if miriam@ladymap.app exists
4. If not, creates user in database
5. Logs: "[Hardcoded Auth] ✓ Created demo user: Miriam (miriam@ladymap.app)"
```

### On API Requests:

**Frontend:**
```javascript
1. API call triggered (e.g., save trusted contact)
2. backendApi includes header: Authorization: Bearer demo-token
3. Fetch sent to backend
```

**Backend:**
```java
1. Request hits DemoAuthenticationFilter
2. Filter sees "Bearer demo-token"
3. Creates mock JWT for demo-user-1
4. Sets SecurityContext authentication
5. Request proceeds to controller as authenticated
6. Controller accesses user via @CurrentUser annotation
7. Response sent back to frontend
```

---

## 📱 Mobile App

The mobile WebView automatically loads the hardcoded-auth frontend:
- ✅ No Auth0 redirects (WebView stays on same page)
- ✅ No popup windows
- ✅ Instant load into the map
- ✅ All features work: SOS, contacts, chat, reports

---

## 🔧 Configuration

### Enable (Current State)

**Frontend `.env`:**
```env
VITE_ENABLE_DEMO_AUTH=true
```

**Backend `application-dev.properties`:**
```properties
app.demo-auth-enabled=true
```

### Disable (Switch Back to Auth0)

To restore Auth0 authentication:

1. **Frontend:**
   - Restore `Auth0Provider` in `main.jsx`
   - Import `useAuth0` from `@auth0/auth0-react` in `auth.js`
   - Set `VITE_ENABLE_DEMO_AUTH=false`

2. **Backend:**
   - Set `app.demo-auth-enabled=false`
   - Use `auth` Spring profile instead of `dev`

---

## ⚠️ Security Warning

### DO NOT USE IN PRODUCTION

This is a **development/demo bypass** only:
- ❌ No authentication security
- ❌ Anyone can access API with "demo-token"
- ❌ No user isolation
- ❌ No rate limiting

### Safe For:
- ✅ Local development
- ✅ Demos and presentations
- ✅ Testing without Auth0 setup
- ✅ CI/CD test pipelines

---

## 🛠️ Troubleshooting

### Still seeing a login screen?
- Check `.env` has `VITE_ENABLE_DEMO_AUTH=true`
- Restart frontend server: `npm run dev`
- Clear browser cache
- Check console for: `[Hardcoded Auth] Using hardcoded user: Miriam`

### Backend rejecting API calls?
- Check backend logs for: `[Hardcoded Auth] ✓ Created demo user`
- Verify `dev` profile is active (not `auth`)
- Check `application-dev.properties` has `app.demo-auth-enabled=true`

### Mobile app not loading?
- Check frontend is running on http://localhost:5173
- Check ADB tunnels: `adb reverse --list`
- Refresh WebView (shake phone → Reload)

---

## 📊 Current Status

✅ **Frontend:** http://localhost:5173 - Hardcoded auth ACTIVE  
✅ **Backend:** http://localhost:8081 - Hardcoded auth ACTIVE  
✅ **Mobile:** WebView loads with zero Auth0 popups  
✅ **User:** Miriam (miriam@ladymap.app) - Created in database

**Open http://localhost:5173 now - you should see the map instantly with NO login screen!** 🎉
