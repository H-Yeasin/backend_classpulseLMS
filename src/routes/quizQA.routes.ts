import { Router } from 'express'
import {
  createAIQuestions,
  getQuizQAByQuizId,
} from '../controllers/quizQA.controller'
import { protect } from '../middlewares/auth.middleware'

const router = Router()

router.post('/generate', createAIQuestions)
router.get('/:quizId', protect, getQuizQAByQuizId)

export default router
