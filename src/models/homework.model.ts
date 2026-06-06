import mongoose, { Schema } from 'mongoose'
import { IHomework, HomeworkModel } from '../interface/homework.interface'

const homeworkSchema: Schema<IHomework> = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date },
      file: {
      type: [
        {
          public_id: { type: String, default: "" },
          url: { type: String, default: "" }
        }
      ],
      default: []
    },
    archived: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

// Static method: Find by class
homeworkSchema.statics.findByClass = async function (classId: string) {
  return await this.find({ classId })
}

// Static method: Find by user
homeworkSchema.statics.findByUser = async function (userId: string) {
  return await this.find({ userId })
}

export const Homework = mongoose.model<IHomework, HomeworkModel>(
  'Homework',
  homeworkSchema
)
