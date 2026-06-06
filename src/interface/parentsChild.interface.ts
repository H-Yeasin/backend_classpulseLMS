import { Document, Model, Types } from 'mongoose'

export interface IParentsChild extends Document {
  parentId: Types.ObjectId
  childId: Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface ParentsChildModel extends Model<IParentsChild> {}
