import mongoose, { Schema } from 'mongoose'
import { IQuizQA, QuizQAModel } from '../interface/quizQA.interface'

const questionSchema = new Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: String, required: true },
    explanation: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    type: {
      type: String,
      enum: ['normal', 'scenario', 'image', 'challenge'],
      default: 'normal',
    },
    imagePrompt: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
  },
  { _id: false }
)

const quizQASchema: Schema<IQuizQA> = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    questions: { type: [questionSchema], required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

export const QuizQA = mongoose.model<IQuizQA, QuizQAModel>(
  'QuizQA',
  quizQASchema
)
