import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [react()],
    // Développement contre une API distante (ex. la prod) sans backend local, dans .env.local :
    //   DEV_API_PROXY=https://api.tindisa.com
    //   VITE_API_URL=/__api
    // Le serveur Vite relaie /__api/* (même origine → pas de blocage CORS). Sans effet sur le build.
    server: env.DEV_API_PROXY
      ? {
          proxy: {
            '/__api': {
              target: env.DEV_API_PROXY,
              changeOrigin: true,
              rewrite: (p) => p.replace(/^\/__api/, ''),
            },
          },
        }
      : undefined,
  }
})
