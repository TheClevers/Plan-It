import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./assets/Logo.png";
import { useLogin } from "./services/auth";

export default function Login() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const navigate = useNavigate();

  // useLogin 훅 사용
  const loginMutation = useLogin();

  const handleSubmit = async () => {
    if (id.trim() !== "" && pw.trim() !== "") {
      try {
        console.log("id", id);
        // 로그인 mutation 실행
        const result = await loginMutation.mutateAsync({
          username: id.trim(),
          password: pw.trim(),
        });

        // 로그인 성공 시 메인 페이지로 이동
        if (result.success) {
          navigate("/main");
        }
      } catch (error) {
        // 에러 처리 (이미 useLogin에서 처리되지만 필요시 추가 처리 가능)
        alert("로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } else {
      alert("아이디와 비밀번호를 입력해주세요.");
    }
  };

  return (
    <div className="w-full h-screen space-background flex items-center justify-center relative">
      {/* 로그인 카드 */}
      <div
        className="bg-[rgba(15,20,35,0.75)] text-white w-[360px] p-8 rounded-2xl 
                      shadow-[0_0_20px_rgba(0,200,255,0.15)]
                      backdrop-blur-md flex flex-col items-center"
      >
        {/* 로고 */}
        <img
          src={Logo}
          alt="logo"
          className="w-[240px] h-[240px] mb-6 select-none drop-shadow-[0_0_12px_rgba(80,200,255,0.5)]"
        />

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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
          className="border border-gray-500 px-3 py-2 w-full mb-6 rounded 
                     bg-[rgba(255,255,255,0.9)] text-black
                     focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />

        {/* 로그인 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={loginMutation.isPending}
          className="
            w-full 
            bg-[#1fb8d6]
            hover:bg-[#33c7e6]
            disabled:bg-gray-400
            disabled:cursor-not-allowed
            text-black 
            font-bold 
            py-2 
            rounded 
            transition 
            mb-2
            shadow-[0_0_4px_rgb(31,184,214)]
          "
        >
          {loginMutation.isPending ? "로그인 중..." : "Login"}
        </button>

        {/* 에러 메시지 표시 */}
        {loginMutation.isError && (
          <div className="text-red-400 text-sm mt-2">
            {loginMutation.error?.message || "로그인에 실패했습니다."}
          </div>
        )}

        {/* 회원가입 */}
        <button
          onClick={() => navigate("/sign-up")}
          className="mt-3 text-cyan-300 hover:text-cyan-200 text-sm transition"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
