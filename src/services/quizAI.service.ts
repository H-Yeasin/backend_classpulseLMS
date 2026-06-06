import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { openai } from '../config/openai.config'
import AppError from '../errors/AppError'
import { uploadBase64ImageToCloudinary } from '../utils/cloudinary'

type QuestionKind = 'normal' | 'scenario' | 'image' | 'challenge'

type GeneratedQuestion = {
  question: string
  options: string[]
  answer: string
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  type?: QuestionKind
  imagePrompt?: string
  imageUrl?: string
}

const QUIZ_MIX = {
  total: 10,
  normalScenario: 8,
  image: 1,
  challenge: 1,
}

const quizQuestionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    questions: {
      type: 'array',
      minItems: QUIZ_MIX.total,
      maxItems: QUIZ_MIX.total,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: { type: 'string' },
          },
          answer: { type: 'string' },
          explanation: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          type: {
            type: 'string',
            enum: ['normal', 'scenario', 'image', 'challenge'],
          },
          imagePrompt: { type: 'string' },
        },
        required: [
          'question',
          'options',
          'answer',
          'explanation',
          'difficulty',
          'type',
          'imagePrompt',
        ],
      },
    },
  },
  required: ['questions'],
}

const buildQuizPrompt = (topic: string) => `
Create an engaging classroom quiz about "${topic}".

Return exactly ${QUIZ_MIX.total} multiple-choice questions:
- ${QUIZ_MIX.normalScenario} normal or real-life scenario questions.
- ${QUIZ_MIX.image} image-based questions that need a visual clue, diagram, chart, scene, map, or object comparison.
- ${QUIZ_MIX.challenge} challenge question that requires deeper reasoning.

Rules:
- Every question must have exactly 4 options.
- The answer must exactly match one option.
- Keep question text student-friendly and concise.
- Distractors should be plausible and based on common misconceptions.
- Add a short explanation for teacher review.
- For image questions, write a precise educational imagePrompt.
- For non-image questions, imagePrompt must be an empty string.
- Do not mention that AI created the content.
`

const extractQuestions = (rawContent: string): GeneratedQuestion[] => {
  try {
    const parsed = JSON.parse(rawContent)
    if (Array.isArray(parsed)) return parsed
    if (Array.isArray(parsed?.questions)) return parsed.questions
  } catch {
    const match = rawContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!match) return []

    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) return parsed
      if (Array.isArray(parsed?.questions)) return parsed.questions
    } catch {
      return []
    }
  }

  return []
}

const fallbackImagePrompt = (topic: string, question: string) =>
  `A clean classroom-friendly educational illustration for a quiz about ${topic}. Visual clue for: ${question}. No answer text, no option labels, simple diagram style.`

const normalizeQuestions = (
  topic: string,
  rawQuestions: GeneratedQuestion[]
): GeneratedQuestion[] => {
  const questions = rawQuestions.slice(0, QUIZ_MIX.total).map((item) => {
    const options = Array.isArray(item.options)
      ? item.options.map((option) => option.toString().trim()).filter(Boolean)
      : []

    return {
      question: item.question?.toString().trim() || '',
      options: options.slice(0, 4),
      answer: item.answer?.toString().trim() || '',
      explanation: item.explanation?.toString().trim() || '',
      difficulty:
        item.difficulty === 'easy' ||
        item.difficulty === 'medium' ||
        item.difficulty === 'hard'
          ? item.difficulty
          : 'medium',
      type:
        item.type === 'normal' ||
        item.type === 'scenario' ||
        item.type === 'image' ||
        item.type === 'challenge'
          ? item.type
          : 'normal',
      imagePrompt: item.imagePrompt?.toString().trim() || '',
    }
  })

  questions.forEach((question) => {
    if (!question.options.includes(question.answer)) {
      question.answer = question.options[0] || question.answer
    }
  })

  const challengeIndex = questions.findIndex((question) => question.type === 'challenge')
  if (challengeIndex === -1 && questions.length) {
    questions[questions.length - 1].type = 'challenge'
  }

  let imageIndexes = questions
    .map((question, index) =>
      question.type === 'image' || question.imagePrompt ? index : -1
    )
    .filter((index) => index >= 0)

  if (imageIndexes.length > QUIZ_MIX.image) {
    imageIndexes.slice(QUIZ_MIX.image).forEach((index) => {
      questions[index].type =
        questions[index].type === 'challenge' ? 'challenge' : 'scenario'
      questions[index].imagePrompt = ''
    })
    imageIndexes = imageIndexes.slice(0, QUIZ_MIX.image)
  }

  for (let index = 0; imageIndexes.length < QUIZ_MIX.image && index < questions.length; index++) {
    if (questions[index].type === 'challenge' || imageIndexes.includes(index)) {
      continue
    }
    questions[index].type = 'image'
    questions[index].imagePrompt = fallbackImagePrompt(topic, questions[index].question)
    imageIndexes.push(index)
  }

  imageIndexes.forEach((index) => {
    if (!questions[index].imagePrompt) {
      questions[index].imagePrompt = fallbackImagePrompt(topic, questions[index].question)
    }
  })

  return questions
}

const saveGeneratedImage = async (imageBase64: string) => {
  const cloudinaryImage = await uploadBase64ImageToCloudinary(imageBase64)
  if (cloudinaryImage?.secure_url) {
    return cloudinaryImage.secure_url
  }

  const outputDir = path.join(process.cwd(), 'public', 'quiz-images')
  await fs.mkdir(outputDir, { recursive: true })

  const fileName = `${Date.now()}-${randomUUID()}.png`
  const filePath = path.join(outputDir, fileName)
  await fs.writeFile(filePath, Buffer.from(imageBase64, 'base64'))

  return `/quiz-images/${fileName}`
}

const generateQuestionImage = async (imagePrompt: string) => {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: imagePrompt,
    size: '1024x1024',
    quality: 'low',
    n: 1,
  } as any)

  const image = response.data?.[0] as any
  if (image?.b64_json) {
    return saveGeneratedImage(image.b64_json)
  }

  return image?.url || ''
}

const attachImages = async (questions: GeneratedQuestion[]) => {
  await Promise.all(
    questions.map(async (question) => {
      if (question.type !== 'image' || !question.imagePrompt) return

      try {
        question.imageUrl = await generateQuestionImage(question.imagePrompt)
      } catch (err: any) {
        console.error('Quiz image generation failed:', err?.message || err)
        question.imageUrl = ''
      }
    })
  )

  return questions
}

export const generateQuizQuestions = async (topic: string, count = 10) => {
  const requestedCount = Math.max(1, Math.floor(count || QUIZ_MIX.total))
  const useEngagingMix = requestedCount === QUIZ_MIX.total
  const prompt = useEngagingMix
    ? buildQuizPrompt(topic)
    : `
      Generate ${requestedCount} difficult multiple-choice questions about "${topic}".
      Format the response strictly as JSON with this structure:
      [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "answer": "string",
          "explanation": "string",
          "difficulty": "medium",
          "type": "normal",
          "imagePrompt": ""
        }
      ]
    `

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You create accurate, age-appropriate, engaging school quiz questions.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      response_format: useEngagingMix
        ? {
            type: 'json_schema',
            json_schema: {
              name: 'engaging_quiz_questions',
              strict: true,
              schema: quizQuestionSchema,
            },
          }
        : { type: 'json_object' },
    })

    const rawContent = completion.choices[0]?.message?.content || '[]'
    const questions = extractQuestions(rawContent)
    if (!questions.length) return []

    const normalizedQuestions = useEngagingMix
      ? normalizeQuestions(topic, questions)
      : questions

    if (useEngagingMix) {
      return attachImages(normalizedQuestions)
    }

    return normalizedQuestions
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      console.error('JSON parse error:', err)
      return []
    }

    const providerStatus = Number(
      err?.status ?? err?.statusCode ?? err?.cause?.status
    )
    const providerMessage =
      typeof err?.message === 'string' && err.message.trim()
        ? err.message.trim()
        : 'AI provider request failed'

    if (providerStatus === 429) {
      throw new AppError(
        429,
        'OpenAI quota/rate limit reached. Add billing credits or use another valid API key.'
      )
    }

    if (providerStatus === 401) {
      throw new AppError(
        401,
        'OpenAI API key is invalid or missing on the server.'
      )
    }

    throw new AppError(502, providerMessage)
  }
}
