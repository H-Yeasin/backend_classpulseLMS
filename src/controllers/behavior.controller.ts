import mongoose from "mongoose";
import AppError from "../errors/AppError";
import { Behavior } from "../models/behavior.model";
import { ParentsChild } from "../models/parentsChild.model";
import { User } from "../models/user.model";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

const createBehavior = catchAsync(async (req, res) => {
  try {
    const { _id: userId } = req.user as any;
    const { studentId } = req.body;

    const teacher = await User.findById(userId);
    if (!teacher) {
      throw new AppError(400, "Teacher not found");
    }

    const student = await User.findById(studentId);
    if (!student) {
      throw new AppError(400, "Student not found");
    }

    const result = await Behavior.create({
      studentId,
      teacherId: userId,
      ...req.body,
    });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Behavior created successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getSingleBehavior = catchAsync(async (req, res) => {
  try {
    const { behaviorId } = req.params;

    const behavior = await Behavior.findById(behaviorId);
    if (!behavior) {
      throw new AppError(400, "Behavior not found");
    }

    const result = await Behavior.findById(behaviorId)
      .populate({
        path: "studentId",
        select: "username email role type",
      })
      .populate({
        path: "teacherId",
        select: "username email role type",
      });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Behavior fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getAllBehaviors = catchAsync(async (req, res) => {
  try {
    const result = await Behavior.find()
      .populate({
        path: "studentId",
        select: "username email role type",
      })
      .populate({
        path: "teacherId",
        select: "username email role type",
      });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Behaviors fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getBehaviorByTeacher = catchAsync(async (req, res) => {
  try {
    const { _id: teacherId } = req.user as any;

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      throw new AppError(400, "Teacher not found");
    }

    const result = await Behavior.find({ teacherId })
      .populate({
        path: "studentId",
        select: "username email role type",
      })
      .populate({
        path: "teacherId",
        select: "username email role type",
      });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Behaviors fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getBehaviorByStudent = catchAsync(async (req, res) => {
  const authUser = req.user as any;
  const authUserId = authUser?._id;

  if (!authUserId) {
    throw new AppError(401, "User not authenticated");
  }

  let studentId = authUserId;

  if (authUser.type === "parent") {
    const childId = (req.query.childId || req.query.studentId)?.toString();

    if (!childId) {
      throw new AppError(400, "childId query parameter is required");
    }

    const child = await User.findById(childId);
    if (!child || child.type !== "student") {
      throw new AppError(404, "Child student not found");
    }

    const relation = await ParentsChild.findOne({
      parentId: authUserId,
      childId,
    });

    if (!relation) {
      throw new AppError(
        403,
        "You are not allowed to view this child's behavior"
      );
    }

    studentId = childId;
  } else {
    const student = await User.findById(studentId);
    if (!student || student.type !== "student") {
      throw new AppError(400, "Student not found");
    }
  }

  const result = await Behavior.find({ studentId })
    .populate({
      path: "studentId",
      select: "username email role type",
    })
    .populate({
      path: "teacherId",
      select: "username email role type",
    });

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Behaviors fetched successfully",
    data: result,
  });
});

const updateBehavior = catchAsync(async (req, res) => {
  try {
    const { behaviorId } = req.params;

    const behavior = await Behavior.findById(behaviorId);
    if (!behavior) {
      throw new AppError(400, "Behavior not found");
    }

    const { studentId } = req.body;

    const student = await User.findById(studentId);
    if (!student) {
      throw new AppError(400, "Student not found");
    }

    const result = await Behavior.findByIdAndUpdate(behaviorId, req.body, {
      new: true,
    });
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Behavior updated successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const deleteBehavior = catchAsync(async (req, res) => {
  try {
    const { behaviorId } = req.params;

    const behavior = await Behavior.findById(behaviorId);
    if (!behavior) {
      throw new AppError(400, "Behavior not found");
    }

    const result = await Behavior.findByIdAndDelete(behaviorId);
    if (!result) {
      throw new AppError(400, "Behavior not found");
    }
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Behavior deleted successfully",
      data: null,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getBehaviorForMyChild = catchAsync(async (req, res) => {
  try {
    const { studentId } = req.params;
    const { _id: parentId } = req.user as any;

    // parent check
    const parent = await User.findById(parentId);
    if (!parent) {
      throw new AppError(400, "Parent not found");
    }

    // student check + parent validation
    const student = await ParentsChild.findOne({
      parentId,
      childId: studentId,
    });
    if (!student) {
      throw new AppError(400, "It's not your child");
    }

    // behavior fetch
    const result = await Behavior.find({ studentId });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Behaviors fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getBehaviorsByStudentId = catchAsync(async (req, res) => {
  try {
    const { studentId } = req.params;

    // =========================
    // 1. Get all behaviors
    // =========================
    const behaviors = await Behavior.find({ studentId })
      .populate({
        path: "studentId",
        select: "username email role type",
      })
      .populate({
        path: "teacherId",
        select: "username email role type",
      });

    // =========================
    // 2. Add per-behavior percentage
    // =========================
    const behaviorsWithProgress = behaviors.map((item) => {
      return {
        ...item.toObject(),
        progressPercentage: item.state === "positive" ? 100 : 0,
      };
    });

    // =========================
    // 3. Overall progress (optional summary)
    // =========================
    const total = behaviors.length;

    const positiveCount = behaviors.filter(
      (b) => b.state === "positive",
    ).length;

    const overallProgress =
      total === 0 ? 0 : Math.round((positiveCount / total) * 100);

    const progress = {
      total,
      positiveCount,
      progressPercentage: overallProgress,
    };

    // =========================
    // 4. Response
    // =========================
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Behaviors fetched successfully",
      data: behaviorsWithProgress,
      progress,
    });
  } catch (error: any) {
    throw new AppError(500, error.message || "Something went wrong");
  }
});

const behaviorController = {
  createBehavior,
  getSingleBehavior,
  getAllBehaviors,
  getBehaviorByTeacher,
  getBehaviorByStudent,
  updateBehavior,
  deleteBehavior,
  getBehaviorForMyChild,
  getBehaviorsByStudentId,
};

export default behaviorController;
