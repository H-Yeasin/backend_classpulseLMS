import { Router } from 'express'
import { protect, authorizeTypes } from '../middlewares/auth.middleware'
import {
  startQuiz,
  saveQuizProgress,
  submitQuiz,
  getQuizAnswersByStudent,
} from '../controllers/quizResult.controller'

const router = Router()

router.post('/start', protect, 
  authorizeTypes('student'),
   startQuiz)
router.post('/save-progress', protect, saveQuizProgress)
router.post('/submit', protect, submitQuiz)
router.get('/answers/:studentId', protect, getQuizAnswersByStudent) 
export default router
