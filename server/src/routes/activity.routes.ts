import { Router } from 'express';
import type { User } from '@supabase/supabase-js';
import { adminSupabase } from '../db/supabase';
import { getUserAccess } from '../authz/repository';

const router = Router();

type ActivityPayload = {
  actionType?: string;
  method?: string;
  payload?: Record<string, unknown>;
};

async function getAuthenticatedUser(authHeader?: string): Promise<User | null> {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return null;
  }

  const { data, error } = await adminSupabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

router.post('/log', async (req, res) => {
  const user = await getAuthenticatedUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Token không hợp lệ.' });
  }

  const { actionType, method, payload }: ActivityPayload = req.body || {};
  if (!actionType) {
    return res.status(400).json({ error: 'Thiếu actionType.' });
  }

  try {
    const access = await getUserAccess(user);
    const logPayload = {
      user_id: access.userId,
      user_email: access.email,
      user_role: access.role,
      source: 'react_client',
      ...payload,
    };

    const { error } = await adminSupabase.from('crm_activity_logs').insert({
      action_type: actionType,
      method: method || 'CLIENT',
      payload_data: logPayload,
      user_id: access.userId,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể ghi activity log.' });
  }
});

export default router;
