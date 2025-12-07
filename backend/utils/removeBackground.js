import sharp from "sharp";

/**
 * base64 이미지의 검정색 배경을 투명하게 만드는 함수
 * @param {string} base64Data - base64 인코딩된 이미지 데이터
 * @param {string} mimeType - 이미지 MIME 타입 (예: "image/png")
 * @param {number} threshold - 검정색으로 간주할 임계값 (0-255, 기본값: 30)
 * @returns {Promise<{data: string, mimeType: string}>} 배경이 제거된 base64 데이터와 MIME 타입
 */
export async function removeBlackBackground(
  base64Data,
  mimeType = "image/png",
  threshold = 30
) {
  try {
    // base64를 Buffer로 변환
    const imageBuffer = Buffer.from(base64Data, "base64");

    // sharp로 이미지 로드 및 처리
    const image = sharp(imageBuffer);

    // 이미지 메타데이터 가져오기
    const metadata = await image.metadata();

    // 알파 채널을 보장하고 RGBA 형식으로 픽셀 데이터 가져오기
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 픽셀 데이터 조작
    const pixels = new Uint8Array(data);
    const width = info.width;
    const height = info.height;

    // 각 픽셀을 확인하고 검정색이면 투명하게 만들기
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // 검정색(또는 거의 검정색)인지 확인
      // RGB 값이 모두 threshold 이하이면 배경으로 간주
      if (r <= threshold && g <= threshold && b <= threshold) {
        // 알파 값을 0으로 설정 (투명)
        pixels[i + 3] = 0;
      }
    }

    // 처리된 픽셀 데이터로 새 이미지 생성
    const resultBuffer = await sharp(pixels, {
      raw: {
        width: width,
        height: height,
        channels: 4,
      },
    })
      .png() // 투명 배경을 위해 PNG로 저장
      .toBuffer();

    // Buffer를 base64로 변환
    const processedBase64 = resultBuffer.toString("base64");

    return {
      data: processedBase64,
      mimeType: "image/png", // 배경 제거 후에는 항상 PNG (투명 배경)
    };
  } catch (error) {
    console.error("배경 제거 중 오류 발생:", error);
    throw new Error(`배경 제거 실패: ${error.message}`);
  }
}
