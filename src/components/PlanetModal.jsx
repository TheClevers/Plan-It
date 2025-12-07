import { useEffect, useRef, useMemo } from "react";

export default function PlanetModal({
  category,
  description,
  completedTasks,
  planetPosition,
  planetSize,
  onClose,
  onDelete,
  planetInfo,
}) {
  const modalRef = useRef(null);
  const modalWidth = 400;
  const offset = 20;

  // 모달 최종 위치 계산
  const finalPosition = useMemo(() => {
    if (!planetPosition) return { x: 0, y: 0 };

    // 최종 위치 계산 (행성 오른쪽, 화면 밖으로 나가지 않도록)
    let finalX = planetPosition.x + planetSize + 80 / 2 + offset;
    const finalY = planetPosition.y;

    // 화면 밖으로 나가는지 확인
    const viewportWidth = window.innerWidth;
    if (finalX + modalWidth > viewportWidth - 20) {
      // 왼쪽에 표시
      finalX = planetPosition.x - planetSize / 2 - offset - modalWidth;
    }

    // 상하 경계 확인
    const viewportHeight = window.innerHeight;
    let adjustedY = finalY;
    if (finalY - 300 < 20) {
      adjustedY = 320; // 상단 여유 공간
    } else if (finalY + 300 > viewportHeight - 20) {
      adjustedY = viewportHeight - 320; // 하단 여유 공간
    }

    return { x: finalX, y: adjustedY };
  }, [planetPosition, planetSize]);

  // 행성에서 튀어나오는 애니메이션
  useEffect(() => {
    if (modalRef.current && planetPosition) {
      const modal = modalRef.current;
      const startX = planetPosition.x;
      const startY = planetPosition.y;

      // 초기 위치를 행성 중심으로 설정
      modal.style.left = `${startX}px`;
      modal.style.top = `${startY}px`;
      modal.style.transform = "translate(-50%, -50%) scale(0)";
      modal.style.opacity = "0";
      modal.style.transition = "none";

      // 애니메이션 시작
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          modal.style.transition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
          modal.style.left = `${finalPosition.x}px`;
          modal.style.top = `${finalPosition.y}px`;
          modal.style.transform = "translateY(-50%) scale(1)";
          modal.style.opacity = "1";
        });
      });
    }
  }, [planetPosition, finalPosition]);

  // 개발이력 날짜별 정렬 (최신이 위로)
  const sortedTasks = [...completedTasks].sort((a, b) => {
    const dateA = new Date(a.completedAt);
    const dateB = new Date(b.completedAt);
    return dateB - dateA; // 최신이 위로
  });

  // 행성 정보 사용 (API에서 받은 데이터 또는 기본값)
  const population =
    planetInfo?.population ?? Math.floor(1000 + completedTasks.length * 500);
  const industry = planetInfo?.majorIndustry ?? "없음";
  const feature = planetInfo?.specifics ?? "없음";

  // 날짜 포맷팅
  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  return (
    <>
      {/* 모달 */}
      <div
        ref={modalRef}
        className="fixed z-50 bg-[#1a1a2e] rounded-xl shadow-2xl border border-[#16213e] w-[400px] max-h-[600px] flex flex-col"
        style={{
          left: `${finalPosition.x}px`,
          top: `${finalPosition.y}px`,
          transform: "translateY(-50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white text-xl font-bold m-0">{category}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#16213e] rounded-full flex items-center justify-center text-white text-lg hover:bg-[#1e2a4a] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 내용 - 스크롤 가능 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 인구 */}
          <div>
            <h3 className="text-[#4a90e2] text-sm font-semibold mb-2">인구</h3>
            <p className="text-white text-base">
              {population.toLocaleString()}명
            </p>
          </div>

          {/* 주력산업 */}
          <div>
            <h3 className="text-[#4a90e2] text-sm font-semibold mb-2">
              주력산업
            </h3>
            <p className="text-white text-base">{industry}</p>
          </div>

          {/* 특이사항 */}
          <div>
            <h3 className="text-[#4a90e2] text-sm font-semibold mb-2">
              특이사항
            </h3>
            <p className="text-white text-base">{feature}</p>
          </div>
          <div>
            <h3 className="text-[#4a90e2] text-sm font-semibold mb-3">
              행성소개
            </h3>
            {description || "행성 소개를 입력하지 않았어요!"}
          </div>
          <div>
            <h3 className="text-[#4a90e2] text-sm font-semibold mb-3">
              완료된 할 일
            </h3>
            <div className="space-y-2">
              {sortedTasks.length === 0 ? (
                <p className="text-gray-500 text-center p-3 text-sm">
                  아직 완료한 일이 없습니다.
                </p>
              ) : (
                sortedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-[#16213e] rounded-md flex flex-col gap-1"
                  >
                    <span className="text-xs text-gray-400">
                      {formatDate(task.completedAt)}
                    </span>
                    <span className="text-white text-sm">{task.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 하단 삭제 버튼 */}
        <div className="px-5 pb-4 pt-2 border-t border-gray-700">
          <button
            onClick={() => {
              if (window.confirm(`${category} 행성을 파괴하시겠습니까?`)) {
                if (onDelete) {
                  onDelete();
                }
                onClose();
              }
            }}
            className="w-full py-1.5 px-3 bg-[#16213e] hover:bg-[#1e2a4a] text-red-400 hover:text-red-300 text-xs font-medium rounded transition-all"
          >
            행성 파괴
          </button>
        </div>
      </div>
    </>
  );
}
