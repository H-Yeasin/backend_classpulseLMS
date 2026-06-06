import bcrypt from 'bcrypt'
import mongoose, { Schema } from 'mongoose'
import { IUser, UserModel } from '../interface/user.interface'

const userSchema: Schema = new Schema<IUser>(
  {
    username: { type: String, required: true },
    phoneNumber: { type: String },
    email: { type: String },
    role: {
      type: String,
      enum: ['user', 'admin', 'administrator'],
      default: 'user',
    },
    type: {
      type: String,
      enum: ['parent', 'student', 'teacher'],
    },
    Id: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    gradeLevel: {
      type: Number,
    },
    state: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    age: { type: Number, default: null },
    avatar: {
      public_id: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    verificationInfo: {
      verified: { type: Boolean, default: false },
      token: { type: String, default: '' },
    },
    password_reset_token: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    tokenVersion: { type: Number, default: 0 },
    credit: { type: Number, default: null },
    fine: { type: Number },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: null },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    isActive: { type: Boolean, default: true },
    isTwoFactorAuthEnabled: { type: Boolean, default: false },
    hashedOtp: { type: String, select: false, default: '' },
    otpExpires: { type: Date, select: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

// Hash password before saving
userSchema.pre('save', async function (next) {
  const user = this as any

  if (user.isModified('password')) {
    const saltRounds =
      Number(
        process.env.BCRYPT_SALT_ROUNDS || process.env.BCRYPT_SALT_ROUND
      ) || 10
    user.password = await bcrypt.hash(user.password, saltRounds)
  }

  next()
})

// Static methods
userSchema.statics.isUserExistsByEmail = async function (email: string) {
  return await User.findOne({ email }).select('+password')
}

userSchema.statics.isOTPVerified = async function (id: string) {
  const user = await User.findById(id).select('+verificationInfo')
  return user?.verificationInfo?.verified
}

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword: string,
  hashPassword: string
) {
  return await bcrypt.compare(plainTextPassword, hashPassword)
}

export const User = mongoose.model<IUser, UserModel>('User', userSchema)
