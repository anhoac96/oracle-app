import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import http from "http";

dotenv.config();
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), "src", ".env") });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const ACTIVE_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const CODEX_MODEL = process.env.OPENAI_CODEX_MODEL || "gpt-5.3-codex";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

export type AiProvider = "auto" | "gemini" | "groq" | "codex" | "openrouter" | "ollama";


const SYSTEM_PROMPT = `Vai trò:
Bạn là một chuyên gia phân tích dữ liệu Oracle SQL cao cấp, có kinh nghiệm dày dặn trong việc truy vấn hệ thống quản lý khách hàng và giao dịch vé số (Vietlott/SMS).

Nhiệm vụ của bạn là:
1. Đọc yêu cầu nghiệp vụ do tôi đưa ra.
2. Tự suy luận xem cần dùng bảng nào, cột nào, và quan hệ join nào dựa trên schema được cung cấp trong context.
3. Giải thích ngắn logic suy luận trước khi viết SQL:
   - Thực thể chính là gì.
   - Cần lọc theo điều kiện nào.
   - Thông tin đó nằm ở bảng nào.
   - Khóa join dự kiến là gì (Bắt buộc phải check lại các key match của các bảng xem có thực sự tồn tại trong Schema không).
4. [QUAN TRỌNG NHẤT - KIỂM TRA CHÉO CỘT]: TRƯỚC KHI SELECT HOẶC JOIN BẤT KỲ CỘT NÀO, bạn BẮT BUỘC phải đọc nguyên văn schema của bảng đó. Nếu tên cột KHÔNG CÓ trong schema được cung cấp, bạn TUYỆT ĐỐI KHÔNG ĐƯỢC DÙNG. Đừng bao giờ tự suy diễn (ví dụ: đừng đoán là "customer_name" mà không check xem schema có phải ghi là "full_name" hay "name" không). Việc bịa (hallucinate) tên cột sẽ làm dỡ hệ thống sản xuất NOC!
5. Nếu có nhiều khả năng do tên cột hoặc trạng thái chưa chắc chắn, hãy:
   - Nêu giả định về ID_TYPE, STATUS_CODE, hoặc CHANNEL_ID (ví dụ: 1 = App, 2 = SMS).
   - Đưa ra 01 câu SQL chính (theo giả định phổ biến nhất).
   - Đưa thêm 01 câu SQL thay thế nếu cần.
6. Ưu tiên các bài toán liên quan tới:
   - Khách hàng (bảng "customer_account" là bảng chính).
   - Nơi đăng ký, nơi nhận thưởng.
   - Kênh đăng ký (App/Web/SMS), tài khoản liên kết (Bank/E-wallet).
   - Lượng vé, tên Game, kênh bán vé (khi truy vấn vé thì bảng "ticket" là bảng chính).
   - Các bảng có tiền tố "AGENT" liên quan đến Cộng Tác Viên (CTV).

Nguyên tắc tối ưu hóa hiệu suất:
- Sử dụng cú pháp Oracle chuyên sâu (như TO_DATE, NVL, DECODE).
- Sử dụng Alias (tên thay thế) cho bảng.
- LUÔN LUÔN đi kèm ĐIỀU KIỆN LỌC THỜI GIAN (nếu truy vấn liên quan giao dịch/vé) để tránh treo DB.

Kết quả trả về theo đúng thứ tự sau:
1. Phân tích logic suy luận: Mô tả ngắn gọn cách xử lý, thực thể, điều kiện.
2. Bảng/cột sẽ dùng: Danh sách chi tiết khóa join và bảng tham gia.
3. Câu lệnh SQL hoàn chỉnh: Định dạng trong khối code (chuẩn Oracle SQL).
4. Các giả định cần lưu ý: Các trạng thái hoặc điều kiện cần kiểm chứng lại ở thực tế dữ liệu.`;

const schemaPath = path.join(__dirname, "schema.txt");
let fullSchema = "";
try {
  fullSchema = fs.readFileSync(schemaPath, "utf8");
} catch {
  console.log("Could not load schema.txt");
}

function getRelevantSchema(message: string): string {
  if (!fullSchema) return "";

  const tableBlocks = fullSchema.split("\nTable: ");
  tableBlocks.shift();

  const stopWords = new Set([
    "tôi", "là", "bảng", "của", "cho", "các", "có", "không", "những", "viết", "câu", "lệnh",
    "muốn", "nhầm", "thấy", "thông", "tin", "file", "mà", "này", "nhỉ", "đây", "rằng", "thì",
    "được", "với", "về", "trong", "xin", "hãy", "lấy", "cái", "chỉ", "cần", "tìm",
  ]);

  const lowerMsg = message.toLowerCase();
  const rawKeywords = lowerMsg
    .replace(/[^a-z0-9_áàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/g, " ")
    .split(/\s+/);

  const keywords = Array.from(new Set(rawKeywords)).filter((word) => word.length > 2 && !stopWords.has(word));
  if (keywords.length === 0) return "";

  const wantsAgent = lowerMsg.includes("ctv") || lowerMsg.includes("cộng tác viên") || lowerMsg.includes("agent");

  const scoredBlocks = tableBlocks.map((block) => {
    const lowerBlock = block.toLowerCase();
    const lines = lowerBlock.split("\n");
    const titleLine = lines[0] || "";
    let score = 0;

    if (!wantsAgent && titleLine.includes("agent")) {
      return { block, score: -100 };
    }

    keywords.forEach((kw) => {
      if (titleLine.includes(kw)) score += 10;
      else if (lowerBlock.includes(kw)) score += 1;
    });

    return { block, score };
  });

  const relevantBlocks = scoredBlocks
    .filter((block) => block.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((block) => block.block);

  if (relevantBlocks.length === 0) {
    return "";
  }

  return `Phần Schema CSDL có thể liên quan nhất:\n\nTable: ${relevantBlocks.slice(0, 15).join("\nTable: ")}`;
}

async function runGemini(prompt: string) {
  if (!genAI) {
    throw new Error("Thiếu GEMINI_API_KEY trong cấu hình server.");
  }

  const model = genAI.getGenerativeModel({ model: ACTIVE_MODEL });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return {
    reply: response.text() || "Xin lỗi, tôi không thể xử lý yêu cầu này.",
    provider: "gemini" as const,
    model: ACTIVE_MODEL,
  };
}

async function runGroq(prompt: string) {
  if (!groq) {
    throw new Error("Thiếu GROQ_API_KEY trong cấu hình server.");
  }

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 1400,
  });

  return {
    reply: completion.choices[0]?.message?.content || "Xin lỗi, tôi không thể xử lý yêu cầu này.",
    provider: "groq" as const,
    model: GROQ_MODEL,
  };
}

async function runCodex(prompt: string) {
  if (!openai) {
    throw new Error("Thiếu OPENAI_API_KEY trong cấu hình server.");
  }

  const response = await openai.responses.create({
    model: CODEX_MODEL,
    input: prompt,
  });

  return {
    reply: response.output_text || "Xin lỗi, tôi không thể xử lý yêu cầu này.",
    provider: "codex" as const,
    model: CODEX_MODEL,
  };
}

async function runOpenRouter(prompt: string) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Thiếu OPENROUTER_API_KEY trong cấu hình server.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "Oracle App CRM",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1400,
    }),
  });

  const data = await response.json() as any;
  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `OpenRouter request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return {
    reply: data?.choices?.[0]?.message?.content || "Xin lỗi, tôi không thể xử lý yêu cầu này.",
    provider: "openrouter" as const,
    model: OPENROUTER_MODEL,
  };
}

// ✅ Ollama - chạy LOCAL trên máy tính, miễn phí, không cần internet
async function runOllama(prompt: string) {
  // Fix lỗi NodeJS IPv6: Thay localhost thành 127.0.0.1
  const host = OLLAMA_HOST.replace("localhost", "127.0.0.1");

  const response = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
    }),
    signal: AbortSignal.timeout(300000), // timeout 5 phút (nếu máy chạy chậm)
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  if (!data?.response) {
    throw new Error("Ollama không trả về kết quả.");
  }

  return {
    reply: data.response as string,
    provider: "ollama" as const,
    model: OLLAMA_MODEL,
  };
}

// Kiểm tra Ollama có đang chạy không
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const host = OLLAMA_HOST.replace("localhost", "127.0.0.1");
    const res = await fetch(`${host}/api/version`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function askAssistant(message: string, preferredProvider: AiProvider = "auto"): Promise<{ reply: string; provider: "gemini" | "groq" | "codex" | "openrouter" | "ollama"; model: string }> {
  const relevantSchema = getRelevantSchema(message);
  const prompt = [
    SYSTEM_PROMPT,
    relevantSchema,
    `Yêu cầu người dùng:\n${message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const tryAutoFlow = async () => {
    if (groq) {
      try {
        return await runGroq(prompt);
      } catch {
        // thử provider tiếp theo
      }
    }

    if (genAI) {
      try {
        return await runGemini(prompt);
      } catch (error: any) {
        const errorMessage = String(error?.message || "");
        const allowFallback =
          errorMessage.includes("429") ||
          errorMessage.includes("quota") ||
          errorMessage.includes("Too Many Requests") ||
          errorMessage.includes("rate limit");

        if (!allowFallback) {
          throw error;
        }
      }
    }

    if (openai) {
      try {
        return await runCodex(prompt);
      } catch {
        // fallback tiếp xuống OpenRouter/Groq
      }
    }

    if (OPENROUTER_API_KEY) {
      try {
        return await runOpenRouter(prompt);
      } catch {
        // fallback cuoi xuong Ollama local
      }
    }

    // ✅ Ollama - fallback cuối cùng, miễn phí, không cần internet
    if (await isOllamaAvailable()) {
      try {
        return await runOllama(prompt);
      } catch {
        // Ollama cũng lỗi
      }
    }

    if (groq) {
      return runGroq(prompt);
    }

    if (genAI) {
      return runGemini(prompt);
    }

    if (openai) {
      return runCodex(prompt);
    }

    if (OPENROUTER_API_KEY) {
      return runOpenRouter(prompt);
    }

    // Last resort: Ollama
    if (await isOllamaAvailable()) {
      return runOllama(prompt);
    }

    throw new Error("Chưa có provider AI nào được cấu hình hợp lệ.");
  };

  try {
    if (preferredProvider === "gemini") {
      return await runGemini(prompt);
    }

    if (preferredProvider === "codex") {
      return await runCodex(prompt);
    }

    if (preferredProvider === "groq") {
      return await runGroq(prompt);
    }

    if (preferredProvider === "openrouter") {
      return await runOpenRouter(prompt);
    }

    // ✅ Chọn thẺᮣng Ollama local
    if (preferredProvider === "ollama") {
      return await runOllama(prompt);
    }

    return await tryAutoFlow();
  } catch (error: any) {
    console.error("AI Provider Error:", error.message);
    return {
      reply: `[Lỗi AI]: ${error.message}`,
      provider:
        preferredProvider === "codex"
          ? "codex"
          : preferredProvider === "groq"
            ? "groq"
            : preferredProvider === "openrouter"
              ? "openrouter"
              : preferredProvider === "ollama"
                ? "ollama"
                : "gemini",
      model:
        preferredProvider === "codex"
          ? CODEX_MODEL
          : preferredProvider === "groq"
            ? GROQ_MODEL
            : preferredProvider === "openrouter"
              ? OPENROUTER_MODEL
              : preferredProvider === "ollama"
                ? OLLAMA_MODEL
                : ACTIVE_MODEL,
    };
  }
}

export async function analyzeSentiment(text: string) {
  try {
    const prompt = `Phân tích cảm xúc của câu sau, CHỈ trả về JSON (không có text khác):
"${text}"
Format: {"label": "positive" | "negative" | "neutral", "score": 0.0-1.0}`;

    const result = await askAssistant(prompt, "auto");
    const content = result.reply;
    const jsonMatch = content.match(/\{.*\}/s);
    if (jsonMatch) {
      return [JSON.parse(jsonMatch[0])];
    }
    return [{ label: "neutral", score: 0.5 }];
  } catch {
    return [{ label: "error", score: 0 }];
  }
}
