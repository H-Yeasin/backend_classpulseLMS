import { Router } from "express";
import behaviorController from "../controllers/behavior.controller";
import { authorizeTypes, protect } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/create",
  protect,
  authorizeTypes("teacher"),
  behaviorController.createBehavior,
);

router.get(
  "/teacher-behaviors",
  protect,
  authorizeTypes("teacher"),
  behaviorController.getBehaviorByTeacher,
);

router.get(
  "/student/:studentId",
  behaviorController.getBehaviorsByStudentId,
);

router.get(
  "/student-behaviors",
  protect,
  authorizeTypes("student", "parent"),
  behaviorController.getBehaviorByStudent
);

router.get(
  "/my-child/:studentId",
  protect,
  authorizeTypes("parent"),
  behaviorController.getBehaviorForMyChild,
);

router.get(
  "/",
  protect,
  authorizeTypes("teacher"),
  behaviorController.getAllBehaviors,
);

router.get(
  "/:behaviorId",
  protect,
  authorizeTypes("teacher"),
  behaviorController.getSingleBehavior,
);

router.put(
  "/update/:behaviorId",
  protect,
  authorizeTypes("teacher"),
  behaviorController.updateBehavior,
);

router.delete(
  "/delete/:behaviorId",
  protect,
  authorizeTypes("teacher"),
  behaviorController.deleteBehavior,
);

const behaviorRouter = router;
export default behaviorRouter;
