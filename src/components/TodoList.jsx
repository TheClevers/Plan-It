import { useState } from "react";
import Calendar from "../assets/svg/Calendar";

export default function TodoList({
  todos,
  categories,
  onAddTodo,
  onToggleTodo,
  onLaunch,
  onAddCategory,
  onMoveTodo,
  onDeleteTodo,
  onUpdateTodo,
}) {
  const [newTodoTexts, setNewTodoTexts] = useState({});
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showInputForCategory, setShowInputForCategory] = useState({});
  const [draggedTodo, setDraggedTodo] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [hoveredTodoId, setHoveredTodoId] = useState(null);
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // 날짜 포맷팅 함수
  const getDateString = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const date = String(today.getDate()).padStart(2, "0");
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[today.getDay()];
    return `${month}.${date} (${dayName}) 일지`;
  };

  // 카테고리별로 todos 그룹화
  const todosByCategory = todos.reduce((acc, todo) => {
    if (!acc[todo.category]) {
      acc[todo.category] = [];
    }
    acc[todo.category].push(todo);
    return acc;
  }, {});

  const handleAddTodo = (category) => {
    const text = newTodoTexts[category] || "";
    if (text.trim()) {
      onAddTodo(text, category);
      setNewTodoTexts({ ...newTodoTexts, [category]: "" });
      setShowInputForCategory({ ...showInputForCategory, [category]: false });
    }
  };

  const handleToggleInput = (category) => {
    setShowInputForCategory({
      ...showInputForCategory,
      [category]: !showInputForCategory[category],
    });
    // 입력 필드가 열리면 포커스
    setTimeout(() => {
      const input = document.getElementById(`todo-input-${category}`);
      if (input && showInputForCategory[category] === false) {
        input.focus();
      }
    }, 0);
  };

  const handleDragStart = (e, todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", todo.id);
  };

  const handleDragOver = (e, category, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverCategory(category);
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    // 자식 요소로 이동하는 경우는 무시
    if (e.currentTarget.contains(e.relatedTarget)) {
      return;
    }
    // 같은 카테고리 내에서만 드래그 리브 처리
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return;
    }
  };

  const handleDrop = (e, targetCategory, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTodo || !onMoveTodo) return;

    onMoveTodo(draggedTodo.id, targetCategory, targetIndex);
    setDraggedTodo(null);
    setDragOverCategory(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTodo(null);
    setDragOverCategory(null);
    setDragOverIndex(null);
  };

  const handleEditTodo = (todo) => {
    setEditingTodoId(todo.id);
    setEditingText(todo.text);
  };

  const handleSaveEdit = (todoId) => {
    if (editingText.trim() && onUpdateTodo) {
      onUpdateTodo(todoId, editingText.trim());
    }
    setEditingTodoId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditingText("");
  };

  const handleDeleteTodo = (todoId) => {
    if (onDeleteTodo) {
      onDeleteTodo(todoId);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  const checkedCount = todos.filter((todo) => todo.completed).length;

  return (
    <div className="max-h-[calc(100vh-40px)] bg-[#1a1a2e] p-5 flex flex-col overflow-y-auto rounded-lg shadow-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
        <h2 className="text-white text-sm font-medium">{getDateString()}</h2>
        <Calendar className="w-5 h-5 text-cyan-300" />
      </div>

      <div className="flex-1 overflow-y-auto mb-5 space-y-4">
        {categories.map((category) => (
          <div key={category} className="mb-4">
            {/* 카테고리 헤더 */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`flex-1 bg-[#16213e] rounded px-3 py-2 transition-all ${
                  dragOverCategory === category && dragOverIndex === -1
                    ? "ring-2 ring-cyan-400"
                    : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDragOver(e, category, -1);
                }}
                onDrop={(e) => handleDrop(e, category, -1)}
              >
                <span className="text-white">{category}</span>
              </div>
              <button
                onClick={() => handleToggleInput(category)}
                className="w-8 h-8 bg-[#16213e] rounded-full flex items-center justify-center text-white text-lg hover:bg-[#1e2a4a] transition-colors"
              >
                +
              </button>
            </div>

            {/* 해당 카테고리의 할 일 목록 */}
            <div
              className="space-y-2"
              onDragOver={(e) => {
                // 목록 끝에 드롭할 수 있도록
                if (draggedTodo) {
                  handleDragOver(
                    e,
                    category,
                    todosByCategory[category]?.length || 0
                  );
                }
              }}
              onDrop={(e) => {
                if (draggedTodo) {
                  handleDrop(
                    e,
                    category,
                    todosByCategory[category]?.length || 0
                  );
                }
              }}
            >
              {todosByCategory[category]?.map((todo, index) => (
                <div key={todo.id}>
                  {/* 위쪽 드롭 영역 */}
                  {dragOverCategory === category && dragOverIndex === index && (
                    <div className="h-1 mb-2 bg-cyan-400 rounded"></div>
                  )}
                  {editingTodoId === todo.id ? (
                    // 수정 모드
                    <div className="flex items-center gap-2.5 p-2.5 bg-[#16213e] rounded">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleSaveEdit(todo.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        onBlur={() => handleSaveEdit(todo.id)}
                        className="flex-1 min-w-0 p-2 bg-[#0f1624] border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(todo.id)}
                        className="w-8 h-8 bg-[#1e2a4a] rounded flex items-center justify-center text-white text-sm hover:bg-[#2a3a5a] transition-colors shrink-0"
                        style={{ minWidth: "32px", minHeight: "32px" }}
                        title="저장"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="w-8 h-8 bg-[#1e2a4a] rounded flex items-center justify-center text-white text-sm hover:bg-[#2a3a5a] transition-colors shrink-0"
                        style={{ minWidth: "32px", minHeight: "32px" }}
                        title="취소"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    // 일반 모드
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, todo)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDragOver(e, category, index);
                      }}
                      onDrop={(e) => handleDrop(e, category, index)}
                      onDragEnd={handleDragEnd}
                      onMouseEnter={() => setHoveredTodoId(todo.id)}
                      onMouseLeave={() => setHoveredTodoId(null)}
                      className={`group flex items-center gap-2.5 p-2.5 bg-[#16213e] rounded cursor-move transition-all ${
                        draggedTodo?.id === todo.id ? "opacity-50" : ""
                      } ${
                        dragOverCategory === category && dragOverIndex === index
                          ? "ring-2 ring-cyan-400"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => onToggleTodo(todo.id)}
                        className="cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <span
                        className={`text-white flex-1 ${
                          todo.completed ? "line-through opacity-60" : ""
                        }`}
                      >
                        {todo.text}
                      </span>
                      {/* 수정/삭제 버튼 - 호버 시 표시 */}
                      {hoveredTodoId === todo.id && !draggedTodo && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTodo(todo);
                            }}
                            className="w-7 h-7 bg-[#1e2a4a] rounded flex items-center justify-center text-white text-xs hover:bg-[#2a3a5a] transition-colors"
                            title="수정"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTodo(todo.id);
                            }}
                            className="w-7 h-7 bg-[#1e2a4a] rounded flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* 목록 끝 드롭 영역 */}
              {dragOverCategory === category &&
                dragOverIndex === (todosByCategory[category]?.length || 0) &&
                draggedTodo && (
                  <div className="h-1 mt-2 bg-cyan-400 rounded"></div>
                )}

              {/* 새 할 일 입력 - + 버튼을 눌렀을 때만 표시 */}
              {showInputForCategory[category] && (
                <input
                  id={`todo-input-${category}`}
                  type="text"
                  placeholder="할 일의 내용"
                  value={newTodoTexts[category] || ""}
                  onChange={(e) =>
                    setNewTodoTexts({
                      ...newTodoTexts,
                      [category]: e.target.value,
                    })
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddTodo(category);
                    } else if (e.key === "Escape") {
                      setShowInputForCategory({
                        ...showInputForCategory,
                        [category]: false,
                      });
                      setNewTodoTexts({
                        ...newTodoTexts,
                        [category]: "",
                      });
                    }
                  }}
                  onBlur={() => {
                    // 입력이 비어있으면 자동으로 닫기
                    if (!newTodoTexts[category]?.trim()) {
                      setShowInputForCategory({
                        ...showInputForCategory,
                        [category]: false,
                      });
                    }
                  }}
                  className="w-full p-2 bg-[#16213e] border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  autoFocus
                />
              )}
            </div>
          </div>
        ))}

        {/* 새 카테고리 추가 */}
        {isAddingCategory ? (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="행성 이름"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddCategory();
                  } else if (e.key === "Escape") {
                    setIsAddingCategory(false);
                    setNewCategoryName("");
                  }
                }}
                className="flex-1 bg-[#16213e] rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border focus:border-gray-500"
                autoFocus
              />
              <button
                onClick={handleAddCategory}
                className="w-8 h-8 bg-[#16213e] rounded-full flex items-center justify-center text-white text-lg hover:bg-[#1e2a4a] transition-colors"
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCategory(true)}
            className="w-full p-3 bg-[#16213e] rounded text-white hover:bg-[#1e2a4a] transition-colors text-left"
          >
            + 새 카테고리 추가
          </button>
        )}
      </div>

      <div className="pt-5 border-t border-gray-700">
        <button
          onClick={onLaunch}
          disabled={checkedCount === 0}
          className="
            relative w-full p-4 bg-transparent border-none rounded-lg cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            group
          "
        >
          {/* 이미지 */}
          <img
            src="/src/assets/launch_button.png"
            alt="발사 버튼"
            className="
              mx-auto w-32 h-auto
              transition-transform duration-200
              group-hover:scale-105
            "
          />

          {/* 중앙 숫자 */}
          <span
            className="
              absolute inset-0 flex items-center justify-center
              text-white font-bold text-lg
              pointer-events-none
              transition-all duration-200
              group-hover:scale-110
            "
          >
            {checkedCount}
          </span>
        </button>
      </div>
    </div>
  );
}
