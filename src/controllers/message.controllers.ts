import { Request, Response } from 'express'
import httpStatus from 'http-status'
import { Message } from '../models/message.model'
import catchAsync from '../utils/catchAsync'
import AppError from '../errors/AppError'
import mongoose from 'mongoose'
import { io } from '../server'
import { uploadToCloudinary } from '../utils/cloudinary' // Adjust path
import { canAccessRoom } from '../utils/chatAccess'
import { Room } from '../models/room.model'

/***************
 * CREATE MESSAGE
 ***************/
export const createMessage = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user as any
  const { message, roomId } = req.body
  const files = (req.files as Express.Multer.File[]) || []

  if (!authUser?._id) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User not authenticated')
  }

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid room ID')
  }

  await canAccessRoom(authUser._id.toString(), roomId)

  // Upload all files to Cloudinary
  const fileData = await Promise.all(
    files.map(async (file) => {
      const result = await uploadToCloudinary(file.path)
      if (result) {
        return {
          filename: file.originalname,
          url: result.secure_url,
          public_id: result.public_id, // save this if you want to support deletion
          uploadedAt: new Date(),
        }
      }
    })
  )

  const newMessage = await Message.create({
    message,
    roomId,
    userId: authUser._id,
    file: fileData.filter(Boolean), // remove nulls
  })

  await Room.findByIdAndUpdate(roomId, {
    lastMessageId: newMessage._id,
    lastMessage: message || (fileData.length > 0 ? 'Attachment' : ''),
    lastMessageAt: new Date()
  })

  io.to(roomId).emit('newMessage', newMessage)

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Message created',
    data: newMessage,
  })
})

/***************
 * GET MESSAGES BY ROOM (Paginated)
 ***************/
export const getMessagesByRoom = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user as any
    const { roomId } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    if (!authUser?._id) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'User not authenticated')
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid room ID')
    }

    await canAccessRoom(authUser._id.toString(), roomId)

    const messages = await Message.find({ roomId })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const total = await Message.countDocuments({ roomId })

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Messages fetched',
      data: messages,
      meta: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    })
  }
)

/***************
 * UPDATE MESSAGE
 ***************/
export const updateMessage = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user as any
  const { messageId } = req.params
  const { message } = req.body

  if (!authUser?._id) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User not authenticated')
  }

  const existing = await Message.findById(messageId)
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found')
  }

  if (existing.userId.toString() !== authUser._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only edit your own messages'
    )
  }

  const updated = await Message.findByIdAndUpdate(
    messageId,
    { message, isEdited: true },
    { new: true }
  )

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Message updated',
    data: updated,
  })
})

/***************
 * DELETE MESSAGE
 ***************/
export const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user as any
  const { messageId } = req.params

  if (!authUser?._id) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User not authenticated')
  }

  const existing = await Message.findById(messageId)
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, 'Message not found')
  }

  if (existing.userId.toString() !== authUser._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only delete your own messages'
    )
  }

  const deleted = await Message.findByIdAndUpdate(
    messageId,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  )

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Message deleted',
    data: deleted,
  })
})
