import { Router } from "express";
import lessonController from "../controllers/lesson.controller";
import { authorizeTypes, protect } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

const router = Router();

router.post(
  "/create",
  protect,
  authorizeTypes("teacher"),
  upload.single("document"),
  lessonController.createLesson
);

router.get(
  "/teacher-lessons",
  protect,
  authorizeTypes("teacher"),
  lessonController.getLessonsByTeacher
);

router.get(
  "/student-lessons",
  protect,
  authorizeTypes("student"),
  lessonController.getLessonsByStudent
);

router.get(
  "/",
  protect,
  authorizeTypes("student"),
  // authorizeTypes("teacher"),
  lessonController.getAllLessons
);

router.get(
  "/archived",
  protect,
  authorizeTypes("teacher"),
  lessonController.getArchivedLessons
)


router.get(
  "/:lessonId",
  protect,
  // authorizeTypes("student"),
  authorizeTypes("teacher"),
  lessonController.getSingleLesson
);

router.get(
  "/class/:classId",
  protect,
  authorizeTypes("teacher", "parent"),
  lessonController.getLessonsByClass
)


router.get(
  "/student/:studentId",
  lessonController.getLessonsByStudentId
);

router.put(
  "/update/:lessonId",
  protect,
  authorizeTypes("teacher"),
  upload.single("document"),
  lessonController.updateLesson
);

router.delete(
  "/delete/:lessonId",
  protect,
  authorizeTypes("teacher"),
  lessonController.deleteLesson
);


router.put(
  "/update-status/:lessonId",
  protect,
  authorizeTypes("teacher"),
  lessonController.updateLessonStatus
)

const lessonRouter = router;
export default lessonRouter;
