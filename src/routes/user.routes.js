import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser);
// http://localhost:8000/api/v1/users/register

// router.route("/login").post(registerUser);
// http://localhost:8000/user/login

export default router;
