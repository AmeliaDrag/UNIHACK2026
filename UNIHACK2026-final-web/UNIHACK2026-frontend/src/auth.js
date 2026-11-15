/**
 * auth.js — session management with hardcoded user (NO Auth0)
 *
 * useSession() → { isLoading, isAuthenticated, user, login, loginSignUp,
 *                  logout, enterGuest, isGuest, guestEnabled,
 *                  backendProfile, profileError, profileLoading,
 *                  showProfilePrompt, dismissProfilePrompt }
 *
 * Flow: User is always authenticated as hardcoded demo user.
 */
import { useAuth0 } from './demoAuth.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { config } from './config';
import { DEMO_TOKEN } from './demoAuth.jsx';
import { backendApi, setTokenProvider, clearTokenProvider } from './api';

// ── Guest helpers ─────────────────────────────────────────────────────────────
function getGuestId() {
  let id = localStorage.getItem('guestId');
  if (!id) {
    id = 'guest-' + Math.random().toString(36).slice(2);
    localStorage.setItem('guestId', id);
  }
  return id;
}

// ── Profile-prompt localStorage key ──────────────────────────────────────────
function promptKey(sub) {
  return `profilePromptSeen:${config.auth0Domain}:${sub}`;
}

function hasSeenPrompt(sub) {
  try { return !!localStorage.getItem(promptKey(sub)); } catch { return true; }
}

function markPromptSeen(sub) {
  try { localStorage.setItem(promptKey(sub), '1'); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

export function useSession() {
  const {
    isLoading: auth0Loading,
    isAuthenticated,
    user,
    error: auth0Error,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [isGuest, setIsGuest] = useState(() => config.guestEnabled && !!localStorage.getItem('guest'));

  // Backend state
  const [backendProfile, setBackendProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError,   setProfileError]   = useState(null); // { status, message }
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  // Log the raw Auth0 error so the real cause is visible in the console
  useEffect(() => {
    if (!auth0Error) return;
    console.error('[auth] Auth0 error:', {
      error: auth0Error.error,
      message: auth0Error.message,
      error_description: auth0Error.error_description,
    });
  }, [auth0Error]);

  // Avoid duplicate /users/me calls
  const initDoneRef = useRef(false);

  // ── Initialize backend after Auth0 authenticates ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user || isGuest) return;
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const init = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        // Always use demo token (no Auth0)
        const tokenFn = async () => {
          console.log('[Hardcoded Auth] Returning demo token');
          return DEMO_TOKEN;
        };
        setTokenProvider(tokenFn);

        // Fetch or provision backend profile
        console.log('[auth] calling GET /api/v1/users/me');
        const profile = await backendApi.getMe();
        console.log('[auth] /users/me →', profile);
        setBackendProfile(profile);

        // Decide whether to show profile prompt
        if (profile.phoneNumber === null && !hasSeenPrompt(user.sub)) {
          setShowProfilePrompt(true);
        }
      } catch (err) {
        console.error('[auth] /users/me error:', err);
        setProfileError({ status: err.status ?? 0, message: err.message, url: err.url, body: err.body });
        clearTokenProvider();
        initDoneRef.current = false; // allow retry
      } finally {
        setProfileLoading(false);
      }
    };

    init();
  }, [isAuthenticated, user, isGuest]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const login = useCallback(() => {
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: config.auth0Audience,
        scope: 'openid profile email',
      },
    });
  }, [loginWithRedirect]);

  const loginSignUp = useCallback(() => {
    loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: config.auth0Audience,
        scope: 'openid profile email',
        screen_hint: 'signup',
      },
    });
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    if (isGuest) {
      localStorage.removeItem('guest');
      setIsGuest(false);
      return;
    }
    // Clear account-specific state
    setBackendProfile(null);
    setProfileError(null);
    setShowProfilePrompt(false);
    initDoneRef.current = false;
    clearTokenProvider();
    // Clear session-scoped items (not profilePromptSeen — that's a persistent UI pref)
    localStorage.removeItem('sid');
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [isGuest, auth0Logout]);

  const enterGuest = useCallback(() => {
    localStorage.setItem('guest', '1');
    setIsGuest(true);
  }, []);

  const dismissProfilePrompt = useCallback((saved = false) => {
    if (user) markPromptSeen(user.sub);
    setShowProfilePrompt(false);
    if (saved && backendProfile) {
      // backendProfile was already updated by the caller via updateBackendProfile
    }
  }, [user, backendProfile]);

  const updateBackendProfile = useCallback((profile) => {
    setBackendProfile(profile);
  }, []);

  // ── Guest session ─────────────────────────────────────────────────────────
  if (isGuest) {
    return {
      isLoading: false,
      isAuthenticated: true,
      isGuest: true,
      user: {
        sub:   getGuestId(),
        name:  'Vizitator',
        email: null,
        'https://safewalk.app/roles': [],
      },
      backendProfile: null,
      profileLoading: false,
      profileError:   null,
      authError:      null,
      showProfilePrompt: false,
      login:      () => {},
      loginSignUp: () => {},
      logout,
      enterGuest: () => {},
      dismissProfilePrompt: () => {},
      updateBackendProfile,
      guestEnabled: config.guestEnabled,
    };
  }

  // ── Loading: Auth0 SDK initialising ───────────────────────────────────────
  const isLoading = auth0Loading || (isAuthenticated && profileLoading && !backendProfile && !profileError);

  return {
    isLoading,
    isAuthenticated, // ✅ ALWAYS authenticated (hardcoded user), no backend requirement
    isGuest: false,
    user: isAuthenticated ? user : null,
    backendProfile,
    profileLoading,
    profileError,
    authError: auth0Error ? auth0Error.message : null,
    showProfilePrompt,
    login,
    loginSignUp,
    logout,
    enterGuest,
    dismissProfilePrompt,
    updateBackendProfile,
    guestEnabled: config.guestEnabled,
  };
}
