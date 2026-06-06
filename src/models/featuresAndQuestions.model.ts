import { model, Schema } from "mongoose";

const featuresAndQuestionsSchema = new Schema(
  {
    docType: {
      type: String,
      required: true,
      enum: ["AppFeatures", "FAQquestions"],
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const FeaturesAndQuestions = model(
  "FeaturesAndQuestions",
  featuresAndQuestionsSchema
);
export default FeaturesAndQuestions;
