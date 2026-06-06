import mongoose, { Schema } from 'mongoose'
import { IQuizResult } from '../interface/quizResult.interface'

const quizResultSchema = new Schema<IQuizResult>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [
      {
        question: { type: String, required: true },
        selectedAnswer: { type: String, default: '' }, // empty if unanswered
        isCorrect: { type: Boolean, default: null }, // null until completed
      },
    ],
    progress: {
      answeredCount: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 0 },
      remainingTime: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['ongoing', 'completed'],
        default: 'ongoing',
      },
    },
    score: { type: Number, default: 0 }, // correct answers count
    percentage: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const QuizResult = mongoose.model(
  'QuizResult',
  quizResultSchema
)
