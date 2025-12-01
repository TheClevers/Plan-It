import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("../.env") });
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.DB_URL, {
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));


// Import your todo routes
import todoRoutes from "./routes/todoRoutes.js";
import planetRoutes from "./routes/planetRoutes.js";

// Use the routes
app.use("/api/todos", todoRoutes);
app.use("/api/planets", planetRoutes);

//initial backend page
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Start server
const PORT = 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
