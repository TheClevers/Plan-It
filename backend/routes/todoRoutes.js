import express from "express";
import Todo from "../models/Todo.js";
import Planet from "../models/Planet.js";
import { updatePlanetInfo } from "../utils/geminiImage.js";

const router = express.Router();

// GET all todos
router.get("/", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const todos = await Todo.find({ username: username.trim() });
    res.json(todos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

// GET a single todo by ID
router.get("/:id", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const todo = await Todo.findOne({
      todo_id: req.params.id,
      username: username.trim(),
    });
    if (!todo) return res.status(404).json({ error: "Todo not found" });
    res.json(todo);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch todo" });
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
    const { todo_name, planet_id, is_completed, username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    // 기존 할일 정보 가져오기 (완료 상태 변경 확인용)
    const existingTodo = await Todo.findOne({
      todo_id: req.params.id,
      username: username.trim(),
    });

    if (!existingTodo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    const updateData = {};

    if (todo_name !== undefined) updateData.todo_name = todo_name;
    if (planet_id !== undefined) updateData.planet_id = planet_id;
    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
      updateData.completed_at = is_completed ? new Date() : null;
    }

    const updated = await Todo.findOneAndUpdate(
      {
        todo_id: req.params.id,
        username: username.trim(),
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Todo not found" });
    }

    // 할일이 새로 완료된 경우 (이전에는 완료되지 않았고, 지금 완료됨)
    if (
      is_completed === true &&
      existingTodo.is_completed === false &&
      updated.planet_id &&
      updated.planet_id !== "NONEPLANET"
    ) {
      try {
        console.log("updated.planet_id", updated.planet_id);
        // 해당 행성 찾기
        const planet = await Planet.findOne({
          planet_id: updated.planet_id,
          username: username.trim(),
        });
        console.log("planet", planet);

        if (planet) {
          // 인구수 증가 (10~50 랜덤)
          const populationIncrease = 10 + Math.floor(Math.random() * 41); // 10~50
          planet.population = (planet.population || 0) + populationIncrease;

          // jobs_done에 완료된 할일 추가
          planet.jobs_done.push({
            todo_name: updated.todo_name,
            completed_at: updated.completed_at || new Date(),
            username: updated.username,
          });

          // LLM을 사용하여 행성의 주력산업과 특이사항 업데이트
          try {
            const updatedInfo = await updatePlanetInfo(
              planet.name,
              planet.major_industry || "NO INDUSTRY",
              planet.specifics || "NO SPECIFICS",
              updated.todo_name
            );

            planet.major_industry = updatedInfo.major_industry;
            planet.specifics = updatedInfo.specifics;

            console.log(`✅ 행성 정보 업데이트 완료: ${planet.name}`);
          } catch (llmError) {
            console.error("LLM을 통한 행성 정보 업데이트 실패:", llmError);
            // LLM 업데이트 실패해도 인구수 증가와 jobs_done 추가는 유지
          }

          await planet.save();
          console.log(
            `✅ 할일 완료: 행성 ${planet.name} 인구수 +${populationIncrease} (현재: ${planet.population})`
          );
        } else {
          console.warn(
            `⚠️ 행성을 찾을 수 없음: planet_id=${
              updated.planet_id
            }, username=${username.trim()}`
          );
        }
      } catch (planetError) {
        console.error("행성 업데이트 실패:", planetError);
        // 행성 업데이트 실패해도 할일 업데이트는 성공으로 처리
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE todo
router.delete("/:id", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const deletedTodo = await Todo.findOneAndDelete({
      todo_id: req.params.id,
      username: username.trim(),
    });

    if (!deletedTodo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

export default router;
