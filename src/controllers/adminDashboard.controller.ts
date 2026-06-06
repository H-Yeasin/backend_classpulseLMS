import { Request, Response } from 'express'
import { User } from '../models/user.model'
import catchAsync from '../utils/catchAsync'
import httpStatus from 'http-status'
import sendResponse from '../utils/sendResponse'

export const getUserStats = catchAsync(async (_req: Request, res: Response) => {
  // Count each type
  const totalStudents = await User.countDocuments({ type: 'student' })
  const totalParents = await User.countDocuments({ type: 'parent' })
  const totalTeachers = await User.countDocuments({ type: 'teacher' })

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User stats fetched successfully',
    data: {
      totalStudents,
      totalParents,
      totalTeachers,
    },
  })
})

// student count by gender
export const getStudentGenderStats = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await User.aggregate([
      { $match: { type: 'student' } }, // Only students
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 },
        },
      },
    ])

    // Format result as an object for pie chart
    const genderStats: Record<string, number> = { male: 0, female: 0, other: 0 }
    result.forEach((item) => {
      genderStats[item._id] = item.count
    })

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Student gender stats fetched successfully',
      data: genderStats,
    })
  }
)
