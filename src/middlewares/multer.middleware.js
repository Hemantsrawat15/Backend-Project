// Importing multer for handling multipart/form-data, primarily used for file uploads
import multer from "multer";

// Configuring disk storage for multer
// This determines where uploaded files will be stored and how they will be named
const storage = multer.diskStorage({
  // Specifies the destination folder for uploaded files
  // Files are temporarily stored in ./public/temp before being processed
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  // Determines the filename of the uploaded file
  // Using originalname preserves the original file name
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// Creating and exporting the multer middleware instance
// This instance can be used in routes to handle file uploads
export const upload = multer({ storage: storage });