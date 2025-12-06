import { useNavigate } from "react-router-dom";

export default function Tutorial() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen space-background flex items-center justify-center relative">
      <div className="bg-[rgba(15,20,35,0.75)] text-white w-[600px] p-8 rounded-2xl 
                      shadow-[0_0_20px_rgba(0,200,255,0.15)]
                      backdrop-blur-md flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-8 text-cyan-300">튜토리얼</h1>
        
        {/* 나중에 튜토리얼 내용을 여기에 추가할 예정 */}
        
        <button
          onClick={() => navigate("/main")}
          className="
            w-full 
            bg-[#1fb8d6]
            hover:bg-[#33c7e6]
            text-black 
            font-bold 
            py-3 
            rounded 
            transition 
            mt-8
            shadow-[0_0_4px_rgb(31,184,214)]
          "
        >
          시작하기
        </button>
      </div>
    </div>
  );
}

