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

  // 두 점 사이의 거리 계산
  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // 행성 위치 생성 함수
  const generatePlanetPositions = useCallback(
    (
      categories: Category[],
      containerWidth: number,
      containerHeight: number
    ): Record<Category, PlanetPosition> => {
      const positions: Record<Category, PlanetPosition> = {} as Record<
        Category,
        PlanetPosition
      >;
      const minDistance = 200; // 최소 거리 (픽셀)
      const padding = 100; // 경계 여백
      const maxAttempts = 100; // 최대 시도 횟수

      categories.forEach((category) => {
        const size = getPlanetSize(category);
        const requiredDistance = minDistance + size;

        let attempts = 0;
        let validPosition = false;
        let x = 0;
        let y = 0;

        while (!validPosition && attempts < maxAttempts) {
          // 랜덤 위치 생성 (패딩 고려)
          x = padding + Math.random() * (containerWidth - 2 * padding - size);
          y = padding + Math.random() * (containerHeight - 2 * padding - size);

          // 기존 행성들과의 거리 확인
          validPosition = Object.values(positions).every((pos) => {
            const distance = getDistance(x, y, pos.x, pos.y);
            const otherSize = getPlanetSize(pos.category);
            return distance >= requiredDistance + otherSize / 2;
          });

          attempts++;
        }

        // 최대 시도 횟수 초과 시 강제 배치 (중앙 근처)
        if (!validPosition) {
          x = containerWidth / 2 + (Math.random() - 0.5) * 300;
          y = containerHeight / 2 + (Math.random() - 0.5) * 300;
        }

        positions[category] = { category, x, y };
      });

      return positions;
    },
    [getPlanetSize]
  );

  // 새로운 카테고리만 위치 생성 (기존 위치는 유지)
  useEffect(() => {
    if (containerRef.current && allCategories.length > 0) {
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width > 0 && height > 0) {
        setPlanetPositions((prevPositions) => {
          // 이미 위치가 있는 카테고리는 제외
          const existingCategories = Object.keys(prevPositions);
          const newCategories = allCategories.filter(
            (cat) => !existingCategories.includes(cat)
          );

          if (newCategories.length === 0) {
            return prevPositions; // 새로운 카테고리가 없으면 기존 위치 유지
          }

          // 기존 위치들을 고려하여 새로운 카테고리 위치 생성
          const existingPositions = Object.values(prevPositions);
          const newPositions: Record<Category, PlanetPosition> = {
            ...prevPositions,
          };

          const minDistance = 200;
          const padding = 100;
          const maxAttempts = 100;

          newCategories.forEach((category) => {
            const size = getPlanetSize(category);
            const requiredDistance = minDistance + size;

            let attempts = 0;
            let validPosition = false;
            let x = 0;
            let y = 0;

            while (!validPosition && attempts < maxAttempts) {
              x = padding + Math.random() * (width - 2 * padding - size);
              y = padding + Math.random() * (height - 2 * padding - size);

              // 기존 모든 행성들과의 거리 확인
              validPosition =
                existingPositions.every((pos) => {
                  const distance = getDistance(x, y, pos.x, pos.y);
                  const otherSize = getPlanetSize(pos.category);
                  return distance >= requiredDistance + otherSize / 2;
                }) &&
                Object.values(newPositions).every((pos) => {
                  if (pos.category === category) return true;
                  const distance = getDistance(x, y, pos.x, pos.y);
                  const otherSize = getPlanetSize(pos.category);
                  return distance >= requiredDistance + otherSize / 2;
                });

              attempts++;
            }

            if (!validPosition) {
              x = width / 2 + (Math.random() - 0.5) * 300;
              y = height / 2 + (Math.random() - 0.5) * 300;
            }

            newPositions[category] = { category, x, y };
          });

          return newPositions;
        });
      }
    }
  }, [allCategories, generatePlanetPositions, getPlanetSize]);

  const handleAddCategory = (category: Category) => {
    if (category.trim() && !categories.includes(category.trim())) {
      setCategories([...categories, category.trim()]);
    }
  };

  const handleAddTodo = (text: string, category: Category) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      category,
      completed: false,
    };
    setTodos([...todos, newTodo]);
    // 카테고리가 없으면 추가
    if (!categories.includes(category)) {
      setCategories([...categories, category]);
    }
  };

  const handleToggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleLaunch = () => {
    const checkedTodos = todos.filter((todo) => todo.completed);

    // 완료된 할 일들을 completedTasks에 추가
    const newCompletedTasks: CompletedTask[] = checkedTodos.map((todo) => ({
      id: todo.id,
      text: todo.text,
      category: todo.category,
      completedAt: new Date(),
    }));

    setCompletedTasks([...completedTasks, ...newCompletedTasks]);

    // 완료된 할 일들을 todos에서 제거
    setTodos(todos.filter((todo) => !todo.completed));
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

      <div
        ref={containerRef}
        className="flex-1 space-background relative overflow-auto p-10"
        style={{ minHeight: "100vh" }}
      >
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
