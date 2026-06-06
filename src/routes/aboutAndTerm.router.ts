import { Router } from "express";
import aboutAndTermController from "../controllers/aboutAndTermController";

const router = Router();

router.post("/create", aboutAndTermController.createAboutAndTerm);

router.get("/about", aboutAndTermController.getAbout);
router.get("/terms", aboutAndTermController.getTerms);

router.put("/update/:id", aboutAndTermController.updateAboutAndTerm);

export const aboutAndTermRouter = router;
