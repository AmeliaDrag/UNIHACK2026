/**
 * demoAuth.jsx — Hardcoded authenticated user (NO Auth0)
 * 
 * This completely replaces Auth0 with a single always-logged-in user.
 */

import { createContext, useContext, useEffect } from 'react';
import { setTokenProvider } from './api';

// ── Hardcoded demo user (ALWAYS logged in) ───────────────────────────────────
export const DEMO_USER = {
  sub: 'demo-user-1',
  name: 'Miriam',
  email: 'miriam@ladymap.app',
  email_verified: true,
  picture: '',
  updated_at: new Date().toISOString(),
  'https://safewalk.app/roles': [],
};

export const DEMO_TOKEN = 'demo-token';

// ── Mock useAuth0 hook (always authenticated) ────────────────────────────────
const mockAuth0 = {
  isLoading: false,
  isAuthenticated: true,
  user: DEMO_USER,
  error: null,
  loginWithRedirect: async () => {
    console.log('[Hardcoded Auth] No login needed - already authenticated');
  },
  logout: async () => {
    console.log('[Hardcoded Auth] Logout bypassed - user stays logged in');
  },
  getAccessTokenSilently: async () => {
    console.log('[Hardcoded Auth] Returning demo token');
    return DEMO_TOKEN;
  },
};

const Auth0Context = createContext(mockAuth0);

// ── Drop-in replacement for Auth0Provider ────────────────────────────────────
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

// ── Drop-in replacement for useAuth0 ─────────────────────────────────────────
export function useAuth0() {
  return useContext(Auth0Context);
}
