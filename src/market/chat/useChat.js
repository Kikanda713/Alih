import { createContext, useContext } from 'react'

// Contexte du chat du site (fourni par <ChatProvider>). Séparé du composant
// pour que le rafraîchissement à chaud reste fiable (react-refresh).
export const ChatContext = createContext(null)

/**
 * openChat({ text, send, photo }) :
 *  - text  : message pré-rempli ;
 *  - send  : true = envoyé immédiatement (ex. commande depuis le panier) ;
 *  - photo : true = ouvre directement le choix d'une photo (recherche par image).
 */
export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat doit être utilisé dans <ChatProvider>')
  return ctx
}
