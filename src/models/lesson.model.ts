import mongoose, { Schema } from "mongoose";
import { ILesson, LessonModel } from "../interface/lesson.interface";

const lessonSchema: Schema<ILesson> = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    title: { type: String, required: true, default: "Lesson" },
    teacherId: { type: Schema.Types.ObjectId, ref: "User" },
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    objective: { type: String, required: true },
    note: { type: String, required: true },
    document: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    isArchived: { type: Boolean, default: false },
  },

  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

export const Lesson = mongoose.model<ILesson, LessonModel>(
  "Lesson",
  lessonSchema
);
