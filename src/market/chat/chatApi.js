import { apiBaseUrl } from '../../auth/config'

// Chat du site : jeton visiteur signé (mémoire sans compte) + flux SSE de l'agent.
const VISITOR_KEY = 'tindisa_visitor_v1'

function readVisitor() {
  try { return localStorage.getItem(VISITOR_KEY) } catch { return null }
}

export async function visitorToken({ renew = false } = {}) {
  const cached = !renew && readVisitor()
  if (cached) return cached
  const res = await fetch(`${apiBaseUrl}/v1/webchat/visitor`, { method: 'POST' })
  if (!res.ok) throw new Error(`Chat indisponible (${res.status})`)
  const { visitorToken: t } = await res.json()
  try { localStorage.setItem(VISITOR_KEY, t) } catch { /* mode privé : jeton de session seulement */ }
  return t
}

/**
 * Envoie un message (texte + URL de photos Cloudinary) et relaie la réponse
 * morceau par morceau. `accessToken` (Auth0) est optionnel : connecté = commande possible.
 * Lève une erreur avec `.status` si le serveur refuse (401 visiteur, 429 limite…).
 */
export async function streamMessage({ message, images, history, accessToken }, onToken) {
  const send = async (token) => {
    const headers = { 'content-type': 'application/json' }
    if (accessToken) headers.authorization = `Bearer ${accessToken}`
    return fetch(`${apiBaseUrl}/v1/webchat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, images, history, visitorToken: token }),
    })
  }
  let res = await send(await visitorToken())
  if (res.status === 401 && !accessToken) res = await send(await visitorToken({ renew: true })) // jeton périmé
  if (!res.ok || !res.body) {
    let msg = `Erreur ${res.status}`
    try { msg = (await res.json())?.message || msg } catch { /* corps vide */ }
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let connected = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() || ''
    for (const part of parts) {
      const line = part.replace(/^data:\s?/, '').trim()
      if (!line) continue
      try {
        const d = JSON.parse(line)
        if (d.token) onToken(d.token)
        if (d.done) connected = !!d.connected
        if (d.error) throw new Error(d.error)
      } catch (e) {
        if (e instanceof SyntaxError) continue // keep-alive / ligne partielle
        throw e
      }
    }
  }
  return { connected }
}
