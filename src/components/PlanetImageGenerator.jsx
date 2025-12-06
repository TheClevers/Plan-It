// src/components/PlanetImageGenerator.jsx
import { useState } from "react";
import { sendMessageToGeminiWithFixedImages } from "../services/gemini";

export default function PlanetImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim()) {
      alert("프롬프트를 입력해줘!");
      return;
    }

    try {
      setLoading(true);
      setAnswer("");
      const res = await sendMessageToGeminiWithFixedImages(prompt);
      setAnswer(res.text || "(응답 텍스트가 없습니다)");
    } catch (err) {
      console.error(err);
      alert("Gemini 호출 중 오류가 발생했어.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[480px] bg-[rgba(10,10,25,0.92)] border border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_25px_rgba(34,211,238,0.4)] text-white text-sm">
      <div className="font-semibold mb-2">Planet Image Prompt Tester</div>

      <textarea
        className="w-full h-20 text-black rounded mb-2 p-2 text-xs"
        placeholder="여기다가 '냥냥성 행성 이미지를 이렇게 만들어줘...' 같은 프롬프트를 적어줘"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="mb-2 text-[10px] text-gray-300"></div>

      <button
        onClick={handleSend}
        disabled={loading}
        className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-1 rounded mb-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Gemini에게 보내는 중..." : "Gemini에게 보내기"}
      </button>

      <div className="max-h-40 overflow-auto bg-black/40 rounded p-2 text-[11px] whitespace-pre-wrap">
        {answer || "여기에 Gemini 응답이 표시됩니다."}
      </div>
    </div>
  );
}
