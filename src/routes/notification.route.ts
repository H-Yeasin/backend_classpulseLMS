import express from 'express'
import {
  getUserNotifications,
  markAllAsRead,
  markOneAsRead,
} from '../controllers/notification.controller'

const router = express.Router()

router.get('/:userId', getUserNotifications)
router.patch('/read/:userId', markAllAsRead)
// Single notification mark-read. Route shape is distinct from
// /read/:userId (literal "read" as first segment) so order-independent.
router.patch('/:notificationId/read', markOneAsRead)

export default router
