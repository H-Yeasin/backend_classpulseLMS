import mongoose, { Schema } from 'mongoose'
import { IRoom, RoomModel } from '../interface/room.interface'

const roomSchema: Schema<IRoom> = new Schema(
  {
    name: { type: String }, // for group chat
    avatar: { type: String }, // group image
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      },
    ],
    type: { type: String, enum: ['direct', 'group'], required: true, default: 'group' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date },
    lastMessage: { type: String, default: '' },
    isBlocked: { type: Boolean, default: false },
    blockedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mutedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

export const Room = mongoose.model<IRoom, RoomModel>('Room', roomSchema)
