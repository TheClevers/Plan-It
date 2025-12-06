import { useState } from "react";
import { createPortal } from "react-dom";
import { sendMessageToGemini } from "../services/gemini";
import { generateImage } from "../services/geminiImage";

// 기본 프롬프트 - 코드에서 명확하게 보이도록 구조화
const DEFAULT_TEXT_PROMPT = "안녕";
const DEFAULT_IMAGE_PROMPT = "사과 이미지 만들어줘";

export function NewPlanetModal({
  isOpen,
  name,
  description,
  onChangeName,
  onChangeDescription,
  onClose,
  onSubmit,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsLoading(true);

    try {
      // 두 종류의 LLM 호출
      const [textResponse, imageResponse] = await Promise.all([
        sendMessageToGemini(DEFAULT_TEXT_PROMPT),
        // generateImage(DEFAULT_IMAGE_PROMPT),
      ]);

      console.log("텍스트 응답:", textResponse);
      console.log("이미지 응답:", imageResponse);

      // 기존 onSubmit 호출
      onSubmit();
    } catch (error) {
      console.error("LLM 호출 중 오류 발생:", error);
      // 오류가 발생해도 기존 onSubmit은 실행
      onSubmit();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999]">
      <div className="bg-[#0f1624] border border-cyan-500/30 p-6 rounded-2xl shadow-2xl w-96">
        <h3 className="text-cyan-300 font-semibold mb-4">새 행성 만들기</h3>

        {/* 행성 이름 */}
        <input
          type="text"
          placeholder="행성 이름"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full p-2 mb-3 rounded-lg bg-[#0a0f1a] text-cyan-100 border border-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          autoFocus
        />

        {/* 행성 설명 */}
        <textarea
          placeholder="행성 설명 (선택)"
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          className="w-full p-2 h-24 mb-4 rounded-lg bg-[#0a0f1a] text-cyan-100 border border-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-red-500/30 text-red-300 rounded-lg hover:bg-red-500/40 transition"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "처리 중..." : "추가"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
