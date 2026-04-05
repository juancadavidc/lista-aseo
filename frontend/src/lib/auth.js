import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const authClient = createAuthClient({
  baseURL: API_BASE.startsWith('http') ? API_BASE.replace(/\/api$/, '') : window.location.origin,
  basePath: '/api/auth',
  plugins: [organizationClient()],
})

export const { useSession, signIn, signUp, signOut } = authClient
