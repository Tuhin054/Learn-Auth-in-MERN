import { Router } from "express";
import * as  authController from "../controllers/auth.controller.js";

const authRoute = Router();

authRoute.post("/register", authController.register);

//authRoute.get("/get-me",authController.getMe)

export default authRoute;