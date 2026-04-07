import { Router } from "express";
import { askAssistant, analyzeSentiment } from "../ai/agent";
import { adminSupabase } from "../db/supabase";

const router = Router();

router.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  const reply = await askAssistant(message);
  res.json({ reply });
});

router.post("/sentiment", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing text to analyze" });
  }

  const result = await analyzeSentiment(text);
  res.json({ result });
});

router.get("/metrics", async (req, res) => {
  try {
    const { count: totalActions } = await adminSupabase.from('crm_activity_logs').select('*', { count: 'exact', head: true });
    
    // Đếm các loại thao tác phổ biến nhất để vẽ biểu đồ
    const { data: popularActions } = await adminSupabase.from('crm_activity_logs').select('action_type').limit(100);
    
    let chartData:any = {};
    if (popularActions) {
      popularActions.forEach((l: any) => {
         chartData[l.action_type] = (chartData[l.action_type] || 0) + 1;
      });
    }

    const metricsArr = Object.entries(chartData).map(([name, value]) => ({ name, value })).sort((a:any, b:any) => b.value - a.value).slice(0, 5);

    res.json({
      metrics: [
        { title: "Tổng thao tác ghi nhận", value: totalActions || 0, trend: "+12%" },
        { title: "Tương tác Phổ biến", value: metricsArr[0]?.name || "N/A", trend: "Hot" }
      ],
      chartData: metricsArr
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
