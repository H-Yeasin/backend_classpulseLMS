import mongoose, { Schema } from 'mongoose'
import { ICallLog, CallLogModel } from '../interface/callLog.interface'

const callLogSchema: Schema<ICallLog> = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['missed', 'completed', 'ongoing', 'declined', 'cancelled', 'busy'], required: true, default: 'ongoing' },
    callType: { type: String, enum: ['audio', 'video'], required: true, default: 'audio' },
    startedAt: { type: Date, required: true, default: Date.now },
    answeredAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

export const CallLog = mongoose.model<ICallLog, CallLogModel>('CallLog', callLogSchema)
