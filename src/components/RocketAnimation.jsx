import { useEffect, useState } from "react";

export default function RocketAnimation({
  startPosition,
  endPosition,
  onComplete,
  category,
  id,
}) {
  const [position, setPosition] = useState(startPosition);
  const [opacity, setOpacity] = useState(1);
  const [isArrived, setIsArrived] = useState(false);
  const gradientId = `rocketGradient-${id}`;

  useEffect(() => {
    if (!startPosition || !endPosition) return;

    const duration = 1500; // 1.5초 동안 이동
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 이징 함수 (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // 현재 위치 계산
      const currentX =
        startPosition.x + (endPosition.x - startPosition.x) * easeOut;
      const currentY =
        startPosition.y + (endPosition.y - startPosition.y) * easeOut;

      setPosition({ x: currentX, y: currentY });

      // 도착 시 디졸브 효과
      if (progress >= 0.9) {
        setIsArrived(true);
        const fadeProgress = (progress - 0.9) / 0.1;
        setOpacity(1 - fadeProgress);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 애니메이션 완료
        if (onComplete) {
          onComplete();
        }
      }
    };

    requestAnimationFrame(animate);
  }, [startPosition, endPosition, onComplete]);

  // 각도 계산 (로켓이 목표 방향을 향하도록)
  const angle =
    startPosition && endPosition
      ? Math.atan2(
          endPosition.y - startPosition.y,
          endPosition.x - startPosition.x
        ) *
        (180 / Math.PI)
      : 0;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        opacity: opacity,
        transition: isArrived ? "opacity 0.3s ease-out" : "none",
      }}
    >
      {/* 로켓 SVG */}
      <svg
        width="24"
        height="40"
        viewBox="0 0 24 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 로켓 본체 */}
        <path
          d="M12 2 L8 8 L12 10 L16 8 Z"
          fill="#60a5fa"
          stroke="#3b82f6"
          strokeWidth="1"
        />
        <rect x="10" y="8" width="4" height="28" fill="#60a5fa" />
        <rect x="10" y="8" width="4" height="28" fill={`url(#${gradientId})`} />

        {/* 로켓 창문 */}
        <circle cx="12" cy="18" r="2" fill="#bfdbfe" />

        {/* 로켓 날개 */}
        <path d="M8 12 L6 20 L8 18 Z" fill="#3b82f6" />
        <path d="M16 12 L18 20 L16 18 Z" fill="#3b82f6" />

        {/* 불꽃 */}
        <path d="M10 36 L12 40 L14 36 Z" fill="#fbbf24" />
        <path d="M9 34 L12 38 L15 34 Z" fill="#f59e0b" opacity="0.8" />

        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
