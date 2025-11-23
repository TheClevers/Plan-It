import { useState } from "react";

export default function TodoList({
  todos,
  categories,
  onAddTodo,
  onToggleTodo,
  onLaunch,
  onAddCategory,
}) {
  const [newTodoTexts, setNewTodoTexts] = useState({});
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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
    <div className="h-full bg-[#1a1a2e] p-5 flex flex-col overflow-y-auto rounded-lg shadow-2xl">
      <div className="flex-1 overflow-y-auto mb-5 space-y-4">
        {categories.map((category) => (
          <div key={category} className="mb-4">
            {/* 카테고리 헤더 */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-[#16213e] rounded px-3 py-2">
                <span className="text-white">{category}</span>
              </div>
              <button
                onClick={() => {
                  const input = document.getElementById(
                    `todo-input-${category}`
                  );
                  if (input) {
                    input.focus();
                  }
                }}
                className="w-8 h-8 bg-[#16213e] rounded-full flex items-center justify-center text-white text-lg hover:bg-[#1e2a4a] transition-colors"
              >
                +
              </button>
            </div>

            {/* 해당 카테고리의 할 일 목록 */}
            <div className="space-y-2">
              {todosByCategory[category]?.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2.5 p-2.5 bg-[#16213e] rounded"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => onToggleTodo(todo.id)}
                    className="cursor-pointer"
                  />
                  <span
                    className={`text-white flex-1 ${
                      todo.completed ? "line-through opacity-60" : ""
                    }`}
                  >
                    {todo.text}
                  </span>
                </div>
              ))}

              {/* 새 할 일 입력 */}
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
                  }
                }}
                className="w-full p-2 bg-[#16213e] border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
              />
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
