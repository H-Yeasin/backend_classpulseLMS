import { Router } from 'express'
import {
  createQuiz,
  updateQuiz,
  getAllQuizzes,
  getQuizzesByClass,
  deleteQuiz,
  getQuizzesByTeacher,
  getQuizzesForStudent,
} from '../controllers/quiz.controller'
import { authorizeTypes, protect } from '../middlewares/auth.middleware'
import { upload } from '../middlewares/multer.middleware'

const router = Router()

router.post('/', upload.single('image'), createQuiz)
router.put('/:quizId', upload.single('image'), updateQuiz)
router.get('/', getAllQuizzes)
router.get('/student/:studentId', protect, authorizeTypes('student'), getQuizzesForStudent)
// Get quizzes by classId
router.get('/class/:classId', getQuizzesByClass)
router.get('/teacher/:teacherId', getQuizzesByTeacher)
router.delete('/:quizId', deleteQuiz)

export default router
