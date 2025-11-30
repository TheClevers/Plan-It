import { useState } from "react";
import CalendarIcon from "../assets/svg/Calendar";
import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

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
  const [selectedDate, setSelectedDate] = useState(new Date()); // ✅ 확정된 날짜
  const [tempDate, setTempDate] = useState(new Date());         // ✅ 달력용 임시 날짜
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 날짜 포맷팅 함수 (selectedDate 사용)
  const getDateString = () => {
    const today = selectedDate;
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

  // ⚙ 한 칸의 폭
  const CELL_WIDTH = 300;

  return (
    // 전체 카드: 닫힘 = 1칸, 열림 = 2칸
    <div
      className="bg-[#1a1a2e] rounded-lg shadow-2xl flex max-h-[calc(100vh-40px)] transition-all duration-300"
      style={{
        width: isCalendarOpen ? CELL_WIDTH * 2 : CELL_WIDTH,
      }}
    >
      {/* 왼쪽: TODO 리스트 (항상 1칸 폭 유지) */}
      <div
        className="relative p-5 flex flex-col overflow-y-auto"
        style={{ width: CELL_WIDTH }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
          <h2 className="text-white text-sm font-medium">
            {getDateString()}
          </h2>
          <button
            onClick={() => {
              // 📌 캘린더를 열 때, 임시 날짜를 현재 확정 날짜로 맞춰줌
              setTempDate(selectedDate);
              setIsCalendarOpen((prev) => !prev);
            }}
            className="p-1 rounded hover:bg-[#16213e] transition-colors"
          >
            <CalendarIcon className="w-5 h-5 text-cyan-300" />
          </button>
        </div>

        {/* 할 일 리스트 영역 */}
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
                      [category]: e.today.value,
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
                  onChange={(e) => setNewCategoryName(e.today.value)}
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

        {/* 발사 버튼 */}
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
            <img
              src="/src/assets/launch_button.png"
              alt="발사 버튼"
              className="
                mx-auto w-32 h-auto
                transition-transform duration-200
                group-hover:scale-105
              "
            />
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

      {/* 오른쪽: 카드 안에서만 열리는 캘린더 영역 (ToDo와 같은 폭) */}
      {isCalendarOpen && (
        <div
          className="border-l border-gray-700 p-4 flex flex-col h-full"
          style={{ width: CELL_WIDTH }}
        >
          <div className="mb-3 text-sm text-white font-semibold">
            날짜 선택
          </div>

          <div className="flex-1 overflow-y-auto">
            <ReactCalendar
              onChange={(date) => setTempDate(date)} // ✅ 임시 날짜만 변경
              value={tempDate}                       // ✅ 달력은 tempDate 기준으로만 보여줌
              locale="ko-KR"
              className="custom-calendar"
            />
          </div>

          <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-700">
            {/* 선택: tempDate를 진짜 selectedDate로 확정 + 닫기 */}
            <button
              onClick={() => {
                setSelectedDate(tempDate);
                setIsCalendarOpen(false);
              }}
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              선택
            </button>

            {/* 닫기: selectedDate는 그대로 두고, 창만 닫기 */}
            <button
              onClick={() => {
                setIsCalendarOpen(false);
                // 원상 복구 느낌을 원하면 다음 줄도 추가 가능:
                // setTempDate(selectedDate);
              }}
              className="px-3 py-1 text-sm rounded bg-gray-600 text-white hover:bg-gray-500"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
