import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import config from "../config/config";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const uploadToCloudinary = async (localFilePath: string) => {
  try {
    if (!localFilePath) {
      // console.log("❌ Local file path missing");
      return null;
    }

    // console.log("📤 Uploading file to Cloudinary:", localFilePath);

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "raw",
    });

    // console.log("✅ Upload Success:", response);

    fs.unlinkSync(localFilePath);

    return response;
  } catch (error: any) {
    console.error("❌ Cloudinary Upload Error:", error);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null;
  }
};

export const uploadBase64ImageToCloudinary = async (
  imageBase64: string,
  folder = "opalmer/quiz-images"
) => {
  try {
    if (!imageBase64) return null;

    const response = await cloudinary.uploader.upload(
      `data:image/png;base64,${imageBase64}`,
      {
        folder,
        resource_type: "image",
      }
    );

    return response;
  } catch (error: any) {
    console.error("Cloudinary Base64 Image Upload Error:", error);
    return null;
  }
};

export const deleteFromCloudinary = async (publicId: string) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
  }
};
