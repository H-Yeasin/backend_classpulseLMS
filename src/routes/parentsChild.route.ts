import express from 'express'
import {
  createParentsChild,
  deleteParentsChild,
  getChildrenByParentId,
  getParentsByChildId,
} from '../controllers/parentsChild.controller'
import { authorizeTypes, protect } from '../middlewares/auth.middleware'

const router = express.Router()

router.post('/', protect, authorizeTypes('parent'), createParentsChild)
router.delete('/:id', protect, authorizeTypes('parent'), deleteParentsChild)
router.get('/parent/:parentId', protect, authorizeTypes('parent'), getChildrenByParentId)
router.get(
  '/child/:childId',
  protect,
  authorizeTypes('teacher', 'parent', 'student'),
  getParentsByChildId
)

export default router
