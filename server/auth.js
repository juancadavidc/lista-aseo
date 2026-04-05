import { betterAuth } from 'better-auth'
import { organization } from 'better-auth/plugins'

export function createAuth(pool) {
  const allowedHosts = (process.env.ALLOWED_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean)
  const fallbackURL = process.env.BETTER_AUTH_URL || 'http://localhost:5173'

  const config = {
    database: pool,
    basePath: '/api/auth',
    baseURL: allowedHosts.length > 0
      ? { allowedHosts, protocol: 'https', fallback: fallbackURL }
      : fallbackURL,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {},
    plugins: [
      organization({
        allowMemberToLeave: true,
      }),
    ],
    trustedOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(u => u.trim().replace(/\/+$/, '')),
    secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production',
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    config.socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }

  return betterAuth(config)
}
