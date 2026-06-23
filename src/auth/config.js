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

// Cloudinary — upload non signé des images produit (comme Wanzo). Le preset
// DOIT être de type "unsigned" pour l'upload depuis le navigateur.
export const cloudinary = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
};
export const isCloudinaryConfigured = Boolean(
  cloudinary.cloudName && cloudinary.uploadPreset,
);

// Canaux du marchand — accès direct depuis le dashboard. Surcharge via env ;
// la page Facebook gérée par Tindisa peut être propre à chaque marchand.
export const channels = {
  whatsapp: import.meta.env.VITE_WHATSAPP_URL || 'https://web.whatsapp.com',
  telegram: import.meta.env.VITE_TELEGRAM_URL || 'https://web.telegram.org',
  facebook: import.meta.env.VITE_FACEBOOK_PAGE_URL || 'https://www.facebook.com',
};
