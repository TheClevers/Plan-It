import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // adjust path if needed

const router = express.Router();

// ✅ ENV CONFIG
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_KEY";
const JWT_EXPIRES_IN = "1h";
const SALT_ROUNDS = 12;

// ============================
// ✅ SIGN UP
// POST /auth/signup
// ============================
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1️⃣ Validation
    if (!username || !password) {
      return res.status(400).json({ error: "user_id, username, and password are required" });
    }

    // 2️⃣ Check duplicate user
    const existing = await User.findOne({username});

    if (existing) {
      return res.status(409).json({ error: "User ID or username already exists" });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4️⃣ Save user
    const user = new User({
      username: username.trim(),
      password: hashedPassword,
    });

    await user.save();

    // 5️⃣ Return safe response
    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      success: true,
      user: safeUser,
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Failed to sign up" });
  }
});


// ============================
// ✅ SIGN IN
// POST /auth/login
// ============================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1️⃣ Validation
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }

    // 2️⃣ Find user
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ error: "ID or PW doesn't match" });
    }

    // 3️⃣ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "ID or PW doesn't match" });
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 5️⃣ Safe user object
    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      token,
      user: safeUser,
    });
  } 
  
  catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
});

// ============================
// ✅ LOGOUT
// POST /auth/logout
// ============================
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logout successful. Please delete token on client.",
  });
});

export default router;
