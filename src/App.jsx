import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import TodoList from "./components/TodoList";
import Planet from "./components/Planet";
import PlanetModal from "./components/PlanetModal";
import RocketAnimation from "./components/RocketAnimation";
import LLMChat from "./components/LLMChat";
import ImageGenerator from "./components/ImageGenerator";
import ChevronRight from "./assets/svg/ChevronRight";
import ChevronLeft from "./assets/svg/ChevronLeft";

// 레퍼런스 이미지 8장
import ref1 from "./assets/reference/planet_ref1.png";
import ref2 from "./assets/reference/planet_ref2.png";
import ref3 from "./assets/reference/planet_ref3.png";
import ref4 from "./assets/reference/planet_ref4.png";
import ref5 from "./assets/reference/planet_ref5.png";
import ref6 from "./assets/reference/planet_ref6.png";
import ref7 from "./assets/reference/planet_ref7.png";
import ref8 from "./assets/reference/planet_ref8.png";

// 👇 Gemini 이미지 생성 함수
import { generateImage } from "./services/geminiImage";

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

function App() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [categories, setCategories] = useState(["냥냥성", "청소별", "공부별"]);
  const [selectedPlanetCategory, setSelectedPlanetCategory] = useState(null);
  const [clickedPlanetCategories, setClickedPlanetCategories] = useState(
    new Set()
  );
  const [planetPositions, setPlanetPositions] = useState({});

  // 카테고리별 Gemini가 생성한 행성 이미지 URL
  const [planetImages, setPlanetImages] = useState({});

  const containerRef = useRef(null);
  const prevCategoriesRef = useRef("");
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

  //BACKEND: client id 가져오기
  const getClientId = () => {
  let id = localStorage.getItem("clientId");
  if (!id) {
    id = Date.now().toString() + "-" + Math.random().toString(36).slice(2,9);
    localStorage.setItem("clientId", id);
  }
  return id;
  };
  const clientId = getClientId();
  
  //BACKEND: TODO 가져오기
  useEffect(() => {
  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json(); 

      // Normalize each todo
      const normalized = data.map(item => ({
        id: item._id || item.id,
        text: item.text,
        category: item.category || "Uncategorized",
        completed: item.completed ?? false,
        completedAt: item.completedAt || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        clientId: item.clientId,
        _raw: item
      }));

      setTodos(normalized);

      // Extract categories
      const extractedCategories = Array.from(
        new Set(normalized.map(t => t.category))
      );

      setCategories(prev =>
        Array.from(new Set([...prev, ...extractedCategories]))
      );

    } catch (err) {
      console.error("Failed to fetch todos", err);
    }
  };
  fetchTodos();
  }, []);

  //BACKEND: PLANETS 가져오기 + planet의 카테고리 채우기
  const [planets, setPlanets] = useState([]);
  useEffect(() => {
  const fetchPlanets = async () => {
  try {
    const response = await fetch("/api/planets"); 
    if (!response.ok) throw new Error("Failed to fetch planets");

    const planetsData = await response.json();
    console.log("All planets:", planetsData);
    setPlanets(planetsData);

    // Extract category from each planet
    const planetCategories = planetsData.map(p => p.category);

    // Merge with existing categories and remove duplicates
    setCategories(prev => Array.from(new Set([...prev, ...planetCategories])));

    // You can store planets in state for later use
    setPlanets(planetsData); 
  } 
  catch (err) {
    console.error(err);
    alert("Error fetching planets: " + err.message);
  }
  }; fetchPlanets();
  }, []);

  //카테고리를 planetId로 전환
  const categoryToPlanetId = Object.fromEntries(
  planets.map(planet => [planet.category, planet._id])
  );

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

  // 🌞 태양 기준으로 행성 위치 생성 (새 카테고리만 랜덤 각도 배치)
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
      console.error("Gemini 행성 이미지 생성 실패:", category, err);
    }
  });
}, [allCategories, planetImages]);

  //카테고리 생성 + BACKEND: 행성 추가 및 저장하기
  const handleAddCategory = async (category) => {
    const trimmed = category.trim(); // 실수로 넣은 공백 제거
    //프엔 단일일 경우
    //if (trimmed && !categories.includes(trimmed)) {
    //  setCategories([...categories, trimmed]);
    //}
    
    if (!trimmed || categories.includes(trimmed)) return;
    
    //보낼 body 생성
    const body = {category: trimmed};
    if (clientId) {body.clientId = clientId;}
    
    //디버깅용
    console.log("body:", body)

    try {
    const res = await fetch("/api/planets", {  
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to add category");
    }

    const saved = await res.json();
    const normalized = {
      id: saved._id || saved.id,
      category: saved.category,
      clientId: saved.clientId || null,
      _raw: saved
    };

    setCategories(prev => {
      if (!prev.includes(normalized.category)) {
        return [...prev, normalized.category];
      }
      return prev;
    });
    } 
    
    catch (error) {
    console.error("ADD CATEGORY error:", error);
    alert("Category를 추가할 수 없습니다. " + error.message);
    }
  };

  //TODO 생성 + BACKEND: TODO 저장하기
  const handleAddTodo = async (text, category) => {
    //프엔에서 구동할 경우
    //const newTodo = {
    //  id: Date.now().toString(),
    //  text,
    //  category,
    //  completed: false,
    //};
    //setTodos((prev) => [...prev, newTodo]);

    //// 카테고리가 없으면 추가
    //if (!categories.includes(category)) {
    //  setCategories((prev) => [...prev, category]);
    //}
    //예외 제거
    if (!text || !text.trim()) {
    alert("TODO를 입력해 주세요!");
    return;
    }


    //server에 연결하고 저장하기
    try {
      const body = { text: text.trim(), category };
      body.clientId = clientId; 
      //디버깅용
      //console.log("body:", body);
      
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    //디버깅용
    //console.log("Stringified body:", JSON.stringify(body));


    //ADD call 안됐을 때 예외 처리
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "ADD TODO 실패");
    }

    const saved = await res.json();
    //디버깅용
    //console.log("category 확인:", saved.category);

    // 서버 저장된 걸 프엔 형태로 바꾸기 (id field)
    const normalized = {
      id: saved._id || saved.id,
      text: saved.text,
      category: saved.category || "Uncategorized",
      completed: saved.completed ?? false,
      completedAt: saved.completedAt || null,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      clientId: saved.clientId,
      _raw: saved
    };

    //디버깅용
    //console.log("Normalized body:", normalized);

    setTodos(prev => [...prev, normalized]);

    if (normalized.category && !categories.includes(normalized.category)) {
      setCategories(prev => [...prev, normalized.category]);
      }
    } 
    
    catch (error) {
    console.error("ADD TODO error:", error);
    alert("TODO를 추가할 수 없습니다. " + error.message);
    }
  };
  
  //TODO 완료상태 변경 + BACKEND: TODO 완료 상태 변경
  const handleToggleTodo = async (id) => {
    //프엔 구동용
    //setTodos((prev) =>
    //  prev.map((todo) =>
    //    todo.id === id ? { ...todo, completed: !todo.completed } : todo
    //  )
    //);
    try {
      // TODO 있는지 확인하기
      const target = todos.find((t) => t.id === id);
      if (!target) return;

      const updatedCompleted = !target.completed;

      // 벡엔드에 업데이트 하기
      const res = await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: updatedCompleted,
        completedAt: Date.now()
       }),
      });

      const saved = await res.json();

      // 백엔드 <> 프런트엔드 양식 맞추기
      // 서버 저장된 걸 프엔 형태로 바꾸기 (id field)
      const normalized = {
      id: saved._id || saved.id,
      text: saved.text,
      category: saved.category || "Uncategorized",
      completed: saved.completed ?? false,
      completedAt: saved.completedAt || null,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      clientId: saved.clientId,
      _raw: saved
      };
    
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      );
    } 
    catch (error) {
    console.error("TODO Toggle Failed", error);
    alert("TODO의 완료 상태를 변경 할 수 없습니다 " + error.message);
    }
  };

  //TODO 삭제하기 + BACKEND: TODO 삭제하기
  const handleDeleteTodo = async (id) => {
    //프엔 구동용
    //setTodos((prev) => prev.filter((todo) => todo.id !== id));
    try {
    const res = await fetch(`/api/todos/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete todo");
    }

    setTodos((prev) => prev.filter((todo) => todo.id !== id && todo._id !== id));
    } 
    
    catch (error) {
    console.error("DELETE TODO error:", error);
    alert("Todo를 삭제할 수 없습니다.");
    }
  };

  //TODO 업데이트 하기 + BACKEND: TODO 업데이트하기
  const handleUpdateTodo = async (id, newText) => {
    //프엔구동용
    //setTodos((prev) =>
    //  prev.map((todo) => (todo.id === id ? { ...todo, text: newText } : todo))
    //);
    try {
    const res = await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    });

    if (!res.ok) {
      throw new Error("Failed to update todo");
    }

    const updated = await res.json(); // the updated todo from backend

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id || todo._id === id ? updated : todo
      )
    );
    } 
    catch (error) {
    console.error("UPDATE TODO error:", error);
    alert("Todo를 수정할 수 없습니다.");
    }
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

  //발사버튼 + BACKEND: 완료된 TODO 삭제 + 행성별로 완료된 TODO 저장
  const handleLaunch = async () => {
    const checkedTodos = todos.filter((todo) => todo.completed);

    if (checkedTodos.length === 0 || isLaunching) return;

    //카테고리별로 완료된 TODO 묶기
    const todosByCategory = checkedTodos.reduce((acc, todo) => {
    if (!acc[todo.category]) acc[todo.category] = [];
    acc[todo.category].push({
      text: todo.text?.trim() || "내용 없음",
      completedAt: new Date(),
      });
    return acc;
    }, {});

    //백엔드에 카테고리 별로 완료된 할 일 행성에 저장하기 
    try {
    //카테고리별로 완료된 TODO 행성에 저장 
    await Promise.all(
      Object.entries(todosByCategory).map(async ([category, tasks]) => {
        // Log the request body
        const body = JSON.stringify({ tasks });
        console.log(`Sending to category "${category}":`, body);  
        const planetId = categoryToPlanetId[category];
        const res = await fetch(`/api/planets/${planetId}/completed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks }),
        });
        if (!res.ok) {
          throw new Error(`Failed to save completed tasks for category ${category}`);
        }
      })
    );

    //완료된 TODO 삭제하기
    await Promise.all(
      checkedTodos.map((todo) =>
        fetch(`/api/todos/${todo.id}`, { method: "DELETE" })
      )
    );
    } 

    catch (err) 
    {
    console.error("Launch error:", err);
    alert("Failed to launch TODOs to planet.", err.message);
    }

    // 발사 시작 - 버튼 비활성화
    setIsLaunching(true);

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

  //행성 삭제 + BACKEND: 행성 삭제하기
  const handleDeletePlanet = async (category) => {
    const planetId = categoryToPlanetId[category];
    if (planetId) {
    try {
      const res = await fetch(`/api/planets/${planetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete planet on server");
      console.log(`Deleted planet ${category} (${planetId}) on server`);
    } 
    catch (err) {
      console.error(err);
      alert(`Failed to delete planet "${category}": ${err.message}`);
      return; // stop local deletion if server failed
    }
    }
    // 카테고리 제거
    setCategories((prev) => prev.filter((cat) => cat !== category));

    // 해당 카테고리의 할 일들 제거
    setTodos((prev) => prev.filter((todo) => todo.category !== category));

    // 해당 카테고리의 완료된 할 일들 제거
    setCompletedTasks((prev) =>
      prev.filter((task) => task.category !== category)
    );

    // 행성 위치 제거
    setPlanetPositions((prev) => {
      const newPositions = { ...prev };
      delete newPositions[category];
      return newPositions;
    });

    // 행성 이미지 제거
    setPlanetImages((prev) => {
      const copy = { ...prev };
      delete copy[category];
      return copy;
    });

    // 모달 닫기
    setClickedPlanetCategories((prev) => {
      const newSet = new Set(prev);
      newSet.delete(category);
      return newSet;
    });
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

            const imageUrl = planetImages[category] || null;

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
                  size={
                    expandingPlanets.has(category)
                      ? getPlanetSize(category) * 1.2
                      : getPlanetSize(category)
                  }
                  imageUrl={imageUrl} // 🔹 Gemini가 만든 이미지 전달
                  onClick={() => handlePlanetClick(category)}
                />
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
        return (
          <PlanetModal
            key={category}
            category={category}
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
