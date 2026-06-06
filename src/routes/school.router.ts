import { Router } from "express";
import schoolController from "../controllers/school.controller";
import { authorizeRoles, protect } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

const router = Router();

router.post(
  "/create",
  protect,
  authorizeRoles("admin"),
  upload.single("logo"),
  schoolController.createSchool
);

router.get(
  "/my-school",
  protect,
  authorizeRoles("administrator"),
  schoolController.getMySchool
);

router.get("/", schoolController.getAllSchools);
router.get("/:id", schoolController.getSingleSchool);

router.put(
  "/update/:id",
  protect,
  authorizeRoles("admin", "administrator"),
  upload.single("logo"),
  schoolController.updateSchool
);

router.delete(
  "/delete/:id",
  protect,
  authorizeRoles("admin"),
  schoolController.deleteSchool
);

const schoolRouter = router;
export default schoolRouter;
