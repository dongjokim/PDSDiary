declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (resp: { credential?: string }) => void }) => void
          renderButton: (parent: HTMLElement, options?: Record<string, unknown>) => void
          prompt: () => void
          disableAutoSelect?: () => void
        }
        oauth2?: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            ux_mode?: 'popup' | 'redirect'
            redirect_uri?: string
            callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void
          }) => {
            requestAccessToken: (options?: { prompt?: '' | 'consent' | 'none' }) => void
          }
        }
      }
    }
  }
}

let loading: Promise<void> | null = null

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (loading) return loading

  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(s)
  })

  return loading
}

