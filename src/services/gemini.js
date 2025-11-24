//import { GoogleGenAI } from "@google/genai";

// API 키는 환경변수에서 가져옵니다
// .env 파일에 GEMINI_API_KEY=your_api_key_here 형식으로 설정하세요
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

//const ai = new GoogleGenAI({ apiKey });

/**
 * Gemini LLM에 메시지를 보내고 응답을 받는 함수
 * @param {string} message - LLM에 보낼 메시지
 * @returns {Promise<string>} LLM의 응답 텍스트
 */
export async function sendMessageToGemini(message) {
  try {
    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정해주세요."
      );
      return null;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: message,
    });

    const responseText = response.text;
    return responseText;
  } catch (error) {
    console.error("Gemini API 호출 중 오류 발생:", error);
    throw error;
  }
}
