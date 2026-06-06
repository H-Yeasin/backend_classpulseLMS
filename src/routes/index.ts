import { Router } from 'express'
import classRoutes from '../routes/class.routes'
import quizzesTestRouter from '../routes/quizResult.routes'
import stuAssignToClassRoutes from '../routes/stuAssignToClass.routes'
import userRoutes from '../routes/user.routes'
import { aboutAndTermRouter } from './aboutAndTerm.router'
import academicDocumentRouter from './academicDocument.router'
import dashboardRouter from './adminDashboard.router'
import analysisRouter from './analysis.router'
import attendanceRoutes from './attendance.routes'
import behaviorRouter from './behavior.router'
import { featuresAndQuestionsRouter } from './featuresAndQuestions.router'
import gradingRouter from './grading.routes'
import { groupWorkRouter } from './groupWork.routes'
import { homeworkRouter } from './homeWork.routes'
import learningTipsRouters from './learningTip.routes'
import lessonRouter from './lesson.router'
import messageRouter from './message.route'
import notificationRouter from './notification.route'
import parantChildRouter from './parentsChild.route'
import quizzesRouter from './quiz.routes'
import quizzesQARouter from './quizQA.routes'
import roomsRouter from './room.route'
import schoolRouter from './school.router'
import callLogRoutes from './callLog.route'

const router = Router()

const moduleRoutes = [
  {
    path: '/featuresAndQuestions',
    route: featuresAndQuestionsRouter,
  },
  {
    path: '/aboutAndTerm',
    route: aboutAndTermRouter,
  },
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/student-assign-to-class',
    route: stuAssignToClassRoutes,
  },
  {
    path: '/classes',
    route: classRoutes,
  },
  {
    path: '/lessons',
    route: lessonRouter,
  },
  {
    path: '/attendances',
    route: attendanceRoutes,
  },
  {
    path: '/behavior',
    route: behaviorRouter,
  },
  {
    path: '/school',
    route: schoolRouter,
  },
  {
    path: '/learning-tips',
    route: learningTipsRouters,
  },
  {
    path: '/message',
    route: messageRouter,
  },
  {
    path: '/notifications',
    route: notificationRouter,
  },
  {
    path: '/rooms',
    route: roomsRouter,
  },

  {
    path: '/academicDocument',
    route: academicDocumentRouter,
  },
  {
    path: '/homework',
    route: homeworkRouter,
  },
  {
    path: '/group-work',
    route: groupWorkRouter,
  },
  {
    path: '/parent/child',
    route: parantChildRouter,
  },
  {
    path: '/quizzes',
    route: quizzesRouter,
  },
  {
    path: '/quiz/qa',
    route: quizzesQARouter,
  },
  {
    path: '/test/quizzes',
    route: quizzesTestRouter,
  },
  {
    path: '/grading',
    route: gradingRouter,
  },
  {
    path: '/dashboard',
    route: dashboardRouter,
  },
  {
    path: '/analysis',
    route: analysisRouter
  },
  {
    path: '/call-logs',
    route: callLogRoutes
  }
]

moduleRoutes.forEach((route) => router.use(route.path, route.route))

export default router
