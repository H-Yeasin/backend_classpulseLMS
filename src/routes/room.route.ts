import express from 'express'
import {
  createRoom,
  editRoom,
  getRoomsByUserId,
} from '../controllers/room.controller'
import { upload } from '../middlewares/multer.middleware'
import { authorizeTypes, protect } from '../middlewares/auth.middleware'

const router = express.Router()

router.post('/', protect, upload.single('avatar'), createRoom)
router.patch(
  '/:id',
  protect,
  authorizeTypes('teacher', 'parent', 'student'),
  upload.single('avatar'),
  editRoom,
)
router.get(
  '/my-rooms',
  protect,
  authorizeTypes('teacher', 'parent', 'student'),
  getRoomsByUserId,
)

export default router
