import { useAuth0 } from '@auth0/auth0-react'
import { apiBaseUrl, auth0Config } from '../auth/config'
import { DEMO_MODE } from '../demo/demo' // DEMO: retirer en production
import { mockApi } from '../demo/mockApi' // DEMO: retirer en production

// Low-level fetch to the Tindisa gateway. Pass an access token to authenticate.
export async function apiFetch(path, { token, method = 'GET', body } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers['authorization'] = `Bearer ${token}`
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

// Hook returning an authenticated API caller. MUST be used inside Auth0Provider
// (i.e. when Auth0 is configured). It attaches the user's Auth0 access token so
// the backend can authenticate the user on important operations.
export function useTindisaApi() {
  // DEMO: en mode démo, on renvoie l'API fictive (aucun Auth0/backend requis).
  // Retirer ces 2 lignes en production. DEMO_MODE est constant -> branche stable.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (DEMO_MODE) return mockApi

  const { getAccessTokenSilently, loginWithRedirect } = useAuth0()

  // Récupère un access token pour l'API Tindisa (audience). Le SDK rafraîchit
  // silencieusement via le refresh token si l'access token est expiré. Si la
  // session est réellement perdue (refresh expiré/révoqué), on relance le login
  // NATIF Auth0 en revenant sur la page courante après authentification.
  const getToken = async () => {
    try {
      return await getAccessTokenSilently(
        auth0Config.audience
          ? { authorizationParams: { audience: auth0Config.audience } }
          : undefined,
      )
    } catch (e) {
      const code = e?.error || e?.message
      if (
        code === 'login_required' ||
        code === 'consent_required' ||
        code === 'missing_refresh_token' ||
        code === 'invalid_grant'
      ) {
        await loginWithRedirect({
          appState: { returnTo: window.location.pathname + window.location.search },
        })
      }
      throw e
    }
  }

  const call = async (path, opts = {}) => {
    const token = await getToken()
    return apiFetch(path, { ...opts, token })
  }

  // Chat assistant en streaming (SSE). onToken reçoit chaque morceau ; renvoie
  // { conversationId } à la fin. Repli automatique sur /v1/agent/chat si le
  // streaming n'est pas disponible.
  const streamChat = async (body, onToken) => {
    const token = await getToken()
    let res
    try {
      res = await fetch(`${apiBaseUrl}/v1/agent/chat/stream`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
    } catch {
      res = null
    }
    if (!res || !res.ok || !res.body) {
      const r = await apiFetch('/v1/agent/chat', { method: 'POST', body, token })
      if (r?.reply?.content) onToken(r.reply.content)
      return { conversationId: r?.conversationId }
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let conversationId
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
          if (d.done) conversationId = d.conversationId
        } catch { /* ignore keep-alive */ }
      }
    }
    return { conversationId }
  }

  return {
    get: (path) => call(path),
    post: (path, body) => call(path, { method: 'POST', body }),
    put: (path, body) => call(path, { method: 'PUT', body }),
    del: (path) => call(path, { method: 'DELETE' }),
    streamChat,
  }
}
