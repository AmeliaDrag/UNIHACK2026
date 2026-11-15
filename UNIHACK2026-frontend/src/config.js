/**
 * config.js — environment variable validation.
 *
 * Import `missingVars` in main.jsx before mounting the app.
 * If the array is non-empty, render <ConfigError /> instead of <App />.
 * No fake data, no fallbacks — if config is broken the app says so clearly.
 */

const REQUIRED = [
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
];

export const missingVars = REQUIRED.filter(
  (key) => !import.meta.env[key] || import.meta.env[key].trim() === ''
);

export const config = {
  auth0Domain:   import.meta.env.VITE_AUTH0_DOMAIN,
  auth0ClientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  auth0Audience: import.meta.env.VITE_AUTH0_AUDIENCE || undefined,

  // Set VITE_GUEST_ENABLED=true in .env to show the "Continuă fără cont" button.
  // Set to false or remove the line before going to production.
  guestEnabled:  import.meta.env.VITE_GUEST_ENABLED === 'true',
};
