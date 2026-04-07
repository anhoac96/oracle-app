import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { syncCatalogTables } from '../authz/repository';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjukfuxkvpxedzwmoztz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_ANON_KEY trong file .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function setupDatabase() {
  try {
    const { error } = await adminSupabase.rpc('init_crm_activity_logs');
    if (error) {
      console.log('ℹ️ RPC init_crm_activity_logs chưa được thiết lập trên Supabase.');
    }
  } catch (e) {
    console.log('Supabase db check failed', e);
  }

  try {
    await syncCatalogTables();
  } catch {
    // Ignore when schema tables are not created yet.
  }
}
