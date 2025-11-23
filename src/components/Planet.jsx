import planetCat from "../assets/planet_cat.png";
import planetClean from "../assets/planet_clean.png";
import planetStudy from "../assets/planet_study.png";

export default function Planet({ category, size, onClick }) {
  // 카테고리별 이미지 매핑
  const getPlanetImage = (category) => {
    if (category.includes("냥냥") || category.includes("cat")) {
      return planetCat;
    } else if (category.includes("청소") || category.includes("clean")) {
      return planetClean;
    } else if (category.includes("공부") || category.includes("study")) {
      return planetStudy;
    }
    return null;
  };

  const planetImage = getPlanetImage(category);
  // 각 행성마다 다른 색상 그라데이션 생성
  const planetColors = [
    { from: "#667eea", to: "#764ba2" },
    { from: "#f093fb", to: "#f5576c" },
    { from: "#4facfe", to: "#00f2fe" },
    { from: "#43e97b", to: "#38f9d7" },
    { from: "#fa709a", to: "#fee140" },
    { from: "#30cfd0", to: "#330867" },
    { from: "#a8edea", to: "#fed6e3" },
    { from: "#ff9a9e", to: "#fecfef" },
  ];

  const colorIndex = category.charCodeAt(0) % planetColors.length;
  const colors = planetColors[colorIndex];

  // hex 색상을 rgba로 변환
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div
      className="flex flex-col items-center cursor-pointer transition-transform duration-300 hover:scale-110 planet-3d"
      onClick={onClick}
    >
      <div
        className="rounded-full planet-glow flex items-center justify-center relative overflow-hidden"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          boxShadow: planetImage
            ? `
            0 0 ${size * 0.25}px ${hexToRgba(colors.from, 0.5)},
            0 0 ${size * 0.5}px ${hexToRgba(colors.from, 0.4)},
            0 0 ${size * 0.75}px ${hexToRgba(colors.from, 0.25)}
          `
            : `
            0 0 ${size * 0.25}px ${hexToRgba(colors.from, 0.5)},
            0 0 ${size * 0.5}px ${hexToRgba(colors.from, 0.4)},
            0 0 ${size * 0.75}px ${hexToRgba(colors.from, 0.25)},
            inset -${size * 0.125}px -${size * 0.125}px ${
                size * 0.375
              }px rgba(0, 0, 0, 0.6),
            inset ${size * 0.125}px ${size * 0.125}px ${
                size * 0.375
              }px rgba(255, 255, 255, 0.15)
          `,
        }}
      >
        {planetImage ? (
          <>
            <img
              src={planetImage}
              alt={category}
              className="w-full h-full object-cover rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
              }}
            />
            {/* 이미지 위에 약간의 오버레이 효과 */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)`,
              }}
            />
          </>
        ) : (
          <>
            <div
              className="rounded-full planet-surface absolute inset-0"
              style={{
                background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.4) 0%, transparent 50%),
            linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
              }}
            />
            {/* 행성 표면 패턴 */}
            <div
              className="absolute inset-0 rounded-full opacity-30"
              style={{
                background: `
              radial-gradient(circle at 20% 30%, transparent 0%, rgba(0, 0, 0, 0.2) 40%, transparent 60%),
              radial-gradient(circle at 80% 70%, transparent 0%, rgba(0, 0, 0, 0.2) 40%, transparent 60%),
              radial-gradient(circle at 50% 50%, transparent 0%, rgba(255, 255, 255, 0.1) 30%, transparent 50%)
            `,
              }}
            />
            <div
              className="text-white font-bold text-center p-2.5 break-words relative z-10 drop-shadow-lg"
              style={{ fontSize: `${size * 0.1}px` }}
            >
              {category}
            </div>
          </>
        )}
      </div>
      <div className="mt-3 text-white text-sm text-center drop-shadow-md font-medium">
        {category}
      </div>
    </div>
  );
}

