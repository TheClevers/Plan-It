import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// .env 파일 로드 (프로젝트 루트 또는 backend 폴더에서 찾기)
dotenv.config();
// 만약 .env가 프로젝트 루트에 있다면 위의 코드로 충분합니다.
// 만약 backend 폴더에 있다면 아래 주석을 해제하세요:
// dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 디버깅: 환경 변수 로드 확인
console.log("환경 변수 로드 확인:");
console.log(
  "VITE_GEMINI_API_KEY:",
  process.env.VITE_GEMINI_API_KEY ? "설정됨" : "없음"
);
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "설정됨" : "없음");
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
