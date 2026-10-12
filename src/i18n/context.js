import { createContext, useContext } from 'react'
import { DEFAULT_LANG } from './dict'

// Contexte de langue (fourni par <LanguageProvider>, cf. LanguageProvider.jsx).
// Séparé des composants pour le Fast Refresh.
export const LanguageContext = createContext({ lang: DEFAULT_LANG, setLang: () => {}, t: (k) => k })

export function useT() {
  return useContext(LanguageContext)
}
