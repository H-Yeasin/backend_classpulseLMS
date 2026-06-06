import mongoose from 'mongoose'
import httpStatus from 'http-status'
import AppError from '../errors/AppError'
import catchAsync from '../utils/catchAsync'
import sendResponse from '../utils/sendResponse'
import { GroupWork } from '../models/groupWork.model'
import { Class } from '../models/class.model'
import { User } from '../models/user.model'
import { uploadToCloudinary } from '../utils/cloudinary'

/***********************************
 * CREATE GROUP WORK               *
 ***********************************/
export const createGroupWork = catchAsync(async (req, res) => {
  const { classId, title, description, dueDate, archived } = req.body
  let { userId } = req.body

  if (!classId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'classId is required')
  }
  if (!title) {
    throw new AppError(httpStatus.BAD_REQUEST, 'title is required')
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid classId')
  }

  const classExists = await Class.findById(classId)
  if (!classExists) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Class not found')
  }

  // Accept userId as either a JSON array or a comma-separated string (multipart friendly)
  if (typeof userId === 'string') {
    userId = userId
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
  }
  if (!Array.isArray(userId) || userId.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'userId must be a non-empty array of member ObjectIds'
    )
  }
  for (const id of userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, `Invalid member id: ${id}`)
    }
  }

  const foundMembers = await User.find({ _id: { $in: userId } }).select('_id')
  if (foundMembers.length !== userId.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'One or more member users were not found'
    )
  }

  // Optional file uploads (multer populates req.files)
  const files: string[] = []
  if (req.files && Array.isArray(req.files)) {
    for (const f of req.files) {
      const uploadResult = await uploadToCloudinary(f.path)
      if (uploadResult) files.push(uploadResult.secure_url)
    }
  }

  const groupWork = await GroupWork.create({
    classId,
    userId,
    title,
    description,
    dueDate,
    file: files,
    archived: archived === true || archived === 'true',
  })

  const populated = await groupWork.populate('userId', 'username avatar')

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Group homework created successfully',
    data: populated,
  })
})

/***********************************
 * GET GROUP WORK FOR A CLASS      *
 *   (populates members w/ avatar) *
 ***********************************/
export const getGroupWorkByClass = catchAsync(async (req, res) => {
  const { classId } = req.params
  const { archived } = req.query

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid class ID')
  }

  const filter: Record<string, any> = { classId }
  if (archived === 'true') filter.archived = true
  else if (archived === 'false') filter.archived = false

  const groupWork = await GroupWork.find(filter)
    .populate('userId', 'username avatar')
    .sort({ created_at: -1 })

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Group homework for class fetched successfully',
    data: groupWork,
  })
})