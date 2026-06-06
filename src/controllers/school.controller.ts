import AppError from "../errors/AppError";
import school from "../models/school.model";
import { User } from "../models/user.model";
import catchAsync from "../utils/catchAsync";
import { uploadToCloudinary } from "../utils/cloudinary";
import sendResponse from "../utils/sendResponse";

const createSchool = catchAsync(async (req, res) => {
  const { _id: userId } = req.user as any;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(400, "User not found");
  }

  if (user.role !== "admin") {
    throw new AppError(403, "Only admins can create a school");
  }

  const payload = { ...req.body };

  if (req.file) {
    const uploadResult = await uploadToCloudinary(req.file.path);
    if (!uploadResult) {
      throw new AppError(500, "Failed to upload school logo");
    }
    payload.logo = uploadResult.secure_url;
  }

  const result = await school.create(payload);

  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "School created successfully",
    data: result,
  });
});

const getAllSchools = catchAsync(async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    // Filters
    const filter: any = {};
    if (search) {
      filter.name = { $regex: search as string, $options: "i" }; // case-insensitive search
    }

    // Pagination values
    const pageNumber = parseInt(page as string, 10) || 1;
    const pageSize = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Get total count
    const total = await school.countDocuments(filter);

    // Fetch with filter, pagination & populate
    const result = await school
      .find(filter)
      .populate({
        path: "administrator",
        select: "username Id role type",
      })
      .skip(skip)
      .limit(pageSize)
      .sort({ created_at: -1 });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Schools fetched successfully",
      data: result,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getMySchool = catchAsync(async (req, res) => {
  const { _id: userId } = req.user as any;
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(400, "User not found");
  }

  const result = await school
    .findOne({
      $or: [{ _id: user.schoolId }, { administrator: user._id }],
    })
    .populate({
      path: "administrator",
      select: "username Id role type",
    });
  if (!result) {
    throw new AppError(404, "School not found");
  }

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "School fetched successfully",
    data: result,
  });
});

const getSingleSchool = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const result = await school.findById(id);
    if (!result) {
      throw new AppError(404, "School not found");
    }
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "School get successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const updateSchool = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    const payload = { ...req.body };

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path);
      if (!uploadResult) {
        throw new AppError(500, "Failed to upload school logo");
      }
      payload.logo = uploadResult.secure_url;
    }

    const result = await school.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!result) {
      throw new AppError(404, "School not found");
    }
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "School updated successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const deleteSchool = catchAsync(async (req, res) => {
  const { id } = req.params;

  const targetSchool = await school.findById(id);
  if (!targetSchool) {
    throw new AppError(404, "School not found");
  }

  await Promise.all([
    targetSchool.administrator
      ? User.findByIdAndUpdate(targetSchool.administrator, {
          $set: { schoolId: null },
        })
      : Promise.resolve(),
    User.updateMany(
      { role: "administrator", schoolId: targetSchool._id },
      { $set: { schoolId: null } }
    ),
  ]);

  const result = await school.findByIdAndDelete(id);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "School deleted successfully",
    data: result,
  });
});

const schoolController = {
  createSchool,
  getAllSchools,
  getMySchool,
  getSingleSchool,
  updateSchool,
  deleteSchool,
};

export default schoolController;
