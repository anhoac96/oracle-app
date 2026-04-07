import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
import { supabase } from "../db/supabase";

const execPromise = promisify(exec);
dotenv.config();

// Cấu hình OpenClaw Bridge
const OPENCLAW_BIN = "/home/anhnn/.npm-global/bin/openclaw";
const OPENCLAW_SESSION_ID = "db4bf10e-1776-4e23-8181-0427443bd653"; // Telegram Session
const WSL_DISTRO = process.env.WSL_DISTRO || "Ubuntu-24.04";

export async function askAssistant(message: string): Promise<string> {
  try {
    // 1. Ghi log hoạt động (Tùy chọn - OpenClaw cũng tự ghi log nếu bật)
    // 2. Gọi OpenClaw qua WSL CLI Bridge
    // Chúng ta escape nháy kép để tránh lỗi Shell
    const safeMessage = message.replace(/"/g, '\\"').replace(/\n/g, " ");
    
    const command = `wsl -d ${WSL_DISTRO} -u anhnn bash -c "${OPENCLAW_BIN} agent --session-id ${OPENCLAW_SESSION_ID} --message \\"${safeMessage}\\""`;
    
    console.log("Calling OpenClaw Bridge...");
    const { stdout, stderr } = await execPromise(command);

    if (stderr && !stdout) {
      console.error("OpenClaw Stderr:", stderr);
      return `[Lỗi OpenClaw]: ${stderr}`;
    }

    return stdout.trim();

  } catch (error: any) {
    console.error("Lỗi Bridge OpenClaw:", error.message);
    // Fallback sang Groq nếu OpenClaw/WSL không phản hồi
    return `[Lỗi Kết nối WSL/OpenClaw]: ${error.message}. Vui lòng đảm bảo WSL và OpenClaw đang chạy.`;
  }
}

export async function analyzeSentiment(text: string) {
  // Đối với phân tích cảm xúc, chúng ta vẫn có thể dùng OpenClaw 
  // hoặc giữ nguyên logic lightweight trước đó để đạt tốc độ cao.
  // Ở đây chúng ta sẽ dùng OpenClaw để đồng bộ hoàn toàn.
  try {
    const prompt = `Phân tích cảm xúc của câu sau (chỉ trả về JSON): "${text}"\\nFormat: {"label": "positive|negative|neutral", "score": 0.0-1.0}`;
    const safePrompt = prompt.replace(/"/g, '\\"');
    
    const command = `wsl -d ${WSL_DISTRO} -u anhnn bash -c "${OPENCLAW_BIN} agent --session-id ${OPENCLAW_SESSION_ID} --message \\"${safePrompt}\\""`;
    const { stdout } = await execPromise(command);
    
    // Tìm JSON trong output (OpenClaw có thể kèm text rác)
    const jsonMatch = stdout.match(/\{.*\}/);
    if (jsonMatch) {
      return [JSON.parse(jsonMatch[0])];
    }
    return [{ label: "neutral", score: 0.5 }];
  } catch (error) {
    return [{ label: "error", score: 0 }];
  }
}
