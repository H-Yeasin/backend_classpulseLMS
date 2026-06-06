import express from 'express'
import {
  assignStudentToClass,
  getClassesByStudent,
  removeStudentFromClass,
  getStudentByClass,
} from '../controllers/stuAssignToClass.controller'
import { authorizeTypes, protect } from '../middlewares/auth.middleware'

const router = express.Router()

// Create assignment
router.post('/', protect, authorizeTypes('teacher'), assignStudentToClass)
// Get by studentId
router.get('/student/:studentId', protect, getClassesByStudent)
// Get by classId
router.get('/class/:classId', protect, getStudentByClass)
// Delete by assignment ID
router.delete('/:id', protect, authorizeTypes('teacher'), removeStudentFromClass)

export default router
