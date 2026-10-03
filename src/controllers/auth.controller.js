import userModel from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

/**
 * REGISTER A NEW USER
 * Flow: check duplicates -> hash password -> save user -> issue login token
 */
export async function register(req, res) {
  // Pull the signup details out of the request body
  const { username, email, password } = req.body;

  // Look in the database for anyone already using this username OR email
  const isAlreadyRegistered = await userModel.findOne({
    $or: [{ username }, { email }]
  });

  // If a match exists, stop here and tell the client (409 = conflict)
  if (isAlreadyRegistered) {
    return res.status(409).json({
      message: "Username or email already exists"
    });
  }

  // Never store a plain-text password.
  // Here we scramble it into a SHA-256 hash before saving it.
  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  // Save the new user in the database (with the hashed password, not the real one)
  const user = await userModel.create({
    username,
    email,
    password: hashedPassword
  });

  // Create a JWT (login token) so the user is logged in right after signing up.
  // It stores the user's id and expires in 1 day.
  const token = jwt.sign(
    { id: user._id.toString() },
    config.JWT_SECRET,
    { expiresIn: "1d" }
  );

  // Send back a success response (201 = created).
  // We only return safe fields: username and email, never the password.
  return res.status(201).json({
    message: "User registered successfully",
    user: {
      username: user.username,
      email: user.email,
    },
    token
  });
}

/**
 * GET CURRENT USER ("who am I?")
 * Flow: read token from header -> verify it -> find the user -> return them
 */
export async function getMe(req, res) {
  try {
    // The client sends: Authorization: Bearer <token>
    // split(" ")[1] grabs just the <token> part.
    // The "?." prevents a crash if the header is missing.
    const token = req.headers.authorization?.split(" ")[1];
    console.log(token); // debug only: remove in production

    // No token means the user isn't logged in (401 = unauthorized)
    if (!token) {
      return res.status(401).json({
        message: "Token not found"
      });
    }

    // Check the token is genuine and not expired.
    // If it's fake or expired, this throws an error (handled in catch below).
    const decoded = jwt.verify(token, config.JWT_SECRET);
    console.log(decoded); // debug only: remove in production

    // The token contains the user's id, so use it to fetch the user from the DB
    const user = await userModel.findById(decoded.id);

    // Token was valid but the user no longer exists (e.g. account deleted)
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // All good: return the user's data
    return res.status(200).json({ user });
  } catch (error) {
    // Token was tampered with, malformed, or expired
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    // Any other unexpected error: pass it up so it isn't silently hidden
    throw error;
  }
}