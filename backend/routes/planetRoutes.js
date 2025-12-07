import express from "express";
import Planet from "../models/Planet.js";
import {
  uploadTestImageToS3,
  uploadBase64ImageToS3,
} from "../utils/s3Upload.js";
import {
  generatePlanetImageWithTransparentBackground,
  buildPlanetPrompt,
  generatePlanetInfo,
} from "../utils/geminiImage.js";

const router = express.Router();

// GET all planets
router.get("/", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const planets = await Planet.find({ username: username.trim() });

    res.json(planets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch planets" });
  }
});

// GET a single planet by ID
router.get("/:id", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const planet = await Planet.findOne({
      planet_id: req.params.id,
      username: username.trim(),
    });
    if (!planet) return res.status(404).json({ error: "Planet not found" });

    res.json(planet);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch planet" });
  }
});

//GET compeleted tasks for single Planet
router.get("/:id/jobs_done", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const planet = await Planet.findOne({
      planet_id: req.params.id,
      username: username.trim(),
    }).select("jobs_done");
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

    // 해당 username의 모든 행성 조회하여 사용 중인 position 확인
    const existingPlanets = await Planet.find({
      username: cleanUsername,
    }).select("position");
    const usedPositions = existingPlanets.map((p) => p.position);

    // 18개가 다 차있으면 생성 불가
    if (usedPositions.length >= 18) {
      return res.status(400).json({
        error: "Maximum number of planets (18) reached for this username",
      });
    }

    // 사용 가능한 position 찾기 (1~18 중 사용되지 않은 것)
    const allPositions = Array.from({ length: 18 }, (_, i) => i + 1);
    const availablePositions = allPositions.filter(
      (pos) => !usedPositions.includes(pos)
    );

    // 사용 가능한 position 중 랜덤하게 하나 선택
    const randomIndex = Math.floor(Math.random() * availablePositions.length);
    const assignedPosition = availablePositions[randomIndex];

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

    // Gemini를 사용하여 행성 이미지 생성, 검정색 배경 제거 및 S3에 업로드
    const DEFAULT_PLANET_IMAGE_URL =
      "https://du5bldqjud75a.cloudfront.net/planets/PLANET_1765127325208.png";
    let s3ImageUrl = null;
    try {
      // 프롬프트 생성 (행성 이름과 소개 기반)
      const prompt = buildPlanetPrompt(cleanName, userIntroduction);

      // Gemini로 이미지 생성 및 검정색 배경 제거
      const imageData = await generatePlanetImageWithTransparentBackground(
        prompt
      );
      console.log(`✅ Gemini 이미지 생성 및 배경 제거 완료: ${cleanName}`);

      // S3에 업로드
      s3ImageUrl = await uploadBase64ImageToS3(
        planet_id,
        imageData.data,
        imageData.mimeType
      );
      console.log(`✅ 이미지가 S3에 업로드되었습니다: ${s3ImageUrl}`);
    } catch (imageError) {
      console.error(
        "⚠️ 이미지 생성/배경 제거/업로드 실패 (기본 이미지 사용):",
        imageError
      );
      // 이미지 생성/업로드 실패 시 기본 이미지 URL 사용
      s3ImageUrl = DEFAULT_PLANET_IMAGE_URL;
      console.log(`✅ 기본 이미지 URL 설정: ${s3ImageUrl}`);
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
      position: assignedPosition,
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
    "position",
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
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const cleanUsername = username.trim();

    // position 업데이트 시 검증
    if (updates.position !== undefined) {
      const newPosition = Number(updates.position);

      // position이 1~18 사이의 정수인지 확인
      if (
        !Number.isInteger(newPosition) ||
        newPosition < 1 ||
        newPosition > 18
      ) {
        return res.status(400).json({
          error: "Position must be an integer between 1 and 18",
        });
      }

      // 현재 행성 조회 (기존 position 확인용)
      const currentPlanet = await Planet.findOne({
        planet_id: req.params.id,
        username: cleanUsername,
      });

      if (!currentPlanet) {
        return res.status(404).json({ error: "Planet not found" });
      }

      // 같은 username의 다른 행성이 이미 그 position을 사용하고 있는지 확인
      const existingPlanetWithPosition = await Planet.findOne({
        username: cleanUsername,
        position: newPosition,
        planet_id: { $ne: req.params.id }, // 현재 행성 제외
      });

      if (existingPlanetWithPosition) {
        return res.status(409).json({
          error: `Position ${newPosition} is already taken by another planet`,
        });
      }

      updates.position = newPosition;
    }

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
      {
        planet_id: req.params.id,
        username: cleanUsername,
      },
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
    const { tasks, username } = req.body;
    // Expected format:
    // tasks = [{ todo_name, completed_at?, username? }, ...]

    // 1. Validate username
    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    // 2. Validate tasks array
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "Tasks array is required" });
    }

    // 3. Find planet by custom planet_id and username
    const planet = await Planet.findOne({
      planet_id: req.params.id,
      username: username.trim(),
    });
    if (!planet) {
      return res.status(404).json({ error: "Planet not found" });
    }

    // 4. Validate & format tasks for jobDoneSchema
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
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const deletedPlanet = await Planet.findOneAndDelete({
      planet_id: req.params.id,
      username: username.trim(),
    });

    if (!deletedPlanet) {
      return res.status(404).json({ error: "Planet not found" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete planet" });
  }
});

export default router;
