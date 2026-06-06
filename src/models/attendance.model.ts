import mongoose, { Schema } from 'mongoose'
import { IAttendance, AttendanceModel } from '../interface/attendance.interface'

const attendanceSchema: Schema<IAttendance> = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'absent',
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

export const Attendance = mongoose.model<IAttendance, AttendanceModel>(
  'Attendance',
  attendanceSchema
)
