import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

const candidateEnvPaths = Array.from(
  new Set([
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ])
)

const resolvedEnvPath = candidateEnvPaths.find((candidatePath) =>
  fs.existsSync(candidatePath)
)

if (resolvedEnvPath) {
  dotenv.config({ path: resolvedEnvPath })
} else {
  dotenv.config()
}

export const loadedEnvPath = resolvedEnvPath

export const getOptionalEnv = (name: string) => {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

export const getRequiredEnv = (name: string) => {
  const value = getOptionalEnv(name)

  if (value) {
    return value
  }

  const checkedPaths = candidateEnvPaths.map((candidatePath) =>
    path.relative(process.cwd(), candidatePath) || '.env'
  )

  throw new Error(
    `Missing required environment variable ${name}. Add it to one of: ${checkedPaths.join(
      ', '
    )}`
  )
}
