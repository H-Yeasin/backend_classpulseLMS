import mongoose, { Schema } from 'mongoose'
import { IQuiz, QuizModel } from '../interface/quiz.interface'

const quizSchema: Schema<IQuiz> = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // who created it
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    // Duration of the quiz in minutes; surfaced to the student UI as
    // "{count} Questions · {time} min".
    time: { type: Number, default: 5, min: 1 },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

quizSchema.statics.findByTitle = async function (title: string) {
  return await this.find({ title: { $regex: title, $options: 'i' } })
}

export const Quiz = mongoose.model<IQuiz, QuizModel>('Quiz', quizSchema)
