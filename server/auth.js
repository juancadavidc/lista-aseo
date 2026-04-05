import { betterAuth } from 'better-auth'
import { organization } from 'better-auth/plugins'

export function createAuth(pool) {
  return betterAuth({
    database: {
      type: 'pg',
      pool,
    },
    basePath: '/api/auth',
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      organization({
        allowMemberToLeave: true,
      }),
    ],
    trustedOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
    secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production',
  })
}
