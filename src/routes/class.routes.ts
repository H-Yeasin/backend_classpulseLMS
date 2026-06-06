import express from 'express'
import {
  createClass,
  getAllClasses,
  getClassesByTeacher,
  updateClass,
  deleteClass,
  getgradeWiseClasses,
  getClassesByStudent,
} from '../controllers/class.controller'
import { authorizeTypes, protect } from '../middlewares/auth.middleware'

const router = express.Router()

router.post('/', protect, authorizeTypes('teacher'), createClass)
router.get('/', getAllClasses)
// Get All Classes
router.get('/teacher/:teacherId', getClassesByTeacher)
// Get Classes by Teacher ID
router.put('/:id', updateClass)
router.delete('/:id', deleteClass)

// grade wise classes
router.get(
  '/grade',
  protect,
  authorizeTypes('student'),
  getgradeWiseClasses
) 

// Get classes by student ID
router.get('/student/:studentId', protect, getClassesByStudent)


export default router
