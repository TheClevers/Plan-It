import { useState, useRef } from "react";
//import { generateImage } from "../services/geminiImage";

export default function ImageGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("사과");
  const [exampleImage, setExampleImage] = useState(null);
  const [exampleImagePreview, setExampleImagePreview] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 선택할 수 있습니다.");
        return;
      }
      setExampleImage(file);
      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setExampleImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleRemoveExampleImage = () => {
    setExampleImage(null);
    setExampleImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageDataUrl = await generateImage(prompt, exampleImage);
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
        <div className="fixed bottom-6 right-28 w-96 bg-[#1a1a2e] rounded-lg shadow-2xl border border-[#16213e] flex flex-col z-50 max-h-[600px]">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-[#16213e]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <h3 className="text-white font-semibold text-sm">이미지 생성</h3>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setPrompt("사과");
                setExampleImage(null);
                setExampleImagePreview(null);
                setGeneratedImage(null);
                setError(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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

          {/* 프롬프트 입력 영역 */}
          <div className="p-4 border-b border-[#16213e] space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="이미지 설명 입력 (예: 사과)"
                disabled={isLoading}
                className="flex-1 bg-[#16213e] text-white placeholder-gray-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9b59b6] disabled:opacity-50"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isLoading}
                className="bg-[#9b59b6] hover:bg-[#8e44ad] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors text-sm font-medium"
              >
                {isLoading ? (
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
                ) : (
                  "생성"
                )}
              </button>
            </div>

            {/* 예시 이미지 선택 */}
            <div className="space-y-2">
              <label className="block text-xs text-gray-400">
                예시 이미지 (선택사항)
              </label>
              {exampleImagePreview ? (
                <div className="relative">
                  <img
                    src={exampleImagePreview}
                    alt="Example preview"
                    className="w-full max-h-32 object-contain rounded bg-[#16213e] p-2"
                  />
                  <button
                    onClick={handleRemoveExampleImage}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    aria-label="이미지 제거"
                  >
                    ×
                  </button>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {exampleImage.name}
                  </p>
                </div>
              ) : (
                <label className="block">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={isLoading}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-[#16213e] rounded px-4 py-3 text-center cursor-pointer hover:border-[#9b59b6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mx-auto text-gray-400 mb-1"
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
                    <span className="text-xs text-gray-400">
                      이미지 파일 선택
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* 이미지 표시 영역 */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center min-h-[300px]">
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
                <p className="text-gray-400 text-sm">이미지를 생성하는 중...</p>
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
      )}
    </>
  );
}
