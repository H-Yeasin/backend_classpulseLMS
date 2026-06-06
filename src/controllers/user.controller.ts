import bcrypt from "bcrypt";
import { Request, Response } from "express";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import AppError from "../errors/AppError";
import { IUser } from "../interface/user.interface";
import { Attendance } from "../models/attendance.model";
import { Class } from "../models/class.model";
import { ParentsChild } from "../models/parentsChild.model";
import { Quiz } from "../models/quiz.model";
import { QuizResult } from "../models/quizResult.model";
import school from "../models/school.model";
import { StuAssignToClass } from "../models/stuAssignToClass.model";
import { User } from "../models/user.model";
import { createNotification } from "../sockets/notification.service";
import catchAsync from "../utils/catchAsync";
import { uploadToCloudinary } from "../utils/cloudinary";
import sendEmail from "../utils/sendEmail";
import sendResponse from "../utils/sendResponse";
import verificationCodeTemplate from "../utils/verificationCodeTemplate";
const getTokenVersion = (user: Partial<IUser>) => user.tokenVersion ?? 0;

const signAccessToken = (user: IUser) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
      type: user.type,
      Id: user.Id,
      tokenVersion: getTokenVersion(user),
    },
    process.env.JWT_SECRET || "default_secret",
    { expiresIn: "7d" },
  );

// Shared shape for auth + profile responses. Keep this in one place so the
// login, /me and update endpoints hand the client identical fields.
const toPublicUser = (user: IUser) => ({
  id: user._id,
  username: user.username,
  Id: user.Id,
  role: user.role,
  type: user.type,
  state: user.state,
  email: user.email,
  phoneNumber: user.phoneNumber,
  age: user.age,
  gradeLevel: user.gradeLevel,
  gender: user.gender,
  schoolId: user.schoolId,
  avatar: user.avatar,
  isActive: user.isActive,
  created_at: user.created_at,
  updated_at: user.updated_at,
  isTwoFactorAuthEnabled: user.isTwoFactorAuthEnabled,
});

const ensureUniqueId = async (Id: string) => {
  const existingId = await User.findOne({ Id });
  if (existingId) {
    throw new AppError(409, "Id already exists");
  }
};

const ensureUniqueAdministratorUpdate = async (
  userId: string,
  Id?: string,
) => {
  if (Id) {
    const existingId = await User.findOne({ Id, _id: { $ne: userId } });
    if (existingId) {
      throw new AppError(409, "Id already exists");
    }
  }
};

const updateAdministratorSchoolAssignment = async (
  administratorId: string,
  currentSchoolId: unknown,
  nextSchoolId?: string | null,
) => {
  if (nextSchoolId === undefined) return undefined;

  const normalizedNextSchoolId = nextSchoolId || null;
  const currentSchoolIdString = currentSchoolId
    ? currentSchoolId.toString()
    : null;

  if (currentSchoolIdString === normalizedNextSchoolId) {
    return normalizedNextSchoolId;
  }

  if (normalizedNextSchoolId) {
    const targetSchool = await school.findById(normalizedNextSchoolId);
    if (!targetSchool) {
      throw new AppError(httpStatus.NOT_FOUND, "School not found");
    }

    if (
      targetSchool.administrator &&
      targetSchool.administrator.toString() !== administratorId
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This school already has an administrator assigned",
      );
    }
  }

  await school.updateMany(
    { administrator: administratorId },
    { $unset: { administrator: "" } },
  );

  if (normalizedNextSchoolId) {
    await school.findByIdAndUpdate(normalizedNextSchoolId, {
      $set: { administrator: administratorId },
    });
  }

  return normalizedNextSchoolId;
};

const buildAvatarFromRequest = async (file?: Express.Multer.File) => {
  if (!file) return { public_id: "", url: "" };

  const uploadResult = await uploadToCloudinary(file.path);
  if (!uploadResult) return { public_id: "", url: "" };

  return {
    public_id: uploadResult.public_id,
    url: uploadResult.secure_url,
  };
};

const findAdministratorSchool = async (administratorId: string) => {
  const administrator = await User.findById(administratorId).select(
    "role schoolId",
  );
  if (!administrator) {
    throw new AppError(httpStatus.NOT_FOUND, "Administrator not found");
  }
  if (administrator.role !== "administrator") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only administrators can manage school users",
    );
  }

  const adminSchool = administrator.schoolId
    ? await school.findById(administrator.schoolId)
    : await school.findOne({ administrator: administrator._id });

  if (!adminSchool) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No school assigned to this administrator",
    );
  }

  return adminSchool;
};

/*****************
 * REGISTER USER *
 *****************/
export const registerUser = catchAsync(async (req: Request, res: Response) => {
  const {
    username,
    phoneNumber,
    type,
    gradeLevel,
    Id,
    age,
    password,
    email,
    role,
    schoolId,
    gender,
  } = req.body;

  // Validate required fields
  if (!username || !Id || !password) {
    throw new AppError(
      400,
      "All fields (username, Id, age, state, password) are required.",
    );
  }

  if (role === "admin" || role === "administrator") {
    throw new AppError(
      400,
      "Admin and administrator accounts must be created by an admin.",
    );
  }

  // Handle image upload
  await ensureUniqueId(Id);
  const avatar = await buildAvatarFromRequest(req.file);

  if (type === "student" || type === "teacher") {
    if (!schoolId) {
      throw new AppError(
        400,
        `School ID is required for ${type} registration.`,
      );
    }

    const isSchoolExists = await school.findById(schoolId);
    if (!isSchoolExists) {
      throw new AppError(400, "School not found");
    }
  }

  // Create user
  const user = await User.create({
    username,
    Id,
    age,
    password,
    avatar,
    phoneNumber,
    type,
    gradeLevel,
    email,
    role,
    schoolId,
    gender,
  });

  const adminUsers = await User.findOne({ role: "admin" });

  await createNotification({
    to: new mongoose.Types.ObjectId(adminUsers!._id as any),
    message: `New user registered: ${username}`,
    type: "user",
    id: user._id,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      id: user._id,
      schoolId: user.schoolId,
      username: user.username,
      type: user.type,
      role: user.role,
      age: user.age,
      state: user.state,
      avatar: user.avatar,
      created_at: user.created_at,
    },
  });
});

/**************
 * LOGIN USER *
 **************/
export const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { Id, password } = req.body;

  // Validate input
  if (!Id || !password) {
    throw new AppError(400, "Id and password are required.");
  }

  // Find user by Id
  const user = await User.findOne({ Id }).select("+password");
  if (!user) {
    throw new AppError(401, "Invalid Id or password.");
  }
  if (user.isActive === false) {
    throw new AppError(401, "Your account has been Deactivated.");
  }

  // Compare password
  const isPasswordMatched = await User.isPasswordMatched(
    password,
    user.password,
  );
  if (!isPasswordMatched) {
    throw new AppError(401, "Invalid Id or password.");
  }

  // Generate JWT token
  const token = signAccessToken(user);

  if (user.isTwoFactorAuthEnabled) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    user.hashedOtp = hashedOtp;
    user.otpExpires = otpExpires;
    await user.save();

    try {
      await sendEmail({
        to: user.email as string,
        subject: "Your 2FA Verification Code",
        html: verificationCodeTemplate(otp),
      });
    } catch (err: any) {
      throw new AppError(500, "Could not send 2FA verification email");
    }
    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
      data: {
        accessToken: token,
        is2FA: true,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token,
      user: toPublicUser(user),
    },
  });
});

/*************************
 * GET CURRENT USER (ME) *
 *************************/
export const getMe = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user as unknown as IUser | undefined;
  if (!authUser?._id) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }

  const user = await User.findById(authUser._id).select(
    "-password -refreshToken -verificationInfo -password_reset_token",
  );
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Current user fetched successfully",
    data: toPublicUser(user),
  });
});

/**********
 * LOGOUT *
 **********/
export const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user as unknown as IUser | undefined;
  if (!authUser?._id) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }

  await User.findByIdAndUpdate(authUser._id, {
    $inc: { tokenVersion: 1 },
    $set: { refreshToken: "" },
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logout successful",
    data: null,
  });
});

/*******************
 * CHANGE PASSWORD *
 *******************/
export const changePassword = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user as unknown as IUser | undefined;
    if (!authUser?._id) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }

    const { oldPassword, newPassword } = req.body as {
      oldPassword?: string;
      newPassword?: string;
    };

    if (!oldPassword || !newPassword) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "oldPassword and newPassword are required.",
      );
    }
    if (newPassword.length < 6) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "New password must be at least 6 characters long.",
      );
    }
    if (oldPassword === newPassword) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "New password must be different from the old password.",
      );
    }

    const user = await User.findById(authUser._id).select("+password");
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    const matches = await User.isPasswordMatched(oldPassword, user.password);
    if (!matches) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Current password is incorrect.",
      );
    }

    // The pre-save hook on User hashes this before persistence.
    user.password = newPassword;
    await user.save();

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Password updated successfully",
    });
  },
);

// Search student by Id
export const searchStudentById = catchAsync(
  async (req: Request, res: Response) => {
    const { Id } = req.query;
    if (!Id || typeof Id !== "string") {
      throw new AppError(400, "Student Id query parameter is required.");
    }

    // Exact match (case insensitive) for the student 'Id'
    const students = await User.find({
      Id: new RegExp(`^${Id}$`, "i"),
      type: "student",
    }).select("username Id gradeLevel age avatar");

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Student search result",
      data: students,
    });
  },
);

// Get all administrators
export const getAllAdministrators = catchAsync(
  async (_req: Request, res: Response) => {
    const admins = await User.find({ role: "administrator" })
      .select("username email phoneNumber type state avatar created_at Id schoolId")
      .populate("schoolId", "name code email");

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Administrators fetched successfully",
      data: admins,
    });
  },
);

export const createAdministrator = catchAsync(
  async (req: Request, res: Response) => {
    const {
      username,
      phoneNumber,
      Id,
      age,
      password,
      email,
      schoolId,
      gender,
    } = req.body;

    if (!username || !Id || !password || !schoolId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "username, Id, password, and schoolId are required.",
      );
    }

    const targetSchool = await school.findById(schoolId);
    if (!targetSchool) {
      throw new AppError(httpStatus.NOT_FOUND, "School not found");
    }

    if (targetSchool.administrator) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This school already has an administrator assigned",
      );
    }

    await ensureUniqueId(Id);
    const avatar = await buildAvatarFromRequest(req.file);

    const user = await User.create({
      username,
      Id,
      age,
      password,
      avatar,
      phoneNumber,
      email,
      role: "administrator",
      schoolId: targetSchool._id,
      gender,
    });

    targetSchool.administrator = user._id as any;
    await targetSchool.save();

    return sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Administrator created and assigned to school successfully",
      data: toPublicUser(user),
    });
  },
);

const createSchoolUserByType = (type: "student" | "teacher" | "parent") =>
  catchAsync(async (req: Request, res: Response) => {
    const authUser = req.user as unknown as IUser | undefined;
    if (!authUser?._id) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }

    const { username, phoneNumber, Id, age, password, email, gradeLevel, gender } =
      req.body;

    if (!username || !Id || !password) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "username, Id, and password are required.",
      );
    }

    const adminSchool = await findAdministratorSchool(authUser._id.toString());
    await ensureUniqueId(Id);
    const avatar = await buildAvatarFromRequest(req.file);

    const user = await User.create({
      username,
      Id,
      age,
      password,
      avatar,
      phoneNumber,
      email,
      role: "user",
      type,
      gradeLevel: gradeLevel !== undefined ? Number(gradeLevel) : undefined,
      schoolId: adminSchool._id,
      gender,
    });

    return sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: `${type[0].toUpperCase()}${type.slice(1)} created successfully`,
      data: toPublicUser(user),
    });
  });

export const createSchoolStudent = createSchoolUserByType("student");
export const createSchoolTeacher = createSchoolUserByType("teacher");
export const createSchoolParent = createSchoolUserByType("parent");

export const getMySchoolAllStudents = catchAsync(
  async (req: Request, res: Response) => {
    const { _id: userId } = req.user as { _id: string; userId?: string };

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const schoolIds =
      user.role === "admin"
        ? (await school.find().select("_id")).map((s) => s._id)
        : [(await findAdministratorSchool(user._id.toString()))._id];

    const students = await User.find({
      schoolId: { $in: schoolIds },
      type: "student",
    }).select("username Id phoneNumber email gradeLevel age avatar state schoolId");

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Students fetched successfully",
      data: students,
    });
  },
);

export const getMySchoolAllTeachers = catchAsync(
  async (req: Request, res: Response) => {
    const { _id: userId } = req.user as { _id: string; userId?: string };

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const schoolIds =
      user.role === "admin"
        ? (await school.find().select("_id")).map((s) => s._id)
        : [(await findAdministratorSchool(user._id.toString()))._id];

    const teachers = await User.find({
      schoolId: { $in: schoolIds },
      type: "teacher",
    }).select("username Id phoneNumber email gradeLevel age avatar state schoolId");

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Teachers fetched successfully",
      data: teachers,
    });
  },
);

export const getMySchoolAllParents = catchAsync(
  async (req: Request, res: Response) => {
    const { _id: userId } = req.user as { _id: string; userId?: string };

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const schoolIds =
      user.role === "admin"
        ? (await school.find().select("_id")).map((s) => s._id)
        : [(await findAdministratorSchool(user._id.toString()))._id];

    const parents = await User.find({
      schoolId: { $in: schoolIds },
      type: "parent",
    }).select("username Id phoneNumber email avatar state schoolId");

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Parents fetched successfully",
      data: parents,
    });
  },
);

/****************************
 * ASSIGN TEACHER TO SCHOOL *
 ****************************/
export const assignTeacherToSchool = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = req.user as unknown as IUser | undefined;
    const { teacherId, schoolId } = req.body as {
      teacherId?: string;
      schoolId?: string;
    };

    if (!authUser?._id) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }

    if (!teacherId || !schoolId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "teacherId and schoolId are required",
      );
    }

    const targetSchool = await school.findById(schoolId);
    if (!targetSchool) {
      throw new AppError(httpStatus.NOT_FOUND, "School not found");
    }

    if (
      authUser.role === "administrator" &&
      targetSchool.administrator?.toString() !== authUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only assign teachers to your own school",
      );
    }

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      throw new AppError(httpStatus.NOT_FOUND, "Teacher not found");
    }

    if (teacher.type !== "teacher") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Selected user is not a teacher",
      );
    }

    teacher.schoolId = targetSchool._id;
    await teacher.save();

    const adminUsers = await User.findOne({ role: "admin" });

    await createNotification({
      to: new mongoose.Types.ObjectId(adminUsers!._id as any),
      message: `Teacher assigned to school: ${teacher.username}`,
      type: "user",
      id: teacher._id,
    });

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Teacher assigned to school successfully",
      data: toPublicUser(teacher),
    });
  },
);

// Update user info
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUser = req.user as unknown as IUser | undefined;

  if (!authUser?._id) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }

  // Owner-only: a user may update their own profile; administrators may
  // update anyone's. This guards against the historical "any token updates
  // any user" bug when the route had no protect middleware.
  const isOwner = authUser._id.toString() === id;
  const isAdmin =
    authUser.role === "administrator" || authUser.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to update this user.",
    );
  }

  const targetUser = await User.findById(id).select("+password");
  if (!targetUser) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "User not found",
    });
  }

  const updateData: Record<string, any> = { ...req.body };
  const canAdminManageAdministrator =
    authUser.role === "admin" && targetUser.role === "administrator";

  // Fields clients must never mutate through this endpoint.
  const restrictedFields = [
    "role",
    "refreshToken",
    "verificationInfo",
    "password_reset_token",
    "isActive",
  ];
  restrictedFields.forEach((field) => delete updateData[field]);

  if (!canAdminManageAdministrator) {
    delete updateData.password;
    delete updateData.Id;
    delete updateData.schoolId;
  }

  if (canAdminManageAdministrator) {
    await ensureUniqueAdministratorUpdate(
      id,
      updateData.Id,
    );

    if (updateData.password) {
      const saltRounds =
        Number(
          process.env.BCRYPT_SALT_ROUNDS || process.env.BCRYPT_SALT_ROUND,
        ) || 10;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
      updateData.tokenVersion = (targetUser.tokenVersion ?? 0) + 1;
    } else {
      delete updateData.password;
    }

    if ("schoolId" in updateData) {
      const nextSchoolId = await updateAdministratorSchoolAssignment(
        id,
        targetUser.schoolId,
        updateData.schoolId,
      );
      updateData.schoolId = nextSchoolId;
    }
  }

  // If a new avatar image is uploaded, push it to Cloudinary and merge into avatar
  if (req.file) {
    const uploadResult = await uploadToCloudinary(req.file.path);
    if (uploadResult) {
      updateData.avatar = {
        public_id: uploadResult.public_id,
        url: uploadResult.secure_url,
      };
    }
  }

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -refreshToken -verificationInfo -password_reset_token");

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully",
    data: toPublicUser(user),
  });
});

/*********************************
 * GET STUDENT COUNT BY GRADE LEVEL *
 *********************************/
export const getStudentCountByGrade = catchAsync(
  async (req: Request, res: Response) => {
    const { grade } = req.params;

    const count = await User.countDocuments({
      type: "student",
      gradeLevel: Number(grade),
    });

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Student count fetched successfully",
      data: { count },
    });
  },
);

/*********************************
 * GET STUDENTS BY GRADE LEVEL *
 *********************************/

export const getStudentsByGrade = catchAsync(
  async (req: Request, res: Response) => {
    const { grade } = req.params;

    const students = await User.find({
      type: "student",
      gradeLevel: Number(grade),
    }).select("username Id phoneNumber gradeLevel age avatar");

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Students fetched successfully",
      data: students,
    });
  },
);

/*********************************
 * GET MY SCHOOL STUDENTS BY GRADE LEVEL *
 *********************************/
export const getMySchoolStudentsByGrade = catchAsync(
  async (req: Request, res: Response) => {
    const { grade } = req.params;
    const currentUser = req.user as any;

    if (!currentUser?.schoolId) {
      throw new AppError(httpStatus.BAD_REQUEST, "School is required");
    }

    const students = await User.find({
      type: "student",
      gradeLevel: Number(grade),
      schoolId: currentUser.schoolId,
      isActive: true,
    }).select("username Id phoneNumber email gradeLevel age avatar schoolId");

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "School students fetched successfully",
      data: students,
    });
  },
);

export const toggleTwoFactorAuth = catchAsync(
  async (req: Request, res: Response) => {
    const { _id: userId } = req.user as any;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    user.isTwoFactorAuthEnabled = !user.isTwoFactorAuthEnabled;
    const updatedUser = await user.save();

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Two factor authentication ${updatedUser.isTwoFactorAuthEnabled ? "enabled" : "disabled"} successfully`,
    });
  },
);

export const verifyOTP = catchAsync(async (req: Request, res: Response) => {
  const { _id: userId } = req.user as any;
  const { otp } = req.body;

  console.log("req", userId);

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized user");
  }

  if (!otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP is required");
  }

  const user = await User.findById(userId).select("+hashedOtp +otpExpires");

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // ❌ No OTP requested
  if (!user.hashedOtp || !user.otpExpires) {
    throw new AppError(400, "OTP not requested");
  }

  // ⏰ Expiry check
  if (user.otpExpires < new Date()) {
    throw new AppError(400, "OTP expired");
  }

  // 🔐 Match OTP
  const isOtpMatched = await bcrypt.compare(otp.toString(), user.hashedOtp);

  if (!isOtpMatched) {
    throw new AppError(400, "Invalid OTP");
  }

  // ✅ Clear OTP after success
  user.hashedOtp = undefined;
  user.otpExpires = undefined;

  await user.save();

  // 🎯 FINAL ACCESS TOKEN (IMPORTANT)
  const token = signAccessToken(user);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP verified successfully",
    data: {
      token,
      user: toPublicUser(user),
    },
  });
});

/****************
 * GET CONTACTS *
 ****************/
export const getContacts = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user as unknown as IUser | undefined;
  if (!authUser?._id) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
  }

  const currentUser = await User.findById(authUser._id);
  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  let query: any = {
    _id: { $ne: currentUser._id },
    isActive: true,
  };

  const isCallMode = req.query.mode === "call";

  // If user belongs to a school, prioritize school contacts
  if (currentUser.schoolId) {
    query.schoolId = currentUser.schoolId;
  }

  if (isCallMode) {
    query = {
      _id: { $ne: currentUser._id },
      isActive: true,
      ...(currentUser.schoolId ? { schoolId: currentUser.schoolId } : {}),
    };
  }

  // Role/Type-based filtering logic
  console.log(
    `getContacts: Current user ${currentUser.username} (Role: ${currentUser.role}, Type: ${currentUser.type})`,
  );

  if (isCallMode) {
    const contacts = await User.find(query)
      .select("_id username role type avatar phoneNumber email gradeLevel")
      .limit(50);

    const formattedContacts = contacts.map((c) => ({
      id: c._id,
      username: c.username,
      role: c.role,
      type: c.type,
      subtitle: c.role,
      avatar: c.avatar?.url || "",
      phoneNumber: c.phoneNumber,
      email: c.email,
      gradeLevel: c.gradeLevel,
    }));

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Contacts fetched successfully",
      data: formattedContacts,
    });
  }

  if (currentUser.type === "teacher") {
    // Teachers can message students in their grades, parents of those students, and other teachers/admins
    const teacherGrades = await Class.find({
      teacherId: new mongoose.Types.ObjectId(currentUser._id),
    }).distinct("grade");

    console.log(
      `getContacts: Teacher ${currentUser.username} teaches grades:`,
      teacherGrades,
    );

    const students = await User.find({
      schoolId: currentUser.schoolId,
      type: "student",
      gradeLevel: { $in: teacherGrades },
    }).select("_id");
    const studentIds = students.map((s) => s._id);

    const parentChildLinks = await ParentsChild.find({
      childId: { $in: studentIds },
    }).populate("childId", "username");

    const parentToChildMap: Record<string, string[]> = {};
    parentChildLinks.forEach((link: any) => {
      if (link.parentId && link.childId) {
        const pId = link.parentId.toString();
        const cName = link.childId.username;
        if (!parentToChildMap[pId]) parentToChildMap[pId] = [];
        parentToChildMap[pId].push(cName);
      }
    });

    const parentIds = Object.keys(parentToChildMap);

    query.$or = [
      { _id: { $in: studentIds }, type: "student" },
      { _id: { $in: parentIds }, type: "parent" },
      { type: "teacher" },
      { role: "administrator" },
    ];

    // Add metadata for mapping later
    (req as any).parentToChildMap = parentToChildMap;
  } else if (currentUser.role === "administrator") {
    // Administrators can message anyone in their school
    // No extra filtering needed beyond schoolId which is already in query
  } else if (currentUser.type === "student") {
    // Students message teachers and other students in their classes
    const classAssignments = await StuAssignToClass.find({
      studentId: currentUser._id,
    }).select("classId");
    const classIds = classAssignments.map((a) => a.classId);

    const classmateAssignments = await StuAssignToClass.find({
      classId: { $in: classIds },
    }).select("studentId");
    const classmateIds = classmateAssignments.map((a) => a.studentId);

    const classes = await Class.find({ _id: { $in: classIds } }).select(
      "teacherId",
    );
    const teacherIds = classes.map((c) => c.teacherId);

    query.$or = [
      { _id: { $in: classmateIds }, type: "student" },
      { _id: { $in: teacherIds }, type: "teacher" },
      { role: "administrator" },
    ];
  } else if (currentUser.type === "parent") {
    const childLinks = await ParentsChild.find({
      parentId: currentUser._id,
    }).select("childId");
    const childIds = childLinks.map((l) => l.childId);

    const classAssignments = await StuAssignToClass.find({
      studentId: { $in: childIds },
    }).select("classId");
    const classIds = classAssignments.map((a) => a.classId);

    const classes = await Class.find({ _id: { $in: classIds } }).select(
      "teacherId",
    );
    const teacherIds = classes.map((c) => c.teacherId);

    query.$or = [
      { _id: { $in: teacherIds }, type: "teacher" },
      { role: "administrator" },
    ];
  }

  const contacts = await User.find(query)
    .select("username Id role type avatar phoneNumber email gradeLevel")
    .limit(50);

  const formattedContacts = contacts.map((c) => {
    const parentToChildMap = (req as any).parentToChildMap || {};
    let subtitle: string = c.role;

    if (c.type === "parent" && parentToChildMap[(c as any)._id.toString()]) {
      subtitle = `Parent of ${parentToChildMap[(c as any)._id.toString()].join(", ")}`;
    } else if (c.type === "student") {
      subtitle = `Student (Grade ${c.gradeLevel || "N/A"})`;
    } else if (c.type === "teacher") {
      subtitle = `Teacher`;
    }

    return {
      id: c._id,
      username: c.username,
      role: c.role,
      type: c.type,
      subtitle: subtitle,
      avatar: c.avatar?.url || "",
      phoneNumber: c.phoneNumber,
      email: c.email,
      gradeLevel: c.gradeLevel,
    };
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contacts fetched successfully",
    data: formattedContacts,
  });
});

export const getSingleStudentAllDetails = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // =====================
    // 1. Student Basic Info
    // =====================
    const studentData = await User.findById(id).select(
      "username Id phoneNumber gradeLevel age",
    );
    if (!studentData) {
      throw new AppError(404, "Student not found");
    }

    // =====================
    // 2. Parent Info
    // =====================
    const studentParent = await ParentsChild.findOne({
      childId: id,
    }).populate({
      path: "parentId",
      select: "username Id phoneNumber email",
    });

    // =====================
    // 3. Subjects (with safe populate)
    // =====================
    const subjectsRaw = await StuAssignToClass.find({
      studentId: id,
    }).populate({
      path: "classId",
      select: "grade subject teacherId",
      populate: {
        path: "teacherId",
        select: "username createdAt avatar type",
      },
    });

    // ❗ null class remove
    const subjects = subjectsRaw.filter(
      (s) => s.classId && (s.classId as any)._id,
    );

    const classIds = subjects.map((s) => (s.classId as any)._id);

    // =====================
    // 4. Attendance (ALL)
    // =====================
    const attendanceData = await Attendance.find({
      userId: id,
      classId: { $in: classIds },
    });

    const totalAttendance = attendanceData.length;

    const presentCount = attendanceData.filter(
      (a) => a.status === "present",
    ).length;

    const overallAttendance = totalAttendance
      ? Math.round((presentCount / totalAttendance) * 100)
      : 0;

    // =====================
    // 5. Quiz Results (ALL)
    // =====================
    const quizResults = await QuizResult.find({
      studentId: id,
    });

    const totalQuiz = quizResults.length;

    const overallProgress = totalQuiz
      ? Math.round(
        quizResults.reduce((sum, q) => sum + (q.percentage || 0), 0) /
        totalQuiz,
      )
      : 0;

    // =====================
    // 6. Subject-wise Data
    // =====================
    const subjectDetails = subjects.map((sub) => {
      const classDoc = sub.classId as any;
      const classId = classDoc._id;

      // Attendance per subject
      const subAttendance = attendanceData.filter(
        (a) => a.classId.toString() === classId.toString(),
      );

      const total = subAttendance.length;

      const present = subAttendance.filter(
        (a) => a.status === "present",
      ).length;

      const attendancePercent = total ? Math.round((present / total) * 100) : 0;

      return {
        classId,
        subject: classDoc.subject || "Unknown",
        attendance: attendancePercent,
        progress: overallProgress,
        teacher: classDoc.teacherId,
      };
    });

    // =====================
    // FINAL RESPONSE
    // =====================
    res.status(200).json({
      success: true,
      message: "Student details fetched successfully",
      data: {
        student: studentData,
        parent: studentParent || null,
        overall: {
          attendance: overallAttendance,
          progress: overallProgress,
        },
        subjects: subjectDetails,
      },
    });
  },
);

export const getSingleAdministratorAllDetails = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // =====================
    // 1. Administrator Basic Info
    // =====================
    const adminData = await User.findById(id).select(
      "username Id phoneNumber email role type state gender avatar schoolId isActive created_at updated_at",
    );

    if (!adminData) {
      throw new AppError(404, "Administrator not found");
    }

    // =====================
    // 2. School Info
    // =====================
    const schoolData = await school
      .findOne({
        $or: [{ _id: adminData.schoolId }, { administrator: adminData._id }],
      })
      .select(
        "_id name code address city state postalCode country phone email establishedYear logo created_at updated_at",
      );

    // =====================
    // 3. Students under this school (NEW)
    // =====================
    const students = schoolData
      ? await User.find({
        schoolId: schoolData._id,
        type: "student",
        isActive: true,
      }).select("username Id phoneNumber email gradeLevel state avatar")
      : [];

    const teachers = schoolData
      ? await User.find({
        schoolId: schoolData._id,
        type: "teacher",
        isActive: true,
      }).select("username Id phoneNumber email state avatar")
      : [];

    // =====================
    // FINAL RESPONSE
    // =====================
    res.status(200).json({
      success: true,
      message: "Administrator details fetched successfully",
      data: {
        admin: adminData,
        school: schoolData,
        students,
        teachers,
      },
    });
  },
);

export const getAllStudent = catchAsync(async (req: Request, res: Response) => {
  const students = await User.find({ type: "student" }).select(
    "username Id phoneNumber email gradeLevel avatar",
  );

  res.status(200).json({
    success: true,
    message: "Students fetched successfully",
    data: students,
  });
});

export const getSingleTeacherDetails = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // =====================
    // 1. Teacher Info
    // =====================
    const teacherData = await User.findById(id).select(
      "username Id phoneNumber email",
    );

    if (!teacherData) {
      throw new AppError(404, "Teacher not found");
    }

    // =====================
    // 2. CLASSES
    // =====================
    const classData = await Class.find({
      teacherId: teacherData._id,
    }).select("_id logo subject grade created_at");

    if (!classData || classData.length === 0) {
      throw new AppError(404, "No class found for this teacher");
    }

    // =====================
    // 3. ENRICH CLASS WITH ATTENDANCE STATS
    // =====================
    const classesWithStats = await Promise.all(
      classData.map(async (cls) => {
        const classId = cls._id;

        // total students in this class
        const totalStudents = await Attendance.distinct("userId", {
          classId,
        });

        const totalStudentCount = totalStudents.length;

        // total present records
        const presentCount = await Attendance.countDocuments({
          classId,
          status: "present",
        });

        // total attendance records
        const totalAttendance = await Attendance.countDocuments({
          classId,
        });

        // percentage calculation
        const attendancePercentage =
          totalAttendance === 0 ? 0 : (presentCount / totalAttendance) * 100;

        return {
          ...cls.toObject(),
          totalStudents: totalStudentCount,
          attendancePercentage: Number(attendancePercentage.toFixed(2)),
        };
      }),
    );

    // =====================
    // 4. QUIZZES
    // =====================
    const quizzes = await Quiz.find({
      teacherId: teacherData._id,
    })
      .populate("classId", "subject grade")
      .sort({ created_at: -1 });

    // =====================
    // FINAL RESPONSE
    // =====================
    res.status(200).json({
      success: true,
      message: "Teacher details fetched successfully",
      data: {
        teacher: teacherData,
        classes: classesWithStats,
        quizzes,
      },
    });
  },
);

export const getAllParents = catchAsync(async (req: Request, res: Response) => {
  const parents = await User.find({ type: "parent" }).select(
    "username Id phoneNumber email avatar",
  );

  res.status(200).json({
    success: true,
    message: "Parents fetched successfully",
    data: parents,
  });
});
