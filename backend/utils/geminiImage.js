import { GoogleGenAI } from "@google/genai";

/**
 * 환경 변수에서 API 키를 가져오는 함수
 * @returns {string|null} API 키 또는 null
 */
function getApiKey() {
  return process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || null;
}

/**
 * Gemini LLM에 메시지를 보내고 응답을 받는 함수
 * @param {string} message - LLM에 보낼 메시지
 * @returns {Promise<string>} LLM의 응답 텍스트
 */
export async function sendMessageToGemini(message) {
  try {
    const apiKey = getApiKey();

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY 또는 GEMINI_API_KEY를 설정해주세요."
      );
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });

    // contents는 배열 형태로 전달
    const contentParts = [{ text: message }];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: contentParts,
    });

    // 응답에서 텍스트 추출
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("Gemini 응답이 없습니다.");
    }

    const responseParts = candidates[0].content.parts;
    if (!responseParts || responseParts.length === 0) {
      throw new Error("응답 텍스트를 찾을 수 없습니다.");
    }

    // 텍스트 데이터 찾기
    for (const part of responseParts) {
      if (part.text) {
        return part.text;
      }
    }

    // response.text가 있다면 사용 (fallback)
    if (response.text) {
      return response.text;
    }

    throw new Error("응답 텍스트를 찾을 수 없습니다.");
  } catch (error) {
    console.error("Gemini API 호출 중 오류 발생:", error);
    throw error;
  }
}

/**
 * 행성 이름을 기반으로 이미지 생성 프롬프트를 만드는 함수
 * @param {string} planetName - 행성 이름
 * @returns {string} 프롬프트 문자열
 */
export function buildPlanetPrompt(planetName) {
  return `
Generate a 2D, outlineless, casual cel-shaded planet illustration with a vibrant style.
The planet's theme is defined by a keyword (e.g., "Cleaning Planet", "Study Planet").
The keyword is: "${planetName}".

Arrange elements relevant to the keyword directly on the planet's surface to reflect the theme.
Ensure a solid #000000 (pure black) background.

Absolutely no outlines, watermarks, alphabets, or any kind of language text/letters are allowed in the generated image.
Avoid realistic facial features on creature/pet planets; use stylized, deformed features only.
Do not generate in 3D style.
`.trim();
}

/**
 * Gemini LLM을 사용하여 이미지를 생성하는 함수
 * @param {string} prompt - 이미지 생성 프롬프트
 * @returns {Promise<{data: string, mimeType: string}>} base64 데이터와 MIME 타입
 */
export async function generatePlanetImage(prompt) {
  try {
    // 함수 호출 시점에 API 키를 가져옵니다 (dotenv가 이미 로드된 후)
    const apiKey = getApiKey();

    // 디버깅: 환경 변수 확인
    console.log("환경 변수 확인:");
    console.log(
      "VITE_GEMINI_API_KEY:",
      process.env.VITE_GEMINI_API_KEY ? "설정됨" : "없음"
    );
    console.log(
      "GEMINI_API_KEY:",
      process.env.GEMINI_API_KEY ? "설정됨" : "없음"
    );

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY 또는 GEMINI_API_KEY를 설정해주세요."
      );
      throw new Error("API 키가 설정되지 않았습니다.");
    }

    // AI 클라이언트 초기화
    const ai = new GoogleGenAI({ apiKey });

    // contents 배열 구성
    const contentParts = [{ text: prompt }];

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

        return { data: imageData, mimeType };
      }
    }

    throw new Error("이미지 데이터를 찾을 수 없습니다.");
  } catch (error) {
    console.error("Gemini 이미지 생성 중 오류 발생:", error);
    throw error;
  }
}

/**
 * Gemini로 이미지를 생성하고 검정색 배경을 투명하게 만드는 함수
 * @param {string} prompt - 이미지 생성 프롬프트
 * @returns {Promise<{data: string, mimeType: string}>} 배경이 제거된 base64 데이터와 MIME 타입
 */
export async function generatePlanetImageWithTransparentBackground(prompt) {
  try {
    // 먼저 이미지 생성
    const imageResult = await generatePlanetImage(prompt);

    // 검정색 배경 제거
    const { removeBlackBackground } = await import("./removeBackground.js");
    const processedImage = await removeBlackBackground(
      imageResult.data,
      imageResult.mimeType
    );

    console.log("✅ 검정색 배경 제거 완료");
    return processedImage;
  } catch (error) {
    console.error("이미지 생성 및 배경 제거 중 오류 발생:", error);
    throw error;
  }
}

/**
 * 행성 정보 생성을 위한 프롬프트를 만드는 함수
 * @param {string} planetName - 행성 이름
 * @param {string|null} description - 행성 설명 (선택사항)
 * @returns {string} 프롬프트 문자열
 */
export function buildPlanetInfoPrompt(planetName, description = null) {
  let prompt = `"${planetName}"라는 이름의 행성에 대한 정보를 생성해주세요.\n\n`;

  if (description) {
    prompt += `추가 컨텍스트: ${description}\n\n`;
  }

  prompt += `다음 JSON 형식으로 정보를 제공해주세요:
{
  "industry": "[키워드와 관련된 주요 산업 4개 이상을 쉼표로 구분하여 나열하세요. 현실적이거나 유머러스하게 과장된 내용도 좋습니다.]",
  "introduction": "[행성의 이름과 주민 종족의 이름을 포함하여 행성을 소개하세요. 행성의 특성과 목표를 200자 이내로 매력적으로 설명하세요.]"
}

모든 응답은 반드시 한국어로 작성해주세요. JSON 객체만 반환하고, 추가 텍스트나 마크다운 형식은 사용하지 마세요.`;

  return prompt;
}

/**
 * Gemini를 사용하여 행성 정보를 생성하는 함수
 * @param {string} planetName - 행성 이름
 * @param {string|null} description - 행성 설명 (선택사항)
 * @returns {Promise<{industry: string, introduction: string}>} 행성 정보 객체
 */
export async function generatePlanetInfo(planetName, description = null) {
  try {
    const prompt = buildPlanetInfoPrompt(planetName, description);
    const responseText = await sendMessageToGemini(prompt);

    if (!responseText) {
      throw new Error("Gemini 응답이 없습니다.");
    }

    // JSON 파싱 시도 (마크다운 코드 블록 제거)
    let jsonText = responseText.trim();

    // 마크다운 코드 블록 제거
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    // JSON 파싱
    const planetInfo = JSON.parse(jsonText);

    // 필수 필드 확인
    if (!planetInfo.industry || !planetInfo.introduction) {
      throw new Error("Gemini 응답에 필수 필드가 없습니다.");
    }

    return {
      industry: planetInfo.industry,
      introduction: planetInfo.introduction,
    };
  } catch (error) {
    console.error("행성 정보 생성 중 오류 발생:", error);
    throw error;
  }
}
