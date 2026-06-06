import mongoose, { Schema } from 'mongoose'
import { IGroupWork, GroupWorkModel } from '../interface/groupWork.interface'

const groupWorkSchema: Schema<IGroupWork> = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    userId: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date },
    file: { type: [String], default: [] },
    archived: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

export const GroupWork = mongoose.model<IGroupWork, GroupWorkModel>(
  'GroupWork',
  groupWorkSchema
)
