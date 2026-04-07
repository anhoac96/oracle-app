import { adminSupabase } from '../db/supabase';
import { areAuthzTablesReady } from './repository';

export async function writeAdminAuditLog(input: {
  actorUserId?: string;
  actorEmail?: string;
  actionType: string;
  targetUserId?: string;
  targetEmail?: string;
  payload?: Record<string, unknown>;
}) {
  if (!(await areAuthzTablesReady())) {
    return false;
  }

  await adminSupabase.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId || null,
    actor_email: input.actorEmail || null,
    action_type: input.actionType,
    target_user_id: input.targetUserId || null,
    target_email: input.targetEmail || null,
    payload_data: input.payload || {},
  });

  return true;
}
