import { betterAuth } from 'better-auth'
import { organization } from 'better-auth/plugins'

export function createAuth(pool) {
  const config = {
    database: pool,
    basePath: '/api/auth',
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {},
    plugins: [
      organization({
        allowMemberToLeave: true,
      }),
    ],
    trustedOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
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
