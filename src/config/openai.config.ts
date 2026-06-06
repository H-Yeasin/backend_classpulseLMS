import OpenAI from 'openai'
import './env'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    'Warning: OPENAI_API_KEY is not set in environment variables.'
  )
}
