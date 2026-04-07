import { Router, Request, Response, NextFunction } from 'express';
import { adminSupabase } from '../db/supabase';
import { deleteUserAccessTables, getUserAccess, listUsersWithAccess, syncCatalogTables, syncUserAccessTables } from '../authz/repository';
import { writeAdminAuditLog } from '../authz/audit';

const router = Router();

type AuthenticatedRequest = Request & {
  currentUser?: {
    id: string;
    email?: string;
    role: string;
    allowedCategories: string[];
    allowedTasks: string[];
  };
};

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Thiếu access token.' });
  }

  const { data, error } = await adminSupabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Token không hợp lệ.' });
  }

  const access = await getUserAccess(data.user);
  const role = access.role;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền thao tác.' });
  }

  req.currentUser = {
    id: data.user.id,
    email: data.user.email,
    role,
    allowedCategories: access.allowedCategories,
    allowedTasks: access.allowedTasks,
  };

  next();
}

router.get('/bootstrap-status', async (_req, res) => {
  try {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ hasUsers: (data?.users?.length || 0) > 0 });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể kiểm tra bootstrap.' });
  }
});

router.post('/bootstrap-admin', async (req, res) => {
  const { email, password, fullName } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu.' });
  }

  try {
    const { data: existingUsers, error: listError } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (listError) {
      return res.status(500).json({ error: listError.message });
    }

    if ((existingUsers?.users?.length || 0) > 0) {
      return res.status(409).json({ error: 'Hệ thống đã có user. Hãy đăng nhập bằng tài khoản admin.' });
    }

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || email,
        role: 'admin',
        allowed_categories: [],
        allowed_tasks: [],
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.user?.id && data.user?.email) {
      await syncUserAccessTables({
        userId: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || data.user.email,
        role: 'admin',
        allowedCategories: [],
        allowedTasks: [],
      });
    }

    await writeAdminAuditLog({
      actionType: 'BOOTSTRAP_ADMIN',
      targetUserId: data.user?.id,
      targetEmail: data.user?.email,
      payload: { role: 'admin' },
    });

    return res.status(201).json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        fullName: data.user?.user_metadata?.full_name,
        role: 'admin',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể tạo admin đầu tiên.' });
  }
});

router.get('/users', requireAdmin, async (_req, res) => {
  try {
    const users = await listUsersWithAccess();
    return res.json({ users });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể tải danh sách user.' });
  }
});

router.post('/sync-catalog', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const synced = await syncCatalogTables();
    await writeAdminAuditLog({
      actorUserId: req.currentUser?.id,
      actorEmail: req.currentUser?.email,
      actionType: 'SYNC_CATALOG',
      payload: { synced },
    });
    return res.json({ synced });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể đồng bộ catalog menu/task.' });
  }
});

router.get('/audit-logs', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await adminSupabase
      .from('admin_audit_logs')
      .select('id,actor_user_id,actor_email,action_type,target_user_id,target_email,payload_data,created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ logs: data || [] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể tải audit log.' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Thiếu access token.' });
  }

  const { data, error } = await adminSupabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Token không hợp lệ.' });
  }

  const access = await getUserAccess(data.user);
  return res.json({
    user: {
      id: access.userId,
      email: access.email,
      fullName: access.fullName,
      role: access.role,
      allowedCategories: access.allowedCategories,
      allowedTasks: access.allowedTasks,
      source: access.source,
    },
  });
});

router.post('/users', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { email, password, fullName, role, allowedCategories, allowedTasks } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu.' });
  }

  const normalizedRole = ['admin', 'operator', 'viewer'].includes(role) ? role : 'viewer';
  const normalizedCategories = Array.isArray(allowedCategories) ? allowedCategories : [];
  const normalizedTasks = Array.isArray(allowedTasks) ? allowedTasks : [];

  try {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || email,
        role: normalizedRole,
        allowed_categories: normalizedCategories,
        allowed_tasks: normalizedRole === 'admin' ? [] : normalizedTasks,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.user?.id && data.user?.email) {
      await syncUserAccessTables({
        userId: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || data.user.email,
        role: normalizedRole,
        allowedCategories: normalizedCategories,
        allowedTasks: normalizedTasks,
      });
    }

    await writeAdminAuditLog({
      actorUserId: req.currentUser?.id,
      actorEmail: req.currentUser?.email,
      actionType: 'CREATE_USER',
      targetUserId: data.user?.id,
      targetEmail: data.user?.email,
      payload: {
        role: normalizedRole,
        allowedCategories: normalizedCategories,
        allowedTasks: normalizedTasks,
      },
    });

    return res.status(201).json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        fullName: data.user?.user_metadata?.full_name,
        role: normalizedRole,
        allowedCategories: normalizedCategories,
        allowedTasks: normalizedRole === 'admin' ? [] : normalizedTasks,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể tạo user.' });
  }
});

router.patch('/users/:userId', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const userId = String(req.params.userId);
  const { fullName, role, allowedCategories, allowedTasks, password } = req.body || {};

  const normalizedRole = ['admin', 'operator', 'viewer'].includes(role) ? role : 'viewer';
  const normalizedCategories = Array.isArray(allowedCategories) ? allowedCategories : [];
  const normalizedTasks = Array.isArray(allowedTasks) ? allowedTasks : [];

  try {
    const payload: Record<string, any> = {
      user_metadata: {
        full_name: fullName || '',
        role: normalizedRole,
        allowed_categories: normalizedRole === 'admin' ? [] : normalizedCategories,
        allowed_tasks: normalizedRole === 'admin' ? [] : normalizedTasks,
      },
    };

    if (password) {
      payload.password = password;
    }

    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, payload);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.user?.id && data.user?.email) {
      await syncUserAccessTables({
        userId: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || data.user.email,
        role: normalizedRole,
        allowedCategories: normalizedCategories,
        allowedTasks: normalizedTasks,
      });
    }

    await writeAdminAuditLog({
      actorUserId: req.currentUser?.id,
      actorEmail: req.currentUser?.email,
      actionType: 'UPDATE_USER',
      targetUserId: data.user?.id,
      targetEmail: data.user?.email,
      payload: {
        role: normalizedRole,
        allowedCategories: normalizedCategories,
        allowedTasks: normalizedTasks,
        passwordChanged: Boolean(password),
      },
    });

    return res.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        fullName: data.user?.user_metadata?.full_name,
        role: normalizedRole,
        allowedCategories: normalizedRole === 'admin' ? [] : normalizedCategories,
        allowedTasks: normalizedRole === 'admin' ? [] : normalizedTasks,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể cập nhật user.' });
  }
});

router.post('/users/:userId/reset-password', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const userId = String(req.params.userId);
  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'Thiếu mật khẩu mới.' });
  }

  try {
    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, { password });
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await writeAdminAuditLog({
      actorUserId: req.currentUser?.id,
      actorEmail: req.currentUser?.email,
      actionType: 'RESET_PASSWORD',
      targetUserId: data.user?.id,
      targetEmail: data.user?.email,
    });

    return res.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      message: 'Đã đổi mật khẩu user.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể đổi mật khẩu user.' });
  }
});

router.delete('/users/:userId', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const userId = String(req.params.userId);

  if (req.currentUser?.id === userId) {
    return res.status(400).json({ error: 'Không thể tự xóa chính tài khoản admin đang đăng nhập.' });
  }

  try {
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await deleteUserAccessTables(userId);

    await writeAdminAuditLog({
      actorUserId: req.currentUser?.id,
      actorEmail: req.currentUser?.email,
      actionType: 'DELETE_USER',
      targetUserId: userId,
    });

    return res.json({ message: 'Đã xóa user.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể xóa user.' });
  }
});

export default router;
