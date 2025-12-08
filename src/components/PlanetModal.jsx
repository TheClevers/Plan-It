import { useEffect, useRef, useMemo } from "react";

/** 행성용 우주 레벨바 */
function PlanetLevelBar({ level, percent }) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const levelValue = Math.max(1, level);

  return (
    <div className="w-full mb-4">
      {/* 텍스트 헤더 */}
      <div className="flex items-baseline justify-between mb-1 text-amber-50">
        <span className="text-xs tracking-[0.18em] uppercase opacity-80">
          Level {levelValue}
        </span>
        <span className="text-xs font-semibold text-amber-300">
          {Math.round(clampedPercent)}%
        </span>
      </div>

      {/* 바 전체 컨테이너 */}
      <div
        className="relative w-full h-3 rounded-full px-[2px] bg-gradient-to-r from-[#1e0f10] via-[#2a120b] to-[#22100b] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_10px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ "--level": clampedPercent / 100 }}
      >
        {/* 외곽 별알갱이 느낌 */}
        <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.3) 0, transparent 45%), radial-gradient(circle, rgba(255,255,255,0.18) 0, transparent 50%)",
              backgroundSize: "26px 26px, 40px 40px",
            }}
          />
        </div>

        {/* 실제 채워지는 부분 */}
        <div
          className="relative h-full rounded-full shadow-[0_0_10px_rgba(255,184,54,0.85),0_0_22px_rgba(255,138,60,0.85),0_0_36px_rgba(255,230,106,0.6)] overflow-hidden"
          style={{
            width: `calc(var(--level) * 100%)`,
            background:
              "linear-gradient(90deg, #FF8A3C, #FFB836, #FFE66A)",
          }}
        >
          {/* 안쪽 하이라이트가 흘러가는 느낌 */}
          <div
            className="absolute inset-[-50%] mix-blend-screen"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.7) 45%, rgba(255,255,255,0) 55%, transparent 100%)",
              animation: "planet-level-shine 2.2s infinite ease-in-out",
            }}
          />
          {/* 작은 별 반짝임 */}
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.5) 0, transparent 55%), radial-gradient(circle, rgba(255,255,255,0.3) 0, transparent 60%)",
              backgroundSize: "22px 22px, 34px 34px",
              backgroundPosition: "0 0, 16px 8px",
              opacity: 0.7,
              filter: "blur(0.2px)",
            }}
          />
        </div>
      </div>

      {/* keyframes 정의 */}
      <style>
        {`
          @keyframes planet-level-shine {
            0% { transform: translateX(-80%); }
            50% { transform: translateX(10%); }
            100% { transform: translateX(120%); }
          }
        `}
      </style>
    </div>
  );
}

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
  const hasAnimatedRef = useRef(false); // 애니메이션이 이미 실행되었는지 추적
  const lastCategoryRef = useRef(category); // 이전 category 추적
  const modalWidth = 400;
  const offset = 20;

  // 이 행성의 완료된 할 일 개수
  const completedCount = completedTasks?.length || 0;

  // 한 레벨당 몇 개의 할 일이 필요한지
  const LEVEL_STEP = 5;

  // 5개당 1레벨 (0~4개: Lv.1, 5~9개: Lv.2, ...)
  const level = useMemo(() => {
    if (completedCount <= 0) return 1;
    return Math.floor(completedCount / LEVEL_STEP) + 1;
  }, [completedCount]);

  // 현재 레벨 내 진행도 (0~100%)
  const inLevelCount = completedCount % LEVEL_STEP;
  const levelPercent = useMemo(
    () => (inLevelCount / LEVEL_STEP) * 100,
    [inLevelCount]
  );

  // category가 변경되면 애니메이션 플래그 리셋 (모달이 다시 열릴 때 애니메이션 실행)
  useEffect(() => {
    if (lastCategoryRef.current !== category) {
      hasAnimatedRef.current = false;
      lastCategoryRef.current = category;
    }
  }, [category]);

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

  // 행성에서 튀어나오는 애니메이션 (처음 마운트될 때만 실행)
  useEffect(() => {
    if (modalRef.current && planetPosition && !hasAnimatedRef.current) {
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
          modal.style.transition =
            "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
          modal.style.left = `${finalPosition.x}px`;
          modal.style.top = `${finalPosition.y}px`;
          modal.style.transform = "translateY(-50%) scale(1)";
          modal.style.opacity = "1";
          hasAnimatedRef.current = true; // 애니메이션 완료 표시
        });
      });
    } else if (modalRef.current && planetPosition && hasAnimatedRef.current) {
      // 이미 애니메이션이 실행된 경우, 위치만 업데이트 (애니메이션 없이)
      const modal = modalRef.current;
      modal.style.transition = "none"; // 애니메이션 없이 즉시 이동
      modal.style.left = `${finalPosition.x}px`;
      modal.style.top = `${finalPosition.y}px`;
      modal.style.transform = "translateY(-50%) scale(1)";
      modal.style.opacity = "1";
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

  // 날짜 및 시간 포맷팅
  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} ${hours}:${minutes}`;
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
          {/* 맨 위에 레벨바 */}
          <PlanetLevelBar level={level} percent={levelPercent} />

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

          {/* 행성소개 */}
          <div>
            <h3 className="text-[#4a90e2] text-sm font-semibold mb-3">
              행성소개
            </h3>
            <p className="text-white text-base">
              {description || "행성 소개를 입력하지 않았어요!"}
            </p>
          </div>

          {/* 완료된 할 일 */}
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
