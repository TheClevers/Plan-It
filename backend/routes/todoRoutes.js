import express from "express";
import Todo from "../models/Todo.js";

const router = express.Router();

// GET all todos
router.get("/", async (req, res) => {
  const todos = await Todo.find();
  res.json(todos);
});

// GET a single planet by ID
router.get("/:id", async (req, res) => {
  try {
    const todo = await Todo.findOne({ todo_id: req.params.id });
    if (!todo) return res.status(404).json({ error: "Todo not found" });
    res.json(todo);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch planet" });
  }
});

// ADD new todo
router.post("/", async (req, res) => {
  try {
    const todo = new Todo({
      todo_id: req.body.todo_id,
      todo_name: req.body.todo_name, // ✅ renamed from text
      planet_id: req.body.planet_id || "NONEPLANET", // ✅ new field
      username: req.body.username, // ✅ use username instead of user_id
      is_completed: false, // ✅ renamed from completed
      completed_at: null, // ✅ renamed from completedAt
    });

    const savedTodo = await todo.save();
    res.status(201).json(savedTodo);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      message: "Todo creation failed",
      error: err.message,
    });
  }
});

// UPDATE todo
router.put("/:id", async (req, res) => {
  try {
    const { todo_name, planet_id, is_completed } = req.body;

    const updateData = {};

    if (todo_name !== undefined) updateData.todo_name = todo_name;
    if (planet_id !== undefined) updateData.planet_id = planet_id;
    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
      updateData.completed_at = is_completed ? new Date() : null;
    }

    const updated = await Todo.findOneAndUpdate(
      { todo_id: req.params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE todo
router.delete("/:id", async (req, res) => {
  await Todo.findOneAndDelete({ todo_id: req.params.id });
  res.json({ success: true });
});

export default router;
