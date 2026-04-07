import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import aiRoutes from './routes/ai.routes';
import adminRoutes from './routes/admin.routes';
import activityRoutes from './routes/activity.routes';
import { adminSupabase, setupDatabase } from './db/supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Khởi tạo Database
setupDatabase();

app.use(cors());
app.use(express.json());

// Load AI Endpoints
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activity', activityRoutes);

// Middleware Giám sát Oracle App Legacy
const legacyLogger = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Chỉ log các Endpoint thuộc về Legacy 
  // API lấy data cũ thường có dạng POST hoặc GET với query specific
  const excludedPath = ['/api/ai', '/api/admin', '/api/activity', '/api/health'];
  
  if (!excludedPath.some(p => req.path.startsWith(p))) {
    const actionType = req.path.replace('/', '').toUpperCase() || 'TRANG_CHU';
    try {
        await adminSupabase.from('crm_activity_logs').insert([{
            action_type: actionType,
            method: req.method,
            payload_data: req.method === 'POST' ? JSON.stringify(req.body) : JSON.stringify(req.query),
            user_id: 'admin_user',
            created_at: new Date().toISOString()
        }]);
        console.log(`[LOG DB] Đã ghi log: ${actionType}`);
    } catch {
        // Ignore error to avoid blocking the user
    }
  }
  next();
};

app.use(legacyLogger);

// Phục hồi lại các route cũ
try {
  const queryRoutes = require('./legacy/data/tra-thuong');
  app.use('/', queryRoutes);
  console.log("✅ Đã load legacy route: tra-thuong");
} catch (error: any) {
  console.log("⚠️ Bỏ qua legacy route do thiếu file cấu hình hoặc env:", error?.message || error);
}

// Routes hệ thống mới
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI-First CRM Backend is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
