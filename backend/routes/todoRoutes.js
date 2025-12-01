import express from "express";
import Todo from "../models/Todo.js"; 

const router = express.Router();

// GET all todos
router.get("/", async (req, res) => {
  const todos = await Todo.find();
  res.json(todos);
});

// ADD new todo
router.post("/", async (req, res) => {
  const todo = new Todo({
    text: req.body.text,
    category: req.body.category,   
    clientId: req.body.clientId,   
    completed: false,
  });

  await todo.save();
  res.json(todo);
});

// UPDATE todo
router.put("/:id", async (req, res) => {
  try {
  const updated = await Todo.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
  }
  catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});



// DELETE todo
router.delete("/:id", async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;