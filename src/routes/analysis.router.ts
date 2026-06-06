import { Router } from "express";
import { getSingleStudentAnalysisController } from "../controllers/analysis.controller";

const router = Router();

router.get("/:classId/:studentId", getSingleStudentAnalysisController);

const analysisRouter = router;
export default analysisRouter;
