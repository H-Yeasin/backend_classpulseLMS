import { Router } from "express";
import gradingController, {
  getSingleStudentGrading,
} from "../controllers/grading.controller";
import { authorizeTypes, protect } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

const router = Router();

router.post(
  "/sessions",
  protect,
  authorizeTypes("teacher"),
  gradingController.createSession,
);

router.get(
  "/sessions",
  protect,
  authorizeTypes("teacher"),
  gradingController.listTeacherSessions,
);

router.get(
  "/student/sessions",
  protect,
  authorizeTypes("student"),
  gradingController.listStudentSessions,
);

router.get(
  "/student/progress",
  protect,
  authorizeTypes("student"),
  gradingController.getStudentProgress,
);

router.get(
  "/child-progress",
  protect,
  authorizeTypes("parent"),
  gradingController.getChildProgress,
);

router.get(
  "/sessions/:sessionId/results",
  protect,
  authorizeTypes("teacher"),
  gradingController.getSessionResults,
);

router.post(
  "/question-image",
  protect,
  authorizeTypes("teacher"),
  upload.single("image"),
  gradingController.uploadQuestionImage,
);

router.post(
  "/sessions/:sessionId/questions",
  protect,
  authorizeTypes("teacher"),
  gradingController.upsertQuestions,
);

router.get(
  "/sessions/:sessionId/questions",
  protect,
  authorizeTypes("teacher", "student"),
  gradingController.getQuestions,
);

router.patch(
  "/sessions/:sessionId/publish",
  protect,
  authorizeTypes("teacher"),
  gradingController.publishSession,
);

router.patch(
  "/sessions/:sessionId",
  protect,
  authorizeTypes("teacher"),
  gradingController.updateSession,
);

router.get(
  "/sessions/:sessionId",
  protect,
  authorizeTypes("teacher"),
  gradingController.getTeacherSession,
);

router.post(
  "/sessions/:sessionId/start",
  protect,
  authorizeTypes("student"),
  gradingController.startSession,
);

router.post(
  "/sessions/:sessionId/save-progress",
  protect,
  authorizeTypes("student"),
  gradingController.saveProgress,
);

router.post(
  "/sessions/:sessionId/submit",
  protect,
  authorizeTypes("student"),
  gradingController.submitSession,
);

router.get("/:studentId", getSingleStudentGrading);

export default router;
