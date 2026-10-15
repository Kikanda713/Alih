import { createContext, useContext } from 'react'

// Contexte de l'assistant du tableau de bord (fourni par <AssistantProvider>).
// Séparé des composants pour que le rafraîchissement à chaud reste fiable.
export const AssistantContext = createContext(null)

/**
 * openAssistant({ text, send, conversationId }) :
 *  - text           : message pré-rempli ;
 *  - send           : true = envoyé immédiatement ;
 *  - conversationId : reprend cette conversation.
 */
export function useAssistant() {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error('useAssistant doit être utilisé dans <AssistantProvider>')
  return ctx
}
