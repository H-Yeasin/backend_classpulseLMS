import { Router } from "express";
import academicDocumentController from "../controllers/academicDocument.controller";
import { authorizeTypes, protect } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

const router = Router();

router.post(
  "/create",
  protect,
  authorizeTypes("teacher"),
  upload.single("document"),
  academicDocumentController.createAcademicDocument,
);

router.get(
  "/student-documents",
  protect,
  authorizeTypes("student"),
  academicDocumentController.getAcademicDocumentForStudent,
);

router.get(
  "/child-documents",
  protect,
  authorizeTypes("parent"),
  academicDocumentController.getAcademicDocumentForChild,
);

router.get(
  "/teacher-documents",
  protect,
  authorizeTypes("teacher"),
  academicDocumentController.getAcademicDocumentForTeacher,
);

router.get(
  "/class-documents/:classId",
  academicDocumentController.getDocumentByClass,
);

router.get(
  "/student/:studentId",
  academicDocumentController.getAcademicDocumentByStudentId,
);

router.get(
  "/:academicDocumentId",
  academicDocumentController.getSingleAcademicDocument,
);

router.put(
  "/update/:id",
  protect,
  authorizeTypes("teacher"),
  upload.single("document"),
  academicDocumentController.updateAcademicDocument,
);

router.delete(
  "/delete/:id",
  protect,
  authorizeTypes("teacher"),
  academicDocumentController.deleteAcademicDocument,
);

const academicDocumentRouter = router;

export default academicDocumentRouter;
