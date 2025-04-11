import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
// fs (File System) module is a built-in Node.js module that provides an API for interacting with the file system
// It allows us to perform file operations like reading, writing, and deleting files
// In this context, fs is used to handle temporary file storage and management when uploading files to Cloudinary
// Common operations include:
// - Reading file data before upload
// - Managing temporary file storage
// - Cleaning up files after upload

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload a file to Cloudinary
// @param {string} localFilePath - Path to the local file to be uploaded
// @returns {Promise<Object|null>} - Returns Cloudinary response object or null if upload fails
const uploadOnCloudinary = async function (localFilePath) {
  try {
    if (!localFilePath) return null;
    // Uplaod the file on Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    // console.log("File is uploaded on Cloudinary", response.url);
    // console.log(response);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

export { uploadOnCloudinary };
