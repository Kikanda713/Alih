import { useState, useCallback, useMemo } from 'react'
import { STORAGE_KEY, DEFAULT_LANG, LANGS, dict } from './dict'
import { LanguageContext, useT } from './context'

/* Composants i18n (fournisseur de langue + sélecteur). Dictionnaire : dict.js. */

function readInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LANGS.includes(saved)) return saved
  } catch {
    /* ignore (e.g. SSR / privacy mode) */
  }
  return DEFAULT_LANG
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang)

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key, vars) => {
      const table = dict[lang] || dict[DEFAULT_LANG]
      let str = table[key] ?? dict[DEFAULT_LANG][key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, v)
        }
      }
      return str
    },
    [lang]
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

const LANG_LABELS = { fr: 'FR', ln: 'LN', sw: 'SW' }

export function LanguageSwitcher() {
  const { lang, setLang } = useT()
  return (
    <div className="lang-switcher" role="group" aria-label="Langue">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-btn${lang === code ? ' active' : ''}`}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {LANG_LABELS[code]}
        </button>
      ))}
    </div>
  )
}
