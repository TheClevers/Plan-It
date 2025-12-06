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

// 행성 상태 메시지 함수
function getPlanetStatusMessage(data) {
  if (!data || data.population === 0) return "🪐 행성을 키워보자!";
  const now = new Date();
  const hoursSinceLast =
    (now - new Date(data.lastActivityTime)) / 1000 / 60 / 60;

  if (hoursSinceLast > 72) return "🚨 지금 행성 관리가 안되고 있어!";
  if (data.population >= 10000) return "😵 너무 좁아!";
  if (data.taskCountLast24h >= 5) return "🔥 최근에 엄청 활발하군요!";
  if (data.avgTaskTime < 10) return "🌱 무럭무럭 자라는군!";
  return "🛰️ 평온한 상태입니다.";
}

function oneMinusExp(x) {
  return 1 - Math.exp(-x);
}

function App() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [categories, setCategories] = useState([
    { name: "냥냥성", description: "" },
    { name: "청소별", description: "" },
    { name: "공부별", description: "" },
  ]);
  const [clickedPlanetCategories, setClickedPlanetCategories] = useState(
    new Set()
  );
  const [planetPositions, setPlanetPositions] = useState({});

  // 드래그 상태: { category, x, y, offsetX, offsetY }
  const [dragging, setDragging] = useState(null);

  // 카테고리별 Gemini가 생성한 행성 이미지 URL
  const [planetImages, setPlanetImages] = useState({});

  const containerRef = useRef(null);
  const planetsLayerRef = useRef(null);
  const [sunCenter, setSunCenter] = useState({ x: 0, y: 0 });
  const [isTodoListOpen, setIsTodoListOpen] = useState(true);
  const [rocketAnimations, setRocketAnimations] = useState([]);
  const [expandingPlanets, setExpandingPlanets] = useState(new Set());
  const [isLaunching, setIsLaunching] = useState(false);

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
        ...categories.map((c) => c.name),
        ...todos.map((t) => t.category),
        ...completedTasks.map((t) => t.category),
      ])
    ).filter(Boolean);
  }, [categories, todos, completedTasks]);

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

  // 컨테이너 크기에 따라 태양 중심 좌표 계산
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
      const localFixedPositions = getFixedPositions(
        sunCenter.x,
        sunCenter.y
      );
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

  const handleAddCategory = (categoryObj) => {
    const trimmed = categoryObj.name.trim();

    if (trimmed && !categories.some((c) => c.name === trimmed)) {
      setCategories((prev) => [
        ...prev,
        {
          name: trimmed,
          description: categoryObj.description || "",
        },
      ]);
    }
  };

  const handleAddTodo = (text, category) => {
    const newTodo = {
      id: Date.now().toString(),
      text,
      category,
      completed: false,
    };
    setTodos((prev) => [...prev, newTodo]);

    const categoryExists = categories.some((c) => c.name === category);

    if (!categoryExists) {
      setCategories((prev) => [...prev, { name: category, description: "" }]);
    }
  };

  const handleToggleTodo = (id) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleDeleteTodo = (id) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const handleUpdateTodo = (id, newText) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, text: newText } : todo))
    );
  };

  const handleMoveTodo = (todoId, targetCategory, targetIndex) => {
    setTodos((prev) => {
      const todo = prev.find((t) => t.id === todoId);
      if (!todo) return prev;

      const filtered = prev.filter((t) => t.id !== todoId);

      const todosByCategory = filtered.reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = [];
        }
        acc[t.category].push(t);
        return acc;
      }, {});

      const newTodo = { ...todo, category: targetCategory };

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
  };

  const handleLaunch = async () => {
    const checkedTodos = todos.filter((todo) => todo.completed);

    if (checkedTodos.length === 0 || isLaunching) return;

    setIsLaunching(true);

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
      setTodos((prev) => prev.filter((todo) => !todo.completed));

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

  const handleDeletePlanet = (category) => {
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
        {/* TodoList 토글 컨트롤 */}
        <div className="absolute top-5 left-5 z-50">
          <img
            src="/favicon.png"
            alt="todo list button"
            className="w-12 h-12"
            draggable={false}
          />
        </div>

        {/* TodoList 컨테이너 - 접는 버튼 포함 */}
        <div
          className={`absolute top-1/2 left-5 -translate-y-1/2 z-40 transition-all duration-300 flex items-center ${
            isTodoListOpen
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          {/* TodoList 카드 */}
          <div className="w-[300px]">
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
            const message =
              isClicked && planetData
                ? getPlanetStatusMessage(planetData)
                : null;

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
              >
                <Planet
                  category={category}
                  size={size}
                  imageUrl={imageUrl}
                  onClick={() => handlePlanetClick(category)}
                />

                {/* 말풍선 */}
                {isClicked && (
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
                    {message || "행성을 키워보자!"}
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
      <LLMChat />

      {/* 이미지 생성 (우측 하단 floating, LLM 채팅 옆) */}
      <ImageGenerator />

      {/* 행성 정보 모달들 */}
      {Array.from(clickedPlanetCategories).map((category) => {
        if (!planetPositions[category]) return null;

        const targetCategoryObj = categories.find((c) => c.name === category);
        const description = targetCategoryObj
          ? targetCategoryObj.description
          : "";

        return (
          <PlanetModal
            key={category}
            category={category}
            description={description}
            completedTasks={tasksByCategory[category] || []}
            planetPosition={planetPositions[category]}
            planetSize={getPlanetSize(category)}
            onClose={() => handleCloseModal(category)}
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
