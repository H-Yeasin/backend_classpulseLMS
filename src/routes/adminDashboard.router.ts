import { Router } from "express";
import {
  getStudentGenderStats,
  getUserStats,
} from "../controllers/adminDashboard.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

router.get("/stats", protect, getUserStats);
router.get("/stats/student-gender", protect, getStudentGenderStats);

export default router;
