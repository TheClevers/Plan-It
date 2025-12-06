import { useNavigate } from "react-router-dom";
import { useState } from "react";
import tutorial1 from "./assets/tutorial/tutorial1.png";
import tutorial2 from "./assets/tutorial/tutorial2.png";
import tutorial3 from "./assets/tutorial/tutorial3.png";
import tutorial4 from "./assets/tutorial/tutorial4.png";
import tutorial5 from "./assets/tutorial/tutorial5.png";
import tutorial6 from "./assets/tutorial/tutorial6.png";
import tutorial7 from "./assets/tutorial/tutorial7.png";
import tutorial8 from "./assets/tutorial/tutorial8.png";
import logo from "./assets/Logo.png"
export default function Tutorial() {
  const navigate = useNavigate();

  const scripts = [
    "지금은 우주 개발 시대, 무한 경쟁 지구에 지쳤다...",
    "이젠 지구를 벗어날 때. 나만의 행성을 찾으러 떠나야겠다.",
    "이삿짐 준비, 로켓 준비 완료!",
    "우주 항해를 출발합니다. 당신만의 행성들이 기다리고 있습니다!",
    "우주 개발 환경에 접속하신 걸 환영합니다.",
    "할 일 카테고리를 입력하면 행성으로 나타나요!",
    "행성 안에 할 일은 적보세요!",
    "할 일이 완료되었다면 체크하고 버튼을 누르면 행성이 개발됩니다!",
    "자신만의 행성을 키워보세요!"
  ];

  const images = [tutorial1, tutorial2, tutorial2, tutorial3, tutorial4, tutorial5, tutorial6, tutorial7, tutorial8];

  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    console.log("START CLICKED");
    setStarted(true);
  };

  const handleNext = () => {
    console.log("NEXT CLICK, step:", step);

    if (step < scripts.length - 1) {
      setStep(step + 1);
    } else {
      console.log("GO TO /main");
      navigate("/main");
    }
  };

  return (
    <div className="w-full h-screen space-background flex items-center justify-center relative">

      {!started && (
        <div className="bg-[rgba(15,20,35,0.75)] text-white w-[700px] p-10 rounded-2xl shadow-lg backdrop-blur-md flex flex-col items-center z-20 relative">
          <img src={logo} alt="logo" className="w-[300px] mb-6" />
          <h1 className="text-4xl font-bold mb-10 text-cyan-300">튜토리얼</h1>

          <button
            onClick={handleStart}
            className="w-full bg-[#1fb8d6] hover:bg-[#33c7e6] text-black font-bold py-4 rounded transition mt-8 shadow-lg text-xl"
          >
            시작하기
          </button>
        </div>
      )}

      {started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50">

          {/* ⭐ 이미지 더 크게 (비율 유지) */}
          <img
            src={images[step]}
            alt="tutorial"
            className="w-[1000px] rounded-xl shadow-xl mb-10 pointer-events-none"
          />

          {/* ⭐ 스크립트 박스도 비례 확대 */}
          <button
            onClick={handleNext}
            className="relative z-50 w-[1040px] bg-white p-8 rounded-2xl shadow-xl text-black 
                       text-xl leading-relaxed hover:bg-gray-200 transition active:scale-95"
          >
            {scripts[step]}
            <div className="text-right text-base text-gray-500 mt-3">
              (클릭하여 계속하기)
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
