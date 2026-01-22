export type GoogleIdTokenPayload = {
  sub: string
  email?: string
  name?: string
  picture?: string
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  const decoded = atob(padded)
  // decodeURIComponent escape for UTF-8
  return decodeURIComponent(
    decoded
      .split('')
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  )
}

export function decodeGoogleIdToken(token: string): GoogleIdTokenPayload | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payloadJson = base64UrlDecode(parts[1])
    const payload = JSON.parse(payloadJson) as GoogleIdTokenPayload
    if (!payload || typeof payload.sub !== 'string') return null
    return payload
  } catch {
    return null
  }
}

