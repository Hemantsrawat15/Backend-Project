import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


//routes import

import userRouter from "./routes/user.routes.js";

//routes declaration
// app.get when we were not using router
// but now since we are using router , to use router we need to use middleware
app.use("/api/v1/users", userRouter);
// http://localhost:8000/api/v1/users/register
// http://localhost:8000/api/v1/users/login

export { app };
