import { Quiz } from '../models/quiz.model'
import { QuizQA } from '../models/quizQA.model'
import { QuizResult } from '../models/quizResult.model'
import AppError from '../errors/AppError'
import catchAsync from '../utils/catchAsync'
import httpStatus from 'http-status'
import sendResponse from '../utils/sendResponse'

/**********************
 * START THE QUIZ API *
 **********************/
export const startQuiz = catchAsync(async (req, res) => {
  const { quizId } = req.body
  const studentId = req.user?._id

  const quiz = await Quiz.findById(quizId)
  if (!quiz) throw new AppError(404, 'Quiz not found')

  const quizQA = await QuizQA.findOne({ quizId })
  if (!quizQA) throw new AppError(404, 'Quiz questions not found')

  // Create empty answer records
  const answers = quizQA.questions.map((q) => ({
    question: q.question,
    selectedAnswer: '',
    isCorrect: null,
  }))

  // Check if already started
  let existing = await QuizResult.findOne({ quizId, studentId })
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You have already started this quiz'
    )
  }

  const newResult = await QuizResult.create({
    quizId,
    studentId,
    answers,
    progress: {
      answeredCount: 0,
      totalQuestions: quizQA.questions.length,
      remainingTime: quiz.time,
      status: 'ongoing',
    },
  })

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Quiz started successfully',
    data: newResult,
  })
})

/**********************
 * SAVE QUIZ PROGRESS *
 **********************/
// export const saveQuizProgress = catchAsync(async (req, res) => {
//   const { quizId, question, selectedAnswer, remainingTime } = req.body
//   const studentId = req.user?._id

//   const result = await QuizResult.findOne({ quizId, studentId })
//   if (!result)
//     throw new AppError(httpStatus.NOT_FOUND, 'Quiz progress not found')

//   // Update the specific question
//   const answerIndex = result.answers.findIndex((a) => a.question === question)
//   if (answerIndex !== -1) {
//     result.answers[answerIndex].selectedAnswer = selectedAnswer
//   }

//   // Update progress
//   result.progress.answeredCount = result.answers.filter(
//     (a) => a.selectedAnswer
//   ).length
//   result.progress.remainingTime = remainingTime

//   await result.save()

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: 'Quiz progress saved successfully',
//     data: result,
//   })
// })

/**********************
 * SAVE QUIZ PROGRESS *
 **********************/
export const saveQuizProgress = catchAsync(async (req, res) => {
  const { quizId, question, selectedAnswer } = req.body
  const studentId = req.user?._id

  const result = await QuizResult.findOne({ quizId, studentId })
  if (!result)
    throw new AppError(httpStatus.NOT_FOUND, 'Quiz progress not found')

  // Fetch quiz to get total time
  const quiz = await Quiz.findById(quizId)
  if (!quiz) throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found')

  // Calculate remaining time
  const now = new Date()
  const lastUpdated = result.updatedAt || result.createdAt

  if (!lastUpdated)
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Last updated not found')

  const elapsedSeconds = Math.floor(
    (now.getTime() - lastUpdated.getTime()) / 1000
  )


  const remainingTime = Math.max(quiz.time - elapsedSeconds, 0) // never negative

  // Update the specific question
  const answerIndex = result.answers.findIndex((a) => a.question === question)
  if (answerIndex !== -1) {
    result.answers[answerIndex].selectedAnswer = selectedAnswer
  }

  // Update progress
  result.progress.answeredCount = result.answers.filter(
    (a) => a.selectedAnswer
  ).length
  result.progress.remainingTime = remainingTime

  await result.save()

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Quiz progress saved successfully',
    data: result,
  })
})

/**********************
 * SUBMIT THE QUIZ API *
 **********************/
export const submitQuiz = catchAsync(async (req, res) => {
  const { quizId } = req.body
  const studentId = req.user?._id

  const result = await QuizResult.findOne({ quizId, studentId })
  if (!result) throw new AppError(404, 'Quiz progress not found')

  const quizQA = await QuizQA.findOne({ quizId })
  if (!quizQA) throw new AppError(404, 'Quiz questions not found')

  let correctCount = 0

  result.answers = result.answers.map((ans) => {
    const correctAnswer = quizQA.questions.find(
      (q) => q.question === ans.question
    )?.answer
    const isCorrect = ans.selectedAnswer === correctAnswer
    if (isCorrect) correctCount++
    return { ...ans, isCorrect }
  })

  const totalQuestions = quizQA.questions.length
  const percentage = (correctCount / totalQuestions) * 100

  result.score = correctCount
  result.percentage = percentage
  result.progress.status = 'completed'

  await result.save()

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Quiz submitted successfully',
    data: {
      correctCount,
      totalQuestions,
      percentage,
      answers: result.answers,
    },
  })
})


/**********************
 * GET QUIZZES ANSWERS BY STUDENT
 **********************/
export const getQuizAnswersByStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params

  const results = await QuizResult.find({ studentId })
    .populate('quizId', 'title classId time') // populate quiz info (optional)
    .sort({ createdAt: -1 })

  // if (!results || results.length === 0) {
  //   throw new AppError(httpStatus.NOT_FOUND, 'No quiz answers found for this student')
  // }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Quiz answers fetched successfully',
    data: results,
  })
})
