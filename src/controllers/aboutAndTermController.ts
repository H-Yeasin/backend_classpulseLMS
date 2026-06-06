import AppError from "../errors/AppError";
import AboutAndTerm from "../models/aboutAndTerm";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

const createAboutAndTerm = catchAsync(async (req, res) => {
  try {
    const result = await AboutAndTerm.create(req.body);

    const { docType } = result;

    if (docType === "about") {
      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "About us created successfully",
        data: result,
      });
    } else if (docType === "terms") {
      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Terms and conditions created successfully",
        data: result,
      });
    }
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getAbout = catchAsync(async (req, res) => {
  try {
    const result = await AboutAndTerm.find({ docType: "about" });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "About us fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getTerms = catchAsync(async (req, res) => {
  try {
    const result = await AboutAndTerm.find({ docType: "terms" });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Terms and conditions fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const updateAboutAndTerm = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await AboutAndTerm.findById(id);
    if (!doc) {
      throw new AppError(404, "App Features not found");
    }

    const result = await AboutAndTerm.findOneAndUpdate({ _id: id }, req.body, {
      new: true,
    });

    const { docType }: any = result;

    if (docType === "about") {
      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "About us updated successfully",
        data: result,
      });
    } else if (docType === "terms") {
      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Terms and conditions updated successfully",
        data: result,
      });
    }
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const aboutAndTermController = {
  createAboutAndTerm,
  getAbout,
  getTerms,
  updateAboutAndTerm,
};

export default aboutAndTermController;
