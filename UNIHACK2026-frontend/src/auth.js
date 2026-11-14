/**
 * auth.js — session wrapper with dev-mode bypass, Auth0, and guest mode.
 *
 * VITE_AUTH_MODE=dev  → mock session, no Auth0 calls (default)
 * VITE_AUTH_MODE=auth → full Auth0 flow
 *
 * useSession() returns:
 *   { isLoading, isAuthenticated, isGuest, user, backendProfile,
 *     login, logout, enterGuest, guestEnabled, getAccessToken }
 *
 * The exported `useSession` is fixed at module-load time to either the dev
 * or the auth0 implementation. This means it satisfies the Rules of Hooks
 * (the same hook function is called on every render) while never calling
 * useAuth0() in dev mode where Auth0Provider is absent from the tree.
 */
import { useEffect, useRef, useState } from 'react';
import { config } from './config';
import { api } from './api';

// Auth0 is a static import — the bundle includes it regardless, but
// useAuth0() is only *called* when authMode === 'auth' (see bottom of file).
import { useAuth0 } from '@auth0/auth0-react';

// Stable guest ID persisted across page refreshes
function getGuestId() {
  let id = localStorage.getItem('guestId');
  if (!id) {
    id = 'guest-' + Math.random().toString(36).slice(2);
    localStorage.setItem('guestId', id);
  }
  return id;
}

// ── Dev-mode hook (no Auth0) ────────────────────────────────────────────────
function useDevSession() {
  const [backendProfile, setBackendProfile] = useState(null);
  const [profileError,   setProfileError]   = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    api.getMe()
      .then(setBackendProfile)
      .catch((e) => setProfileError(e.message));
  }, []);

  return {
    isLoading: false,
    isAuthenticated: true,
    isGuest: false,
    user: {
      sub:   'dev-user',
      name:  'Dev User',
      email: 'ana@test.com',
      'https://safewalk.app/roles': [],
    },
    backendProfile,
    profileError,
    getAccessToken: async () => null,
    login:      () => {},
    logout:     () => {},
    enterGuest: () => {},
    guestEnabled: config.guestEnabled,
  };
}

// ── Auth0 hook ──────────────────────────────────────────────────────────────
function useAuth0Session() {
  const {
    isLoading,
    isAuthenticated,
    user,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [isGuest, setIsGuest] = useState(() => !!localStorage.getItem('guest'));
  const [backendProfile, setBackendProfile] = useState(null);
  const [profileError,   setProfileError]   = useState(null);
  const fetched = useRef(false);

  const getAccessToken = () =>
    getAccessTokenSilently({
      authorizationParams: { audience: config.auth0Audience },
    });

  // Once Auth0 login succeeds, fetch backend profile once
  useEffect(() => {
    if (!isAuthenticated || isGuest || fetched.current) return;
    fetched.current = true;
    api.getMe()
      .then(setBackendProfile)
      .catch((e) => setProfileError(e.message));
  }, [isAuthenticated, isGuest]);

  const logout = () => {
    if (isGuest) {
      localStorage.removeItem('guest');
      setIsGuest(false);
    } else {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    }
  };

  if (isGuest) {
    return {
      isLoading: false,
      isAuthenticated: true,
      isGuest: true,
      user: {
        sub:   getGuestId(),
        name:  'Guest',
        email: null,
        'https://safewalk.app/roles': [],
      },
      backendProfile: null,
      profileError:   null,
      getAccessToken: async () => null,
      login:      () => {},
      logout,
      enterGuest: () => {},
      guestEnabled: config.guestEnabled,
    };
  }

  return {
    isLoading,
    isAuthenticated,
    isGuest: false,
    user: isAuthenticated ? user : null,
    backendProfile,
    profileError,
    getAccessToken,
    login:      () => loginWithRedirect(),
    logout,
    enterGuest: () => {
      localStorage.setItem('guest', '1');
      setIsGuest(true);
    },
    guestEnabled: config.guestEnabled,
  };
}

// ── Public export ────────────────────────────────────────────────────────────
// config.authMode is a constant (read from import.meta.env at build time),
// so this ternary is resolved once at module load — the same function is
// always returned, satisfying the Rules of Hooks.
export const useSession =
  config.authMode === 'auth' ? useAuth0Session : useDevSession;
