//import { GoogleGenAI } from "@google/genai";

// API 키는 환경변수에서 가져옵니다
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

//const ai = new GoogleGenAI({ apiKey });

/**
 * 이미지 파일을 base64로 변환하는 함수
 * @param {File} file - 이미지 파일
 * @returns {Promise<{data: string, mimeType: string}>} base64 데이터와 MIME 타입
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // data:image/png;base64,xxxxx 형식에서 base64 부분만 추출
      const base64 = result.split(",")[1];
      const mimeType = result.split(";")[0].split(":")[1];
      resolve({ data: base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Gemini LLM을 사용하여 이미지를 생성하는 함수
 * @param {string} prompt - 이미지 생성 프롬프트
 * @param {File|null} exampleImage - 예시 이미지 파일 (선택사항)
 * @returns {Promise<string>} base64 인코딩된 이미지 데이터 URL
 */
export async function generateImage(prompt, exampleImage = null) {
  try {
    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정해주세요."
      );
      throw new Error("API 키가 설정되지 않았습니다.");
    }

    // contents 배열 구성
    const contentParts = [{ text: prompt }];

    // 예시 이미지가 있으면 추가
    if (exampleImage) {
      const imageData = await fileToBase64(exampleImage);
      contentParts.push({
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: contentParts,
    });

    // 응답에서 이미지 데이터 추출
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("이미지 생성 응답이 없습니다.");
    }

    const responseParts = candidates[0].content.parts;
    if (!responseParts || responseParts.length === 0) {
      throw new Error("이미지 데이터를 찾을 수 없습니다.");
    }

    // 이미지 데이터 찾기
    for (const part of responseParts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || "image/png";

        // base64 데이터를 data URL로 변환
        const dataUrl = `data:${mimeType};base64,${imageData}`;
        return dataUrl;
      }
    }

    throw new Error("이미지 데이터를 찾을 수 없습니다.");
  } catch (error) {
    console.error("Gemini 이미지 생성 중 오류 발생:", error);
    throw error;
  }
}
