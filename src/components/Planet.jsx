import planetCat from "../assets/planet_cat.png";
import planetClean from "../assets/planet_clean.png";
import planetStudy from "../assets/planet_study.png";
import loadingImage from "../assets/loading.png";

export default function Planet({ category, size, onClick, imageUrl, isLoading = false }) {
  // 카테고리별 기본 이미지 매핑
  const getPlanetImage = (category) => {
    if (category.includes("냥냥") || category.toLowerCase().includes("cat")) {
      return planetCat;
    } else if (category.includes("청소") || category.toLowerCase().includes("clean")) {
      return planetClean;
    } else if (category.includes("공부") || category.toLowerCase().includes("study")) {
      return planetStudy;
    }
    return null;
  };

  // 1순위: Gemini가 생성한 이미지
  // 2순위: 카테고리별 기본 행성 이미지
  const basePlanetImage = getPlanetImage(category);
  const planetImage = imageUrl || basePlanetImage;

  // 각 행성마다 다른 색상 그라데이션 (텍스트/배경용)
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
      className="flex flex-col items-center cursor-pointer planet-3d planet-hover"
      onClick={onClick}
      style={{
        transition: "transform 0.5s ease-out",
      }}
    >
      <div
        className="rounded-full flex items-center justify-center relative overflow-hidden"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transition: "width 0.5s ease-out, height 0.5s ease-out",
          background: "transparent",
          boxShadow: "none",
        }}
      >
        {isLoading ? (
          <img
            src={loadingImage}
            alt="공사중"
            className="rounded-full"
            style={{
              width: "150%",
              height: "150%",
              objectFit: "cover",
            }}
            draggable={false}
          />
        ) : planetImage ? (
          <img
            src={planetImage}
            alt={category}
            className="rounded-full"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            draggable={false}
          />
        ) : (
          <div
            className="text-white font-bold text-center p-2.5 break-words relative z-10 drop-shadow-lg"
            style={{ fontSize: `${size * 0.1}px` }}
          >
            {category}
          </div>
        )}
      </div>
      <div className="mt-3 text-white text-sm text-center drop-shadow-md font-medium">
        {category}
      </div>
    </div>
  );
}
