import AppError from "../errors/AppError";
import FeaturesAndQuestions from "../models/featuresAndQuestions.model";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

const crateFeaturesAndQuestions = catchAsync(async (req, res) => {
  try {
    const result = await FeaturesAndQuestions.create(req.body);
    const { docType } = result;

    if (docType === "AppFeatures") {
      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "App Features created successfully",
        data: result,
      });
    } else if (docType === "FAQquestions") {
      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "FAQ questions created successfully",
        data: result,
      });
    }
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getAppFeatures = catchAsync(async (req, res) => {
  try {
    const result = await FeaturesAndQuestions.find({ docType: "AppFeatures" });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "App Features fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const getFAQquestions = catchAsync(async (req, res) => {
  try {
    const result = await FeaturesAndQuestions.find({ docType: "FAQquestions" });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "FAQ questions fetched successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

const updateFeaturesAndQuestions = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await FeaturesAndQuestions.findById(id);
    if (!doc) {
      throw new AppError(404, "App Features not found");
    }

    const result = await FeaturesAndQuestions.findOneAndUpdate(
      { _id: id },
      req.body,
      { new: true }
    );

    const { docType }: any = result;

    if (docType === "AppFeatures") {
      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "App Features created successfully",
        data: result,
      });
    } else if (docType === "FAQquestions") {
      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "FAQ questions created successfully",
        data: result,
      });
    }
  } catch (error) {
    throw new AppError(500, error as string);
  }
});

export const featuresAndQuestionsController = {
  crateFeaturesAndQuestions,
  getAppFeatures,
  getFAQquestions,
  updateFeaturesAndQuestions,
};
