import httpStatus from "http-status";
import mongoose from "mongoose";
import AppError from "../errors/AppError";
import { Class } from "../models/class.model";
import { Homework } from "../models/homework.model";
import { StuAssignToClass } from "../models/stuAssignToClass.model";
import { User } from "../models/user.model";
import { createNotification } from "../sockets/notification.service";
import catchAsync from "../utils/catchAsync";
import { uploadToCloudinary } from "../utils/cloudinary";
import sendResponse from "../utils/sendResponse";

/*************************
 * CREATE HOMEWORK       *
 *************************/
export const createHomework = catchAsync(async (req, res) => {
  const data = req.body;
  if (!data.classId)
    throw new AppError(httpStatus.BAD_REQUEST, "Class ID is required");
  if (!data.userId)
    throw new AppError(httpStatus.BAD_REQUEST, "User ID is required");
  if (!data.title)
    throw new AppError(httpStatus.BAD_REQUEST, "Title is required");

  // ✅ Check if class exists
  const classExists = await Class.findById(data.classId);
  if (!classExists)
    throw new AppError(httpStatus.BAD_REQUEST, "Class not found");

  // ✅ Check if user exists
  const userExists = await User.findById(data.userId);
  if (!userExists) throw new AppError(httpStatus.BAD_REQUEST, "User not found");

  let files: { public_id: string; url: string }[] = [];

  if (req.files && Array.isArray(req.files)) {
    // Loop through all uploaded files
    for (const file of req.files) {
      const uploadResult = await uploadToCloudinary(file.path);
      if (uploadResult) {
        files.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        });
      }
    }
  }

  const homework = await Homework.create({ ...data, file: files });

  // =========================
  // 1. Get all students of this class
  // =========================
  const students = await StuAssignToClass.find({ classId: data.classId });

  // =========================
  // 2. Send notification to each student
  // =========================
  const notifications = students.map((stu) =>
    createNotification({
      to: new mongoose.Types.ObjectId(stu.studentId),
      message: `You have to added new homework: ${data.title}`,
      type: "homework",
      id: homework._id,
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
      message: `New homework created: ${data.title}`,
      type: "homework",
      id: homework._id,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Homework created successfully",
    data: homework,
  });
});

/*************************
 * GET HOMEWORK BY ID     *
 *************************/
export const getHomeworkById = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid homework ID");

  const homework = await Homework.findById(id);
  if (!homework) throw new AppError(httpStatus.NOT_FOUND, "Homework not found");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Homework fetched successfully",
    data: homework,
  });
});

/*************************
 * GET HOMEWORK BY CLASS  *
 *************************/
export const getHomeworkByClass = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const { archived } = req.query;

  if (!mongoose.Types.ObjectId.isValid(classId))
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid class ID");

  const filter: Record<string, any> = { classId };
  if (archived === "true") filter.archived = true;
  else if (archived === "false") filter.archived = false;

  const homework = await Homework.find(filter).sort({ created_at: -1 });
  // const homework = await Homework.findByClass(classId)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Homework for class fetched successfully",
    data: homework,
  });
});

/*************************
 * GET HOMEWORK BY USER   *
 *************************/
export const getHomeworkByUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId))
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid user ID");

  const homework = await Homework.findByUser(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Homework for user fetched successfully",
    data: homework,
  });
});

/*************************
 * UPDATE HOMEWORK        *
 *************************/
export const updateHomework = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid homework ID");
  const updates = { ...req.body };

  if (req.files && Array.isArray(req.files)) {
    let files: { public_id: string; url: string }[] = [];

    for (const file of req.files) {
      const uploadResult = await uploadToCloudinary(file.path);
      if (uploadResult) {
        files.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        });
      }
    }
    updates.file = files;
  }

  const updatedHomework = await Homework.findByIdAndUpdate(id, updates, {
    new: true,
  });
  if (!updatedHomework)
    throw new AppError(httpStatus.NOT_FOUND, "Homework not found");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Homework updated successfully",
    data: updatedHomework,
  });
});

/*************************
 * DELETE HOMEWORK        *
 *************************/
export const deleteHomework = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid homework ID");

  const deletedHomework = await Homework.findByIdAndDelete(id);
  if (!deletedHomework)
    throw new AppError(httpStatus.NOT_FOUND, "Homework not found");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Homework deleted successfully",
  });
});

/*************************
 * ARCHIVE HOMEWORK       *
 *************************/
export const archiveHomework = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { archived } = req.body; // read from request body

  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid homework ID");

  if (typeof archived !== "boolean")
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "archived must be true or false",
    );

  const updatedHomework = await Homework.findByIdAndUpdate(
    id,
    { archived },
    { new: true },
  );

  if (!updatedHomework)
    throw new AppError(httpStatus.NOT_FOUND, "Homework not found");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Homework ${archived ? "archived" : "unarchived"} successfully`,
    data: updatedHomework,
  });
});
