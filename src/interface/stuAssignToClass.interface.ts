import { Document, Model, Types } from 'mongoose'

export interface IStuAssignToClass extends Document {
  studentId: Types.ObjectId
  classId: Types.ObjectId
  created_at?: Date
  updated_at?: Date
}

export type StuAssignToClassModel = Model<IStuAssignToClass>
