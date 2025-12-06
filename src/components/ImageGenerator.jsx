import { useState } from "react";
import { generateImage } from "../services/geminiImage";

// App.jsx에서 사용하는 레퍼런스 이미지들
import ref1 from "../assets/reference/planet_ref1.png";
import ref2 from "../assets/reference/planet_ref2.png";
import ref3 from "../assets/reference/planet_ref3.png";
import ref4 from "../assets/reference/planet_ref4.png";
import ref5 from "../assets/reference/planet_ref5.png";
import ref6 from "../assets/reference/planet_ref6.png";
import ref7 from "../assets/reference/planet_ref7.png";
import ref8 from "../assets/reference/planet_ref8.png";

// 기본 설정값 - 코드에서 명확하게 보이도록 구조화
const DEFAULT_PROMPT = "냥냥성 행성 이미지를 이렇게 만들어줘";
const DEFAULT_SELECTED_IMAGES = [
  ref1,
  ref2,
  ref3,
  ref4,
  ref5,
  ref6,
  ref7,
  ref8,
]; // 모든 이미지 기본 선택

// 레퍼런스 이미지 배열
const REFERENCE_IMAGES = [
  { id: 1, src: ref1, label: "Reference 1" },
  { id: 2, src: ref2, label: "Reference 2" },
  { id: 3, src: ref3, label: "Reference 3" },
  { id: 4, src: ref4, label: "Reference 4" },
  { id: 5, src: ref5, label: "Reference 5" },
  { id: 6, src: ref6, label: "Reference 6" },
  { id: 7, src: ref7, label: "Reference 7" },
  { id: 8, src: ref8, label: "Reference 8" },
];

// URL을 File로 변환하는 헬퍼 함수
async function urlToFile(url, filename) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

export default function ImageGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [selectedImages, setSelectedImages] = useState(DEFAULT_SELECTED_IMAGES);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageToggle = (imageSrc) => {
    setSelectedImages((prev) => {
      if (prev.includes(imageSrc)) {
        return prev.filter((src) => src !== imageSrc);
      } else {
        return [...prev, imageSrc];
      }
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // 선택된 이미지 URL들을 File로 변환
      const imageFiles = await Promise.all(
        selectedImages.map((url, idx) => urlToFile(url, `ref${idx + 1}.png`))
      );

      const imageDataUrl = await generateImage(prompt, imageFiles);
      setGeneratedImage(imageDataUrl);
    } catch (err) {
      setError(err.message || "이미지 생성에 실패했습니다.");
      console.error("이미지 생성 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Floating 버튼 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-28 w-14 h-14 bg-[#9b59b6] hover:bg-[#8e44ad] text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
          aria-label="이미지 생성 열기"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      )}

      {/* 이미지 생성 창 */}
      {isOpen && (
        <div className="fixed inset-4 z-50 bg-[#1a1a2e] rounded-lg shadow-2xl border border-[#16213e] flex flex-col max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-[#16213e]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <h3 className="text-white font-semibold text-xl">이미지 생성</h3>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setPrompt(DEFAULT_PROMPT);
                setSelectedImages(DEFAULT_SELECTED_IMAGES);
                setGeneratedImage(null);
                setError(null);
              }}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-6 p-6 overflow-hidden">
            {/* 프롬프트 입력 영역 */}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                프롬프트 입력
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={DEFAULT_PROMPT}
                disabled={isLoading}
                className="w-full h-32 bg-[#16213e] text-white placeholder-gray-400 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9b59b6] disabled:opacity-50 resize-none"
              />
            </div>

            {/* 예시 이미지 선택 영역 */}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                예시 이미지 선택 ({selectedImages.length}개 선택됨)
              </label>
              <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto p-3 bg-[#16213e] rounded-lg">
                {REFERENCE_IMAGES.map((img) => {
                  const isSelected = selectedImages.includes(img.src);
                  return (
                    <div
                      key={img.id}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                        isSelected
                          ? "border-[#9b59b6] shadow-[0_0_10px_rgba(155,89,182,0.6)]"
                          : "border-gray-600 opacity-60 hover:opacity-80"
                      }`}
                      onClick={() => handleImageToggle(img.src)}
                    >
                      <img
                        src={img.src}
                        alt={img.label}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-[#9b59b6] rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            ✓
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 생성 버튼 */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
              className="w-full bg-[#9b59b6] hover:bg-[#8e44ad] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors text-sm font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>이미지 생성 중...</span>
                </div>
              ) : (
                "이미지 생성"
              )}
            </button>

            {/* 이미지 표시 영역 */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center bg-[#16213e] rounded-lg p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-[#9b59b6] rounded-full animate-bounce"></div>
                    <div
                      className="w-3 h-3 bg-[#9b59b6] rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-3 h-3 bg-[#9b59b6] rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    이미지를 생성하는 중...
                  </p>
                </div>
              ) : error ? (
                <div className="text-red-400 text-sm text-center p-4">
                  <p>오류: {error}</p>
                </div>
              ) : generatedImage ? (
                <div className="w-full flex flex-col items-center gap-4">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="max-w-full max-h-[400px] rounded-lg shadow-lg object-contain"
                  />
                  <button
                    onClick={handleDownload}
                    className="bg-[#9b59b6] hover:bg-[#8e44ad] text-white px-4 py-2 rounded transition-colors text-sm font-medium"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 inline mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    다운로드
                  </button>
                </div>
              ) : (
                <div className="text-gray-500 text-sm text-center">
                  프롬프트를 입력하고 생성 버튼을 눌러주세요
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
