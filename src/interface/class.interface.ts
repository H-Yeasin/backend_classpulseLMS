import { Document, Model, Types } from 'mongoose'

export interface IClass extends Document {
  grade: number
  subject: string
  section: string
  schedule: string
  teacherId: Types.ObjectId
  created_at?: Date
  updated_at?: Date
}

// Static methods interface
export interface ClassModel extends Model<IClass> {
  findByGrade(grade: string): Promise<IClass[]>
}
