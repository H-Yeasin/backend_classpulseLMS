import mongoose, { Schema } from 'mongoose'
import { IMessage, MessageModel } from '../interface/message.interface'

const messageSchema: Schema<IMessage> = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '' },
    file: {
      type: [
        {
          filename: { type: String, required: true },
          url: { type: String, required: true },
          public_id: { type: String, default: '' },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    ans: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

export const Message = mongoose.model<IMessage, MessageModel>(
  'Message',
  messageSchema
)
