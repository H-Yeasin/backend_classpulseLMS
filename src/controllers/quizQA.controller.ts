import { Request, Response } from 'express'
import httpStatus from 'http-status'
import { QuizQA } from '../models/quizQA.model'
import { generateQuizQuestions } from '../services/quizAI.service'
import catchAsync from '../utils/catchAsync'
import AppError from '../errors/AppError'
import sendResponse from '../utils/sendResponse'

/************************
 * CREATE AI QUIESTIONS *
 ************************/
export const createAIQuestions = catchAsync(
  async (req: Request, res: Response) => {
    const quizId =
      typeof req.body?.quizId === 'string' ? req.body.quizId.trim() : ''
    const topic =
      typeof req.body?.topic === 'string' ? req.body.topic.trim() : ''
    const prompt =
      typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : ''
    const generationTopic = topic || prompt

    const requestedCount = Number(req.body?.count)
    const count =
      Number.isFinite(requestedCount) && requestedCount > 0
        ? Math.min(Math.floor(requestedCount), 20)
        : 10

    if (!generationTopic) {
      throw new AppError(400, 'topic or prompt is required')
    }

    const questions = await generateQuizQuestions(generationTopic, count)
    if (!questions.length)
      throw new AppError(500, 'AI failed to generate questions')

    // Backward-compatible mode:
    // if quizId is provided, generate and persist for that quiz.
    if (quizId) {
      const savedQA = await QuizQA.create({
        quizId,
        questions,
      })

      return sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Questions generated and saved successfully',
        data: savedQA,
      })
    }

    // Prompt preview mode:
    // return plain generated questions so frontend can review/edit before saving.
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Questions generated successfully',
      data: questions,
    })
  }
)

/****************************
 * GET QUESTIONS BY QUIZ ID *
 ****************************/
export const getQuizQAByQuizId = catchAsync(
  async (req: Request, res: Response) => {
    const { quizId } = req.params
    if (!quizId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'quizId is required')
    }

    const qa = await QuizQA.findOne({ quizId })
    if (!qa) {
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'No questions found for this quiz',
        data: null,
      })
    }

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Quiz questions fetched successfully',
      data: qa,
    })
  }
)
