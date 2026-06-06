import { model, Schema } from "mongoose";

const aboutAndTermSchema = new Schema(
  {
    docType: {
      type: String,
      required: true,
      enum: ["about", "terms"],
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const AboutAndTerm = model("AboutAndTerm", aboutAndTermSchema);
export default AboutAndTerm;
