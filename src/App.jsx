import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import TodoList from "./components/TodoList";
import Planet from "./components/Planet";
import PlanetInfo from "./components/PlanetInfo";
import LLMChat from "./components/LLMChat";
import ImageGenerator from "./components/ImageGenerator";
import { sendMessageToGemini } from "./services/gemini";

// 태양 관련 상수
const SUN_SIZE = 800; // 태양 이미지 크기(px)
const SUN_LEFT_OFFSET = (-SUN_SIZE * 3) / 4; // 화면 왼쪽 밖으로 3/4 나가게
const SUN_BOTTOM_OFFSET = 40; // 아래에서 40px 위

// 행성 관련 상수
const PLANET_ORBIT_RADIUS_OPTION = [350, 500, 750, 1000, 1250]
const PLANET_ORBIT_RADIUS = {
  냥냥성: 500,
  청소별: 750,
  공부별: 1000,
}; // 태양으로부터 거리
const PLANET_EXIST_ANGLE = Math.PI / 12; // 행성이 태양으로부터 존재할 수 있는 각도 (-π/n ~ π/n)
const MAXIMUM_PLANET_SIZE = 150;
const MINIMUM_PLANET_SIZE = 80;

function getWeightedRandomRadius() {
  const weights = PLANET_ORBIT_RADIUS_OPTION.map((_, i) => i + 1); 
  const total = weights.reduce((a, b) => a + b, 0);
  const random = Math.random() * total;

  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (random < sum) {
      return PLANET_ORBIT_RADIUS_OPTION[i];
    }
  }
}

const getOrbitRadius = (category) => {
  if (!(category in PLANET_ORBIT_RADIUS)) {
    // 새로운 카테고리면 랜덤값으로 설정
    PLANET_ORBIT_RADIUS[category] = getWeightedRandomRadius();
  }
  return PLANET_ORBIT_RADIUS[category];
};

function calDistance(r1, theta1, r2, theta2) {
  return Math.sqrt(
    r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(theta1 - theta2)
  );
}

function App({ onLogout }) {
  const [todos, setTodos] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [categories, setCategories] = useState(["냥냥성", "청소별", "공부별"]);
  const [selectedPlanetCategory, setSelectedPlanetCategory] = useState(null);
  const [planetPositions, setPlanetPositions] = useState({});
  const containerRef = useRef(null);
  const prevCategoriesRef = useRef("");
  const [sunCenter, setSunCenter] = useState({ x: 0, y: 0 });

  // 카테고리별로 완료된 할 일들을 그룹화
  const tasksByCategory = completedTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {});

  function oneMinusExp(x) {
    return 1 - Math.exp(-x);
  }

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
  // useMemo로 메모이제이션하여 불필요한 재계산 방지
  const allCategories = useMemo(() => {
    return Array.from(
      new Set([
        ...categories,
        ...todos.map((t) => t.category),
        ...completedTasks.map((t) => t.category),
      ])
    ).filter(Boolean);
  }, [categories, todos, completedTasks]);

  // 궤도 반지름 목록 (중복 제거)
  const uniqueRadii = useMemo(() => {
    const radiiSet = new Set();
    allCategories.forEach((category) => {
      radiiSet.add(getOrbitRadius(category));
    });
    return Array.from(radiiSet);
  }, [allCategories]);

  // 태양 기준으로 행성 위치 생성 (새 카테고리만 랜덤 각도 배치)
  useEffect(() => {
    if (!containerRef.current || allCategories.length === 0) return;

    // 카테고리 목록을 정렬하여 문자열로 변환하여 비교
    const currentCategoriesString = [...allCategories].sort().join(",");

    // 이전 카테고리와 동일하면 실행하지 않음 (무한 루프 방지)
    if (prevCategoriesRef.current === currentCategoriesString) {
      return;
    }

    // 현재 카테고리 목록 저장
    prevCategoriesRef.current = currentCategoriesString;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width <= 0 || height <= 0) return;

    // 태양의 left/top 계산
    const sunLeft = SUN_LEFT_OFFSET;
    const sunTop = height - SUN_SIZE - SUN_BOTTOM_OFFSET;

    // 태양 중심 좌표
    const sunCenterX = sunLeft + SUN_SIZE / 2;
    const sunCenterY = sunTop + SUN_SIZE / 2;

    // 궤도/행성 렌더링에서 쓸 수 있도록 상태로 저장
    setSunCenter({ x: sunCenterX, y: sunCenterY });

    setPlanetPositions((prev) => {
      // 이미 위치가 있는 카테고리는 그대로 두고,
      // 위치가 없는 새 카테고리만 랜덤으로 생성
      const next = { ...prev };

      const newCategories = allCategories.filter((cat) => !next[cat]);

      // 새 카테고리가 없으면 상태 업데이트하지 않음 (불필요한 리렌더링 방지)
      if (newCategories.length === 0) {
        return prev;
      }

      newCategories.forEach((category) => {
        const radius = getOrbitRadius(category);

        let valid = false;
        let angle = 0;
        let attempt = 0;
        const maxAttempts = 100; // 무한 루프 방지

        while (!valid && attempt < maxAttempts) {
          // 랜덤 각도 (-PLANET_EXIST_ANGLE ~ +PLANET_EXIST_ANGLE)
          angle =
            Math.random() * (2 * PLANET_EXIST_ANGLE) - PLANET_EXIST_ANGLE;

          const newSize = getPlanetSize(category);
          const newR = radius;

          valid = true;

          // 기존 행성들과 거리 검사
          // TODO: 같은 궤도 내의 행성들만 검사하게끔 바꾸면 더 효율적임
          for (const otherCat in next) {
            const other = next[otherCat];
            const otherAngle = Math.atan2(
              other.y - sunCenterY,
              other.x - sunCenterX
            );
            const otherR = Math.sqrt(
              Math.pow(other.x - sunCenterX, 2) +
                Math.pow(other.y - sunCenterY, 2)
            );

            const dist = calDistance(newR, angle, otherR, otherAngle);
            const minDist =
              (getPlanetSize(otherCat) + newSize) / 2 + 20; // 여유 간격

            if (dist < minDist) {
              valid = false;
              break;
            }
          }

          attempt++;
        }

        // 실패 시 그냥 마지막 값 사용
        const x = sunCenterX + Math.cos(angle) * radius;
        const y = sunCenterY + Math.sin(angle) * radius;

        next[category] = { category, x, y };
      });

      return next;
    });
  }, [allCategories, getPlanetSize]);

  const handleAddCategory = (category) => {
    const trimmed = category.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
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

    // 카테고리가 없으면 추가
    if (!categories.includes(category)) {
      setCategories((prev) => [...prev, category]);
    }
  };

  const handleToggleTodo = (id) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleLaunch = async () => {
    const checkedTodos = todos.filter((todo) => todo.completed);

    if (checkedTodos.length === 0) return;

    // 완료된 할 일들을 completedTasks에 추가
    const newCompletedTasks = checkedTodos.map((todo) => ({
      id: todo.id,
      text: todo.text,
      category: todo.category,
      completedAt: new Date(),
    }));

    setCompletedTasks((prev) => [...prev, ...newCompletedTasks]);

    // 완료된 할 일들을 todos에서 제거
    setTodos((prev) => prev.filter((todo) => !todo.completed));

    // // LLM 호출 예시
    // try {
    //   await sendMessageToGemini("안녕");
    // } catch (error) {
    //   console.error("LLM 호출 실패:", error);
    // }
  };

  const handlePlanetHover = (category) => {
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
    <div className="flex h-screen overflow-hidden relative">
      {/* Logout 버튼 */}
      <button
        onClick={onLogout}
        className="
        absolute top-5 right-5 z-50
        text-cyan-300 font-semibold tracking-wide
        transition
        hover:text-cyan-200 hover:shadow-[0_0_4px_rgb(34,211,238)]
      "
      >
        Logout
      </button>

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
          className="relative w-full h-full"
          style={{ minHeight: "calc(100vh - 80px)" }}
        >
          {/* 궤도 원들 (각 반지름 당 한 번만) */}
          {uniqueRadii.map((radius) => (
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

          {/* 행성들 */}
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

      {/* LLM 채팅 (우측 하단 floating) */}
      <LLMChat />

      {/* 이미지 생성 (우측 하단 floating, LLM 채팅 옆) */}
      <ImageGenerator />
    </div>
  );
}

export default App;
