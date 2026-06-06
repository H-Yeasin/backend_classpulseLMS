import httpStatus from "http-status";
import mongoose from "mongoose";
import AppError from "../errors/AppError";
import { Class } from "../models/class.model";
import { StuAssignToClass } from "../models/stuAssignToClass.model";
import { User } from "../models/user.model";
import { createNotification } from "../sockets/notification.service";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/******************************
 * ASSIGN STUDENT TO CLASS *
 ******************************/
export const assignStudentToClass = catchAsync(async (req, res) => {
  const { studentId, classId } = req.body;
  const currentUser = req.user as any;

  if (!studentId || !classId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "studentId and classId are required",
    );
  }

  const classInfo = await Class.findById(classId).select("teacherId grade");
  if (!classInfo) {
    throw new AppError(httpStatus.NOT_FOUND, "Class not found");
  }

  if (
    currentUser?.type === "teacher" &&
    classInfo.teacherId.toString() !== currentUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Teachers can only assign students to their own classes",
    );
  }

  const student = await User.findById(studentId).select(
    "type schoolId gradeLevel",
  );
  if (!student || student.type !== "student") {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  if (
    currentUser?.schoolId &&
    student.schoolId?.toString() !== currentUser.schoolId.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Teachers can only assign students from their school",
    );
  }

  if (student.gradeLevel !== classInfo.grade) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Student grade does not match class grade",
    );
  }

  // Check if already assigned
  const existingAssignment = await StuAssignToClass.findOne({
    studentId,
    classId,
  });
  if (existingAssignment) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Student already assigned to this class",
    );
  }

  const newAssignment = await StuAssignToClass.create({ studentId, classId });

  await createNotification({
    to: new mongoose.Types.ObjectId(studentId as any),
    message: `You have been assigned to a class: ${classId}`,
    type: "user",
    id: newAssignment._id,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Student assigned to class successfully",
    data: newAssignment,
  });
});

/******************************
 * GET CLASSES BY STUDENT ID *
 ******************************/
export const getClassesByStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  const assignments = await StuAssignToClass.find({ studentId })
    .populate("classId", "grade subject section schedule")
    .populate("studentId", "username email");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Classes for student fetched successfully",
    data: assignments,
  });
});

/******************************
 * GET STUDENTS BY CLASS ID *
 ******************************/
export const getStudentByClass = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const currentUser = req.user as any;

  const classInfo = await Class.findById(classId).select("teacherId");
  if (!classInfo) {
    throw new AppError(httpStatus.NOT_FOUND, "Class not found");
  }

  if (
    currentUser?.type === "teacher" &&
    classInfo.teacherId.toString() !== currentUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Teachers can only view students from their own classes",
    );
  }

  const assignments = await StuAssignToClass.find({ classId })
    .populate("classId", "grade subject section schedule")
    .populate(
      "studentId",
      "-password_reset_token -refreshToken -verificationInfo",
    );

  if (!assignments) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "No students found for this class",
    );
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Students for class fetched successfully",
    data: assignments,
  });
});

/***************************
 * REMOVE STUDENT ASSIGNMENT *
 ***************************/
export const removeStudentFromClass = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user as any;

  const assignment = await StuAssignToClass.findById(id).populate(
    "classId",
    "teacherId",
  );
  if (!assignment) {
    throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
  }

  const classInfo = assignment.classId as any;
  if (
    currentUser?.type === "teacher" &&
    classInfo?.teacherId?.toString() !== currentUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Teachers can only remove students from their own classes",
    );
  }

  await StuAssignToClass.findByIdAndDelete(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student removed from class successfully",
    data: null,
  });
});
