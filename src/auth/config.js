// Auth0 configuration, read from Vite env vars (see .env.example).
// Convention de callback alignée sur Wanzo : chemin explicite `/auth/callback`
// (ex. http://localhost:5173/auth/callback en local, https://tindisa.com/auth/callback
// en prod). Calculé depuis l'origine si VITE_AUTH0_CALLBACK_URL n'est pas fourni.
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  callbackUrl:
    import.meta.env.VITE_AUTH0_CALLBACK_URL ||
    `${window.location.origin}/auth/callback`,
  logoutUrl: import.meta.env.VITE_AUTH0_LOGOUT_URL || window.location.origin,
};

// Base URL of the Tindisa API gateway (BFF).
export const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// True only when the mandatory Auth0 settings are present, so the app can run
// (and degrade the auth buttons gracefully) before Auth0 is configured.
export const isAuth0Configured = Boolean(auth0Config.domain && auth0Config.clientId);

// Cloudinary — upload non signé des images produit. Le preset est de type
// "unsigned" (conçu pour l'upload navigateur) → valeurs publiques sûres. Défauts =
// la Cloudinary Tindisa (identiques au plugin OpenClaw) pour que l'upload marche
// même si le build n'a pas les VITE_CLOUDINARY_* ; surchargeable par env.
export const cloudinary = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'en7ocjnd',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'tindisa_products',
};
export const isCloudinaryConfigured = Boolean(
  cloudinary.cloudName && cloudinary.uploadPreset,
);

// Canaux du marchand — accès direct depuis le dashboard. Surcharge via env ;
// la page Facebook gérée par Tindisa peut être propre à chaque marchand.
export const channels = {
  whatsapp: import.meta.env.VITE_WHATSAPP_URL || 'https://web.whatsapp.com',
  telegram: import.meta.env.VITE_TELEGRAM_URL || 'https://t.me/Tindisa_tbot',
  facebook: import.meta.env.VITE_FACEBOOK_PAGE_URL || 'https://www.facebook.com',
};
