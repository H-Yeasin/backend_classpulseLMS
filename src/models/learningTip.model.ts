import mongoose, { Schema } from 'mongoose'
import {
  ILearningTip,
  ILearningTipSection,
  LearningTipModel,
} from '../interface/learningTip.interface'

const learningTipSectionSchema = new Schema<ILearningTipSection>(
  {
    title: { type: String, required: true },
    description: { type: String },
    bulletPoints: [{ type: String }],
    imageUrls: [{ type: String }],
    footerText: { type: String },
  },
  { _id: false }
)

const learningTipSchema: Schema<ILearningTip> = new Schema(
  {
    administratorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    img: [{ type: String }],
    title: { type: String, required: true },
    description: { type: String },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    imageUrl: { type: String },
    sections: { type: [learningTipSectionSchema], default: undefined },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)
export const LearningTip = mongoose.model<ILearningTip, LearningTipModel>(
  'LearningTip',
  learningTipSchema
)
