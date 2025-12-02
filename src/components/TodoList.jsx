import { useState } from 'react';
import Calendar from '../assets/svg/Calendar';
import { NewPlanetModal } from './NewPlanetModal';

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
  isLaunching = false,
  onPlanetClick,
}) {
  const [newTodoTexts, setNewTodoTexts] = useState({});
  //const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showInputForCategory, setShowInputForCategory] = useState({});
  const [draggedTodo, setDraggedTodo] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [hoveredTodoId, setHoveredTodoId] = useState(null);
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isPlanetModalOpen, setIsPlanetModalOpen] = useState(false);
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  // 날짜 포맷팅 함수
  const getDateString = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
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
    const text = newTodoTexts[category] || '';
    if (text.trim()) {
      onAddTodo(text, category);
      setNewTodoTexts({ ...newTodoTexts, [category]: '' });
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
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', todo.id);
  };

  const handleDragOver = (e, category, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
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
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditingText('');
  };

  const handleDeleteTodo = (todoId) => {
    if (onDeleteTodo) {
      onDeleteTodo(todoId);
    }
  };

  const handleAddCategoryModal = () => {
    if (!newCategoryName.trim()) return;

    onAddCategory({
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim(),
    });

    setNewCategoryName('');
    setNewCategoryDescription('');
    setIsPlanetModalOpen(false);
  };

  const checkedCount = todos.filter((todo) => todo.completed).length;

  return (
    <div
      className='max-h-[calc(100vh-40px)] bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#16213e] p-5 flex flex-col overflow-y-auto rounded-2xl shadow-2xl backdrop-blur-sm border border-cyan-500/20'
      style={{
        boxShadow:
          '0 0 40px rgba(80, 200, 255, 0.1), inset 0 0 60px rgba(80, 200, 255, 0.05)',
      }}
    >
      {/* 헤더 */}
      <div className='flex items-center justify-between mb-4 pb-3 border-b border-cyan-500/30'>
        <h2
          className='text-cyan-300 text-sm font-semibold tracking-wide'
          style={{ textShadow: '0 0 10px rgba(80, 200, 255, 0.5)' }}
        >
          {getDateString()}
        </h2>
        <Calendar
          className='w-5 h-5 text-cyan-400'
          style={{ filter: 'drop-shadow(0 0 4px rgba(80, 200, 255, 0.6))' }}
        />
      </div>

      <div className='flex-1 overflow-y-auto mb-5 space-y-4'>
        {categories.map((cat) => {
          const category = cat;

          return (
            <div key={category} className='mb-4'>
              {/* 카테고리 헤더 */}
              <div className='flex items-center gap-2 mb-2'>
                <div
                  className={`flex-1 bg-gradient-to-r from-[#16213e] to-[#1a1a2e] rounded-xl px-3 py-2 transition-all cursor-pointer hover:from-[#1a1a2e] hover:to-[#16213e] ${
                    dragOverCategory === category && dragOverIndex === -1
                      ? 'ring-2 ring-cyan-400 shadow-lg'
                      : ''
                  }`}
                  style={{
                    boxShadow:
                      dragOverCategory === category && dragOverIndex === -1
                        ? '0 0 20px rgba(80, 200, 255, 0.4)'
                        : '0 2px 8px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(80, 200, 255, 0.1)',
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDragOver(e, category, -1);
                  }}
                  onDrop={(e) => handleDrop(e, category, -1)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPlanetClick) {
                      onPlanetClick(category);
                    }
                  }}
                >
                  <span
                    className='text-cyan-200 font-medium'
                    style={{ textShadow: '0 0 8px rgba(80, 200, 255, 0.4)' }}
                  >
                    {category}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleInput(category)}
                  className='w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg hover:from-cyan-400 hover:to-blue-400 transition-all'
                  style={{
                    boxShadow: '0 0 8px rgba(80, 200, 255, 0.4)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      '0 0 12px rgba(80, 200, 255, 0.6)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      '0 0 8px rgba(80, 200, 255, 0.4)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  +
                </button>
              </div>

              {/* 해당 카테고리의 할 일 목록 */}
              <div
                className='space-y-2'
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
                    {dragOverCategory === category &&
                      dragOverIndex === index && (
                        <div
                          className='h-1 mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 rounded'
                          style={{
                            boxShadow: '0 0 10px rgba(80, 200, 255, 0.6)',
                          }}
                        ></div>
                      )}
                    {editingTodoId === todo.id ? (
                      // 수정 모드
                      <div
                        className='flex items-center gap-2.5 p-2.5 bg-[#16213e] rounded-xl border border-cyan-500/30'
                        style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                      >
                        <input
                          type='text'
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(todo.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          onBlur={() => handleSaveEdit(todo.id)}
                          className='flex-1 min-w-0 p-2 bg-[#0f1624] border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400'
                          style={{
                            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(todo.id)}
                          className='w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white text-sm hover:from-emerald-400 hover:to-teal-400 transition-all shrink-0'
                          style={{
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                          }}
                          title='저장'
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className='w-7 h-7 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center text-white text-lg hover:from-red-400 hover:to-rose-400 transition-all shrink-0 font-bold'
                          style={{
                            boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
                          }}
                          title='취소'
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      // 일반 모드
                      <div
                        data-todo-id={todo.id}
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
                        className={`group flex items-center gap-2.5 p-2.5 bg-[#16213e] rounded-xl cursor-move transition-all border ${
                          draggedTodo?.id === todo.id ? 'opacity-50' : ''
                        } ${
                          dragOverCategory === category &&
                          dragOverIndex === index
                            ? 'ring-2 ring-cyan-400 border-cyan-400'
                            : 'border-cyan-500/20'
                        }`}
                        style={{
                          boxShadow:
                            dragOverCategory === category &&
                            dragOverIndex === index
                              ? '0 0 20px rgba(80, 200, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)'
                              : '0 2px 8px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        <input
                          type='checkbox'
                          checked={todo.completed}
                          onChange={() => onToggleTodo(todo.id)}
                          className='cursor-pointer'
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        <span
                          className={`text-cyan-100 flex-1 ${
                            todo.completed
                              ? 'line-through opacity-40 text-cyan-500'
                              : ''
                          }`}
                          style={{
                            textShadow: todo.completed
                              ? 'none'
                              : '0 0 4px rgba(80, 200, 255, 0.3)',
                          }}
                        >
                          {todo.text}
                        </span>
                        {/* 수정/삭제 버튼 - 호버 시 표시 */}
                        {hoveredTodoId === todo.id && !draggedTodo && (
                          <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTodo(todo);
                              }}
                              className='w-7 h-7 bg-transparent rounded-lg flex items-center justify-center text-cyan-300 text-sm hover:text-cyan-200 transition-all font-bold'
                              style={{
                                textShadow: '0 0 8px rgba(80, 200, 255, 0.6)',
                                transform: 'rotate(-45deg)',
                              }}
                              title='수정'
                              onMouseEnter={(e) => {
                                e.currentTarget.style.textShadow =
                                  '0 0 12px rgba(80, 200, 255, 0.9)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.textShadow =
                                  '0 0 8px rgba(80, 200, 255, 0.6)';
                              }}
                            >
                              ✏
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTodo(todo.id);
                              }}
                              className='w-7 h-7 bg-transparent rounded-lg flex items-center justify-center text-red-400 text-lg hover:text-red-300 transition-all font-bold'
                              style={{
                                textShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                              }}
                              title='삭제'
                              onMouseEnter={(e) => {
                                e.currentTarget.style.textShadow =
                                  '0 0 12px rgba(239, 68, 68, 0.9)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.textShadow =
                                  '0 0 8px rgba(239, 68, 68, 0.6)';
                              }}
                            >
                              ✕
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
                    <div
                      className='h-1 mt-2 bg-gradient-to-r from-cyan-400 to-blue-400 rounded'
                      style={{ boxShadow: '0 0 10px rgba(80, 200, 255, 0.6)' }}
                    ></div>
                  )}

                {/* 새 할 일 입력 - + 버튼을 눌렀을 때만 표시 */}
                {showInputForCategory[category] && (
                  <input
                    id={`todo-input-${category}`}
                    type='text'
                    placeholder='할 일의 내용'
                    value={newTodoTexts[category] || ''}
                    onChange={(e) =>
                      setNewTodoTexts({
                        ...newTodoTexts,
                        [category]: e.target.value,
                      })
                    }
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTodo(category);
                      } else if (e.key === 'Escape') {
                        setShowInputForCategory({
                          ...showInputForCategory,
                          [category]: false,
                        });
                        setNewTodoTexts({
                          ...newTodoTexts,
                          [category]: '',
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
                    className='w-full p-2 bg-[#0f1624] border border-cyan-500/30 rounded-xl text-cyan-100 placeholder-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400'
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' }}
                    autoFocus
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* 새 카테고리 추가 버튼 */}
        <button
          onClick={() => setIsPlanetModalOpen(true)}
          className='w-full p-3 bg-[#16213e] rounded-xl text-cyan-300 hover:bg-[#1a1a2e] transition-all text-left font-medium border border-cyan-500/20 hover:border-cyan-500/40'
          style={{
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            textShadow: '0 0 8px rgba(80, 200, 255, 0.4)',
          }}
        >
          + 새 행성 추가
        </button>

        <NewPlanetModal
          isOpen={isPlanetModalOpen}
          onClose={() => {
            setIsPlanetModalOpen(false);
            setNewCategoryName('');
            setNewCategoryDescription('');
          }}
          name={newCategoryName}
          description={newCategoryDescription}
          onChangeName={setNewCategoryName}
          onChangeDescription={setNewCategoryDescription}
          onSubmit={handleAddCategoryModal}
        />
      </div>

      <div className='pt-5 border-t border-cyan-500/30'>
        <button
          onClick={onLaunch}
          disabled={checkedCount === 0 || isLaunching}
          className='
            relative w-full p-4 bg-transparent border-none rounded-lg cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            group
          '
        >
          {/* 이미지 */}
          <img
            src='/src/assets/launch_button.png'
            alt='발사 버튼'
            className='
              mx-auto w-32 h-auto
              transition-transform duration-200
              group-hover:scale-105
            '
          />

          {/* 중앙 숫자 또는 로딩 */}
          {isLaunching ? (
            <div
              className='
                absolute inset-0 flex items-center justify-center
                pointer-events-none
              '
            >
              <div className='flex flex-col items-center gap-2'>
                <div className='w-6 h-6 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin'></div>
                <span className='text-cyan-300 text-xs font-medium'>
                  발사 중...
                </span>
              </div>
            </div>
          ) : (
            <span
              className='
                absolute inset-0 flex items-center justify-center
                text-white font-bold text-lg
                pointer-events-none
                transition-all duration-200
                group-hover:scale-110
              '
            >
              {checkedCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
