import { useEffect, useState } from "react";
import rocketImg from "../assets/rocket.png"; // 로켓 이미지 import

export default function RocketAnimation({
  startPosition,
  endPosition,
  onComplete,
  category,
  id,
}) {
  const [position, setPosition] = useState(startPosition); // 현재 위치
  const [opacity, setOpacity] = useState(1); // 불투명도
  const [isArrived, setIsArrived] = useState(false); // 도착 여부

  useEffect(() => {
    if (!startPosition || !endPosition) return;

    const duration = 1500; // 애니메이션 총 시간 (1.5초)
    const startTime = Date.now(); // 시작 시간

    const animate = () => {
      const elapsed = Date.now() - startTime; // 경과 시간
      const progress = Math.min(elapsed / duration, 1); // 진행률 (0~1)

      // 이징 함수: ease-out (처음 빠르게, 끝은 느리게)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // 현재 위치 계산
      const currentX =
        startPosition.x + (endPosition.x - startPosition.x) * easeOut;
      const currentY =
        startPosition.y + (endPosition.y - startPosition.y) * easeOut;

      setPosition({ x: currentX, y: currentY }); // 위치 갱신

      // 도착 후 디졸브 효과 (마지막 10% 구간에서 투명도 감소)
      if (progress >= 0.9) {
        setIsArrived(true);
        const fadeProgress = (progress - 0.9) / 0.1;
        setOpacity(1 - fadeProgress);
      }

      // 애니메이션 계속 진행 또는 완료 처리
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (onComplete) {
          onComplete(); // 애니메이션 완료 콜백 실행
        }
      }
    };

    requestAnimationFrame(animate); // 애니메이션 시작
  }, [startPosition, endPosition, onComplete]);

  // 로켓의 회전 각도 계산 (목표 지점을 향하도록)
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
        transform: `translate(-50%, -50%) rotate(${ angle + 90 }deg)`, // 중심 정렬 + 회전
        opacity: opacity,
        transition: isArrived ? "opacity 0.3s ease-out" : "none", // 디졸브 효과 적용
      }}
    >
      {/* 로켓 이미지 (SVG 대신 png 사용) */}
      <img src={rocketImg} alt="Rocket" width={40} height={40} />
    </div>
  );
}
