import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TodoList from './components/TodoList';
import Planet from './components/Planet';
import PlanetModal from './components/PlanetModal';
import RocketAnimation from './components/RocketAnimation';
import LLMChat from './components/LLMChat';
import ImageGenerator from './components/ImageGenerator';
import ChevronRight from './assets/svg/ChevronRight';
import ChevronLeft from './assets/svg/ChevronLeft';

// 레퍼런스 이미지 8장
import ref1 from './assets/reference/planet_ref1.png';
import ref2 from './assets/reference/planet_ref2.png';
import ref3 from './assets/reference/planet_ref3.png';
import ref4 from './assets/reference/planet_ref4.png';
import ref5 from './assets/reference/planet_ref5.png';
import ref6 from './assets/reference/planet_ref6.png';
import ref7 from './assets/reference/planet_ref7.png';
import ref8 from './assets/reference/planet_ref8.png';

// 👇 Gemini 이미지 생성 함수
import { generateImage } from './services/geminiImage';

// 태양 관련 상수
const SUN_SIZE = 800; // 태양 이미지 크기(px)
const SUN_LEFT_OFFSET = (-SUN_SIZE * 3) / 4; // 화면 왼쪽 밖으로 3/4 나가게
const SUN_BOTTOM_OFFSET = 40; // 아래에서 40px 위

// 행성 관련 상수
const PLANET_ORBIT_RADIUS_OPTION = [350, 500, 750, 1000, 1250, 1500];
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
  // 혹시라도 못 뽑으면 마지막 값
  return PLANET_ORBIT_RADIUS_OPTION[PLANET_ORBIT_RADIUS_OPTION.length - 1];
}

const getOrbitRadius = (category) => {
  if (!(category in PLANET_ORBIT_RADIUS)) {
    // 새로운 카테고리면 랜덤값으로 설정
    PLANET_ORBIT_RADIUS[category] = getWeightedRandomRadius();
  }
  return PLANET_ORBIT_RADIUS[category];
};

function calDistance(r1, theta1, r2, theta2) {
  return Math.sqrt(r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(theta1 - theta2));
}

// 카테고리만 변수로 들어가는 행성 이미지 프롬프트
function buildPlanetPrompt(category) {
  return `
Generate a 2D, outlineless, casual cel-shaded planet illustration with a vibrant style.
The planet's theme is defined by a keyword (e.g., "Cleaning Planet", "Study Planet").
The keyword is: "${category}".

Arrange elements relevant to the keyword directly on the planet's surface to reflect the theme.
Ensure a solid #000000 (pure black) background.

Absolutely no outlines, watermarks, alphabets, or any kind of language text/letters are allowed in the generated image.
Avoid realistic facial features on creature/pet planets; use stylized, deformed features only.
Do not generate in 3D style.
`.trim();
}

// 행성 상태 메시지 함수
function getPlanetStatusMessage(data) {
  if (!data || data.population === 0) return "🪐 행성을 키워보자!";
  const now = new Date();
  const hoursSinceLast = (now - new Date(data.lastActivityTime)) / 1000 / 60 / 60;

  if (hoursSinceLast > 72) return "🚨 지금 행성 관리가 안되고 있어!";
  if (data.population >= 10000) return "😵 너무 좁아!";
  if (data.taskCountLast24h >= 5) return "🔥 최근에 엄청 활발하군요!";
  if (data.avgTaskTime < 10) return "🌱 무럭무럭 자라는군!";
  return "🛰️ 평온한 상태입니다.";
}

        
function App() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [categories, setCategories] = useState([
    { name: '냥냥성', description: '' },
    { name: '청소별', description: '' },
    { name: '공부별', description: '' },
  ]);
  const [selectedPlanetCategory, setSelectedPlanetCategory] = useState(null);
  const [clickedPlanetCategories, setClickedPlanetCategories] = useState(
    new Set()
  );
  const [planetPositions, setPlanetPositions] = useState({});

  // 카테고리별 Gemini가 생성한 행성 이미지 URL
  const [planetImages, setPlanetImages] = useState({});

  const containerRef = useRef(null);
  const prevCategoriesRef = useRef('');
  const [sunCenter, setSunCenter] = useState({ x: 0, y: 0 });
  const [isTodoListOpen, setIsTodoListOpen] = useState(true);
  const [rocketAnimations, setRocketAnimations] = useState([]);
  const [expandingPlanets, setExpandingPlanets] = useState(new Set());
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLogout = () => {
    navigate('/login');
  };

  const toggleTodoList = () => {
    setIsTodoListOpen((prev) => !prev);
  };

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

  async function urlToFile(url, filename) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  }

  // 모든 카테고리 목록 (categories, todos, completedTasks에서 추출)
  const allCategories = useMemo(() => {
    return Array.from(
      new Set([
        ...categories.map((c) => c.name), // 객체에서 이름만 추출
        ...todos.map((t) => t.category),
        ...completedTasks.map((t) => t.category),
      ])
    ).filter(Boolean);
  }, [categories, todos, completedTasks]);

  // 행성 별 메시지
const planetStatusMap = useMemo(() => {
  const now = new Date();

  return allCategories.reduce((acc, category) => {
    const tasks = completedTasks.filter((t) => t.category === category);

    // ❌ 기존 코드 (메시지 제외됨)
    // if (tasks.length === 0) return acc;

    // ✅ tasks가 없더라도 기본 값으로 넣기
    const sortedTasks = [...tasks].sort(
      (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
    );
    const lastActivityTime = sortedTasks[0]?.completedAt || null;
    const taskCountLast24h = tasks.filter(
      (t) => now - new Date(t.completedAt) < 24 * 60 * 60 * 1000
    ).length;
    const avgTaskTime = 15 + Math.floor(Math.random() * 10); // 예시: 랜덤 평균 시간

    acc[category] = {
      lastActivityTime,
      lastUpgradeTime: "2025-09-01T00:00:00Z", // 임시 값
      population: tasks.length * 3000, // 0일 수 있음
      taskCountLast24h,
      avgTaskTime,
    };

    return acc;
  }, {});
}, [allCategories, completedTasks]);



  // 궤도 반지름 목록 (중복 제거)
  const uniqueRadii = useMemo(() => {
    const radiiSet = new Set();
    allCategories.forEach((category) => {
      radiiSet.add(getOrbitRadius(category));
    });
    return Array.from(radiiSet);
  }, [allCategories]);

  // 🌞 태양 기준으로 행성 위치 생성 (새 카테고리만 랜덤 각도 배치)
  useEffect(() => {
    if (!containerRef.current || allCategories.length === 0) return;

    // 카테고리 목록을 정렬하여 문자열로 변환하여 비교
    const currentCategoriesString = [...allCategories].sort().join(',');

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
          angle = Math.random() * (2 * PLANET_EXIST_ANGLE) - PLANET_EXIST_ANGLE;

          const newSize = getPlanetSize(category);
          const newR = radius;

          valid = true;

          // 기존 행성들과 거리 검사
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
            const minDist = (getPlanetSize(otherCat) + newSize) / 2 + 20; // 여유 간격

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

  // Gemini 호출: 카테고리마다 행성 이미지 생성 (이미 생성된 건 다시 안 부름)
  useEffect(() => {
    if (allCategories.length === 0) return;

    const categoriesWithoutImage = allCategories.filter(
      (cat) => !planetImages[cat]
    );

    if (categoriesWithoutImage.length === 0) return;

    categoriesWithoutImage.forEach(async (category) => {
      try {
        // URL 목록을 File[] 로 변환
        const fileRefs = await Promise.all(
          [ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8].map((url, idx) =>
            urlToFile(url, `ref${idx + 1}.png`)
          )
        );

        // 프롬프트 생성
        const prompt = buildPlanetPrompt(category);

        // File[] 전달
        const dataUrl = await generateImage(prompt, fileRefs);

        // 이미지 저장
        if (dataUrl) {
          setPlanetImages((prev) =>
            prev[category] ? prev : { ...prev, [category]: dataUrl }
          );
        }
      } catch (err) {
        console.error('Gemini 행성 이미지 생성 실패:', category, err);
      }
    });
  }, [allCategories, planetImages]);

  const handleAddCategory = (categoryObj) => {
    // categoryObj는 { name: string, description?: string } 형태라고 가정
    const trimmed = categoryObj.name.trim();

    // 객체의 name 프로퍼티와 비교
    if (trimmed && !categories.some((c) => c.name === trimmed)) {
      setCategories((prev) => [
        ...prev,
        {
          name: trimmed,
          description: categoryObj.description || '', // 설명이 없으면 빈 문자열
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

    // 카테고리가 존재하는지 객체의 name으로 확인
    const categoryExists = categories.some((c) => c.name === category);

    // 없으면 새 객체 형태로 추가
    if (!categoryExists) {
      setCategories((prev) => [...prev, { name: category, description: '' }]);
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

      const newTodo = { ...todo, category: targetCategory };

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
  };

  const handleLaunch = async () => {
    const checkedTodos = todos.filter((todo) => todo.completed);

    if (checkedTodos.length === 0 || isLaunching) return;

    // 발사 시작 - 버튼 비활성화
    setIsLaunching(true);

    // 완료된 할 일들의 위치 가져오기
    const todoElements = document.querySelectorAll('[data-todo-id]');
    const rockets = [];

    checkedTodos.forEach((todo) => {
      const todoElement = Array.from(todoElements).find(
        (el) => el.getAttribute('data-todo-id') === todo.id
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

    // 로켓 애니메이션 시작
    setRocketAnimations(rockets);

    // 각 로켓 애니메이션 완료 후 처리
    rockets.forEach((rocket) => {
      setTimeout(() => {
        // 행성 크기 증가 애니메이션
        setExpandingPlanets((prev) => new Set(prev).add(rocket.category));

        setTimeout(() => {
          setExpandingPlanets((prev) => {
            const newSet = new Set(prev);
            newSet.delete(rocket.category);
            return newSet;
          });
        }, 500);

        // 로켓 제거
        setRocketAnimations((prev) => prev.filter((r) => r.id !== rocket.id));
      }, 1500); // 로켓 애니메이션 시간 (1.5초)
    });

    // 모든 로켓 애니메이션 완료 후 데이터 업데이트
    setTimeout(() => {
      const newCompletedTasks = checkedTodos.map((todo) => ({
        id: todo.id,
        text: todo.text,
        category: todo.category,
        completedAt: new Date(),
      }));

      setCompletedTasks((prev) => [...prev, ...newCompletedTasks]);
      setTodos((prev) => prev.filter((todo) => !todo.completed));

      // 발사 완료 - 버튼 활성화
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
    // category 매개변수는 삭제할 카테고리의 '이름(String)'입니다.

    // 객체의 name과 비교하여 필터링
    setCategories((prev) => prev.filter((cat) => cat.name !== category));

    // 해당 카테고리의 할 일들 제거 (기존 동일)
    setTodos((prev) => prev.filter((todo) => todo.category !== category));

    // 해당 카테고리의 완료된 할 일들 제거 (기존 동일)
    setCompletedTasks((prev) =>
      prev.filter((task) => task.category !== category)
    );

    // 행성 위치 제거 (기존 동일)
    setPlanetPositions((prev) => {
      const newPositions = { ...prev };
      delete newPositions[category];
      return newPositions;
    });

    // 행성 이미지 제거 (기존 동일)
    setPlanetImages((prev) => {
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
  };

  return (
    <div className='w-full h-screen overflow-hidden relative'>
      {/* Logout 버튼 */}
      <button
        onClick={handleLogout}
        className='
        absolute top-5 right-5 z-50
        text-cyan-300 font-semibold tracking-wide
        transition
        hover:text-cyan-200 hover:shadow-[0_0_4px_rgb(34,211,238)]
      '
      >
        Logout
      </button>

      {/* 우주 공간 - 전체 너비 */}
      <div
        ref={containerRef}
        className='w-full h-full space-background relative overflow-auto p-10'
        style={{ minHeight: '100vh' }}
      >
        {/* TodoList 토글 컨트롤 */}
        <div className='absolute top-5 left-5 z-50'>
          <img
            src='/favicon.png'
            alt='todo list button'
            className='w-12 h-12'
            draggable={false}
          />
        </div>

        {/* TodoList 컨테이너 - 접는 버튼 포함 */}
        <div
          className={`absolute top-1/2 left-5 -translate-y-1/2 z-40 transition-all duration-300 flex items-center ${
            isTodoListOpen
              ? 'translate-x-0 opacity-100'
              : '-translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          {/* TodoList 카드 */}
          <div className='w-[300px]'>
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
            className='w-16 h-48 flex items-center justify-center text-white/60 hover:text-white/80 transition-all hover:scale-110 cursor-pointer'
          >
            <ChevronLeft className='w-full h-full' />
          </button>
        </div>

        {/* 닫혀있을 때 펼치는 버튼 (오른쪽 화살표) */}
        <div
          className={`absolute top-1/2 left-5 -translate-y-1/2 z-40 transition-all duration-300 ${
            !isTodoListOpen
              ? 'translate-x-0 opacity-100'
              : '-translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          <button
            onClick={toggleTodoList}
            className='w-16 h-48 flex items-center justify-center text-white/60 hover:text-white/80 transition-all hover:scale-110 cursor-pointer'
          >
            <ChevronRight className='w-full h-full' />
          </button>
        </div>

        {/* 태양 이미지 — 왼쪽 중앙, 화면 밖으로 나가게 */}
        <img
          src='/src/assets/sun.png'
          alt='sun'
          className='absolute pointer-events-none z-0 sun-rotate'
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
          className='relative w-full h-full'
          style={{ minHeight: 'calc(100vh - 80px)' }}
        >
          {/* 궤도 원들 (각 반지름 당 한 번만) */}
          {uniqueRadii.map((radius) => (
            <div
              key={radius}
              className='absolute rounded-full pointer-events-none'
              style={{
                width: `${radius * 2}px`,
                height: `${radius * 2}px`,
                left: `${sunCenter.x - radius}px`,
                top: `${sunCenter.y - radius}px`,
                border: '2px solid rgba(80, 180, 255, 0.6)',
                boxShadow: '0 0 6px rgba(80, 180, 255, 0.5)',
                zIndex: 1,
              }}
            />
          ))}

          {/* 행성들 */}
        {allCategories.map((category) => {
          const position = planetPositions[category];
          if (!position) return null;

          const imageUrl = planetImages[category] || null;
          const size = expandingPlanets.has(category)
            ? getPlanetSize(category) * 1.2
            : getPlanetSize(category);

          const isClicked = clickedPlanetCategories.has(category);
          const planetData = planetStatusMap[category];
          const message =
            isClicked && planetData ? getPlanetStatusMessage(planetData) : null;

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
    padding: "4px 8px",            // ⬅ 여백 최소화
    borderRadius: "6px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    whiteSpace: "nowrap",          
    minWidth: "140px",
    maxWidth: "240px",             // ✅ 말풍선 더 길게
    textAlign: "center",
    lineHeight: "1.4",
    position: "absolute",
  }}
>
  {message || "행성을 키워보자!"}

  {/* 꼬리: 아래로 향하게 */}
  <div
    style={{
      position: "absolute",
      top: "100%",         // 말풍선 하단에 붙이기
      left: "50%",
      transform: "translateX(-50%)",
      width: 0,
      height: 0,
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderTop: "8px solid white", // 아래로 향하는 꼬리
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

        // 🔍 1. 현재 렌더링 중인 카테고리 이름(category)과 일치하는 객체를 찾습니다.
        const targetCategoryObj = categories.find((c) => c.name === category);

        // 🔍 2. 설명 추출 (없을 경우 빈 문자열 처리)
        const description = targetCategoryObj
          ? targetCategoryObj.description
          : '';

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
