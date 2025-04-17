import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

/**
 * @description Handles user registration process
 * @function registerUser
 * @param {Object} req - Express request object containing user details and files
 * @param {Object} res - Express response object
 * @returns {Object} Response with created user data
 *
 * Steps:
 * 1. Extract user details from request body
 * 2. Validate required fields
 * 3. Check for existing user
 * 4. Handle avatar and cover image uploads
 * 5. Create new user in database
 * 6. Return sanitized user data
 */
const registerUser = asyncHandler(async (req, res) => {
  // # Steps to register user

  // 1. get user details from frontend
  // Destructuring user details from request body
  const { fullName, username, email, password } = req.body;

  // 2. validation - not empty
  // Array.some() - JavaScript method to check if any element passes the test
  // trim() - Removes whitespace from both ends of a string
  if (
    [fullName, email, username, password].some((field) => {
      return field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // 3. check if user already exist (check from username and email both)
  // User.findOne() - Mongoose method to find a single document
  // $or operator - MongoDB operator to match any of the conditions
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "User already exists with this username or email");
  }

  // 4. check for images, check for avatar
  // Optional chaining (?.) - Safely access nested properties
  // req.files - Multer middleware adds files to request object
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // 5. upload them to cloudinary, avatar
  // uploadOnCloudinary() - Custom utility function to upload files to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // 6. create user object - create entry in db
  // User.create() - Mongoose method to create a new document
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", // Fallback to empty string if no cover image
    email,
    password,
    username: username.toLowerCase(), // Normalize username to lowercase
  });

  // 7. remove password and refresh token field ( we made it in schema ) from response
  // User.findById().select() - Mongoose method to find by ID and exclude specific fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 8. check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // 9. return response else return error
  // ApiResponse - Custom response wrapper for consistent API responses
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

/**
 * @description Handles user login process
 * @function loginUser
 * @param {Object} req - Express request object containing user credentials
 * @param {Object} res - Express response object
 * @returns {Object} Response with user data and tokens
 *
 * Steps:
 * 1. Extract credentials from request body
 * 2. Validate credentials
 * 3. Find user in database
 * 4. Verify password
 * 5. Generate tokens
 * 6. Set cookies and return response
 */
const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  const { email, username, password } = req.body;

  // username or email
  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required");
  }

  // find the user
  // User.findOne() - Mongoose method to find a single document matching the query
  // $or operator - MongoDB operator to match any of the conditions
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // password check
  // isPasswordCorrect() - Custom method defined in User model to compare passwords
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // generate access and refresh token
  // generateAccessAndRefreshTokens() - Helper function to create JWT tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // User.findById().select() - Mongoose method to find by ID and exclude specific fields
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookies
  // Cookie options for security
  const options = {
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    secure: true, // Cookie will only be sent over HTTPS
  };

  // Return response with:
  // - Status code 200
  // - Set cookies for tokens
  // - JSON response with user data and tokens
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in sucessfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    secure: true, // Cookie will only be sent over HTTPS
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshAccessToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("AccessToken", accessToken, options)
      .cookie("RefreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName, // fullName : fullName
        email,
      },
    },
    { new: true }
  ).select("-password");

  return (
    res.status(200),
    json(new ApiResponse(200, user, "Accound details updated sucessfully"))
  );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
};
