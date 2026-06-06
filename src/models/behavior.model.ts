import mongoose, { Schema } from "mongoose";
import { IBehavior, BehaviorModel } from "../interface/behavior.interface";

const behaviorSchema: Schema<IBehavior> = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User" },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    state: { type: String, enum: ["positive", "negative"], required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

export const Behavior = mongoose.model<IBehavior, BehaviorModel>(
  "Behavior",
  behaviorSchema
);
