import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

/**
 * @description Middleware to verify JWT token and authenticate user
 * @function verifyJWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {ApiError} If token is missing or invalid
 *
 * Steps:
 * 1. Extract token from cookies or Authorization header
 * 2. Verify token using JWT
 * 3. Find user in database
 * 4. Attach user to request object
 */
export const verifyJWT = asyncHandler(async (req, _, next) => {
  // 1. Extract token from cookies or Authorization header
  // Optional chaining (?.) - Safely access nested properties
  // req.header("Authorization") - Get token from Authorization header
  // replace() - Remove "Bearer " prefix if present
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // Check if token exists
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // 2. Verify token using JWT
    // jwt.verify() - Verifies the token signature and decodes the payload
    // process.env.ACCESS_TOKEN_SECRET - Secret key used to sign the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 3. Find user in database
    // User.findById() - Mongoose method to find user by ID
    // select() - Exclude sensitive fields from the result
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    // Check if user exists
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // 4. Attach user to request object for use in subsequent middleware/routes
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});
