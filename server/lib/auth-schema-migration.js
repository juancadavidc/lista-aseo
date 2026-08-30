// Migracion incremental del schema de better-auth.
//
// better-auth 1.7 agrego la columna `issuer` a la tabla `account` (con indice
// unico sobre issuer + accountId) y la usa como clave para resolver el dueno de
// una cuenta OAuth. Las tablas de auth se crearon con el schema de 1.5.x, asi
// que sin esta columna el callback de Google y el signup por email fallan con
// `column account.issuer does not exist`, que better-auth traduce a
// /api/auth/error?error=internal_server_error.
//
// Valores de issuer que usa better-auth 1.7 para los proveedores de esta app:
//   credential -> local:credential            (createLocalAccountIssuer)
//   google     -> https://accounts.google.com (Google declara su propio issuer)
//   otros      -> local:oauth:<providerId>    (createOAuthAccountIssuer)

const ACCOUNT_ISSUER_INDEX = 'account_issuer_accountId_uidx'

export async function migrateAccountIssuer(pool, log = console.log) {
  const { rows: tableRows } = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'account'`
  )
  if (tableRows.length === 0) return false

  const { rows: columnRows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'account' AND column_name = 'issuer'`
  )
  if (columnRows.length > 0) return false

  await pool.query('ALTER TABLE "account" ADD COLUMN "issuer" TEXT')
  await pool.query(`
    UPDATE "account" SET "issuer" = CASE "providerId"
      WHEN 'credential' THEN 'local:credential'
      WHEN 'google'     THEN 'https://accounts.google.com'
      ELSE 'local:oauth:' || "providerId"
    END
  `)
  await pool.query('ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL')
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "${ACCOUNT_ISSUER_INDEX}" ON "account" ("issuer", "accountId")`)

  log('Migration: added issuer column to account (better-auth 1.7)')
  return true
}
