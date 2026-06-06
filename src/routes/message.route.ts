import express from 'express'
import { upload } from '../middlewares/multer.middleware'
import { authorizeTypes, protect } from '../middlewares/auth.middleware'
import {
  createMessage,
  deleteMessage,
  getMessagesByRoom,
  updateMessage,
} from '../controllers/message.controllers'

const router = express.Router()

router.post(
  '/',
  protect,
  authorizeTypes('teacher', 'parent', 'student'),
  upload.array('files'),
  createMessage
)
router.get(
  '/:roomId',
  protect,
  authorizeTypes('teacher', 'parent', 'student'),
  getMessagesByRoom
)
router.patch(
  '/:messageId',
  protect,
  authorizeTypes('teacher', 'parent', 'student'),
  updateMessage
)
router.delete(
  '/:messageId',
  protect,
  authorizeTypes('teacher', 'parent', 'student'),
  deleteMessage
)


export default router
