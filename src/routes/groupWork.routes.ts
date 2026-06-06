import express from 'express'
import { protect, authorizeTypes } from '../middlewares/auth.middleware'
import { upload } from '../middlewares/multer.middleware'
import {
  createGroupWork,
  getGroupWorkByClass,
} from '../controllers/groupWork.controller'

const router = express.Router()

// Create group homework (teacher only)
router.post(
  '/create',
  protect,
  authorizeTypes('teacher'),
  upload.array('file'),
  createGroupWork
)

// List group homework for a class. Supports ?archived=true|false to scope the list.
router.get('/class/:classId', getGroupWorkByClass)

export const groupWorkRouter = router
