import { Document, Model, Types } from 'mongoose'

export interface IMessageAttachment {
  filename: string
  url: string
  public_id?: string
  uploadedAt?: Date
}

export interface IMessage extends Document {
  roomId: Types.ObjectId
  userId: Types.ObjectId
  message: string
  file: IMessageAttachment[]
  ans?: string
  status: 'sent' | 'delivered' | 'read'
  readBy: Types.ObjectId[]
  isEdited: boolean
  isDeleted: boolean
  deletedAt?: Date
  created_at?: Date
  updated_at?: Date
}

export interface MessageModel extends Model<IMessage> {
  findByRoom(roomId: string): Promise<IMessage[]>
}
