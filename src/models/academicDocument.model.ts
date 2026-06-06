import { model, Schema } from "mongoose";
import { IAcademicDocument } from "../interface/academicDocument.interface";

const academicDocumentSchema = new Schema<IAcademicDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User" },
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    document: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

const AcademicDocument = model<IAcademicDocument>(
  "AcademicDocument",
  academicDocumentSchema
);

export default AcademicDocument;
