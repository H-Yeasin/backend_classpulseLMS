import { LearningTip } from '../models/learningTip.model'
import { ParentsChild } from '../models/parentsChild.model'
import { User } from '../models/user.model'
import catchAsync from '../utils/catchAsync'
import sendResponse from '../utils/sendResponse'
import AppError from '../errors/AppError'
import httpStatus from 'http-status'
import { getPaginationParams, buildMetaPagination } from '../utils/pagination'

// CREATE
export const createLearningTip = catchAsync(async (req, res) => {
  const {
    administratorId,
    img,
    title,
    description,
    schoolId,
    imageUrl,
    sections,
  } = req.body

//   if (!administratorId || !name || !description || !schoolId) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Missing required fields')
//   }

  const newTip = await LearningTip.create({
    administratorId,
    img,
    title,
    description,
    schoolId,
    imageUrl,
    sections,
  })

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Learning tip created successfully',
    data: newTip,
  })
})

/*****************************
 * // GET BY ADMINISTRATORID *
 *****************************/
export const getLearningTipsByAdmin = catchAsync(async (req, res) => {
  const { administratorId } = req.query
  if (!administratorId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'administratorId is required')
  }

  const { page, limit, skip } = getPaginationParams(req.query)

  const totalItems = await LearningTip.countDocuments({ administratorId })
  const tips = await LearningTip.find({ administratorId })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)

    const meta = await buildMetaPagination(totalItems, page, limit)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Learning tips fetched successfully',
    data: {
      tips,
      meta,
    },
  })
})

/**********************
 * // GET BY SCHOOLID *
 **********************/
export const getLearningTipsBySchool = catchAsync(async (req, res) => {
  const { schoolId } = req.query
  if (!schoolId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'schoolId is required')
  }

  const tips = await LearningTip.find({ schoolId }).sort({ created_at: -1 })

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Learning tips fetched successfully',
    data: tips,
  })
})

/******************
 * // VIEW SINGLE *
 ******************/
export const getSingleLearningTip = catchAsync(async (req, res) => {
  const { id } = req.params

  const tip = await LearningTip.findById(id)
  if (!tip) throw new AppError(httpStatus.NOT_FOUND, 'Learning tip not found')

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Learning tip fetched successfully',
    data: tip,
  })
})

/*************
 * // UPDATE *
 *************/
export const updateLearningTip = catchAsync(async (req, res) => {
  const { id } = req.params

  const updatedTip = await LearningTip.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  })

  if (!updatedTip)
    throw new AppError(httpStatus.NOT_FOUND, 'Learning tip not found')

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Learning tip updated successfully',
    data: updatedTip,
  })
})

/**********************************************
 * // GET BY PARENT (aggregate across schools) *
 **********************************************/
export const getLearningTipsByParent = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User not authenticated')
  }

  const parentId = req.user._id

  const relations = await ParentsChild.find({ parentId }).select('childId')
  const childIds = relations.map((r) => r.childId)

  const children = await User.find({ _id: { $in: childIds } }).select('schoolId')
  const uniqueSchoolIds = Array.from(
    new Set(
      children
        .map((c) => c.schoolId?.toString())
        .filter((id): id is string => Boolean(id))
    )
  )

  const tips = uniqueSchoolIds.length
    ? await LearningTip.find({ schoolId: { $in: uniqueSchoolIds } }).sort({
        created_at: -1,
      })
    : []

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Learning tips fetched successfully',
    data: { tips },
  })
})

/*************
 * // DELETE *
 *************/
export const deleteLearningTip = catchAsync(async (req, res) => {
  const { id } = req.params

  const deletedTip = await LearningTip.findByIdAndDelete(id)
  if (!deletedTip)
    throw new AppError(httpStatus.NOT_FOUND, 'Learning tip not found')

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Learning tip deleted successfully',
    data: deletedTip,
  })
})
