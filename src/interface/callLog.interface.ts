import { Document, Model, Types } from 'mongoose'

export interface ICallLog extends Document {
  roomId: Types.ObjectId;
  callerId: Types.ObjectId;
  receiverId?: Types.ObjectId;
  status: 'missed' | 'completed' | 'ongoing' | 'declined' | 'cancelled' | 'busy';
  callType: 'audio' | 'video';
  startedAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number;
  created_at?: Date;
  updated_at?: Date;
}

export type CallLogModel = Model<ICallLog>;
