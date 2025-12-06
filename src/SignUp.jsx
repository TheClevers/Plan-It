import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./assets/Logo.png";

export default function SignUp() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    // API 연동 전이므로 내용만 채워져 있으면 바로 이동
    if (id.trim() !== "" && pw.trim() !== "" && confirmPw.trim() !== "") {
      if (pw !== confirmPw) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
      }
      // 나중에 API 연동할 예정이므로 지금은 바로 이동
      navigate("/tutorial");
    } else {
      alert("모든 항목을 입력해주세요.");
    }
  };

  return (
    <div className="w-full h-screen space-background flex items-center justify-center relative">
      {/* 회원가입 카드 */}
      <div className="bg-[rgba(15,20,35,0.75)] text-white w-[360px] p-8 rounded-2xl 
                      shadow-[0_0_20px_rgba(0,200,255,0.15)]
                      backdrop-blur-md flex flex-col items-center">
        {/* 로고 */}
        <img
          src={Logo}
          alt="logo"
          className="w-[240px] h-[240px] mb-6 select-none drop-shadow-[0_0_12px_rgba(80,200,255,0.5)]"
        />

        <h2 className="text-2xl font-bold mb-6 text-cyan-300">회원가입</h2>

        {/* 아이디 */}
        <input
          type="text"
          placeholder="Username"
          maxLength={10}
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="border border-gray-500 px-3 py-2 w-full mb-4 rounded 
                     bg-[rgba(255,255,255,0.9)] text-black
                     focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />

        {/* 비밀번호 */}
        <input
          type="password"
          placeholder="Password"
          maxLength={10}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="border border-gray-500 px-3 py-2 w-full mb-4 rounded 
                     bg-[rgba(255,255,255,0.9)] text-black
                     focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />

        {/* 비밀번호 확인 */}
        <input
          type="password"
          placeholder="Confirm Password"
          maxLength={10}
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          className="border border-gray-500 px-3 py-2 w-full mb-6 rounded 
                     bg-[rgba(255,255,255,0.9)] text-black
                     focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />

        {/* 회원가입 버튼 */}
        <button
          onClick={handleSubmit}
          className="
            w-full 
            bg-[#1fb8d6]
            hover:bg-[#33c7e6]
            text-black 
            font-bold 
            py-2 
            rounded 
            transition 
            mb-2
            shadow-[0_0_4px_rgb(31,184,214)]
          "
        >
          Sign Up
        </button>

        {/* 로그인으로 돌아가기 */}
        <button
          onClick={() => navigate("/login")}
          className="mt-3 text-cyan-300 hover:text-cyan-200 text-sm transition"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

