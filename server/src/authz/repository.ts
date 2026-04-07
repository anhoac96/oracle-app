import { adminSupabase } from '../db/supabase';
import { LEGACY_MENU_CATALOG } from './catalog';

export type AccessProfile = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  allowedCategories: string[];
  allowedTasks: string[];
  source: 'tables' | 'metadata';
};

function metadataRole(user: any) {
  return user?.user_metadata?.role || 'viewer';
}

function metadataCategories(user: any) {
  return Array.isArray(user?.user_metadata?.allowed_categories) ? user.user_metadata.allowed_categories : [];
}

function metadataTasks(user: any) {
  return Array.isArray(user?.user_metadata?.allowed_tasks) ? user.user_metadata.allowed_tasks : [];
}

export async function areAuthzTablesReady() {
  const { error } = await adminSupabase.from('app_roles').select('code').limit(1);
  return !error;
}

export async function syncCatalogTables() {
  if (!(await areAuthzTablesReady())) {
    return false;
  }

  const categories = LEGACY_MENU_CATALOG.map((menu) => ({
    category_key: menu.name,
    display_name: menu.name,
  }));

  const tasks: Array<{ task_id: string; category_key: string; group_name: string | null; display_name: string }> = [];
  for (const menu of LEGACY_MENU_CATALOG) {
    for (const child of menu.children) {
      if ('children' in child && child.children) {
        for (const task of child.children) {
          tasks.push({
            task_id: task.id,
            category_key: menu.name,
            group_name: child.name,
            display_name: task.name,
          });
        }
      } else {
        const task = child as { id: string; name: string };
        tasks.push({
          task_id: task.id,
          category_key: menu.name,
          group_name: null,
          display_name: task.name,
        });
      }
    }
  }

  await adminSupabase.from('app_categories').upsert(categories, { onConflict: 'category_key' });
  await adminSupabase.from('app_tasks').upsert(tasks, { onConflict: 'task_id' });
  return true;
}

export async function syncUserAccessTables(input: {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  allowedCategories: string[];
  allowedTasks: string[];
}) {
  if (!(await areAuthzTablesReady())) {
    return false;
  }

  await syncCatalogTables();

  const normalizedCategories = input.role === 'admin' ? LEGACY_MENU_CATALOG.map((menu) => menu.name) : input.allowedCategories;
  const normalizedTasks =
    input.role === 'admin'
      ? LEGACY_MENU_CATALOG.flatMap((menu) =>
          menu.children.flatMap((child) => {
            if ('children' in child && child.children) {
              return child.children.map((task) => task.id);
            }
            return [(child as { id: string }).id];
          }),
        )
      : input.allowedTasks;

  await adminSupabase.from('app_user_profiles').upsert(
    {
      user_id: input.userId,
      email: input.email,
      full_name: input.fullName,
      role_code: input.role,
      is_active: true,
    },
    { onConflict: 'user_id' },
  );

  await adminSupabase.from('app_user_category_permissions').delete().eq('user_id', input.userId);
  if (normalizedCategories.length > 0) {
    await adminSupabase.from('app_user_category_permissions').insert(
      normalizedCategories.map((categoryKey) => ({
        user_id: input.userId,
        category_key: categoryKey,
      })),
    );
  }

  await adminSupabase.from('app_user_task_permissions').delete().eq('user_id', input.userId);
  if (normalizedTasks.length > 0) {
    await adminSupabase.from('app_user_task_permissions').insert(
      normalizedTasks.map((taskId) => ({
        user_id: input.userId,
        task_id: taskId,
      })),
    );
  }

  return true;
}

export async function deleteUserAccessTables(userId: string) {
  if (!(await areAuthzTablesReady())) {
    return false;
  }
  await adminSupabase.from('app_user_profiles').delete().eq('user_id', userId);
  return true;
}

export async function getUserAccess(user: any): Promise<AccessProfile> {
  const fallback: AccessProfile = {
    userId: user.id,
    email: user.email || '',
    fullName: user.user_metadata?.full_name || user.email || '',
    role: metadataRole(user),
    allowedCategories: metadataCategories(user),
    allowedTasks: metadataTasks(user),
    source: 'metadata',
  };

  if (!(await areAuthzTablesReady())) {
    return fallback;
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from('app_user_profiles')
    .select('user_id,email,full_name,role_code')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return fallback;
  }

  const [{ data: categoryRows }, { data: taskRows }] = await Promise.all([
    adminSupabase.from('app_user_category_permissions').select('category_key').eq('user_id', user.id),
    adminSupabase.from('app_user_task_permissions').select('task_id').eq('user_id', user.id),
  ]);

  return {
    userId: user.id,
    email: profile.email || user.email || '',
    fullName: profile.full_name || profile.email || user.email || '',
    role: profile.role_code || 'viewer',
    allowedCategories: (categoryRows || []).map((row: { category_key: string }) => row.category_key),
    allowedTasks: (taskRows || []).map((row: { task_id: string }) => row.task_id),
    source: 'tables',
  };
}

export async function listUsersWithAccess() {
  const { data, error } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw new Error(error.message);
  }

  const users = await Promise.all((data?.users || []).map((user) => getUserAccess(user)));
  return users;
}
