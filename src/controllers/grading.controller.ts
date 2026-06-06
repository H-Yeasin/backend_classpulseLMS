import httpStatus from "http-status";
import { Types } from "mongoose";
import AppError from "../errors/AppError";
import { Class } from "../models/class.model";
import { ParentsChild } from "../models/parentsChild.model";
import { Quiz } from "../models/quiz.model";
import { QuizQA } from "../models/quizQA.model";
import { QuizResult } from "../models/quizResult.model";
import { StuAssignToClass } from "../models/stuAssignToClass.model";
import { User } from "../models/user.model";
import catchAsync from "../utils/catchAsync";
import { uploadToCloudinary } from "../utils/cloudinary";
import sendResponse from "../utils/sendResponse";

type QuestionPayload = {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  type?: "normal" | "scenario" | "image" | "challenge";
  imagePrompt?: string;
  imageUrl?: string;
};

const assertObjectId = (id: unknown, label: string) => {
  if (!id || !Types.ObjectId.isValid(id.toString())) {
    throw new AppError(httpStatus.BAD_REQUEST, `${label} is invalid`);
  }
};

const requireCurrentUserId = (req: any) => {
  const userId = req.user?._id?.toString();
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }
  return userId;
};

const ensureTeacherOwnsClass = async (teacherId: string, classId: string) => {
  assertObjectId(classId, "classId");

  const classData = await Class.findById(classId);
  if (!classData) {
    throw new AppError(httpStatus.NOT_FOUND, "Class not found");
  }

  if (classData.teacherId.toString() !== teacherId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to manage grading for this class",
    );
  }

  return classData;
};

const ensureTeacherOwnsSession = async (
  teacherId: string,
  sessionId: string,
) => {
  assertObjectId(sessionId, "sessionId");

  const session = await Quiz.findById(sessionId);
  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Grading session not found");
  }

  if (session.teacherId.toString() !== teacherId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to manage this grading session",
    );
  }

  return session;
};

const isStudentInClass = async (studentId: string, classData: any) => {
  const assigned = await StuAssignToClass.exists({
    studentId,
    classId: classData._id,
  });
  if (assigned) return true;

  const student = await User.findById(studentId).select("type gradeLevel");
  return Boolean(
    student &&
    student.type === "student" &&
    Number(student.gradeLevel) === Number(classData.grade),
  );
};

const ensureStudentCanAccessSession = async (
  studentId: string,
  sessionId: string,
) => {
  assertObjectId(sessionId, "sessionId");

  const session = await Quiz.findById(sessionId);
  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Grading session not found");
  }

  if (session.status !== "published") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Grading session is not published",
    );
  }

  const classData = await Class.findById(session.classId);
  if (!classData) {
    throw new AppError(httpStatus.NOT_FOUND, "Class not found");
  }

  const isAllowed = await isStudentInClass(studentId, classData);
  if (!isAllowed) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to access this grading session",
    );
  }

  return { session, classData };
};

const getQuestionCount = async (sessionId: string) => {
  const qa = await QuizQA.findOne({ quizId: sessionId }).select("questions");
  return qa?.questions.length || 0;
};

const withSessionMeta = async (session: any, studentId?: string) => {
  const obj = session.toObject ? session.toObject() : session;
  const questionCount = await getQuestionCount(obj._id.toString());
  const result = studentId
    ? await QuizResult.findOne({ quizId: obj._id, studentId }).select(
        "score percentage progress createdAt updatedAt",
      )
    : null;

  return {
    ...obj,
    questionCount,
    resultStatus: result?.progress?.status ?? "not_started",
    result: result
      ? {
          _id: result._id,
          score: result.score,
          percentage: result.percentage,
          progress: result.progress,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        }
      : null,
  };
};

const validateQuestions = (rawQuestions: unknown): QuestionPayload[] => {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "questions array is required");
  }

  return rawQuestions.map((raw, index) => {
    const item = raw as Partial<QuestionPayload>;
    const question = item.question?.toString().trim();
    const answer = item.answer?.toString().trim();
    const explanation = item.explanation?.toString().trim() || "";
    const imagePrompt = item.imagePrompt?.toString().trim() || "";
    const imageUrl = item.imageUrl?.toString().trim() || "";
    const options = Array.isArray(item.options)
      ? item.options.map((option) => option.toString().trim()).filter(Boolean)
      : [];
    const difficulty =
      item.difficulty === "easy" ||
      item.difficulty === "medium" ||
      item.difficulty === "hard"
        ? item.difficulty
        : "medium";
    const type =
      item.type === "normal" ||
      item.type === "scenario" ||
      item.type === "image" ||
      item.type === "challenge"
        ? item.type
        : imageUrl || imagePrompt
          ? "image"
          : "normal";

    if (!question) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `questions[${index}].question is required`,
      );
    }
    if (!answer) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `questions[${index}].answer is required`,
      );
    }
    if (!options.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `questions[${index}].options is required`,
      );
    }
    if (!options.includes(answer)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `questions[${index}].answer must match one option`,
      );
    }

    return {
      question,
      options,
      answer,
      explanation,
      difficulty,
      type,
      imagePrompt,
      imageUrl,
    };
  });
};

const getOrCreateResult = async (sessionId: string, studentId: string) => {
  let result = await QuizResult.findOne({ quizId: sessionId, studentId });
  if (result) return result;

  const session = await Quiz.findById(sessionId);
  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Grading session not found");
  }

  const qa = await QuizQA.findOne({ quizId: sessionId });
  if (!qa) {
    throw new AppError(httpStatus.NOT_FOUND, "Questions not found");
  }

  result = await QuizResult.create({
    quizId: sessionId,
    studentId,
    answers: qa.questions.map((q) => ({
      question: q.question,
      selectedAnswer: "",
      isCorrect: null,
    })),
    progress: {
      answeredCount: 0,
      totalQuestions: qa.questions.length,
      remainingTime: session.time,
      status: "ongoing",
    },
  });

  return result;
};

const mergeSubmittedAnswers = (
  result: any,
  submittedAnswers: Array<{ question?: string; selectedAnswer?: string }>,
) => {
  for (const submitted of submittedAnswers) {
    const question = submitted.question?.toString();
    const selectedAnswer = submitted.selectedAnswer?.toString() ?? "";
    const answerIndex = result.answers.findIndex(
      (answer: any) => answer.question === question,
    );

    if (answerIndex !== -1) {
      result.answers[answerIndex].selectedAnswer = selectedAnswer;
    }
  }

  result.progress.answeredCount = result.answers.filter((answer: any) =>
    Boolean(answer.selectedAnswer),
  ).length;
};

const buildProgressRecords = async (studentId: string, classId?: string) => {
  const quizFilter: Record<string, any> = { status: "published" };

  if (classId) {
    assertObjectId(classId, "classId");
    const classData = await Class.findById(classId);
    if (!classData) {
      throw new AppError(httpStatus.NOT_FOUND, "Class not found");
    }
    const isAllowed = await isStudentInClass(studentId, classData);
    if (!isAllowed) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Student is not assigned to this class",
      );
    }
    quizFilter.classId = classId;
  }

  const sessions = await Quiz.find(quizFilter).select("_id");
  const sessionIds = sessions.map((session) => session._id);

  const results = await QuizResult.find({
    studentId,
    quizId: { $in: sessionIds },
    "progress.status": "completed",
  })
    .populate({
      path: "quizId",
      select: "title classId time teacherId created_at",
      populate: [
        { path: "classId", select: "subject grade section" },
        { path: "teacherId", select: "username Id type role" },
      ],
    })
    .sort({ updatedAt: -1 });

  const records = results.map((result: any) => {
    const session = result.quizId;
    return {
      _id: result._id,
      sessionId: session?._id,
      title: session?.title ?? "Grading Session",
      date: result.updatedAt ?? result.createdAt,
      score: result.score ?? 0,
      totalQuestions: result.progress?.totalQuestions ?? result.answers.length,
      percentage: result.percentage ?? 0,
      status: result.progress?.status ?? "completed",
      class: session?.classId ?? null,
      teacher: session?.teacherId ?? null,
    };
  });

  const overallPercentage = records.length
    ? Math.round(
        records.reduce((sum, record) => sum + record.percentage, 0) /
          records.length,
      )
    : 0;

  return {
    summary: {
      overallPercentage,
      completedCount: records.length,
    },
    records,
  };
};

const getClassRoster = async (classData: any) => {
  const assigned = await StuAssignToClass.find({ classId: classData._id })
    .populate("studentId", "username Id gradeLevel avatar")
    .sort({ created_at: -1 });

  const assignedStudents = assigned
    .map((relation: any) => relation.studentId)
    .filter(Boolean);

  if (assignedStudents.length) return assignedStudents;

  return User.find({
    type: "student",
    gradeLevel: classData.grade,
  }).select("username Id gradeLevel avatar");
};

const createSession = catchAsync(async (req, res) => {
  const teacherId = requireCurrentUserId(req);
  const { classId, title, description, time } = req.body;

  if (!title?.toString().trim()) {
    throw new AppError(httpStatus.BAD_REQUEST, "title is required");
  }

  await ensureTeacherOwnsClass(teacherId, classId);

  const session = await Quiz.create({
    teacherId,
    classId,
    title: title.toString().trim(),
    description: description?.toString() ?? "",
    time: Number(time) || 5,
    status: "draft",
  });

  return sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Grading session created successfully",
    data: await withSessionMeta(session),
  });
});

const listTeacherSessions = catchAsync(async (req, res) => {
  const teacherId = requireCurrentUserId(req);
  const classId = req.query.classId?.toString();

  const filter: Record<string, any> = { teacherId };
  if (classId) {
    await ensureTeacherOwnsClass(teacherId, classId);
    filter.classId = classId;
  }

  const sessions = await Quiz.find(filter)
    .populate("classId", "subject grade")
    .sort({ createdAt: -1 });
  const data = await Promise.all(
    sessions.map((session) => withSessionMeta(session)),
  );

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading sessions fetched successfully",
    data,
  });
});

const getTeacherSession = catchAsync(async (req, res) => {
  const teacherId = requireCurrentUserId(req);
  const session = await ensureTeacherOwnsSession(
    teacherId,
    req.params.sessionId,
  );
  await session.populate("classId", "subject grade");

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading session fetched successfully",
    data: await withSessionMeta(session),
  });
});

const updateSession = catchAsync(async (req, res) => {
  const teacherId = requireCurrentUserId(req);
  const session = await ensureTeacherOwnsSession(
    teacherId,
    req.params.sessionId,
  );

  const updates: Record<string, any> = {};
  if (req.body.title !== undefined) updates.title = req.body.title.toString();
  if (req.body.description !== undefined) {
    updates.description = req.body.description.toString();
  }
  if (req.body.time !== undefined) updates.time = Number(req.body.time) || 5;

  const updated = await Quiz.findByIdAndUpdate(session._id, updates, {
    new: true,
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading session updated successfully",
    data: await withSessionMeta(updated),
  });
});

const uploadQuestionImage = catchAsync(async (req, res) => {
  requireCurrentUserId(req);

  if (!req.file) {
    throw new AppError(httpStatus.BAD_REQUEST, "image is required");
  }

  const uploadResult = await uploadToCloudinary(req.file.path);
  if (!uploadResult) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to upload image");
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Question image uploaded successfully",
    data: {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    },
  });
});

const publishSession = catchAsync(async (req, res) => {
  const teacherId = requireCurrentUserId(req);
  const session = await ensureTeacherOwnsSession(
    teacherId,
    req.params.sessionId,
  );

  const questionCount = await getQuestionCount(session._id.toString());
  if (!questionCount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Add questions before publishing this grading session",
    );
  }

  const updated = await Quiz.findByIdAndUpdate(
    session._id,
    { status: "published" },
    { new: true },
  );

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading session published successfully",
    data: await withSessionMeta(updated),
  });
});

const upsertQuestions = catchAsync(async (req, res) => {
  const teacherId = requireCurrentUserId(req);
  const session = await ensureTeacherOwnsSession(
    teacherId,
    req.params.sessionId,
  );
  const questions = validateQuestions(req.body.questions);

  const qa = await QuizQA.findOneAndUpdate(
    { quizId: session._id },
    { quizId: session._id, questions },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading questions saved successfully",
    data: qa,
  });
});

const getQuestions = catchAsync(async (req, res) => {
  const userId = requireCurrentUserId(req);
  const userType = (req.user as any).type;
  const sessionId = req.params.sessionId;

  if (userType === "teacher") {
    await ensureTeacherOwnsSession(userId, sessionId);
  } else if (userType === "student") {
    await ensureStudentCanAccessSession(userId, sessionId);
  } else {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied");
  }

  const qa = await QuizQA.findOne({ quizId: sessionId });
  if (!qa) {
    throw new AppError(httpStatus.NOT_FOUND, "Questions not found");
  }

  const data =
    userType === "student"
      ? {
          _id: qa._id,
          quizId: qa.quizId,
          questions: qa.questions.map((question) => ({
            question: question.question,
            options: question.options,
            difficulty: question.difficulty,
            type: question.type,
            imageUrl: question.imageUrl,
          })),
        }
      : qa;

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading questions fetched successfully",
    data,
  });
});

const listStudentSessions = catchAsync(async (req, res) => {
  const studentId = requireCurrentUserId(req);
  const classId = req.query.classId?.toString();

  if (!classId) {
    throw new AppError(httpStatus.BAD_REQUEST, "classId query is required");
  }

  assertObjectId(classId, "classId");
  const classData = await Class.findById(classId);
  if (!classData) {
    throw new AppError(httpStatus.NOT_FOUND, "Class not found");
  }

  const isAllowed = await isStudentInClass(studentId, classData);
  if (!isAllowed) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to access grading sessions for this class",
    );
  }

  const sessions = await Quiz.find({
    classId,
    status: "published",
  }).sort({ created_at: -1 });

  const data = await Promise.all(
    sessions.map((session) => withSessionMeta(session, studentId)),
  );

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student grading sessions fetched successfully",
    data,
  });
});

const startSession = catchAsync(async (req, res) => {
  const studentId = requireCurrentUserId(req);
  const { session } = await ensureStudentCanAccessSession(
    studentId,
    req.params.sessionId,
  );

  const existing = await QuizResult.findOne({
    quizId: session._id,
    studentId,
  });
  if (existing?.progress?.status === "completed") {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already submitted this grading session",
    );
  }

  const result =
    existing ?? (await getOrCreateResult(session._id.toString(), studentId));

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: existing
      ? "Grading session already started"
      : "Grading session started successfully",
    data: result,
  });
});

const saveProgress = catchAsync(async (req, res) => {
  const studentId = requireCurrentUserId(req);
  const { session } = await ensureStudentCanAccessSession(
    studentId,
    req.params.sessionId,
  );
  const { question, selectedAnswer, remainingTime } = req.body;

  if (!question?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, "question is required");
  }

  const result: any = await getOrCreateResult(
    session._id.toString(),
    studentId,
  );
  if (result.progress?.status === "completed") {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already submitted this grading session",
    );
  }

  mergeSubmittedAnswers(result, [
    {
      question: question.toString(),
      selectedAnswer: selectedAnswer?.toString() ?? "",
    },
  ]);
  if (remainingTime !== undefined) {
    result.progress.remainingTime = Number(remainingTime) || 0;
  }

  await result.save();

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading progress saved successfully",
    data: result,
  });
});

const submitSession = catchAsync(async (req, res) => {
  const studentId = requireCurrentUserId(req);
  const { session } = await ensureStudentCanAccessSession(
    studentId,
    req.params.sessionId,
  );
  const result: any = await getOrCreateResult(
    session._id.toString(),
    studentId,
  );

  if (result.progress?.status === "completed") {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already submitted this grading session",
    );
  }

  if (Array.isArray(req.body.answers)) {
    mergeSubmittedAnswers(result, req.body.answers);
  }

  const qa = await QuizQA.findOne({ quizId: session._id });
  if (!qa) {
    throw new AppError(httpStatus.NOT_FOUND, "Questions not found");
  }

  let correctCount = 0;
  result.answers = result.answers.map((answer: any) => {
    const correctAnswer = qa.questions.find(
      (question) => question.question === answer.question,
    )?.answer;
    const isCorrect = answer.selectedAnswer === correctAnswer;
    if (isCorrect) correctCount++;
    const plainAnswer =
      typeof answer.toObject === "function" ? answer.toObject() : answer;
    return { ...plainAnswer, isCorrect };
  });

  const totalQuestions = qa.questions.length;
  const percentage = totalQuestions ? (correctCount / totalQuestions) * 100 : 0;

  result.score = correctCount;
  result.percentage = percentage;
  result.progress.answeredCount = result.answers.filter((answer: any) =>
    Boolean(answer.selectedAnswer),
  ).length;
  result.progress.totalQuestions = totalQuestions;
  result.progress.remainingTime = 0;
  result.progress.status = "completed";

  await result.save();

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading session submitted successfully",
    data: {
      _id: result._id,
      sessionId: session._id,
      score: correctCount,
      totalQuestions,
      percentage,
      progress: result.progress,
      answers: result.answers,
    },
  });
});

const getStudentProgress = catchAsync(async (req, res) => {
  const studentId = requireCurrentUserId(req);
  const classId = req.query.classId?.toString();
  const data = await buildProgressRecords(studentId, classId);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading progress fetched successfully",
    data,
  });
});

const getChildProgress = catchAsync(async (req, res) => {
  const parentId = requireCurrentUserId(req);
  const childId = (
    req.query.childId ||
    req.query.childsid ||
    req.query.childsId ||
    req.query.studentId
  )?.toString();
  const classId = req.query.classId?.toString();

  if (!childId) {
    throw new AppError(httpStatus.BAD_REQUEST, "childId query is required");
  }
  assertObjectId(childId, "childId");

  const relation = await ParentsChild.findOne({ parentId, childId });
  if (!relation) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to view this child's grading progress",
    );
  }

  const data = await buildProgressRecords(childId, classId);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Child's grading progress fetched successfully",
    data,
  });
});

const getSessionResults = catchAsync(async (req, res) => {
  const teacherId = requireCurrentUserId(req);
  const session = await ensureTeacherOwnsSession(
    teacherId,
    req.params.sessionId,
  );
  const classData = await Class.findById(session.classId);
  if (!classData) {
    throw new AppError(httpStatus.NOT_FOUND, "Class not found");
  }

  const roster = await getClassRoster(classData);
  const results = await QuizResult.find({ quizId: session._id })
    .populate("studentId", "username name Id grade gradeLevel avatar")
    .sort({ updatedAt: -1 });

  const resultByStudent = new Map(
    results.map((result: any) => [result.studentId?._id?.toString(), result]),
  );

  const attended = results.filter(
    (result: any) => result.progress?.status === "completed",
  );
  const averagePercentage = attended.length
    ? Math.round(
        attended.reduce(
          (sum: number, result: any) => sum + (result.percentage || 0),
          0,
        ) / attended.length,
      )
    : 0;

  const notAttendedStudents = roster.filter((student: any) => {
    const result = resultByStudent.get(student._id?.toString());
    return !result || result.progress?.status !== "completed";
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Grading session results fetched successfully",
    data: {
      session: await withSessionMeta(session),
      summary: {
        assignedStudents: roster.length,
        startedStudents: results.length,
        attendedStudents: attended.length,
        notAttendedStudents: notAttendedStudents.length,
        averagePercentage,
      },
      results: results.map((result: any) => ({
        _id: result._id,
        studentId: result.studentId,
        score: result.score ?? 0,
        totalQuestions:
          result.progress?.totalQuestions ?? result.answers.length,
        percentage: result.percentage ?? 0,
        status: result.progress?.status ?? "ongoing",
        submittedAt:
          result.progress?.status === "completed" ? result.updatedAt : null,
        updatedAt: result.updatedAt,
      })),
      notAttendedStudents,
    },
  });
});

export const getSingleStudentGrading = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  // =====================
  // 1. FETCH ALL GRADING
  // =====================
  const gradingData = await QuizResult.find({
    studentId,
  })
    .populate("quizId", "title description")
    .sort({ createdAt: -1 });

  if (!gradingData || gradingData.length === 0) {
    throw new AppError(404, "No grading found for this student");
  }

  // =====================
  // 2. FORMAT RESPONSE
  // =====================
  const formatted = gradingData.map((item) => ({
    _id: item._id,
    quiz: item.quizId,
    score: item.score,
    percentage: item.percentage,
    progress: item.progress,
    status: item.progress?.status,
    answeredCount: item.progress?.answeredCount,
    totalQuestions: item.progress?.totalQuestions,
  }));

  // =====================
  // FINAL RESPONSE
  // =====================
  res.status(200).json({
    success: true,
    message: "Student grading fetched successfully",
    data: formatted,
  });
});

const gradingController = {
  createSession,
  listTeacherSessions,
  getTeacherSession,
  updateSession,
  uploadQuestionImage,
  publishSession,
  upsertQuestions,
  getQuestions,
  listStudentSessions,
  startSession,
  saveProgress,
  submitSession,
  getStudentProgress,
  getChildProgress,
  getSessionResults,
  getSingleStudentGrading,
};

export default gradingController;
