import { useState, useEffect, useRef, useCallback } from "react";
import TodoList from "./components/TodoList";
import Planet from "./components/Planet";
import PlanetInfo from "./components/PlanetInfo";
import type { Todo, CompletedTask, Category } from "./types";

interface PlanetPosition {
  category: Category;
  x: number;
  y: number;
}

// 🌞 태양/궤도 관련 상수
const SUN_SIZE = 800;                    // 태양 이미지 크기(px)
const SUN_RIGHT_OFFSET = -SUN_SIZE / 2;  // 화면 오른쪽 밖으로 절반 나가게
const SUN_BOTTOM_OFFSET = 40;            // 아래에서 40px 위
const PLANET_ORBIT_RADIUS = {"냥냥": 500, "청소": 750, "공부": 1000}; // 태양으로부터 거리

const getOrbitRadius = (category: string) => {
  if (category.includes("냥냥")) return PLANET_ORBIT_RADIUS["냥냥"];
  if (category.includes("청소")) return PLANET_ORBIT_RADIUS["청소"];
  if (category.includes("공부")) return PLANET_ORBIT_RADIUS["공부"];
  return 500; // 디폴트
};

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    "냥냥성",
    "청소별",
    "공부별",
  ]);
  const [selectedPlanetCategory, setSelectedPlanetCategory] =
    useState<Category | null>(null);
  const [planetPositions, setPlanetPositions] = useState<
    Record<Category, PlanetPosition>
  >({});
  const containerRef = useRef<HTMLDivElement>(null);

  // 카테고리별로 완료된 할 일들을 그룹화
  const tasksByCategory = completedTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<Category, CompletedTask[]>);

  // 카테고리별 행성 크기 계산 (완료된 할 일 개수에 비례)
  const getPlanetSize = useCallback(
    (category: Category): number => {
      const count = tasksByCategory[category]?.length || 0;
      return Math.max(80, 80 + count * 10); // 최소 80px, 할 일 하나당 10px 증가
    },
    [tasksByCategory]
  );

  // 모든 카테고리 목록 (categories, todos, completedTasks에서 추출)
  const allCategories = Array.from(
    new Set([
      ...categories,
      ...todos.map((t) => t.category),
      ...completedTasks.map((t) => t.category),
    ])
  ).filter(Boolean);

  // 🌞 태양 기준으로 행성 위치 생성 (새 카테고리만 랜덤 각도 배치)
  useEffect(() => {
    if (!containerRef.current || allCategories.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width <= 0 || height <= 0) return;

    // 태양의 left/top 계산 (right/bottom 기준 역산)
    const sunLeft = width - SUN_SIZE - SUN_RIGHT_OFFSET;
    const sunTop = height - SUN_SIZE - SUN_BOTTOM_OFFSET;

    // 태양 중심 좌표
    const sunCenterX = sunLeft + SUN_SIZE / 2;
    const sunCenterY = sunTop + SUN_SIZE / 2;

    setPlanetPositions((prev) => {
      // 이미 위치가 있는 카테고리는 그대로 두고,
      // 위치가 없는 새 카테고리만 랜덤으로 생성
      const next: Record<Category, PlanetPosition> = { ...prev };

      const newCategories = allCategories.filter(
        (cat) => !next[cat]
      );

      newCategories.forEach((category) => {
        const angle = Math.random() * (13/12 * Math.PI - 11/12 * Math.PI) + 11/12 * Math.PI; // 11/12π ~ 13/12π 사이 랜덤 값
        const radius = getOrbitRadius(category)
        const x = sunCenterX + Math.cos(angle) * radius;
        const y = sunCenterY + Math.sin(angle) * radius;

        next[category] = { category, x, y };
      });

      return next;
    });
  }, [allCategories]);

  const handleAddCategory = (category: Category) => {
    const trimmed = category.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
    }
  };

  const handleAddTodo = (text: string, category: Category) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      category,
      completed: false,
    };
    setTodos((prev) => [...prev, newTodo]);

    // 카테고리가 없으면 추가
    if (!categories.includes(category)) {
      setCategories((prev) => [...prev, category]);
    }
  };

  const handleToggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleLaunch = () => {
    const checkedTodos = todos.filter((todo) => todo.completed);

    if (checkedTodos.length === 0) return;

    // 완료된 할 일들을 completedTasks에 추가
    const newCompletedTasks: CompletedTask[] = checkedTodos.map((todo) => ({
      id: todo.id,
      text: todo.text,
      category: todo.category,
      completedAt: new Date(),
    }));

    setCompletedTasks((prev) => [...prev, ...newCompletedTasks]);

    // 완료된 할 일들을 todos에서 제거
    setTodos((prev) => prev.filter((todo) => !todo.completed));
  };

  const handlePlanetHover = (category: Category) => {
    setSelectedPlanetCategory(category);
  };

  const handlePlanetLeave = () => {
    setSelectedPlanetCategory(null);
  };

  // 오늘의 날짜와 요일 가져오기
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const dayNames = [
      "일요일",
      "월요일",
      "화요일",
      "수요일",
      "목요일",
      "금요일",
      "토요일",
    ];
    const dayName = dayNames[today.getDay()];
    return `${year}. ${month}. ${date}. ${dayName}`;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 왼쪽 패널 */}
      <div className="w-[300px] relative bg-[#0a0a1a]">
        {/* 타이틀 영역 - 떠있는 카드 */}
        <div className="absolute top-5 left-5 right-5 bg-[#1a1a2e] p-5 rounded-lg shadow-2xl z-10">
          <h1 className="text-white text-xl font-bold mb-2">
            Plan It: we made it !
          </h1>
          <p className="text-white text-sm text-gray-300">{getTodayDate()}</p>
        </div>

        {/* TodoList - 떠있는 카드 */}
        <div className="absolute top-32 left-5 right-5 bottom-5">
          <TodoList
            todos={todos}
            categories={allCategories}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onLaunch={handleLaunch}
            onAddCategory={handleAddCategory}
          />
        </div>
      </div>

      {/* 오른쪽 우주 공간 */}
      <div
        ref={containerRef}
        className="flex-1 space-background relative overflow-auto p-10"
        style={{ minHeight: "100vh" }}
      >
        {/* 🌞 태양 이미지 — 오른쪽 아래, 화면 밖으로 절반 나가게 */}
        <img
          src="/src/assets/sun.png"
          alt="sun"
          className="absolute pointer-events-none z-0"
          style={{
            width: `${SUN_SIZE}px`,
            height: `${SUN_SIZE}px`,
            right: SUN_RIGHT_OFFSET,
            bottom: SUN_BOTTOM_OFFSET,
            filter: `
              drop-shadow(0 0 40px rgba(255, 200, 50, 0.8))
              drop-shadow(0 0 80px rgba(255, 180, 40, 0.6))
              drop-shadow(0 0 120px rgba(255, 150, 30, 0.4))
            `,
          }}
        />

        {/* 행성들 */}
        <div
          className="relative w-full h-full"
          style={{ minHeight: "calc(100vh - 80px)" }}
        >
          {allCategories.map((category) => {
            const position = planetPositions[category];
            if (!position) return null;

            return (
              <div
                key={category}
                className="absolute z-10"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  onMouseEnter={() => handlePlanetHover(category)}
                  onMouseLeave={handlePlanetLeave}
                >
                  <Planet
                    category={category}
                    size={getPlanetSize(category)}
                    onClick={() => {}}
                  />
                </div>

                {selectedPlanetCategory === category && (
                  <div
                    onMouseEnter={() => handlePlanetHover(category)}
                    onMouseLeave={handlePlanetLeave}
                  >
                    <PlanetInfo
                      category={category}
                      completedTasks={tasksByCategory[category] || []}
                      planetPosition={position}
                      planetSize={getPlanetSize(category)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
