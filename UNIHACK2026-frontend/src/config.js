/**
 * config.js — environment variable validation.
 *
 * VITE_AUTH_MODE controls whether Auth0 is required:
 *   dev  — no token, mock session (default)
 *   auth — full Auth0 flow, Auth0 vars become required
 *
 * Import `missingVars` in main.jsx before mounting the app.
 * If the array is non-empty, render <ConfigError /> instead of <App />.
 */

const authMode = import.meta.env.VITE_AUTH_MODE || 'dev';

// Auth0 vars are only required when running in auth mode
const AUTH0_VARS = [
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
];

export const missingVars =
  authMode === 'auth'
    ? AUTH0_VARS.filter(
        (key) => !import.meta.env[key] || import.meta.env[key].trim() === ''
      )
    : [];

export const config = {
  authMode,

  auth0Domain:   import.meta.env.VITE_AUTH0_DOMAIN,
  auth0ClientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  auth0Audience: import.meta.env.VITE_AUTH0_AUDIENCE || undefined,

  // Set VITE_GUEST_ENABLED=true in .env to show the "Continue without account" button.
  // Set to false or remove the line before going to production.
  guestEnabled:  import.meta.env.VITE_GUEST_ENABLED === 'true',
};
