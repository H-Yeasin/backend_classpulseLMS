import { Document, Model, Types } from 'mongoose'

export interface IHomework extends Document {
  classId: Types.ObjectId
  userId: Types.ObjectId
  title: string
  description?: string
  dueDate?: Date
  file: string[]
  archived: boolean
  created_at?: Date
  updated_at?: Date
}

export interface HomeworkModel extends Model<IHomework> {
  findByClass(classId: string): Promise<IHomework[]>
  findByUser(userId: string): Promise<IHomework[]>
}
