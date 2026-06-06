import { Document, Model, Types } from "mongoose";

export interface ILesson extends Document {
  studentId?: Types.ObjectId;
  title: string;
  teacherId: Types.ObjectId;
  classId: Types.ObjectId;
  objective: string;
  note: string;
  document: string;
  isArchived: boolean;
}

export interface LessonModel extends Model<ILesson> {
  findByClass(classId: string): Promise<ILesson[]>;
}
