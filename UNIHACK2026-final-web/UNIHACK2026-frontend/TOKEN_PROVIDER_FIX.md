# Token Provider Fix - API Calls Now Work Immediately

## Problem

When clicking "Find route" or making any backend API calls, the frontend threw this error:

```
Error: No token provider set. Call setTokenProvider() after login.
```

**Root Cause:**
- `src/api.js` expected `setTokenProvider()` to be called after Auth0 login
- We removed Auth0 and switched to hardcoded authentication (`demoAuth.jsx`)
- The token provider was never set, so `getBearerToken()` threw an error

**Affected Features:**
- ❌ Find route (route planning)
- ❌ SOS alerts
- ❌ Chat messages (when backend is running)
- ❌ Friends list (when backend is running)
- ❌ Any backend API call requiring authentication

---

## Solution

### 1. Default Token Provider in `api.js`

**File:** `src/api.js`

**Changed:**
```javascript
// OLD (threw error if not set):
let _tokenProvider = null;

async function getBearerToken() {
  if (!_tokenProvider) throw new Error('No token provider set...');
  return _tokenProvider();
}
```

**To:**
```javascript
// NEW (defaults to demo-token):
let _tokenProvider = async () => {
  console.log('[api.js] Using default demo token');
  return 'demo-token';
};

async function getBearerToken() {
  // Always use token provider (now defaults to demo-token)
  if (!_tokenProvider) {
    console.warn('[api.js] No token provider, using demo-token as fallback');
    return 'demo-token';
  }
  return _tokenProvider();
}
```

**Benefits:**
- ✅ API never throws "No token provider" error
- ✅ Always sends `Authorization: Bearer demo-token`
- ✅ Works immediately on app load
- ✅ Can still override with `setTokenProvider()` if needed

---

### 2. Explicit Token Provider Setup in `demoAuth.jsx`

**File:** `src/demoAuth.jsx`

**Added:**
```javascript
import { setTokenProvider } from './api';

export function HardcodedAuthProvider({ children }) {
  // Set token provider on mount so all API calls work immediately
  useEffect(() => {
    console.log('[Hardcoded Auth] Setting demo token provider');
    setTokenProvider(async () => {
      console.log('[Hardcoded Auth] Token provider called, returning demo-token');
      return DEMO_TOKEN;
    });
  }, []);

  return (
    <Auth0Context.Provider value={mockAuth0}>
      {children}
    </Auth0Context.Provider>
  );
}
```

**Benefits:**
- ✅ Explicitly sets token provider on app mount
- ✅ Console logs confirm token provider is active
- ✅ Ensures consistent token across all API calls

---

## How It Works Now

### Token Provider Flow

```
App Start
    ↓
main.jsx renders <HardcodedAuthProvider>
    ↓
HardcodedAuthProvider.useEffect() runs
    ↓
setTokenProvider(async () => 'demo-token')
    ↓
_tokenProvider is set in api.js
    ↓
Any API call → getBearerToken() → 'demo-token'
    ↓
Request sent with: Authorization: Bearer demo-token
    ↓
Backend validates token (DemoAuthenticationFilter)
    ✅ Success!
```

### Default Fallback (if Provider Not Set)

```
App Start (edge case: provider not set yet)
    ↓
api.js initializes with default:
_tokenProvider = async () => 'demo-token'
    ↓
Any API call → getBearerToken() → 'demo-token'
    ↓
Still works! (no error thrown)
```

---

## Testing

### Before Fix:
```
❌ Click "Find route" → Error: No token provider set
❌ Click SOS ladybug → Error: No token provider set
❌ Send chat message (backend) → Error: No token provider set
```

### After Fix:
```
✅ Click "Find route" → API call with Bearer demo-token → Route returned
✅ Click SOS ladybug → API call with Bearer demo-token → Alert sent
✅ Send chat message (backend) → API call with Bearer demo-token → Message saved
✅ Any backend API call → Works immediately!
```

### Console Logs (Expected):
```
[Hardcoded Auth] Setting demo token provider
[Hardcoded Auth] Token provider called, returning demo-token
[api.js] POST /api/v1/routes -> 200 OK
```

---

## Files Modified

### 1. `src/api.js`
**Changes:**
- Set default `_tokenProvider` to return `'demo-token'`
- Updated `getBearerToken()` to use default instead of throwing
- Updated `clearTokenProvider()` to reset to default (not null)

**Lines changed:** ~10 lines

---

### 2. `src/demoAuth.jsx`
**Changes:**
- Import `setTokenProvider` from `./api`
- Add `useEffect` hook in `HardcodedAuthProvider`
- Call `setTokenProvider(async () => DEMO_TOKEN)` on mount

**Lines added:** ~10 lines

---

## Backend Integration

The backend accepts `Bearer demo-token` via `DemoAuthenticationFilter.java`:

```java
@Override
protected void doFilterInternal(...) {
    String authHeader = request.getHeader("Authorization");
    
    if (authHeader != null && authHeader.startsWith("Bearer demo-token")) {
        // Create authenticated user: miriam@ladymap.app
        Authentication auth = new UsernamePasswordAuthenticationToken(
            "miriam@ladymap.app", null, authorities
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
    
    chain.doFilter(request, response);
}
```

**When backend is running:**
- ✅ Validates `Bearer demo-token`
- ✅ Authenticates as `miriam@ladymap.app`
- ✅ All API endpoints work (routes, SOS, chat, etc.)

**When backend is down:**
- ✅ Frontend fallback still works (hardcoded friends/chat)
- ✅ No error thrown (graceful degradation)

---

## Benefits Summary

✅ **No More Errors:**
- "No token provider set" error eliminated
- All API calls work immediately on app load

✅ **Consistent Token:**
- All requests send `Authorization: Bearer demo-token`
- Backend recognizes and authenticates user

✅ **Graceful Fallback:**
- If provider not set → uses default
- If backend down → frontend fallback works

✅ **Easy to Override:**
- Can still call `setTokenProvider()` with custom logic
- Maintains flexibility for future auth systems

✅ **Better Debugging:**
- Console logs show when token provider is set/used
- Easy to track API authentication flow

---

## Rollback (if needed)

To revert to Auth0 authentication:

1. **Revert `api.js`:**
   ```javascript
   let _tokenProvider = null;
   
   async function getBearerToken() {
     if (!_tokenProvider) throw new Error('No token provider set...');
     return _tokenProvider();
   }
   ```

2. **Remove from `demoAuth.jsx`:**
   ```javascript
   // Remove import
   import { setTokenProvider } from './api';
   
   // Remove useEffect hook
   useEffect(() => { ... }, []);
   ```

3. **Restore Auth0Provider in `main.jsx`:**
   ```javascript
   import { Auth0Provider } from '@auth0/auth0-react';
   ```

---

## Technical Details

### Token Provider Function Signature

```typescript
type TokenProvider = () => Promise<string>;
```

**Default Implementation:**
```javascript
const defaultTokenProvider: TokenProvider = async () => {
  console.log('[api.js] Using default demo token');
  return 'demo-token';
};
```

**Override Implementation (in demoAuth.jsx):**
```javascript
const customTokenProvider: TokenProvider = async () => {
  console.log('[Hardcoded Auth] Token provider called, returning demo-token');
  return DEMO_TOKEN; // 'demo-token'
};

setTokenProvider(customTokenProvider);
```

### HTTP Request Headers

**Before fix:**
```
❌ No Authorization header (error thrown before request sent)
```

**After fix:**
```
✅ Authorization: Bearer demo-token
```

### Backend Authentication Flow

```
1. Frontend: fetch('/api/v1/routes', { 
     headers: { Authorization: 'Bearer demo-token' } 
   })
   
2. Backend: DemoAuthenticationFilter intercepts request
   
3. Backend: Checks if header === 'Bearer demo-token'
   
4. Backend: Creates Authentication for miriam@ladymap.app
   
5. Backend: Sets SecurityContext
   
6. Backend: Continues to controller (authorized)
   
7. Backend: Returns route data
   
8. Frontend: Receives response (success!)
```

---

## Related Documentation

- **HARDCODED_AUTH_SUMMARY.md** - Full hardcoded auth system
- **DEMO_FRIENDS_CHAT_SETUP.md** - Backend seeding & fallback
- **STATUS_FINAL.md** - Complete app status

---

## Summary

✅ **Fixed:** "No token provider set" error  
✅ **Method:** Default token provider + explicit setup on mount  
✅ **Result:** All API calls work immediately with `Bearer demo-token`  
✅ **Backend:** Recognizes token and authenticates as Miriam  
✅ **Fallback:** Works even if backend is down  

**All features now work out of the box!** 🎉

---

**Modified Files:**
- `src/api.js` (~10 lines changed)
- `src/demoAuth.jsx` (~10 lines added)

**Testing:** Click "Find route" or any API feature → Works! ✅
