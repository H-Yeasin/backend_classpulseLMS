import { Document, Model, Types } from 'mongoose'

export interface ILearningTipSection {
  title: string
  description?: string
  bulletPoints?: string[]
  imageUrls?: string[]
  footerText?: string
}

export interface ILearningTip extends Document {
  administratorId: Types.ObjectId
  img: string[]
  title: string
  description?: string
  schoolId: Types.ObjectId
  imageUrl?: string
  sections?: ILearningTipSection[]
  created_at?: Date
  updated_at?: Date
}


export interface LearningTipModel extends Model<ILearningTip> {
  findByUser(userId: string): Promise<ILearningTip[]>
}
