import { Request, Response } from "express";
import mongoose, { PipelineStage, Types } from "mongoose";
import AppError from "../errors/AppError";
import { Class } from "../models/class.model";
import { Quiz } from "../models/quiz.model";
import { StuAssignToClass } from "../models/stuAssignToClass.model";
import { User } from "../models/user.model";
import { createNotification } from "../sockets/notification.service";
import catchAsync from "../utils/catchAsync";
import { uploadToCloudinary } from "../utils/cloudinary";

// Shared aggregation that attaches `questionCount` (size of the matching
// QuizQA.questions array) to every quiz returned by a list endpoint. Keeps
// the question-count source of truth in one place and avoids N+1 lookups
// from the client.
const withQuestionCount = (
  match: PipelineStage.Match["$match"],
): PipelineStage[] => [
  { $match: match },
  { $sort: { created_at: -1 } },
  {
    $lookup: {
      from: "quizqas",
      localField: "_id",
      foreignField: "quizId",
      as: "qa",
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "teacherId",
      foreignField: "_id",
      as: "teacher",
    },
  },
  {
    $addFields: {
      questionCount: {
        $size: {
          $ifNull: [{ $arrayElemAt: ["$qa.questions", 0] }, []],
        },
      },
      teacher: { $arrayElemAt: ["$teacher", 0] },
    },
  },
  { $project: { qa: 0 } },
];

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAuthorizedStudentId = (req: Request) => {
  const requester = req.user as any;
  const targetStudentId = req.params.studentId;

  if (!targetStudentId || !Types.ObjectId.isValid(targetStudentId)) {
    throw new AppError(400, "Valid studentId is required");
  }

  if (
    requester?.type === "student" &&
    requester?._id?.toString() !== targetStudentId
  ) {
    throw new AppError(
      403,
      "Students can only access quizzes assigned to their own account",
    );
  }

  return targetStudentId;
};

// Create a new quiz
export const createQuiz = catchAsync(async (req: Request, res: Response) => {
  const { teacherId, classId, title, description, time } = req.body;

  let imageUrl = "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.path);
    if (result) imageUrl = result.secure_url;
  }

  const newQuiz = await Quiz.create({
    teacherId,
    classId,
    title,
    description,
    image: imageUrl,
    time,
  });

  // =========================
  // 1. Get all students of this class
  // =========================
  const students = await StuAssignToClass.find({ classId });

  // =========================
  // 2. Send notification to each student
  // =========================
  const notifications = students.map((stu) =>
    createNotification({
      to: new mongoose.Types.ObjectId(stu.studentId),
      message: `New quiz added: ${title}`,
      type: "quiz",
      id: newQuiz._id,
    }),
  );

  await Promise.all(notifications);

  // =========================
  // 3. Optional: Admin notification (keep if needed)
  // =========================
  const adminUsers = await User.findOne({ role: "admin" });

  if (adminUsers) {
    await createNotification({
      to: new mongoose.Types.ObjectId(adminUsers._id as any),
      message: `New quiz created: ${title}`,
      type: "quiz",
      id: newQuiz._id,
    });
  }

  res.status(201).json({
    success: true,
    message: "Quiz created successfully",
    data: newQuiz,
  });
});

// Edit/update a quiz
export const updateQuiz = catchAsync(async (req: Request, res: Response) => {
  const { quizId } = req.params;
  const updates: any = { ...req.body };

  // Handle image upload if file exists
  if (req.file) {
    const result = await uploadToCloudinary(req.file.path);
    if (result) updates.image = result.secure_url;
  }

  const updatedQuiz = await Quiz.findByIdAndUpdate(quizId, updates, {
    new: true,
  });

  if (!updatedQuiz) throw new AppError(404, "Quiz not found");

  res.status(200).json({
    success: true,
    message: "Quiz updated successfully",
    data: updatedQuiz,
  });
});

// Get all quizzes
export const getAllQuizzes = catchAsync(
  async (_req: Request, res: Response) => {
    const quizzes = await Quiz.aggregate(withQuestionCount({}));
    res.status(200).json({
      success: true,
      data: quizzes,
    });
  },
);

// Get quizzes by classId
export const getQuizzesByClass = catchAsync(
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    const quizzes = await Quiz.aggregate(
      withQuestionCount({ classId: new Types.ObjectId(classId) }),
    );

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  },
);

// Delete a quiz
export const deleteQuiz = catchAsync(async (req: Request, res: Response) => {
  const { quizId } = req.params;
  const deletedQuiz = await Quiz.findByIdAndDelete(quizId);

  if (!deletedQuiz) throw new AppError(404, "Quiz not found");

  res.status(200).json({
    success: true,
    message: "Quiz deleted successfully",
  });
});

// Get quizzes by teacherId
export const getQuizzesByTeacher = catchAsync(
  async (req: Request, res: Response) => {
    const { teacherId } = req.params;

    const quizzes = await Quiz.aggregate(
      withQuestionCount({ teacherId: new Types.ObjectId(teacherId) }),
    );

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  },
);

export const getQuizzesForStudent = catchAsync(
  async (req: Request, res: Response) => {
    const studentId = getAuthorizedStudentId(req);
    const subjectQuery = req.query.subject?.toString().trim();

    const student = await User.findById(studentId).select(
      "username email gradeLevel schoolId type",
    );

    if (!student || student.type !== "student") {
      throw new AppError(404, "Student not found");
    }

    if (!student.schoolId || student.gradeLevel === undefined) {
      return res.status(200).json({
        success: true,
        message: "Student quizzes fetched successfully",
        data: {
          student,
          filters: {
            schoolId: student.schoolId ?? null,
            gradeLevel: student.gradeLevel ?? null,
            subject: subjectQuery || null,
          },
          quizzes: [],
        },
      });
    }

    const schoolTeacherIds = (await User.find({
      type: "teacher",
      schoolId: student.schoolId,
      isActive: true,
    }).distinct("_id")) as Types.ObjectId[];

    if (!schoolTeacherIds.length) {
      return res.status(200).json({
        success: true,
        message: "Student quizzes fetched successfully",
        data: {
          student,
          filters: {
            schoolId: student.schoolId,
            gradeLevel: student.gradeLevel,
            subject: subjectQuery || null,
          },
          quizzes: [],
        },
      });
    }

    const assignedClassIds = (await StuAssignToClass.find({
      studentId: new Types.ObjectId(studentId),
    }).distinct("classId")) as Types.ObjectId[];

    const classFilter: Record<string, any> = {
      grade: student.gradeLevel,
      teacherId: { $in: schoolTeacherIds },
    };

    if (assignedClassIds.length) {
      classFilter._id = { $in: assignedClassIds };
    }

    if (subjectQuery) {
      classFilter.subject = {
        $regex: escapeRegex(subjectQuery),
        $options: "i",
      };
    }

    const allowedClasses = await Class.find(classFilter).select(
      "_id grade subject section schedule teacherId",
    );

    if (!allowedClasses.length) {
      return res.status(200).json({
        success: true,
        message: "Student quizzes fetched successfully",
        data: {
          student,
          filters: {
            schoolId: student.schoolId,
            gradeLevel: student.gradeLevel,
            subject: subjectQuery || null,
          },
          quizzes: [],
        },
      });
    }

    const allowedClassIds = allowedClasses.map((classItem) => classItem._id);
    const classById = new Map(
      allowedClasses.map((classItem) => [classItem._id.toString(), classItem]),
    );

    const quizzes = await Quiz.aggregate([
      {
        $match: {
          status: "published",
          classId: { $in: allowedClassIds },
          teacherId: { $in: schoolTeacherIds },
        },
      },
      { $sort: { created_at: -1 } },
      {
        $lookup: {
          from: "quizqas",
          localField: "_id",
          foreignField: "quizId",
          as: "qa",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "teacherId",
          foreignField: "_id",
          as: "teacher",
        },
      },
      {
        $addFields: {
          questionCount: {
            $size: {
              $ifNull: [{ $arrayElemAt: ["$qa.questions", 0] }, []],
            },
          },
          teacher: { $arrayElemAt: ["$teacher", 0] },
        },
      },
      { $project: { qa: 0 } },
    ]);

    const data = quizzes.map((quiz: any) => {
      const classData = classById.get(quiz.classId.toString());
      return {
        ...quiz,
        class: classData
          ? {
              _id: classData._id,
              grade: classData.grade,
              subject: classData.subject,
              section: classData.section,
              schedule: classData.schedule,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Student quizzes fetched successfully",
      data: {
        student,
        filters: {
          schoolId: student.schoolId,
          gradeLevel: student.gradeLevel,
          subject: subjectQuery || null,
        },
        quizzes: data,
      },
    });
  },
);
