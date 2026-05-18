/**
 * Jest global setup for backend tests.
 * Runs after the test framework is installed in the environment.
 */

// Set test environment
process.env['NODE_ENV'] = 'test'

// Load .env.test if it exists (optional — fallback to default env)
// This runs in the jest worker process, not in the NestJS bootstrap.
// Individual E2E tests are responsible for providing their own DB config
// via environment variables or test doubles.
import * as fs from 'fs'
import * as path from 'path'

// Load .env.test if it exists using manual parsing (avoids require() ESLint error)
const envTestPath = path.resolve(process.cwd(), '.env.test')
if (fs.existsSync(envTestPath)) {
  const lines = fs.readFileSync(envTestPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (key && !(key in process.env)) {
          process.env[key] = val
        }
      }
    }
  }
}
