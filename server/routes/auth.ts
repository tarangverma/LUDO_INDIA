import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

const router = express.Router();

const SECRET = process.env.JWT_SECRET || "replace-with-strong-secret";
const EXPIRES_IN = "7d";

export interface AuthPayload {
  userId: string;
  username: string;
}

export function sign(payload: AuthPayload, opts: { expiresIn?: string } = {}): string {
  return jwt.sign(payload, SECRET, { expiresIn: opts.expiresIn || EXPIRES_IN });
}

export function verify(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, SECRET) as AuthPayload;
  } catch (e) {
    return null;
  }
}

// Login Route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = sign({ userId: user._id.toString(), username: user.username });
    res.json({ token, userId: user._id, username: user.username });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    let user = await User.findOne({ username });

    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      password: hashedPassword,
    });

    await user.save();

    const token = sign({ userId: user._id.toString(), username: user.username });
    res.json({ token, userId: user._id, username: user.username });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
