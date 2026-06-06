import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { User } from '../models/user.model'
import { ParentsChild } from '../models/parentsChild.model'
import { QuizResult } from '../models/quizResult.model'
import AppError from '../errors/AppError'
import catchAsync from '../utils/catchAsync'
import sendResponse from '../utils/sendResponse'
import httpStatus from 'http-status'
import { canMessageUser } from '../utils/chatAccess'

/*****************
 * CREATE RELATION
 *****************/
export const createParentsChild = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user as any
    const parentId = authUser?._id?.toString()
    let { childId } = req.body

    if (!parentId || !childId) {
      throw new AppError(400, 'childId is required.')
    }

    // If childId is not a valid MongoDB ObjectId, attempt to find user by custom 'Id' string
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      const student = await User.findOne({ Id: childId })
      if (!student) {
        throw new AppError(404, 'Student with the provided ID not found.')
      }
      childId = student._id
    }

    const parent = await User.findById(parentId).select('_id type isActive schoolId')
    if (!parent || parent.type !== 'parent' || !parent.isActive) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Only active parent accounts can create parent-child relations'
      )
    }

    const childUser = await User.findById(childId).select('_id type isActive schoolId')
    if (!childUser || childUser.type !== 'student' || !childUser.isActive) {
      throw new AppError(400, 'Child must be an active student account')
    }

    if (
      parent.schoolId &&
      childUser.schoolId &&
      parent.schoolId.toString() !== childUser.schoolId.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Parent and child must belong to the same school'
      )
    }

    // Prevent duplicate relation
    const existing = await ParentsChild.findOne({ parentId, childId })
    if (existing) {
      throw new AppError(409, 'Relation already exists.')
    }

    const relation = await ParentsChild.create({ parentId, childId })

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Parent-Child relation created successfully',
      data: relation,
    })
  }
)

/*****************
 * DELETE RELATION
 *****************/
export const deleteParentsChild = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user as any
    const { id } = req.params

    const relation = await ParentsChild.findById(id)
    if (!relation) {
      throw new AppError(404, 'Relation not found.')
    }

    if (authUser?._id?.toString() !== relation.parentId.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You can only delete your own parent-child relations'
      )
    }

    await ParentsChild.findByIdAndDelete(id)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Relation deleted successfully',
    })
  }
)

/***********************
 * GET CHILDREN BY PARENT
 ***********************/
export const getChildrenByParentId = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user as any
    const { parentId } = req.params

    if (authUser?._id?.toString() !== parentId.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You can only view your own children'
      )
    }

    const children = await ParentsChild.find({ parentId }).populate(
      'childId',
      'username email age gradeLevel avatar'
    )
    const validChildren = children.filter((relation: any) => relation.childId)

    // Calculate progress and tagText for each child
    const enhancedChildren = await Promise.all(
      validChildren.map(async (relation: any) => {
        let childData = relation.childId;
        if (childData && childData._id) {
          // Fetch completed quiz results for this child
          const quizResults = await QuizResult.find({ 
            studentId: childData._id, 
            'progress.status': 'completed' 
          });

          let averagePercentage = 0;
          let progressScore = 0;
          
          if (quizResults.length > 0) {
            const totalPercentage = quizResults.reduce((acc: number, curr: any) => acc + (curr.percentage || 0), 0);
            averagePercentage = totalPercentage / quizResults.length;
            progressScore = Number((averagePercentage / 100).toFixed(2));
          }

          let tagTextString = 'Needs Work';
          if (progressScore >= 0.9) {
            tagTextString = 'Excellent';
          } else if (progressScore >= 0.75) {
            tagTextString = 'Good';
          } else if (progressScore >= 0.5) {
            tagTextString = 'Fair';
          }

          const relationObj = relation.toObject();
          return {
            ...relationObj,
            childId: {
              ...relationObj.childId,
              progress: progressScore,
              tagText: tagTextString
            }
          };
        }
        return relation;
      })
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      data: { children: enhancedChildren, count: enhancedChildren.length },
    })
  }
)

/**********************
 * GET PARENTS BY CHILD
 **********************/
export const getParentsByChildId = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user as any
    const { childId } = req.params

    const requesterType = authUser?.type
    if (!requesterType) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'User not authenticated')
    }

    if (requesterType === 'student' && authUser._id.toString() !== childId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Students can only view their own parents'
      )
    }

    if (requesterType === 'parent') {
      const ownRelation = await ParentsChild.exists({
        parentId: authUser._id,
        childId,
      })
      if (!ownRelation) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Parents can only view parent data for their own children'
        )
      }
    }

    if (requesterType === 'teacher') {
      const access = await canMessageUser(authUser._id.toString(), childId)
      if (!access.allowed) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "Teachers can only view parents for students from their own classes"
        )
      }
    }

    const parents = await ParentsChild.find({ childId }).populate(
      'parentId',
      'username email role avatar'
    )

    sendResponse(res, {
      statusCode: 200,
      success: true,
      data: { parents, count: parents.length },
    })
  }
)
