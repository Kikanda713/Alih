import { useAuth0 } from '@auth0/auth0-react'
import { apiBaseUrl } from '../auth/config'

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
  const { getAccessTokenSilently } = useAuth0()

  const call = async (path, opts = {}) => {
    const token = await getAccessTokenSilently()
    return apiFetch(path, { ...opts, token })
  }

  return {
    get: (path) => call(path),
    post: (path, body) => call(path, { method: 'POST', body }),
    put: (path, body) => call(path, { method: 'PUT', body }),
    del: (path) => call(path, { method: 'DELETE' }),
  }
}
