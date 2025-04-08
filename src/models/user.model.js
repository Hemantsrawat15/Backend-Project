import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// Pre-save middleware to hash the password before saving to database
// This ensures that passwords are never stored in plain text
// The middleware only runs when the password field is modified
// Uses bcrypt with a salt round of 10 for secure password hashing
userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    this.password = bcrypt.hash(this.password, 10);
    next();
})

// Method to verify if the provided password matches the hashed password in database
// Uses bcrypt.compare to securely compare plain text password with hashed password
// Returns true if passwords match, false otherwise
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}

// Method to generate access token for user authentication
// Access tokens are short-lived and contain user's basic information
// Used for regular API requests and expires quickly (1 day as per .env)
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this.id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

// Method to generate refresh token for maintaining user session
// Refresh tokens are long-lived and contain minimal user information
// Used to obtain new access tokens when they expire (10 days as per .env)
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this.id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);
