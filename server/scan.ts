// Business-card OCR/AI proxy — ported from Cardlogue's lib/clova.ts +
// lib/claude.ts. Moved server-side so the CLOVA secret and Claude API key
// never ship inside the app bundle (EXPO_PUBLIC_* vars are plaintext in the
// built JS, extractable from any installed APK). The app now sends the
// (already resized/compressed) image here instead of calling CLOVA/Claude
// directly — see server/routes.ts POST /api/scan/analyze.

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

export interface CardOCRResult {
  name: string;
  company: string;
  title: string;
  phone: string;
  company_phone: string;
  fax: string;
  email: string;
  address: string;
  country: string;
  tags: string[];
  memo: string;
  confidence: "high" | "low";
}

const EMPTY_RESULT: CardOCRResult = {
  name: "",
  company: "",
  title: "",
  phone: "",
  company_phone: "",
  fax: "",
  email: "",
  address: "",
  country: "",
  tags: [],
  memo: "",
  confidence: "low",
};

const COMMON_RULES = `
[name 규칙]
- 사람 이름만. 직책(대표이사·팀장·CEO 등)·회사명 절대 포함 금지
- 한국 이름: 한글 그대로 (성+이름 2~4글자)
- 영어 이름: First Last 형식
- 한글+영어 둘 다 있으면 한글 우선
- 가장 크게 표시된 사람 이름 선택

[phone 규칙]
- 휴대폰(010/011/016/017/018/019) 우선
- FAX·팩스는 fax 필드에 따로
- company_phone: 회사 대표번호/유선전화 (02-, 031- 등 지역번호로 시작)
- 라벨 제거: T. Tel. M. H.P. 전화: 핸드폰: 등
- 형식: 숫자와 하이픈만 (010-1234-5678)

[address 규칙]
- 주소 텍스트를 글자 하나도 빠짐없이 그대로 복사
- 시/도 + 구/군 + 동/로/길 + 번지 + 건물명 + 층/호 모두 포함
- 우편번호(숫자 5자리만 단독)는 제외
- 절대 생략·요약·추측 금지

[공통]
- company: 회사명 (주식회사·(주)·Inc. 포함)
- title: 직책/직위만
- email: @ 포함 이메일
- fax: FAX/팩스 번호
- company_phone: 회사 대표번호/유선전화
- confidence: name·phone 둘 다 성공 → "high", 하나라도 실패 → "low"
- 없는 정보는 ""
- 반드시 순수 JSON만 반환. 마크다운·코드블록·설명 절대 금지

예시:
{"name":"홍길동","company":"(주)카드로그","title":"대표이사","phone":"010-1234-5678","company_phone":"02-1234-5678","fax":"02-1234-5679","email":"test@cardlogue.com","address":"서울특별시 강남구 테헤란로 123 카드로그빌딩 5층 501호","confidence":"high"}`;

// 이미지 직접 분석용 (영어 명함 또는 CLOVA 실패 폴백)
const IMAGE_SYSTEM_PROMPT = `너는 명함 이미지에서 정보를 추출하는 전문가야.
이미지에 인쇄된 글자를 픽셀 단위로 정확하게 읽어야 해.
비슷하게 생긴 글자라도 이미지에 보이는 그대로 복사해야 한다. 임의로 교체 절대 금지.
${COMMON_RULES}`;

// 텍스트 구조화용 (CLOVA OCR 결과 → JSON 분류)
const TEXT_SYSTEM_PROMPT = `너는 명함에서 추출된 텍스트를 JSON으로 구조화하는 전문가야.
주어진 텍스트를 그대로 활용해서 각 필드에 정확히 분류해야 한다. 텍스트에 없는 내용은 절대 추가하지 마라.
${COMMON_RULES}`;

function stripJsonFence(raw: string): string {
  return raw.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
}

// CLOVA General OCR: extracts raw text from a base64 JPEG. Throws on both
// transport failure and CLOVA's own inferResult !== "SUCCESS" (quota
// exceeded, bad format, etc.) — the caller treats either as "fall back to
// Claude image analysis", but they're distinct failure modes worth logging
// differently from "success with genuinely no text on the card".
async function extractTextWithClova(imageBase64: string, lang: "ko" | "en"): Promise<string> {
  const requestId = Date.now().toString() + Math.random().toString(36).slice(2);
  const res = await fetch(requireEnv("CLOVA_OCR_URL"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OCR-SECRET": requireEnv("CLOVA_OCR_SECRET"),
    },
    body: JSON.stringify({
      version: "V2",
      requestId,
      timestamp: 0,
      lang,
      images: [{ format: "jpeg", name: "card", data: imageBase64 }],
    }),
  });
  if (!res.ok) throw new Error(`Clova OCR error (${res.status})`);

  const data: any = await res.json();
  const image = data?.images?.[0];
  if (!image || image.inferResult !== "SUCCESS") {
    throw new Error(`Clova OCR failed: ${image?.message ?? "unknown"}`);
  }

  const fields = image.fields ?? [];
  return fields.map((f: any) => f.inferText).filter(Boolean).join("\n");
}

async function callClaudeMessages(system: string, content: unknown): Promise<CardOCRResult | null> {
  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": requireEnv("CLAUDE_API_KEY"),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API error (${res.status})`);
    const data: any = await res.json();
    const raw = data.content?.[0]?.text ?? "";
    return JSON.parse(stripJsonFence(raw)) as CardOCRResult;
  } catch (err) {
    console.error("Claude call failed:", err);
    return null;
  }
}

function callClaudeImage(imageBase64: string, prompt: string): Promise<CardOCRResult | null> {
  return callClaudeMessages(IMAGE_SYSTEM_PROMPT, [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
    { type: "text", text: prompt },
  ]);
}

function structureTextWithHaiku(rawText: string): Promise<CardOCRResult | null> {
  return callClaudeMessages(
    TEXT_SYSTEM_PROMPT,
    `아래는 명함에서 추출한 텍스트야. 이 텍스트를 분석해서 JSON으로 구조화해줘.\n\n${rawText}`,
  );
}

function mergeResults(existing: CardOCRResult, result: CardOCRResult): CardOCRResult {
  return {
    name: existing.name || result.name,
    company: existing.company || result.company,
    title: existing.title || result.title,
    phone: existing.phone || result.phone,
    company_phone: existing.company_phone || result.company_phone,
    fax: existing.fax || result.fax,
    email: existing.email || result.email,
    address: existing.address || result.address,
    country: existing.country || result.country,
    tags: existing.tags?.length ? existing.tags : result.tags ?? [],
    memo: existing.memo || result.memo,
    confidence: existing.confidence,
  };
}

// Front-of-card scan: CLOVA OCR → Haiku text structuring, falling back to
// Haiku image analysis if CLOVA fails/returns nothing or Haiku's own
// structuring call fails.
async function scanFront(imageBase64: string, lang: "ko" | "en"): Promise<CardOCRResult> {
  try {
    const rawText = await extractTextWithClova(imageBase64, lang);
    if (rawText.trim()) {
      const result = await structureTextWithHaiku(rawText);
      if (result) return result;
    }
  } catch (err) {
    console.error("Clova OCR failed, falling back to Haiku image:", err);
  }

  const fallback = await callClaudeImage(
    imageBase64,
    "이 명함 이미지에서 정보를 추출해줘. 휴대폰 번호 우선, 주소는 완전하게.",
  );
  return fallback ?? EMPTY_RESULT;
}

// Back-of-card scan: same CLOVA→Haiku pipeline, but the prompt is told which
// fields are already filled (from the front) so it focuses on the rest, and
// the result is merged so front-side fields never get overwritten.
async function scanBack(imageBase64: string, lang: "ko" | "en", existing: CardOCRResult): Promise<CardOCRResult> {
  const emptyFields = Object.entries(existing)
    .filter(([k, v]) => k !== "confidence" && k !== "tags" && k !== "memo" && k !== "country" && (v === "" || v === null))
    .map(([k]) => k)
    .join(", ");

  try {
    const rawText = await extractTextWithClova(imageBase64, lang);
    if (rawText.trim()) {
      const result = await callClaudeMessages(
        TEXT_SYSTEM_PROMPT,
        `아래는 명함 뒷면에서 추출한 텍스트야. 앞면에서 이미 채워진 필드: ${JSON.stringify(existing)}. 비어있는 필드(${emptyFields || "없음"})를 채우는 데 집중해서 JSON으로 구조화해줘.\n\n${rawText}`,
      );
      if (result) return mergeResults(existing, result);
    }
  } catch (err) {
    console.error("Back-of-card Clova OCR failed, falling back to Haiku image:", err);
  }

  const fallback = await callClaudeImage(
    imageBase64,
    `이 명함 뒷면에서 정보를 추출해줘. 이미 채워진 필드: ${JSON.stringify(existing)}. 비어있는 필드만 채워줘.`,
  );
  return fallback ? mergeResults(existing, fallback) : existing;
}

export function analyzeBusinessCard(params: {
  imageBase64: string;
  lang?: "ko" | "en";
  existingFields?: Partial<CardOCRResult>;
}): Promise<CardOCRResult> {
  const lang = params.lang === "en" ? "en" : "ko";
  if (params.existingFields) {
    const existing: CardOCRResult = { ...EMPTY_RESULT, ...params.existingFields };
    return scanBack(params.imageBase64, lang, existing);
  }
  return scanFront(params.imageBase64, lang);
}
