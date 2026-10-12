import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './dashboard.css'
import Root from './Root.jsx'
import Auth0ProviderWithConfig from './auth/Auth0ProviderWithConfig.jsx'
import { LanguageProvider } from './i18n'
import { ToastProvider } from './components/Toast.jsx'
import { CartProvider } from './market/CartContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ToastProvider>
          <Auth0ProviderWithConfig>
            <CartProvider>
              <Root />
            </CartProvider>
          </Auth0ProviderWithConfig>
        </ToastProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
