import { Model, Types } from 'mongoose'

export interface IQuestion {
  question: string
  options: string[]
  answer: string
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  type?: 'normal' | 'scenario' | 'image' | 'challenge'
  imagePrompt?: string
  imageUrl?: string
}

export interface IQuizQA {
  _id?: Types.ObjectId
  quizId: Types.ObjectId 
  questions: IQuestion[]
  created_at?: Date
  updated_at?: Date
}

// Model interface
export interface QuizQAModel extends Model<IQuizQA> {}
