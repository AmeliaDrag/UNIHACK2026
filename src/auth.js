/**
 * auth.js — thin session wrapper over Auth0, with optional guest mode.
 *
 * useSession() returns { isLoading, isAuthenticated, user, login, logout, enterGuest, isGuest }
 *
 * Guest mode is controlled by VITE_GUEST_ENABLED=true in .env.
 * To disable it before production: set VITE_GUEST_ENABLED=false or remove the line.
 */
import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';
import { config } from './config';

// Stable guest ID persisted across page refreshes
function getGuestId() {
  let id = localStorage.getItem('guestId');
  if (!id) {
    id = 'guest-' + Math.random().toString(36).slice(2);
    localStorage.setItem('guestId', id);
  }
  return id;
}

export function useSession() {
  const { isLoading, isAuthenticated, user, loginWithRedirect, logout: auth0Logout } = useAuth0();
  const [isGuest, setIsGuest] = useState(() => !!localStorage.getItem('guest'));

  const enterGuest = () => {
    localStorage.setItem('guest', '1');
    setIsGuest(true);
  };

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
      isAuthenticated: true,   // treat guest as authenticated so the app renders
      isGuest: true,
      user: {
        sub:   getGuestId(),
        name:  'Vizitator',
        email: null,
        // guests have no roles
        'https://safewalk.app/roles': [],
      },
      login:      () => {},    // no-op while in guest mode
      logout,
      enterGuest: () => {},    // already in guest mode
      guestEnabled: config.guestEnabled,
    };
  }

  return {
    isLoading,
    isAuthenticated,
    isGuest: false,
    user: isAuthenticated ? user : null,
    login:        () => loginWithRedirect(),
    logout,
    enterGuest,
    guestEnabled: config.guestEnabled,
  };
}
