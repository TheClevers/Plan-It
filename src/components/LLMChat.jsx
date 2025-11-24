import { useState } from "react";
//import { sendMessageToGemini } from "../services/gemini";

export default function LLMChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setResponse("");

    try {
      const result = await sendMessageToGemini(message);
      setResponse(result || "응답을 받을 수 없습니다.");
    } catch (error) {
      setResponse(`오류 발생: ${error.message}`);
    } finally {
      setIsLoading(false);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating 버튼 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#4a90e2] hover:bg-[#357abd] text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
          aria-label="LLM 채팅 열기"
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* 채팅 창 */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-[#1a1a2e] rounded-lg shadow-2xl border border-[#16213e] flex flex-col z-50">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-[#16213e]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-white font-semibold text-sm">LLM 연결됨</h3>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setMessage("");
                setResponse("");
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

          {/* 응답 출력 영역 */}
          <div className="flex-1 overflow-y-auto p-4">
            {response ? (
              <div className="text-white text-sm whitespace-pre-wrap break-words">
                {response}
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-[#4a90e2] rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-[#4a90e2] rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-[#4a90e2] rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                ) : (
                  "메시지를 입력하세요"
                )}
              </div>
            )}
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-[#16213e]">
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지 입력..."
                disabled={isLoading}
                className="flex-1 bg-[#16213e] text-white placeholder-gray-400 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4a90e2] disabled:opacity-50"
                rows="2"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                className="bg-[#4a90e2] hover:bg-[#357abd] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
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
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
