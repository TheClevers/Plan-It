import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

//로컬용
//dotenv.config({ path: path.resolve("../.env") });
dotenv.config();
const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://plan-it-origin-backend.onrender.com",
      "https://i-made-it.onrender.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

console.log("Loaded DB_URL:", process.env.DB_URL);
// Connect to MongoDB
mongoose
  .connect(process.env.DB_URL, {})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Import your todo routes
import todoRoutes from "./routes/todoRoutes.js";
import planetRoutes from "./routes/planetRoutes.js";
import authRoutes from "./routes/auth.routes.js";

// Use the routes
app.use("/api/todos", todoRoutes);
app.use("/api/planets", planetRoutes);
app.use("/auth", authRoutes);

//initial backend page
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
