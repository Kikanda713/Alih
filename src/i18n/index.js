/*
 * Point d'entrée i18n : `import { useT, LanguageSwitcher } from '../i18n'`.
 * - dict.js : langues + dictionnaire ;
 * - context.js : contexte + hook useT ;
 * - LanguageProvider.jsx : composants (fichier « composants seuls » pour le Fast Refresh).
 */
export { LANGS } from './dict'
export { useT } from './context'
export { LanguageProvider, LanguageSwitcher } from './LanguageProvider.jsx'
