import { Document, Model, Types } from 'mongoose'

export interface IGroupWork extends Document {
  classId: Types.ObjectId
  userId: Types.ObjectId[]
  title: string
  description?: string
  dueDate?: Date
  file: string[]
  archived: boolean
  created_at?: Date
  updated_at?: Date
}

export interface GroupWorkModel extends Model<IGroupWork> {
  findByClass(classId: string): Promise<IGroupWork[]>
}
