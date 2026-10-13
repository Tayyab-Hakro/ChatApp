const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const TOKEN_KEY = 'gather.accessToken'

let refreshRequest

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function saveAccessToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

function urlFor(path) {
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/api/')) return `${API_BASE}${path.slice(4)}`
  return `${API_BASE}/${path.replace(/^\//, '')}`
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = fetch(urlFor('/auth/refresh'), {
      method: 'POST',
      credentials: 'include'
    }).then(async (response) => {
      const body = response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok || !body?.accessToken) {
        saveAccessToken(null)
        throw new ApiError(body?.error?.message || 'Your session has expired. Please sign in again.', response.status)
      }
      saveAccessToken(body.accessToken)
      return body.accessToken
    }).finally(() => {
      refreshRequest = undefined
    })
  }
  return refreshRequest
}

export async function request(path, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers || {})
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(urlFor(path), {
    ...options,
    headers,
    credentials: 'include'
  })
  if (response.status === 401 && canRefresh && !path.startsWith('/auth/')) {
    await refreshAccessToken()
    return request(path, options, false)
  }
  if (response.status === 204) return null

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(
      body?.error?.message || `Request failed (${response.status})`,
      response.status,
      body?.error?.code
    )
  }
  return body
}

export async function downloadFile(path, canRefresh = true) {
  const headers = new Headers()
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(urlFor(path), { headers, credentials: 'include' })
  if (response.status === 401 && canRefresh) {
    await refreshAccessToken()
    return downloadFile(path, false)
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(body?.error?.message || `Download failed (${response.status})`, response.status)
  }
  return response.blob()
}

export { API_BASE, SOCKET_URL }
