import express from "express";
import Planet from "../models/Planet.js"; 

const router = express.Router();

// GET all planets
router.get("/", async (req, res) => {
  try {
    const planets = await Planet.find();
    res.json(planets);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch planets" });
  }
});

// GET a single planet by ID
router.get("/:id", async (req, res) => {
  try {
    const planet = await Planet.findById(req.params.id);
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    res.json(planet);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch planet" });
  }
});

//GET compeleted tasks for single Planet
router.get("/:id/completed", async (req, res) => {
  try {
    const planet = await Planet.findById(req.params.id).select("completedTodos");
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    res.json(planet.completedTodos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch completed todos" });
  }
});

// CREATE a new planet
router.post("/", async (req, res) => {
  try {
    const {category, clientId} = req.body;
     if (!category||!category.trim()) {
      return res.status(400).json({ error: "Image and category are required" });
    }

    // Check duplicate category
    const exists = await Planet.findOne({ category });
    if (exists) {
      return res.status(409).json({ error: "Category already exists" });
    }


    const planet = new Planet({ image: null , category: category.trim(), color:"#ffffff", clientId });
    await planet.save();
    res.status(201).json(planet);
  } catch (err) {
    console.error("Failed to create planet:", err);
    res.status(500).json({ error: "Failed to create planet,", details: err.message});
  }
});

// UPDATE a planet
//router.put("/:id", async (req, res) => {
//  try {
//    const updated = await Planet.findByIdAndUpdate(req.params.id, req.body, {
//      new: true,
//    });
//    res.json(updated);
//  } catch (err) {
//    res.status(500).json({ error: "Failed to update planet" });
//  }
//});

// UPDATE a planet
router.put("/:id", async (req, res) => {
  const allowedUpdates = ['text', 'category', 'completed'];
  const updates = {};

  allowedUpdates.forEach(key => {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const updatedTodo = await Todo.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedTodo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json(updatedTodo);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

//POST completed tasks
router.post("/:id/completed", async (req, res) => {
  try {
    const { tasks } = req.body; 
    // tasks = [{ text, category, completedAt }, ...]

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "Tasks array required" });
    }

    const planet = await Planet.findById(req.params.id);
    if (!planet) return res.status(404).json({ error: "Planet not found" });

    // Push tasks
    planet.completedTodos.push(...tasks);

    await planet.save();
    res.json({ success: true, completedTodos: planet.completedTodos });

  } catch (err) {
    res.status(500).json({ error: "Failed to add completed todos" });
  }
});

// DELETE a planet
router.delete("/:id", async (req, res) => {
  try {
    await Planet.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete planet" });
  }
});

export default router;
