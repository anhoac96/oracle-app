import Groq from "groq-sdk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model Groq miễn phí, rate limit cao: 30 req/phút, 14,400 req/ngày
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Bạn là Trợ lý AI thông minh của Oracle App - một hệ thống CRM hiện đại.
Bạn hỗ trợ người dùng phân tích dữ liệu, trả lời câu hỏi về nghiệp vụ CRM, và cung cấp các insights hữu ích.
Đặc biệt, bạn có khả năng viết mã SQL Oracle nếu người dùng yêu cầu dựa trên Database Schema được cung cấp trong context.
Quy tắc nghiệp vụ CSDL quan trọng cần nhớ:
- Các bảng có tiền tố "AGENT" là các bảng liên quan đến Cộng Tác Viên (CTV).
- Các bảng có chứa từ "CUSTOMER" mới là các bảng thực sự liên quan tới Khách hàng.
Hãy lựa chọn đúng bảng khi viết truy vấn SQL tùy thuộc vào việc người dùng hỏi về Khách hàng hay CTV.
Trả lời ngắn gọn, súc tích và bằng tiếng Việt. Nếu câu hỏi bằng tiếng Anh, hãy trả lời bằng tiếng Anh.`;

const schemaPath = path.join(__dirname, "schema.txt");
let fullSchema = "";
try {
  fullSchema = fs.readFileSync(schemaPath, "utf8");
} catch (e) {
  console.log("Could not load schema.txt");
}

function getRelevantSchema(message: string): string {
  if (!fullSchema) return "";
  
  const tableBlocks = fullSchema.split("\nTable: ");
  tableBlocks.shift(); // Remove the header
  
  // Loại bỏ các từ dừng tiếng Việt và từ quá phổ biến để không làm nhiễu kết quả
  const stopWords = new Set(["tôi", "là", "bảng", "của", "cho", "các", "có", "không", "những", "viết", "câu", "lệnh", "muốn", "nhầm", "thấy", "thông", "tin", "file", "mà", "này", "nhỉ", "đây", "rằng", "thì", "được", "với", "về", "trong", "xin", "hãy", "lấy", "các", "cái", "cho", "chỉ", "cần", "tìm"]);
  
  const lowerMsg = message.toLowerCase();
  let rawKeywords = lowerMsg.replace(/[^a-z0-9_áàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/g, ' ').split(/\s+/);
  
  const keywords = Array.from(new Set(rawKeywords))
                        .filter(w => w.length > 2 && !stopWords.has(w));
  
  if (keywords.length === 0) return "";

  // Kiểm tra xem user có đang hỏi về CTV không
  const wantsAgent = lowerMsg.includes("ctv") || lowerMsg.includes("cộng tác viên") || lowerMsg.includes("agent");

  const scoredBlocks = tableBlocks.map(block => {
    const lowerBlock = block.toLowerCase();
    let score = 0;
    const lines = lowerBlock.split("\n");
    const titleLine = lines[0] || "";

    // Nếu không nhắc tới CTV, loại trừ hoàn toàn các bảng có chữ AGENT
    if (!wantsAgent && titleLine.includes("agent")) {
      return { block, score: -100 };
    }

    keywords.forEach(kw => {
      if (titleLine.includes(kw)) score += 10;
      else if (lowerBlock.includes(kw)) score += 1;
    });

    return { block, score };
  });

  const relevantBlocks = scoredBlocks
    .filter(b => b.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(b => b.block);

  if (relevantBlocks.length > 0) {
    return "Phần Schema CSDL có thể liên quan nhất:\n\nTable: " + relevantBlocks.slice(0, 15).join("\nTable: ");
  }
  return "";
}

export async function askAssistant(message: string): Promise<string> {
  try {
    const relevantSchema = getRelevantSchema(message);
    const contextPrompt = relevantSchema 
      ? `${SYSTEM_PROMPT}\n\n${relevantSchema}` 
      : SYSTEM_PROMPT;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: contextPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content ?? "Xin lỗi, tôi không thể xử lý yêu cầu này.";

  } catch (error: any) {
    console.error("Groq API Error:", error.message);
    return `[Lỗi AI]: ${error.message}`;
  }
}


export async function analyzeSentiment(text: string) {
  try {
    const prompt = `Phân tích cảm xúc của câu sau, CHỈ trả về JSON (không có text khác):
"${text}"
Format: {"label": "positive" | "negative" | "neutral", "score": 0.0-1.0}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 100,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{.*\}/s);
    if (jsonMatch) {
      return [JSON.parse(jsonMatch[0])];
    }
    return [{ label: "neutral", score: 0.5 }];

  } catch (error) {
    return [{ label: "error", score: 0 }];
  }
}
