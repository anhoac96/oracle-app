import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.OPENCLAW_BOT_TOKEN;
const CHAT_ID = '1203310936'; // Lấy từ session ID đã tìm thấy

export async function sendTelegramMessage(message: string) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("Thiếu BOT_TOKEN hoặc CHAT_ID để gửi Telegram");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log("[TELEGRAM] Đã gửi thông báo thành công");
  } catch (error: any) {
    console.error("[TELEGRAM ERROR]", error.message);
  }
}
