import mongoose from "mongoose";
import AppError from "../errors/AppError";
import AcademicDocument from "../models/academicDocument.model";
import { Class } from "../models/class.model";
import { ParentsChild } from "../models/parentsChild.model";
import { User } from "../models/user.model";
import { createNotification } from "../sockets/notification.service";
import catchAsync from "../utils/catchAsync";
import { uploadToCloudinary } from "../utils/cloudinary";
import sendResponse from "../utils/sendResponse";
//
const createAcademicDocument = catchAsync(async (req, res) => {
  try {
    const { studentId } = req.body;
    const { _id: userId } = req.user as any;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(400, "Teacher not found");
    }

    if (!user.schoolId) {
      throw new AppError(400, "You are not a teacher of any school");
    }

    const teacherClass = await Class.findOne({ teacherId: user._id });
    if (!teacherClass) {
      throw new AppError(400, "You are not a teacher of any class");
    }

    const student = await User.findById(studentId);
    if (!student) {
      throw new AppError(400, "Student not found");
    }

    if (student.type !== "student") {
      throw new AppError(
        400,
        "You can only upload academic documents for students",
      );
    }

    if (student.schoolId === null) {
      throw new AppError(400, "Student is not enrolled in any school");
    }

    if (String(user.schoolId) !== String(student.schoolId)) {
      throw new AppError(
        400,
        "You can't upload academic documents for a student from another school",
      );
    }

    let document = { public_id: "", url: "" };
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path);
      if (uploadResult) {
        document = {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        };
      }
    }

    const academicDocument = await AcademicDocument.create({
      teacherId: user._id,
      studentId,
      schoolId: user.schoolId,
      classId: teacherClass._id,
      document,
    });

    const populatedDocument = await AcademicDocument.findById(
      academicDocument._id,
    )
      .populate({
        path: "studentId",
        select: "username Id gradeLevel schoolId",
        populate: {
          path: "schoolId",
          select: "name",
        },
      })
      .populate({
        path: "schoolId",
        select: "name",
      });

    await createNotification({
      to: new mongoose.Types.ObjectId(student._id as any),
      message: `New academic document assigned by ${user.username}`,
      type: "academicDocument",
      id: academicDocument._id,
    });

    const adminUsers = await User.findOne({ role: "admin" });

    if (adminUsers) {
      await createNotification({
        to: new mongoose.Types.ObjectId(adminUsers._id as any),
        message: `New academic document created by ${user.username}`,
        type: "academicDocument",
        id: academicDocument._id,
      });
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Academic document created successfully",
      data: populatedDocument,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getAcademicDocumentForStudent = catchAsync(async (req, res) => {
  try {
    const { _id: userId } = req.user as any;
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(400, "Student not found");
    }

    const result = await AcademicDocument.find({ studentId: user._id })
      .populate({
        path: "studentId",
        select: "username Id gradeLevel",
      })
      .populate({
        path: "teacherId",
        select: "username",
      })
      .populate({
        path: "schoolId",
        select: "name",
      })

      .populate({
        path: "classId",
        select: "subject grade",
      })
      .sort({ created_at: -1 });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Academic documents fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getAcademicDocumentForChild = catchAsync(async (req, res) => {
  const { _id: parentId } = req.user as any;
  const childId = (
    req.query.childId ||
    req.query.childsid ||
    req.query.childsId ||
    req.query.studentId
  )?.toString();

  if (!childId) {
    throw new AppError(400, "childId query parameter is required");
  }

  const child = await User.findById(childId);
  if (!child || child.type !== "student") {
    throw new AppError(404, "Child student not found");
  }

  const relation = await ParentsChild.findOne({ parentId, childId });
  if (!relation) {
    throw new AppError(
      403,
      "You are not allowed to view this child's academic documents",
    );
  }

  const result = await AcademicDocument.find({ studentId: childId })
    .populate({
      path: "studentId",
      select: "username Id gradeLevel",
    })
    .populate({
      path: "teacherId",
      select: "username Id role type",
    })
    .populate({
      path: "schoolId",
      select: "name",
    })
    .sort({ created_at: -1 });

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Academic documents fetched successfully",
    data: result,
  });
});

const getAcademicDocumentForTeacher = catchAsync(async (req, res) => {
  try {
    const { _id: userId } = req.user as any;
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(400, "Teacher not found");
    }

    const result = await AcademicDocument.find({
      teacherId: user._id,
    })
      .populate({
        path: "studentId",
        select: "username Id gradeLevel",
      })
      .populate({
        path: "schoolId",
        select: "name",
      });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Academic documents fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getSingleAcademicDocument = catchAsync(async (req, res) => {
  try {
    const { academicDocumentId } = req.params;

    const document = await AcademicDocument.findById(academicDocumentId);
    if (!document) {
      throw new AppError(400, "Academic document not found");
    }

    const result = await AcademicDocument.findById(academicDocumentId)
      .populate({
        path: "studentId",
        select: "username Id gradeLevel",
      })
      .populate({
        path: "schoolId",
        select: "name",
      });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Academic document get successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const updateAcademicDocument = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await AcademicDocument.findById(id);
    if (!doc) {
      throw new AppError(400, "Academic document not found");
    }

    let document = { public_id: "", url: "" };
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path);
      if (uploadResult) {
        document = {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        };
      }
    }

    const updatedDocument = await AcademicDocument.findByIdAndUpdate(
      id,
      {
        document,
      },
      { new: true },
    );

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Academic document updated successfully",
      data: updatedDocument,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const deleteAcademicDocument = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    const document = await AcademicDocument.findById(id);
    if (!document) {
      throw new AppError(400, "Academic document not found");
    }

    await AcademicDocument.findByIdAndDelete(id);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Academic document deleted successfully",
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getDocumentByClass = catchAsync(async (req, res) => {
  try {
    const { classId } = req.params;
    const documents = await AcademicDocument.find({ classId })
      .populate({
        path: "studentId",
        select: "username Id gradeLevel",
      })
      .populate({
        path: "schoolId",
        select: "name",
      })
      .populate({
        path: "classId",
        select: "subject grade",
      });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Academic documents fetched successfully",
      data: documents,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getAcademicDocumentByStudentId = catchAsync(async (req, res) => {
  try {
    const { studentId } = req.params;
    const documents = await AcademicDocument.find({ studentId })
      .populate({
        path: "studentId",
        select: "username Id gradeLevel",
      })
      .populate({
        path: "schoolId",
        select: "name",
      })
      .populate({
        path: "classId",
        select: "subject grade",
      });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Academic documents fetched successfully",
      data: documents,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const academicDocumentController = {
  createAcademicDocument,
  getAcademicDocumentForStudent,
  getAcademicDocumentForChild,
  getAcademicDocumentForTeacher,
  getSingleAcademicDocument,
  getDocumentByClass,
  updateAcademicDocument,
  deleteAcademicDocument,
  getAcademicDocumentByStudentId,
};

export default academicDocumentController;
