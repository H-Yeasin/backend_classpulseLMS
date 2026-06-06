import { model, Schema } from "mongoose";
import { ISchool } from "../interface/school.interface";

const schoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    administrator: { type: Schema.Types.ObjectId, ref: "User" },
    code: { type: String, trim: true, unique: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    establishedYear: { type: Number },
    logo: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

const school = model<ISchool>("School", schoolSchema);
export default school;
