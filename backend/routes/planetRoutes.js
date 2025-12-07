import express from "express";
import Planet from "../models/Planet.js";
import {
  uploadTestImageToS3,
  uploadBase64ImageToS3,
} from "../utils/s3Upload.js";
import {
  generatePlanetImage,
  buildPlanetPrompt,
  generatePlanetInfo,
} from "../utils/geminiImage.js";

const router = express.Router();

// GET all planets
router.get("/", async (req, res) => {
  try {
    const planets = await Planet.find();

    res.json(planets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch planets" });
  }
});

// GET a single planet by ID
router.get("/:id", async (req, res) => {
  try {
    const planet = await Planet.findOne({ planet_id: req.params.id });
    if (!planet) return res.status(404).json({ error: "Planet not found" });

    res.json(planet);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch planet" });
  }
});

//GET compeleted tasks for single Planet
router.get("/:id/jobs_done", async (req, res) => {
  try {
    const planet = await Planet.findOne({ planet_id: req.params.id }).select(
      "jobs_done"
    );
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    res.json(planet.jobs_done);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch completed todos" });
  }
});

// ADD new planet (BASE64 -> Buffer)
router.post("/", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Request body is missing" });
    }

    const {
      planet_id,
      name,
      introduction,
      population,
      major_industry,
      specifics,
      username,
    } = req.body;

    if (!planet_id || !planet_id.trim()) {
      return res.status(400).json({ error: "Planet id is required" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Planet name is required" });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const cleanName = name.trim();
    const cleanUsername = username.trim();

    const exists = await Planet.findOne({ name: cleanName });
    if (exists) {
      return res.status(409).json({ error: "Planet name already exists" });
    }

    // Gemini를 사용하여 행성 정보 생성
    let generatedIndustry = major_industry ? major_industry.trim() : null;
    // introduction은 유저 입력값 사용 (AI로 대체하지 않음)
    const userIntroduction = introduction ? introduction.trim() : null;
    let generatedSpecifics = specifics ? specifics.trim() : null;

    try {
      const planetInfo = await generatePlanetInfo(cleanName, introduction);
      generatedIndustry = planetInfo.industry;
      // AI가 생성한 introduction은 specifics에만 사용
      generatedSpecifics = planetInfo.introduction;
      console.log(`✅ Gemini 행성 정보 생성 완료: ${cleanName}`);
    } catch (infoError) {
      console.error(
        "⚠️ 행성 정보 생성 실패 (기본값 사용 또는 제공된 값 사용):",
        infoError
      );
      // 정보 생성 실패 시 제공된 값이나 기본값 사용
    }

    // Gemini를 사용하여 행성 이미지 생성 및 S3에 업로드
    let s3ImageUrl = null;
    try {
      // 프롬프트 생성 (행성 이름 기반)
      const prompt = buildPlanetPrompt(cleanName);

      // Gemini로 이미지 생성
      const imageData = await generatePlanetImage(prompt);
      console.log(`✅ Gemini 이미지 생성 완료: ${cleanName}`);

      // S3에 업로드
      s3ImageUrl = await uploadBase64ImageToS3(
        planet_id,
        imageData.data,
        imageData.mimeType
      );
      console.log(`✅ 이미지가 S3에 업로드되었습니다: ${s3ImageUrl}`);
    } catch (imageError) {
      console.error(
        "⚠️ 이미지 생성/업로드 실패 (행성은 계속 생성됩니다):",
        imageError
      );
      // 이미지 생성/업로드 실패해도 행성 생성은 계속 진행
    }

    const planet = new Planet({
      planet_id: planet_id || null,
      name: cleanName,
      s3_image_url: s3ImageUrl || null,
      introduction: userIntroduction || null, // 유저 입력값 사용
      population: population ? Number(population) : 100, // 기본값 100명
      major_industry: generatedIndustry || "NO INDUSTRY",
      specifics: generatedSpecifics || "NO SPECIFICS",
      jobs_done: [],
      username: cleanUsername,
    });

    await planet.save();

    res.status(201).json(planet);
  } catch (err) {
    console.error("Failed to create planet:", err);
    res.status(500).json({
      error: "Failed to create planet",
      details: err.message,
    });
  }
});

//UPDATE planet
router.put("/:id", async (req, res) => {
  const allowedUpdates = [
    "name",
    "introduction",
    "population",
    "major_industry",
    "specifics",
  ];

  const updates = {};

  allowedUpdates.forEach((key) => {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    if (updates.name) updates.name = updates.name.trim();
    if (updates.introduction)
      updates.introduction = updates.introduction.trim();
    if (updates.major_industry)
      updates.major_industry = updates.major_industry.trim();
    if (updates.specifics) updates.specifics = updates.specifics.trim();
    if (updates.population !== undefined) {
      updates.population = Number(updates.population);
    }

    const updatedPlanet = await Planet.findOneAndUpdate(
      { planet_id: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedPlanet) {
      return res.status(404).json({ error: "Planet not found" });
    }

    res.json(updatedPlanet);
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ error: "Update failed", details: err.message });
  }
});

//POST completed tasks to a planet (jobs_done)
router.post("/:id/jobs_done", async (req, res) => {
  try {
    const { tasks } = req.body;
    // Expected format:
    // tasks = [{ todo_name, completed_at?, username? }, ...]

    // 1. Validate tasks array
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "Tasks array is required" });
    }

    // 2. Find planet by custom planet_id
    const planet = await Planet.findOne({ planet_id: req.params.id });
    if (!planet) {
      return res.status(404).json({ error: "Planet not found" });
    }

    // 3. Validate & format tasks for jobDoneSchema
    const formattedTasks = tasks.map((task) => {
      if (!task.todo_name || !task.todo_name.trim()) {
        throw new Error("Each task must have a valid todo_name");
      }

      return {
        todo_name: task.todo_name.trim(),
        completed_at: task.completed_at
          ? new Date(task.completed_at)
          : new Date(),
        username: task.username || planet.username, // fallback to planet owner
      };
    });

    // 4. Push into jobs_done (correct field)
    planet.jobs_done.push(...formattedTasks);

    // 5. 인구수 증가 (각 할일마다 10~50 랜덤 증가)
    let populationIncrease = 0;
    for (let i = 0; i < formattedTasks.length; i++) {
      populationIncrease += 10 + Math.floor(Math.random() * 41); // 각 할일마다 10~50 랜덤
    }
    planet.population = (planet.population || 100) + populationIncrease;

    // 6. Save
    await planet.save();

    // 7. Respond with updated jobs_done and population
    res.json({
      success: true,
      jobs_done: planet.jobs_done,
      population: planet.population,
    });
  } catch (err) {
    console.error("Failed to add jobs_done:", err);
    res.status(500).json({
      error: "Failed to add completed tasks",
      details: err.message,
    });
  }
});

// DELETE a planet
router.delete("/:id", async (req, res) => {
  try {
    await Planet.findOneAndDelete({ planet_id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete planet" });
  }
});

export default router;
