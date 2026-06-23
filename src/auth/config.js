// Auth0 configuration, read from Vite env vars (see .env.example).
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
};

// Base URL of the Tindisa API gateway (BFF).
export const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// True only when the mandatory Auth0 settings are present, so the app can run
// (and degrade the auth buttons gracefully) before Auth0 is configured.
export const isAuth0Configured = Boolean(auth0Config.domain && auth0Config.clientId);
