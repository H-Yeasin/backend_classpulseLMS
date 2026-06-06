import { Router } from "express";
import { featuresAndQuestionsController } from "../controllers/featuresAndQuestions.controller";

const router = Router();

router.post(
  "/create",
  featuresAndQuestionsController.crateFeaturesAndQuestions
);

router.get("/AppFeatures", featuresAndQuestionsController.getAppFeatures);
router.get("/FAQquestions", featuresAndQuestionsController.getFAQquestions);

router.put(
  "/update/:id",
  featuresAndQuestionsController.updateFeaturesAndQuestions
);

export const featuresAndQuestionsRouter = router;
