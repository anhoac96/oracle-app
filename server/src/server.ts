import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import aiRoutes from './routes/ai.routes';
import adminRoutes from './routes/admin.routes';
import activityRoutes from './routes/activity.routes';
import { adminSupabase, setupDatabase } from './db/supabase';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Khởi tạo Database
setupDatabase();

// ✅ [SECURITY] CORS chỉ cho phép các origin hợp lệ
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origin không được phép.'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' })); // ✅ Giới hạn request body

// ✅ [SECURITY] Rate Limiting tổng quát
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
});

// ✅ [SECURITY] Rate Limiting riêng cho AI endpoint (tốn tiền API)
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20, // chỉ 20 req/phút cho AI
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu đến AI. Vui lòng đợi 1 phút.' },
});

app.use(generalLimiter);


// Load AI Endpoints - áp dụng rate limit riêng cho AI (tốn tiền API)
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activity', activityRoutes);

// Middleware Giám sát Oracle App Legacy
const legacyLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Chỉ log các Endpoint thuộc về Legacy 
  const excludedPath = ['/api/ai', '/api/admin', '/api/activity', '/api/health'];
  
  if (!excludedPath.some(p => req.path.startsWith(p))) {
    const actionType = req.path.replace('/', '').toUpperCase() || 'TRANG_CHU';
    
    // Cố gắng trích xuất token người dùng nếu có từ Frontend gửi lên trong các header đặc biệt
    const authHeader = req.headers.authorization;
    const userId = authHeader ? 'authenticated_user' : 'anonymous';

    // Bất đồng bộ ghi log (Fire and forget) - Không dùng await để block request
    Promise.resolve().then(async () => {
      try {
          await adminSupabase.from('crm_activity_logs').insert([{
              action_type: actionType,
              method: req.method,
              payload_data: req.method === 'POST' ? JSON.stringify(req.body) : JSON.stringify(req.query),
              user_id: userId,
              created_at: new Date().toISOString()
          }]);
          console.log(`[LOG DB] Đã ghi log bất đồng bộ: ${actionType}`);
      } catch (err) {
          console.error(`[LOG DB ERR] Lỗi ghi log:`, err);
      }
    });
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
