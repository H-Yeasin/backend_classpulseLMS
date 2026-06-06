import { Document, Model, Types } from 'mongoose'

export interface IUser extends Document {
  username: string
  phoneNumber?: string
  email?: string
  role: 'user' | 'admin' | 'administrator'
  type: 'parent' | 'student' | 'teacher'
  Id: string
  password: string
  gradeLevel?: number
  state: 'active' | 'inactive' | 'suspended'
  age?: number
  avatar?: {
    public_id: string
    url: string
  }
  verificationInfo?: {
    verified: boolean
    token: string
  }
  password_reset_token?: string
  refreshToken?: string
  tokenVersion?: number
  credit?: number
  fine?: number
  created_at?: Date
  updated_at?: Date
  schoolId: Types.ObjectId
  gender: 'male' | 'female' | 'other'
  isActive: boolean
  isTwoFactorAuthEnabled: boolean
  hashedOtp?: string
  otpExpires?: Date
}

// Static methods interface
export interface UserModel extends Model<IUser> {
  isUserExistsByEmail(email: string): Promise<IUser | null>
  isOTPVerified(id: string): Promise<boolean | undefined>
  isPasswordMatched(
    plainTextPassword: string,
    hashPassword: string
  ): Promise<boolean>
  isJWTIssuedBeforePasswordChanged(
    passwordChangeTimeStamp: Date,
    JwtIssuedTimeStamp: number
  ): boolean
}

export type TLoginUser = {
  email: string
  password: string
}
