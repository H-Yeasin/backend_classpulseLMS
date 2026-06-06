import mongoose, { Schema } from 'mongoose'
import {
  IStuAssignToClass,
  StuAssignToClassModel,
} from '../interface/stuAssignToClass.interface'

const stuAssignToClassSchema: Schema<IStuAssignToClass> = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

export const StuAssignToClass = mongoose.model<
  IStuAssignToClass,
  StuAssignToClassModel
>('StuAssignToClass', stuAssignToClassSchema)
