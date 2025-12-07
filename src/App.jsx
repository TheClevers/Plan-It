import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TodoList from "./components/TodoList";
import Planet from "./components/Planet";
import PlanetModal from "./components/PlanetModal";
import RocketAnimation from "./components/RocketAnimation";
import LLMChat from "./components/LLMChat";
import ImageGenerator from "./components/ImageGenerator";
import ChevronRight from "./assets/svg/ChevronRight";
import ChevronLeft from "./assets/svg/ChevronLeft";
import {
  planetSlots,
  subscribePlanetChange,
  savePlanetToSlot,
  changePlanetSlot,
  placePlanetRandomly,
} from "./components/PlanetSlots";
import { getUsername } from "./services/auth";

// API 기본 URL (환경 변수에서 가져오기)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 태양 관련 상수
const SUN_SIZE = 800; // 태양 이미지 크기(px)
const SUN_LEFT_OFFSET = (-SUN_SIZE * 3) / 4; // 화면 왼쪽 밖으로 3/4 나가게
const SUN_BOTTOM_OFFSET = 40; // 아래에서 40px 위

// 행성 크기 관련 상수
const MAXIMUM_PLANET_SIZE = 150;
const MINIMUM_PLANET_SIZE = 80;

// 고정된 궤도 반지름 (항상 존재)
const FIXED_ORBIT_RADII = [500, 750, 1000, 1250, 1500];

// 각 궤도마다 고정된 각도 위치들 (라디안)
const FIXED_ANGLES_PER_ORBIT = {
  500: [-Math.PI / 6, 0, Math.PI / 6],
  750: [-Math.PI / 8, -Math.PI / 24, Math.PI / 24, Math.PI / 8],
  1000: [-Math.PI / 10, -Math.PI / 20, 0, Math.PI / 20, Math.PI / 10],
  1250: [-Math.PI / 18, 0, Math.PI / 18],
  1500: [-Math.PI / 18, 0, Math.PI / 18],
};

// 고정 위치들을 생성하는 함수 (각 슬롯 index -> x,y,radius,angle)
function getFixedPositions(sunCenterX, sunCenterY) {
  const positions = [];
  let positionIndex = 1;
  FIXED_ORBIT_RADII.forEach((radius) => {
    const angles = FIXED_ANGLES_PER_ORBIT[radius] || [];
    angles.forEach((angle) => {
      const x = sunCenterX + Math.cos(angle) * radius;
      const y = sunCenterY + Math.sin(angle) * radius;
      positions.push({ radius, angle, x, y, index: positionIndex++ });
    });
  });
  return positions;
}

// planetSlots + 태양 + 고정 위치를 기반으로 category별 planetPositions 계산
function computePlanetPositions(slots, sunCenter, allCategories) {
  if (!sunCenter.x || !sunCenter.y) return {};

  const fixedPositions = getFixedPositions(sunCenter.x, sunCenter.y);
  const fixedByIndex = {};
  fixedPositions.forEach((pos) => {
    fixedByIndex[pos.index] = pos;
  });

  const positions = {};

  for (let i = 1; i <= 18; i++) {
    const info = slots[i];
    if (!info || !info.name) continue;

    const category = info.name;

    // 현재 존재하는 카테고리만 그림
    if (allCategories && !allCategories.includes(category)) continue;

    const pos = fixedByIndex[i];
    if (!pos) continue;

    positions[category] = {
      category,
      x: pos.x,
      y: pos.y,
      radius: pos.radius,
      angle: pos.angle,
      slotIndex: i,
    };
  }

  return positions;
}

// 행성 상태 메시지 생성 함수
// ======================
function getMessage(planet) {
  // 1) 데이터가 없거나, 인구 0 → 기본 메시지
  if (!planet || planet.population === 0) {
    return "🪐 행성을 키워보자!";
  }

  const now = new Date();
  const minsSince = (now - new Date(planet.lastActivityTime)) / 1000 / 60;
  const daysSince = minsSince / 60 / 24;
  const daysSinceUpgrade =
    (now - new Date(planet.lastUpgradeTime)) / 1000 / 60 / 60 / 24;

  // 1) 즉시 반응 메시지
  if (planet.recentBatchCount >= 3) return "⚡ 와! 발전이 아주 빠른데?";
  if (planet.taskCountLast24h === 1) return "🌅 오늘의 첫 번째 업적 달성!";
  if (planet.recentFastActions >= 2) return "🔥 열정이 대단한데?";

  // 2) 성장 관련 메시지
  if (planet.population >= 30000) return "🏙 너무 좁아!";
  if (planet.population >= 12000) return "🌎 행성이 꽤 살아나는걸?";

  // 3) 생산성 / 활동 메시지
  if (minsSince <= 10) return "🌱 무럭무럭 자라는군!";
  if (planet.avgTaskTime <= 10) return "🎉 생산성이 최고야!";

  // 4) 너무 조용함
  if (planet.taskCountLast24h === 0 && minsSince > 10)
    return "😴 너무 조용해...";

  // 5) 업그레이드 필요
  if (daysSinceUpgrade >= 30) return "🔧 업그레이드가 필요해!";

  // 6) 장기 방치
  if (daysSince >= 7) return "🌋 지금 행성 관리가 안되고 있어!";

  // 7) 기본
  return "🪐 행성을 키워보자!";
}

function oneMinusExp(x) {
  return 1 - Math.exp(-x);
}

function App() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clickedPlanetCategories, setClickedPlanetCategories] = useState(
    new Set()
  );
  const [planetPositions, setPlanetPositions] = useState({});

  // 드래그 상태: { category, x, y, offsetX, offsetY }
  const [dragging, setDragging] = useState(null);

  // 카테고리별 Gemini가 생성한 행성 이미지 URL
  const [planetImages, setPlanetImages] = useState({});

  // 행성 정보 저장 (카테고리명을 키로 사용)
  const [planetInfo, setPlanetInfo] = useState({});

  // 새 행성 추가 중 로딩 상태
  const [isAddingPlanet, setIsAddingPlanet] = useState(false);

  // 공사중인 행성들 (임시 행성)
  const [loadingPlanets, setLoadingPlanets] = useState(new Set());

  const containerRef = useRef(null);
  const planetsLayerRef = useRef(null);
  const [sunCenter, setSunCenter] = useState({ x: 0, y: 0 });
  const [isTodoListOpen, setIsTodoListOpen] = useState(true);
  const [rocketAnimations, setRocketAnimations] = useState([]);
  const [expandingPlanets, setExpandingPlanets] = useState(new Set());
  const [isLaunching, setIsLaunching] = useState(false);

  // 행성 목록 로드
  useEffect(() => {
    const loadPlanets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/planets`);
        if (!response.ok) {
          throw new Error(`Failed to fetch planets: ${response.status}`);
        }
        const planets = await response.json();
        console.log("Loaded planets:", planets);

        // 행성 데이터 처리
        const newCategories = [];
        const newCompletedTasks = [];
        const newPlanetInfo = {};

        planets.forEach((planet) => {
          // 행성 이름 추출 (category 또는 name 필드 사용)
          const planetName = planet.category || planet.name;
          if (!planetName) return;

          // 카테고리 추가
          const introduction = planet.introduction || "";
          newCategories.push({
            name: planetName,
            description: introduction,
          });

          // 행성 정보 저장
          newPlanetInfo[planetName] = {
            id: planet._id,
            planetId: planet.planet_id,
            name: planetName,
            population: planet.population || 0,
            majorIndustry: planet.major_industry || "NO INDUSTRY",
            specifics: planet.specifics || "NO SPECIFICS",
            introduction: introduction,
            completedTodos: planet.completedTodos || planet.jobs_done || [],
          };

          // 완료된 할 일 추가
          const completedTodos =
            planet.completedTodos || planet.jobs_done || [];
          completedTodos.forEach((todo) => {
            // 두 가지 형식 지원
            if (todo.text && todo.category) {
              // 첫 번째 형식: { text, category, completedAt, _id }
              newCompletedTasks.push({
                id: todo._id || Date.now().toString(),
                text: todo.text,
                category:
                  todo.category === "Uncategorized"
                    ? planetName
                    : todo.category,
                completedAt: todo.completedAt || new Date(),
              });
            } else if (todo.todo_name) {
              // 두 번째 형식: { todo_name, completed_at, user_id, _id }
              newCompletedTasks.push({
                id: todo._id || Date.now().toString(),
                text: todo.todo_name,
                category: planetName,
                completedAt: todo.completed_at || new Date(),
              });
            }
          });

          // S3 이미지 URL 우선 사용, 없으면 image 필드 사용
          const imageUrl = planet.s3_image_url || planet.image;
          if (imageUrl) {
            // URL에 프로토콜이 없으면 https:// 추가
            const fullImageUrl =
              imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
                ? imageUrl
                : `https://${imageUrl}`;
            setPlanetImages((prev) => ({
              ...prev,
              [planetName]: fullImageUrl,
            }));
          }
        });

        // 상태 업데이트
        setCategories((prev) => {
          // 기존 카테고리와 병합 (중복 제거)
          const existingNames = new Set(prev.map((c) => c.name));
          const uniqueNewCategories = newCategories.filter(
            (c) => !existingNames.has(c.name)
          );
          return [...prev, ...uniqueNewCategories];
        });

        setCompletedTasks((prev) => {
          // 기존 완료된 할 일과 병합 (중복 제거)
          const existingIds = new Set(prev.map((t) => t.id));
          const uniqueNewTasks = newCompletedTasks.filter(
            (t) => !existingIds.has(t.id)
          );
          return [...prev, ...uniqueNewTasks];
        });

        setPlanetInfo((prev) => ({
          ...prev,
          ...newPlanetInfo,
        }));
      } catch (error) {
        console.error("Error loading planets:", error);
      }
    };

    loadPlanets();
  }, []);

  useEffect(() => {
    console.log("planetInfo", planetInfo);
  }, [planetInfo]);

  // 할 일 목록 로드 (행성 정보 로드 후)
  useEffect(() => {
    const loadTodos = async () => {
      // planetInfo가 비어있으면 대기
      if (Object.keys(planetInfo).length === 0) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/todos`);
        if (!response.ok) {
          throw new Error(`Failed to fetch todos: ${response.status}`);
        }
        const apiTodos = await response.json();
        console.log("Loaded todos:", apiTodos);

        // planet_id를 category 이름으로 변환하기 위한 맵 생성
        const planetIdToCategoryMap = {};
        Object.values(planetInfo).forEach((info) => {
          if (info.planetId) {
            planetIdToCategoryMap[info.planetId] = info.name;
          }
        });

        // API 데이터를 로컬 상태 형식으로 변환
        const localTodos = [];
        const localCompletedTasks = [];

        apiTodos.forEach((apiTodo) => {
          const category =
            planetIdToCategoryMap[apiTodo.planet_id] ||
            (apiTodo.planet_id === "NONEPLANET" ? null : apiTodo.planet_id);

          const todo = {
            id: apiTodo.todo_id,
            text: apiTodo.todo_name,
            category: category || "Uncategorized",
            completed: apiTodo.is_completed || false,
            checked: false, // 체크 상태 (발사 전까지는 체크만)
            todoId: apiTodo.todo_id, // API 호출용
            planetId: apiTodo.planet_id,
          };

          if (apiTodo.is_completed) {
            localCompletedTasks.push({
              id: apiTodo.todo_id,
              text: apiTodo.todo_name,
              category: category || "Uncategorized",
              completedAt: apiTodo.completed_at || new Date(),
            });
          } else {
            localTodos.push(todo);
          }
        });

        setTodos(localTodos);
        setCompletedTasks((prev) => {
          // 기존 완료된 할 일과 병합 (중복 제거)
          const existingIds = new Set(prev.map((t) => t.id));
          const uniqueNewTasks = localCompletedTasks.filter(
            (t) => !existingIds.has(t.id)
          );
          return [...prev, ...uniqueNewTasks];
        });
      } catch (error) {
        console.error("Error loading todos:", error);
      }
    };

    loadTodos();
  }, [planetInfo]);

  const handleLogout = () => {
    navigate("/login");
  };

  const toggleTodoList = () => {
    setIsTodoListOpen((prev) => !prev);
  };

  // 카테고리별로 완료된 할 일들을 그룹화
  const tasksByCategory = useMemo(
    () =>
      completedTasks.reduce((acc, task) => {
        if (!acc[task.category]) {
          acc[task.category] = [];
        }
        acc[task.category].push(task);
        return acc;
      }, {}),
    [completedTasks]
  );

  // 카테고리별 행성 크기 계산 (완료된 할 일 개수에 비례)
  const getPlanetSize = useCallback(
    (category) => {
      const count = tasksByCategory[category]?.length || 0;
      return Math.max(
        MINIMUM_PLANET_SIZE,
        MAXIMUM_PLANET_SIZE * oneMinusExp(count)
      );
    },
    [tasksByCategory]
  );

  // 모든 카테고리 목록 (categories, todos, completedTasks에서 추출)
  const allCategories = useMemo(() => {
    return Array.from(
      new Set([
        ...categories.map((c) => c.name), // 객체에서 이름만 추출
      ])
    ).filter(Boolean);
  }, [categories]);

  // 행성 별 메시지용 데이터
  const planetStatusMap = useMemo(() => {
    const now = new Date();

    return allCategories.reduce((acc, category) => {
      const tasks = completedTasks.filter((t) => t.category === category);

      const sortedTasks = [...tasks].sort(
        (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
      );
      const lastActivityTime = sortedTasks[0]?.completedAt || null;
      const taskCountLast24h = tasks.filter(
        (t) => now - new Date(t.completedAt) < 24 * 60 * 60 * 1000
      ).length;
      const categoryHash = category
        .split("")
        .reduce((acc2, char) => acc2 + char.charCodeAt(0), 0);
      const avgTaskTime = 15 + (categoryHash % 10);

      acc[category] = {
        lastActivityTime,
        lastUpgradeTime: "2025-09-01T00:00:00Z",
        population: tasks.length * 3000,
        taskCountLast24h,
        avgTaskTime,
      };

      return acc;
    }, {});
  }, [allCategories, completedTasks]);

  // 말풍선 자동 순환
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [isHintVisible, setIsHintVisible] = useState(true);

  // 말풍선 자동 순환
  useEffect(() => {
    if (allCategories.length === 0) return;

    let visibleTimer = null;
    let hiddenTimer = null;

    const startCycle = () => {
      // 말풍선 3초 ON
      setIsHintVisible(true);

      visibleTimer = setTimeout(() => {
        setIsHintVisible(false);

        // 7초 OFF → 다음 행성으로 인덱스 이동
        hiddenTimer = setTimeout(() => {
          setCurrentHintIndex((idx) => (idx + 1) % allCategories.length);
          startCycle(); // 반복
        }, 4000);
      }, 4000);
    };

    startCycle();

    return () => {
      clearTimeout(visibleTimer);
      clearTimeout(hiddenTimer);
    };
  }, [allCategories]);

  // 궤도 반지름 목록 (중복 제거)
  // const uniqueRadii = useMemo(() => {
  //   const radiiSet = new Set();
  //   allCategories.forEach((category) => {
  //     radiiSet.add(getOrbitRadius(category));
  //   });
  //   return Array.from(radiiSet);
  // }, [allCategories]);

  // 태양 기준으로 행성 위치 생성 (새 카테고리만 랜덤 각도 배치)
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const updateSunCenter = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width <= 0 || height <= 0) return;

      const sunLeft = SUN_LEFT_OFFSET;
      const sunTop = height - SUN_SIZE - SUN_BOTTOM_OFFSET;
      const sunCenterX = sunLeft + SUN_SIZE / 2;
      const sunCenterY = sunTop + SUN_SIZE / 2;

      setSunCenter({ x: sunCenterX, y: sunCenterY });
    };

    updateSunCenter();
    window.addEventListener("resize", updateSunCenter);

    return () => {
      window.removeEventListener("resize", updateSunCenter);
    };
  }, []);

  // 고정 슬롯 위치들 (sunCenter 기준으로 계산)
  const fixedPositions = useMemo(() => {
    if (!sunCenter.x || !sunCenter.y) return [];
    return getFixedPositions(sunCenter.x, sunCenter.y);
  }, [sunCenter]);

  // 드래그 중일 때, 현재 드롭하면 들어갈 "가장 가까운 슬롯 index"
  const nearestSlotIndex = useMemo(() => {
    if (!dragging || !fixedPositions.length) return null;
    const { x, y } = dragging;
    let nearest = null;
    let minDist = Infinity;

    fixedPositions.forEach((pos) => {
      const dx = pos.x - x;
      const dy = pos.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = pos.index;
      }
    });

    return nearest;
  }, [dragging, fixedPositions]);

  // planetSlots를 이용해서 행성 위치 생성 + 슬롯 자동 배치
  useEffect(() => {
    if (!sunCenter.x || !sunCenter.y) return;

    // 1) 이미 슬롯에 어떤 카테고리들이 들어있는지 수집
    const categoriesWithSlot = new Set();
    for (let i = 1; i <= 18; i++) {
      const info = planetSlots[i];
      if (info && info.name) {
        categoriesWithSlot.add(info.name);
      }
    }

    // 2) 슬롯이 없는 카테고리는 자동으로 빈 슬롯에 배치
    allCategories.forEach((category) => {
      if (categoriesWithSlot.has(category)) return;
      placePlanetRandomly({ name: category });
      categoriesWithSlot.add(category);
    });

    // 3) 현재 planetSlots + sunCenter 기준으로 planetPositions 계산
    const applyPositions = (slots) => {
      const positions = computePlanetPositions(slots, sunCenter, allCategories);
      setPlanetPositions(positions);
    };

    // 처음 한 번 현재 값으로 계산
    applyPositions(planetSlots);

    // 4) 슬롯 변경 구독 → 슬롯이 바뀔 때마다 위치를 다시 계산
    const unsubscribe = subscribePlanetChange((slots) => {
      applyPositions(slots);
    });

    return unsubscribe;
  }, [allCategories, sunCenter]);

  // 드래그 관련: 마우스 이동 / 업 전역 리스너
  useEffect(() => {
    if (!dragging) return;
    if (!planetsLayerRef.current) return;

    const handleMouseMove = (e) => {
      const rect = planetsLayerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragging.offsetX;
      const y = e.clientY - rect.top - dragging.offsetY;
      setDragging((prev) =>
        prev
          ? {
              ...prev,
              x,
              y,
            }
          : null
      );
    };

    const handleMouseUp = () => {
      if (!dragging) return;
      if (!planetsLayerRef.current) {
        setDragging(null);
        return;
      }

      const { category, x, y } = dragging;

      // 드롭 위치에서 가장 가까운 고정 슬롯 찾기
      const localFixedPositions = getFixedPositions(sunCenter.x, sunCenter.y);
      let nearestSlot = null;
      let minDist = Infinity;

      localFixedPositions.forEach((pos) => {
        const dx = pos.x - x;
        const dy = pos.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearestSlot = pos.index;
        }
      });

      if (nearestSlot != null) {
        // src 슬롯 찾기
        let srcSlot = null;
        for (let i = 1; i <= 18; i++) {
          if (planetSlots[i] && planetSlots[i].name === category) {
            srcSlot = i;
            break;
          }
        }

        if (srcSlot != null && srcSlot !== nearestSlot) {
          changePlanetSlot(srcSlot, nearestSlot);
        }
      }

      setDragging(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, sunCenter]);

  const handlePlanetMouseDown = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    if (!planetsLayerRef.current) return;
    const rect = planetsLayerRef.current.getBoundingClientRect();
    const pos = planetPositions[category];
    if (!pos) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setDragging({
      category,
      x: pos.x,
      y: pos.y,
      offsetX: mouseX - pos.x,
      offsetY: mouseY - pos.y,
    });
  };

  const handleAddCategory = async (categoryObj) => {
    // categoryObj는 { name: string, description?: string } 형태라고 가정
    const trimmed = categoryObj.name.trim();

    // 중복 체크
    if (!trimmed || categories.some((c) => c.name === trimmed)) {
      return;
    }

    // username 가져오기
    const username = getUsername();
    if (!username) {
      console.error("Username not found. Please login again.");
      return;
    }

    // 즉시 임시 행성 추가 (공사중 표시)
    setLoadingPlanets((prev) => new Set([...prev, trimmed]));
    setCategories((prev) => [
      ...prev,
      {
        name: trimmed,
        description: categoryObj.description || "",
      },
    ]);

    // 임시 행성 정보 저장
    setPlanetInfo((prev) => ({
      ...prev,
      [trimmed]: {
        id: null,
        planetId: null,
        name: trimmed,
        population: 0,
        majorIndustry: "NO INDUSTRY",
        specifics: "NO SPECIFICS",
        introduction: categoryObj.description || "",
        completedTodos: [],
        isLoading: true,
      },
    }));

    // 로딩 시작
    setIsAddingPlanet(true);

    // API 호출로 행성 생성 (백그라운드)
    try {
      const response = await fetch(`${API_BASE_URL}/api/planets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planet_id: `PLANET_${Date.now()}`, // 임시 ID 생성
          name: trimmed,
          image: null, // 이미지는 아직 미구현
          introduction: categoryObj.description || null,
          population: 0,
          major_industry: "NO INDUSTRY",
          specifics: "NO SPECIFICS",
          username: username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to create planet: ${response.status}`
        );
      }

      const newPlanet = await response.json();
      console.log("Planet created successfully:", newPlanet);

      // 공사중 상태 제거
      setLoadingPlanets((prev) => {
        const next = new Set(prev);
        next.delete(trimmed);
        return next;
      });

      // 행성 정보 업데이트 (임시 -> 실제)
      const planetName = newPlanet.category || newPlanet.name || trimmed;
      setPlanetInfo((prev) => ({
        ...prev,
        [planetName]: {
          id: newPlanet._id,
          planetId: newPlanet.planet_id,
          name: planetName,
          population: newPlanet.population || 0,
          majorIndustry: newPlanet.major_industry || "NO INDUSTRY",
          specifics: newPlanet.specifics || "NO SPECIFICS",
          introduction: newPlanet.introduction || categoryObj.description || "",
          completedTodos: newPlanet.completedTodos || newPlanet.jobs_done || [],
          isLoading: false,
        },
      }));

      // S3 이미지 URL 저장
      const imageUrl = newPlanet.s3_image_url || newPlanet.image;
      if (imageUrl) {
        // URL에 프로토콜이 없으면 https:// 추가
        const fullImageUrl =
          imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
            ? imageUrl
            : `https://${imageUrl}`;
        setPlanetImages((prev) => ({
          ...prev,
          [planetName]: fullImageUrl,
        }));
      }
    } catch (error) {
      console.error("Error creating planet:", error);
      // 에러 발생 시 임시 행성 제거
      setLoadingPlanets((prev) => {
        const next = new Set(prev);
        next.delete(trimmed);
        return next;
      });
      setCategories((prev) => prev.filter((c) => c.name !== trimmed));
      setPlanetInfo((prev) => {
        const next = { ...prev };
        delete next[trimmed];
        return next;
      });
    } finally {
      // 로딩 종료
      setIsAddingPlanet(false);
    }
  };

  const handleAddTodo = async (text, category) => {
    // username 가져오기
    const username = getUsername();
    if (!username) {
      console.error("Username not found. Please login again.");
      return;
    }

    // category에서 planet_id 찾기
    const planetInfoForCategory = Object.values(planetInfo).find(
      (info) => info.name === category
    );
    const planetId = planetInfoForCategory?.planetId || "NONEPLANET";

    // API 호출로 할 일 생성
    try {
      const todoId = `TODO_${Date.now()}`;
      const response = await fetch(`${API_BASE_URL}/api/todos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          todo_id: todoId,
          todo_name: text,
          planet_id: planetId,
          username: username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to create todo: ${response.status}`
        );
      }

      const newTodo = await response.json();
      console.log("Todo created successfully:", newTodo);

      // 성공 시 로컬 상태에 추가
      const localTodo = {
        id: newTodo.todo_id,
        text: newTodo.todo_name,
        category: category,
        completed: false,
        checked: false, // 체크 상태 초기화
        todoId: newTodo.todo_id,
        planetId: newTodo.planet_id,
      };
      setTodos((prev) => [...prev, localTodo]);

      // 카테고리가 존재하는지 객체의 name으로 확인
      const categoryExists = categories.some((c) => c.name === category);

      // 없으면 새 객체 형태로 추가
      if (!categoryExists) {
        setCategories((prev) => [...prev, { name: category, description: "" }]);
      }
    } catch (error) {
      console.error("Error creating todo:", error);
    }
  };

  const handleToggleTodo = (id) => {
    // 체크 상태만 토글 (API 호출 없음)
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, checked: !todo.checked } : todo
      )
    );
  };

  const handleDeleteTodo = async (id) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // API 호출로 할 일 삭제
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos/${todo.todoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete todo: ${response.status}`);
      }

      console.log("Todo deleted successfully");
    } catch (error) {
      console.error("Error deleting todo:", error);
    }

    // 로컬 상태에서 제거
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setCompletedTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTodo = async (id, newText) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // API 호출로 할 일 이름 업데이트
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos/${todo.todoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          todo_name: newText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update todo: ${response.status}`);
      }

      const updatedTodo = await response.json();
      console.log("Todo updated successfully:", updatedTodo);

      // 성공 시 로컬 상태 업데이트
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, text: newText } : t))
      );
    } catch (error) {
      console.error("Error updating todo:", error);
      // 에러 발생 시에도 UI 업데이트 (낙관적 업데이트)
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, text: newText } : t))
      );
    }
  };

  const handleMoveTodo = async (todoId, targetCategory, targetIndex) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    // targetCategory에서 planet_id 찾기
    const planetInfoForCategory = Object.values(planetInfo).find(
      (info) => info.name === targetCategory
    );
    const targetPlanetId = planetInfoForCategory?.planetId || "NONEPLANET";

    // API 호출로 할 일 위치 업데이트
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos/${todo.todoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planet_id: targetPlanetId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update todo: ${response.status}`);
      }

      const updatedTodo = await response.json();
      console.log("Todo moved successfully:", updatedTodo);

      // 성공 시 로컬 상태 업데이트
      setTodos((prev) => {
        const foundTodo = prev.find((t) => t.id === todoId);
        if (!foundTodo) return prev;

        // 기존 할 일 제거
        const filtered = prev.filter((t) => t.id !== todoId);

        // 카테고리별로 그룹화하여 순서 유지
        const todosByCategory = filtered.reduce((acc, t) => {
          if (!acc[t.category]) {
            acc[t.category] = [];
          }
          acc[t.category].push(t);
          return acc;
        }, {});

        const newTodo = { ...foundTodo, category: targetCategory };

        // targetIndex가 -1이면 맨 위에, 그 외에는 해당 인덱스에 삽입
        const insertIndex = targetIndex === -1 ? 0 : targetIndex;

        // 타겟 카테고리의 할 일 목록 가져오기
        const targetCategoryTodos = todosByCategory[targetCategory] || [];

        // 인덱스가 범위를 벗어나면 끝에 추가
        const finalIndex =
          insertIndex >= targetCategoryTodos.length
            ? targetCategoryTodos.length
            : insertIndex;

        // 새 목록 생성
        const newTargetCategoryTodos = [...targetCategoryTodos];
        newTargetCategoryTodos.splice(finalIndex, 0, newTodo);

        // 모든 카테고리의 할 일들을 순서대로 합치기
        const allCats = Array.from(
          new Set([...Object.keys(todosByCategory), targetCategory])
        );

        const result = [];
        allCats.forEach((cat) => {
          if (cat === targetCategory) {
            result.push(...newTargetCategoryTodos);
          } else {
            result.push(...(todosByCategory[cat] || []));
          }
        });

        return result;
      });
    } catch (error) {
      console.error("Error moving todo:", error);
      // 에러 발생 시에도 UI 업데이트 (낙관적 업데이트)
      setTodos((prev) => {
        const foundTodo = prev.find((t) => t.id === todoId);
        if (!foundTodo) return prev;

        const filtered = prev.filter((t) => t.id !== todoId);
        const todosByCategory = filtered.reduce((acc, t) => {
          if (!acc[t.category]) {
            acc[t.category] = [];
          }
          acc[t.category].push(t);
          return acc;
        }, {});

        const newTodo = { ...foundTodo, category: targetCategory };
        const insertIndex = targetIndex === -1 ? 0 : targetIndex;
        const targetCategoryTodos = todosByCategory[targetCategory] || [];
        const finalIndex =
          insertIndex >= targetCategoryTodos.length
            ? targetCategoryTodos.length
            : insertIndex;

        const newTargetCategoryTodos = [...targetCategoryTodos];
        newTargetCategoryTodos.splice(finalIndex, 0, newTodo);

        const allCats = Array.from(
          new Set([...Object.keys(todosByCategory), targetCategory])
        );

        const result = [];
        allCats.forEach((cat) => {
          if (cat === targetCategory) {
            result.push(...newTargetCategoryTodos);
          } else {
            result.push(...(todosByCategory[cat] || []));
          }
        });

        return result;
      });
    }
  };

  const handleLaunch = async () => {
    const checkedTodos = todos.filter((todo) => todo.checked);

    if (checkedTodos.length === 0 || isLaunching) return;

    setIsLaunching(true);

    // 체크된 할 일들을 API로 완료 처리
    const updatePromises = checkedTodos.map(async (todo) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/todos/${todo.todoId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              is_completed: true,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update todo: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error(`Error updating todo ${todo.id}:`, error);
        return null;
      }
    });

    // 모든 API 호출 완료 대기
    await Promise.all(updatePromises);

    // 완료된 할 일들의 위치 가져오기
    const todoElements = document.querySelectorAll("[data-todo-id]");
    const rockets = [];

    checkedTodos.forEach((todo) => {
      const todoElement = Array.from(todoElements).find(
        (el) => el.getAttribute("data-todo-id") === todo.id
      );

      if (todoElement && planetPositions[todo.category]) {
        const todoRect = todoElement.getBoundingClientRect();
        const startX = todoRect.left + todoRect.width / 2;
        const startY = todoRect.top + todoRect.height / 2;

        const planetPos = planetPositions[todo.category];
        const endX = planetPos.x;
        const endY = planetPos.y;

        rockets.push({
          id: `rocket-${todo.id}-${Date.now()}`,
          startPosition: { x: startX, y: startY },
          endPosition: { x: endX, y: endY },
          category: todo.category,
          todoId: todo.id,
        });
      }
    });

    setRocketAnimations(rockets);

    rockets.forEach((rocket) => {
      setTimeout(() => {
        setExpandingPlanets((prev) => new Set(prev).add(rocket.category));

        setTimeout(() => {
          setExpandingPlanets((prev) => {
            const newSet = new Set(prev);
            newSet.delete(rocket.category);
            return newSet;
          });
        }, 500);

        setRocketAnimations((prev) => prev.filter((r) => r.id !== rocket.id));
      }, 1500);
    });

    setTimeout(() => {
      const newCompletedTasks = checkedTodos.map((todo) => ({
        id: todo.id,
        text: todo.text,
        category: todo.category,
        completedAt: new Date(),
      }));

      setCompletedTasks((prev) => [...prev, ...newCompletedTasks]);
      // 체크된 할 일들을 제거하고, 체크되지 않은 할 일들만 남김
      setTodos((prev) => prev.filter((todo) => !todo.checked));

      setIsLaunching(false);
    }, 2000);
  };

  const handlePlanetClick = (category) => {
    setClickedPlanetCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleCloseModal = (category) => {
    setClickedPlanetCategories((prev) => {
      const newSet = new Set(prev);
      newSet.delete(category);
      return newSet;
    });
  };

  const handleCloseAllModals = () => {
    setClickedPlanetCategories(new Set());
  };

  // 배경 클릭 핸들러 - 빈 배경만 클릭했을 때 모달 닫기
  const handleBackgroundClick = (e) => {
    // 클릭된 요소가 상호작용 가능한 요소인지 확인
    const target = e.target;

    // 상호작용 가능한 요소들: 버튼, 행성, 모달, TodoList, 말풍선 등
    const isInteractiveElement =
      target.closest("button") ||
      target.closest('[class*="cursor-grab"]') ||
      target.closest('[class*="cursor-pointer"]') ||
      target.closest('[class*="z-50"]') ||
      target.closest('[class*="z-40"]') ||
      target.closest("img") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("select") ||
      target.closest("a");

    // 빈 배경만 클릭했을 때만 모달 닫기
    if (!isInteractiveElement && clickedPlanetCategories.size > 0) {
      handleCloseAllModals();
    }
  };

  const handleDeletePlanet = async (category) => {
    // category 매개변수는 삭제할 카테고리의 '이름(String)'입니다.
    const info = planetInfo[category];
    const planetId = info?.planetId;

    // API 호출로 행성 삭제
    if (planetId) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/planets/${planetId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete planet: ${response.status}`);
        }

        const result = await response.json();
        console.log("Planet deleted successfully:", result);
      } catch (error) {
        console.error("Error deleting planet:", error);
        // 에러가 발생해도 UI에서는 제거 (낙관적 업데이트)
      }
    }

    // 객체의 name과 비교하여 필터링
    setCategories((prev) => prev.filter((cat) => cat.name !== category));

    setTodos((prev) => prev.filter((todo) => todo.category !== category));

    setCompletedTasks((prev) =>
      prev.filter((task) => task.category !== category)
    );

    setPlanetPositions((prev) => {
      const newPositions = { ...prev };
      delete newPositions[category];
      return newPositions;
    });

    setPlanetImages((prev) => {
      const copy = { ...prev };
      delete copy[category];
      return copy;
    });

    // 행성 정보 제거
    setPlanetInfo((prev) => {
      const copy = { ...prev };
      delete copy[category];
      return copy;
    });

    // 모달 닫기 (기존 동일)
    setClickedPlanetCategories((prev) => {
      const newSet = new Set(prev);
      newSet.delete(category);
      return newSet;
    });

    // 필요하면 planetSlots에서도 해당 카테고리 제거 로직 추가 가능
  };

  return (
    <div className="w-full h-screen overflow-hidden relative">
      {/* Logout 버튼 */}
      <button
        onClick={handleLogout}
        className="
        absolute top-5 right-5 z-50
        text-cyan-300 font-semibold tracking-wide
        transition
        hover:text-cyan-200 hover:shadow-[0_0_4px_rgb(34,211,238)]
      "
      >
        Logout
      </button>

      {/* 우주 공간 - 전체 너비 */}
      <div
        ref={containerRef}
        className="w-full h-full space-background relative overflow-auto p-10"
        style={{ minHeight: "100vh" }}
      >
        {/* TodoList 컨테이너 - 접는 버튼 포함 */}
        <div
          className={`absolute top-1/2 left-5 -translate-y-1/2 z-40 transition-all duration-300 flex items-center ${
            isTodoListOpen
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          {/* TodoList 카드 */}
          <div className="w-[340px]">
            <TodoList
              todos={todos}
              categories={allCategories}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onLaunch={handleLaunch}
              onAddCategory={handleAddCategory}
              onMoveTodo={handleMoveTodo}
              onDeleteTodo={handleDeleteTodo}
              onUpdateTodo={handleUpdateTodo}
              isLaunching={isLaunching}
              onPlanetClick={handlePlanetClick}
            />
          </div>

          {/* 접는 버튼 (왼쪽 화살표) - TodoList 오른쪽 */}
          <button
            onClick={toggleTodoList}
            className="w-16 h-48 flex items-center justify-center text-white/60 hover:text-white/80 transition-all hover:scale-110 cursor-pointer"
          >
            <ChevronLeft className="w-full h-full" />
          </button>
        </div>

        {/* 닫혀있을 때 펼치는 버튼 (오른쪽 화살표) */}
        <div
          className={`absolute top-1/2 left-5 -translate-y-1/2 z-40 transition-all duration-300 ${
            !isTodoListOpen
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          <button
            onClick={toggleTodoList}
            className="w-16 h-48 flex items-center justify-center text-white/60 hover:text-white/80 transition-all hover:scale-110 cursor-pointer"
          >
            <ChevronRight className="w-full h-full" />
          </button>
        </div>

        {/* 태양 이미지 — 왼쪽 중앙, 화면 밖으로 나가게 */}
        <img
          src="/src/assets/sun.png"
          alt="sun"
          className="absolute pointer-events-none z-0 sun-rotate"
          style={{
            width: `${SUN_SIZE}px`,
            height: `${SUN_SIZE}px`,
            left: SUN_LEFT_OFFSET,
            bottom: SUN_BOTTOM_OFFSET,
            filter: `
              drop-shadow(0 0 40px rgba(255, 200, 50, 0.8))
              drop-shadow(0 0 80px rgba(255, 180, 40, 0.6))
              drop-shadow(0 0 120px rgba(255, 150, 30, 0.4))
            `,
          }}
        />

        {/* 행성들 & 궤도 */}
        <div
          ref={planetsLayerRef}
          className="relative w-full h-full"
          style={{ minHeight: "calc(100vh - 80px)" }}
          onClick={handleBackgroundClick}
        >
          {/* 궤도 원들 */}
          {FIXED_ORBIT_RADII.map((radius) => (
            <div
              key={radius}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: `${radius * 2}px`,
                height: `${radius * 2}px`,
                left: `${sunCenter.x - radius}px`,
                top: `${sunCenter.y - radius}px`,
                border: "2px solid rgba(80, 180, 255, 0.6)",
                boxShadow: "0 0 6px rgba(80, 180, 255, 0.5)",
                zIndex: 1,
              }}
            />
          ))}

          {/* 슬롯 표시: 드래그 중일 때만 흰/초록/빨강 슬롯 이미지 표시 */}
          {sunCenter.x !== 0 &&
            sunCenter.y !== 0 &&
            dragging &&
            fixedPositions.map((pos, index) => {
              const isNearest =
                nearestSlotIndex != null && pos.index === nearestSlotIndex;

              // 이 슬롯이 이미 점유된 상태인지 (planetSlots 기준)
              const isOccupied = !!planetSlots[pos.index];

              // 색/스타일 결정
              let borderColor;
              let bgColor;
              let glow;

              if (isOccupied) {
                // 이미 행성이 있는 슬롯 → 빨강
                borderColor = "3px solid rgba(255, 120, 120, 0.95)";
                bgColor = "rgba(255, 80, 80, 0.35)";
                glow = "0 0 18px rgba(255, 80, 80, 1)";
              } else if (isNearest) {
                // 가장 가까운 슬롯 (비어있는 경우) → 초록
                borderColor = "3px solid rgba(100, 255, 100, 0.95)";
                bgColor = "rgba(100, 255, 100, 0.35)";
                glow = "0 0 18px rgba(100, 255, 150, 1)";
              } else {
                // 나머지 비어 있는 슬롯 → 흰색
                borderColor = "3px solid rgba(255, 255, 255, 0.95)";
                bgColor = "rgba(255, 255, 255, 0.35)";
                glow = "0 0 15px rgba(255, 255, 255, 0.9)";
              }

              return (
                <div
                  key={`fixed-${pos.radius}-${pos.angle}-${index}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 5,
                  }}
                >
                  {/* 슬롯 원 */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: `${MINIMUM_PLANET_SIZE}px`,
                      height: `${MINIMUM_PLANET_SIZE}px`,
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      border: borderColor,
                      backgroundColor: bgColor,
                      boxShadow: glow,
                    }}
                  />
                  {/* 번호 표시 */}
                  <div
                    className="absolute text-white font-bold text-center flex items-center justify-center"
                    style={{
                      width: `${MINIMUM_PLANET_SIZE}px`,
                      height: `${MINIMUM_PLANET_SIZE}px`,
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "20px",
                      textShadow:
                        "0 0 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.6)",
                      zIndex: 6,
                    }}
                  >
                    {pos.index}
                  </div>
                </div>
              );
            })}

          {/* 행성들 */}
          {allCategories.map((category) => {
            const basePos = planetPositions[category];
            if (!basePos) return null;

            const isDraggingThis =
              dragging && dragging.category === category && dragging.x != null;

            const x = isDraggingThis ? dragging.x : basePos.x;
            const y = isDraggingThis ? dragging.y : basePos.y;

            const imageUrl = planetImages[category] || null;
            const size = expandingPlanets.has(category)
              ? getPlanetSize(category) * 1.2
              : getPlanetSize(category);

            const isClicked = clickedPlanetCategories.has(category);
            const planetData = planetStatusMap[category];

            // 자동 순환 인덱스와 비교해서 자동 말풍선 띄움
            const planetIndex = allCategories.indexOf(category);
            const showAutoHint =
              isHintVisible && planetIndex === currentHintIndex;

            // 클릭이거나 자동 중 하나라도 true면 말풍선 표시
            const showHint = isClicked || showAutoHint;

            // 최종 메시지
            const statusMessage = getMessage(planetData);

            return (
              <div
                key={category}
                className="absolute z-10 cursor-grab active:cursor-grabbing"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseDown={(e) => handlePlanetMouseDown(e, category)}
                onClick={(e) => e.stopPropagation()}
              >
                <Planet
                  category={category}
                  size={size}
                  imageUrl={imageUrl}
                  onClick={() => handlePlanetClick(category)}
                  isLoading={loadingPlanets.has(category)}
                />

                {/* 말풍선 */}
                {showHint && (
                  <div
                    className="absolute z-50 text-black text-sm px-4 py-2 rounded shadow"
                    style={{
                      top: `-15px`,
                      left: "50%",
                      transform: "translate(-50%, -100%)",
                      backgroundColor: "white",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      whiteSpace: "nowrap",
                      minWidth: "140px",
                      maxWidth: "240px",
                      textAlign: "center",
                      lineHeight: "1.4",
                      position: "absolute",
                    }}
                  >
                    {statusMessage}

                    {/* 꼬리 */}
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "8px solid transparent",
                        borderRight: "8px solid transparent",
                        borderTop: "8px solid white",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* LLM 채팅 (우측 하단 floating) */}
      {/* <LLMChat /> */}

      {/* 이미지 생성 (우측 하단 floating, LLM 채팅 옆) */}
      {/* <ImageGenerator /> */}

      {/* 행성 정보 모달들 */}
      {Array.from(clickedPlanetCategories).map((category) => {
        if (!planetPositions[category]) return null;

        const targetCategoryObj = categories.find((c) => c.name === category);
        const description = targetCategoryObj
          ? targetCategoryObj.description
          : "";

        const info = planetInfo[category];

        return (
          <PlanetModal
            key={category}
            category={category}
            description={description}
            completedTasks={tasksByCategory[category] || []}
            planetPosition={planetPositions[category]}
            planetSize={getPlanetSize(category)}
            onClose={() => handleCloseModal(category)}
            onDelete={() => handleDeletePlanet(category)}
            planetInfo={info}
          />
        );
      })}

      {/* 로켓 애니메이션들 */}
      {rocketAnimations.map((rocket) => (
        <RocketAnimation
          key={rocket.id}
          id={rocket.id}
          startPosition={rocket.startPosition}
          endPosition={rocket.endPosition}
          category={rocket.category}
          onComplete={() => {
            // 로켓 제거는 이미 handleLaunch에서 처리됨
          }}
        />
      ))}
    </div>
  );
}

export default App;
