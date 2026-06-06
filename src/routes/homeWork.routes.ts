import { Router } from "express";

import { protect, authorizeTypes } from "../middlewares/auth.middleware";
import { archiveHomework, createHomework, deleteHomework, getHomeworkByClass, getHomeworkById, getHomeworkByUser, updateHomework } from "../controllers/homeWork.controller";
import { upload } from "../middlewares/multer.middleware";


const router = Router();

// Create homework (teacher only)
router.post(
    "/create",
    protect,
    authorizeTypes("teacher"),
    upload.array("file"),
    createHomework
);

// Get homework by class (teacher only)
router.get(
    "/class/:classId",
    getHomeworkByClass
);

// Get homework by user (teacher or student)
router.get(
    "/user/:userId",
    
    getHomeworkByUser
);

// Get single homework by ID (teacher only)
router.get(
    "/:id",

    getHomeworkById
);

// Update homework (teacher only)
router.put(
    "/update/:id",
    protect,
    authorizeTypes("teacher"),
     upload.array("file"),
    updateHomework
);

// Delete homework (teacher only)
router.delete(
    "/delete/:id",
    protect,
    authorizeTypes("teacher"),
    deleteHomework
);

// Archive homework (teacher only)
router.patch(
    "/archive/:id",
    protect,
    authorizeTypes("teacher"),
    archiveHomework
);

export const homeworkRouter = router;