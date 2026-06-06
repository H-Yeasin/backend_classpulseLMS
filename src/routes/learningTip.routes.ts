import express from 'express'
import {
  protect,
  authorizeRoles,
  authorizeTypes,
} from '../middlewares/auth.middleware'

import {
  createLearningTip,
  getLearningTipsByAdmin,
  getLearningTipsBySchool,
  getLearningTipsByParent,
  getSingleLearningTip,
  updateLearningTip,
  deleteLearningTip,
} from '../controllers/learningTip.controller'

const router = express.Router()

// Create
router.post('/',
    // protect, authorizeRoles('administrator'),
createLearningTip)

// Get by adminId (paginated)
router.get('/by-admin', getLearningTipsByAdmin)

// Get by schoolId
router.get('/by-school', getLearningTipsBySchool)

// Get tips aggregated across all schools for the authenticated parent's children
router.get(
  '/by-parent/me',
  protect,
  authorizeTypes('parent'),
  getLearningTipsByParent
)

// Single
router.get('/:id', getSingleLearningTip)

// Update
router.patch('/:id', updateLearningTip)

// Delete
router.delete('/:id', deleteLearningTip)

export default router
