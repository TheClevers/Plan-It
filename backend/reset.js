// TODO Reset용
import mongoose from "mongoose";
import dotenv from "dotenv";
import Todo from "./models/Todo.js";
import Planet from "./models/Planet.js";
import path from "path";

dotenv.config({ path: path.resolve("../.env") });

async function reset() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.DB_URL, {
    });
    console.log("Connected to MongoDB");

    // 2. Delete all data in the Todo collection
    const result = await Todo.deleteMany({});
    console.log(`Deleted ${result.deletedCount} todos`);
    
    const indexes = await Planet.collection.indexes();
    const nameIndex = indexes.find(idx => idx.name === "name_1");
    if(nameIndex) {
      await Planet.collection.dropIndex("name_1");
      console.log("Dropped!")
    }
    // 3. Close connection
    await mongoose.connection.close();
    console.log("Database connection closed");
    console.log("✔ All TODO data reset successfully!");
    
  } catch (err) {
    console.error("❌ Error resetting database:", err);
  }
}

reset();

