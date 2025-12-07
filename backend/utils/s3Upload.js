import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * test.png 파일을 S3에 업로드하고 CDN URL을 반환합니다.
 * @param {string} planetId - 행성 ID (파일명에 사용)
 * @returns {Promise<string>} 업로드된 파일의 CDN URL
 */
export async function uploadTestImageToS3(planetId) {
  try {
    // 환경 변수 검증
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    const bucket = process.env.S3_BUCKET;
    const cdnDomain = process.env.CDN_DOMAIN;

    if (!accessKeyId || !secretAccessKey || !region || !bucket || !cdnDomain) {
      const missing = [];
      if (!accessKeyId) missing.push("AWS_ACCESS_KEY_ID");
      if (!secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");
      if (!region) missing.push("AWS_REGION");
      if (!bucket) missing.push("S3_BUCKET");
      if (!cdnDomain) missing.push("CDN_DOMAIN");
      throw new Error(
        `필수 환경 변수가 설정되지 않았습니다: ${missing.join(", ")}`
      );
    }

    // S3 클라이언트 초기화 (함수 내부에서)
    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    // test.png 파일 경로
    const imagePath = join(__dirname, "../test.png");

    // 파일 읽기
    const fileBuffer = readFileSync(imagePath);

    // S3에 업로드할 파일명 생성 (행성 ID를 포함하여 고유하게)
    const fileName = `planets/${planetId}.png`;

    // S3 업로드 명령 생성
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: fileBuffer,
      ContentType: "image/png",
    });

    // S3에 업로드
    await s3Client.send(command);

    // CDN URL 생성
    const cdnUrl = cdnDomain.endsWith("/")
      ? `${cdnDomain}${fileName}`
      : `${cdnDomain}/${fileName}`;

    return cdnUrl;
  } catch (error) {
    console.error("S3 업로드 실패:", error);
    throw new Error(`S3 업로드 실패: ${error.message}`);
  }
}
