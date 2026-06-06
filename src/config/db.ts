import dns from 'dns'
import mongoose from 'mongoose'
import { getOptionalEnv, getRequiredEnv } from './env'

const parseDnsServers = (value: string) =>
  value
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean)

const configureMongoDns = (mongoUri: string) => {
  if (!mongoUri.startsWith('mongodb+srv://')) {
    return
  }

  const configuredDnsServers = getOptionalEnv('MONGO_DNS_SERVERS')
  const currentDnsServers = dns.getServers()
  const shouldUseFallback =
    configuredDnsServers ||
    currentDnsServers.some((server) => server === '127.0.0.1' || server === '::1')

  if (!shouldUseFallback) {
    return
  }

  dns.setServers(
    configuredDnsServers
      ? parseDnsServers(configuredDnsServers)
      : ['1.1.1.1', '1.0.0.1']
  )
}

export const connectDB = async () => {
  try {
    const mongoUri = getRequiredEnv('MONGO_URI')
    configureMongoDns(mongoUri)

    await mongoose.connect(mongoUri)
    console.log('MongoDB connected')
  } catch (error) {
    console.error('MongoDB connection failed:', error)
    process.exit(1)
  }
}
