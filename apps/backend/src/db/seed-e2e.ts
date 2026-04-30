import 'dotenv/config'
import postgres from 'postgres'

/**
 * Seed idempotente para crear el usuario admin de testing E2E en Supabase auth.
 *
 * Activacion (Approach B fallback offline):
 *   E2E_SEED=true pnpm --filter @objetiva/backend exec tsx src/db/seed-e2e.ts
 *
 * Crea (o re-actualiza) el usuario `e2e-admin@test.local` con
 * `raw_app_meta_data.role = 'admin'`. Si el usuario ya existe, garantiza que el
 * rol siga siendo `admin` y NO recrea (idempotente).
 *
 * NOTA importante:
 *  - Este script SOLO toca `auth.users` (Supabase Auth), nunca tablas de negocio.
 *  - El guard `process.env.E2E_SEED === 'true'` evita ejecuciones accidentales.
 *  - El archivo asume que `SUPABASE_DB_URL` (o `DATABASE_URL`) apunta a la DB
 *    Postgres del proyecto Supabase (NO al Postgres de negocio local).
 *  - El password real NO se commitea — usar `.env.test` (gitignored).
 *
 * Plan 04 - Phase 29 (Catalogos de Atributos) - Wave 0.
 */
async function main(): Promise<void> {
  if (process.env.E2E_SEED !== 'true') {
    console.log('[seed-e2e] Skipping - E2E_SEED is not set to "true"')
    return
  }

  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      '[seed-e2e] SUPABASE_DB_URL o DATABASE_URL deben estar definidos'
    )
  }

  const email = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@test.local'
  const password =
    process.env.E2E_ADMIN_PASSWORD ?? 'e2e-admin-pwd-CHANGE-ME'

  const sql = postgres(url, { max: 1 })

  try {
    const existing = await sql<
      { id: string }[]
    >`SELECT id FROM auth.users WHERE email = ${email}`

    if (existing.length > 0) {
      // Asegurar role=admin sin tocar password ni recrear el row.
      await sql`
        UPDATE auth.users
        SET raw_app_meta_data = jsonb_set(
              COALESCE(raw_app_meta_data, '{}'::jsonb),
              '{role}',
              '"admin"',
              true
            ),
            updated_at = NOW()
        WHERE email = ${email}
      `
      console.log(
        `[seed-e2e] OK: user ${email} already existed; ensured role=admin`
      )
    } else {
      const appMeta = JSON.stringify({
        role: 'admin',
        provider: 'email',
        providers: ['email'],
      })
      await sql`
        INSERT INTO auth.users (
          instance_id, id, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, role, aud
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          ${email},
          crypt(${password}, gen_salt('bf')),
          NOW(),
          ${appMeta}::jsonb,
          '{}'::jsonb,
          NOW(), NOW(), 'authenticated', 'authenticated'
        )
      `
      console.log(`[seed-e2e] OK: created admin user ${email}`)
    }
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error('[seed-e2e] FAILED:', err)
  process.exit(1)
})
