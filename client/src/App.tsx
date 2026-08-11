import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { supabase } from './lib/supabase';

type Role = 'admin' | 'operator' | 'viewer';
type LegacyTask = { id: string; name: string };
type LegacyMenuGroup = { name: string; children?: LegacyTask[]; id?: string };
type LegacyMenu = { id: string; name: string; children: Array<LegacyMenuGroup | LegacyTask> };
type AppUser = { id: string; email: string; fullName: string; role: Role; allowedCategories: string[]; allowedTasks: string[]; source?: 'tables' | 'metadata' };
type AuditLog = { id: string; actor_email?: string; action_type: string; target_email?: string; created_at: string };

const API_BASE = 'http://localhost:5001/api';

const LEGACY_MENUS: LegacyMenu[] = [
  { id: 'reward_withdraw', name: 'Trúng/Trả thưởng-Rút tiền', children: [
    { name: 'Lập lệnh', children: [{ id: 'script_laplenhlandau', name: 'Lệnh trả thưởng' }, { id: 'script_ruttien', name: 'Lệnh rút tiền' }] },
    { name: 'Trả thưởng', children: [{ id: 'checkerror', name: 'Nguyên nhân trả thưởng lỗi' }, { id: 'checkcommand', name: 'Tra cứu mã lập lệnh trả thưởng' }, { id: 'script_chia535', name: 'Thống kê tổng tiền trả thưởng' }, { id: 'script_chiviettelpay', name: 'Check trả thưởng ViettelPay trạng thái WAIT_DISB' }] },
    { name: 'Rút tiền', children: [{ id: 'checkwithdraw', name: 'Nguyên nhân lỗi rút tiền' }, { id: 'withdrawrq', name: 'Check trạng thái rút tiền' }, { id: 'exportwithdraw', name: 'Xuất danh sách rút tiền' }] },
    { name: 'Trúng thưởng', children: [{ id: 'checkReward', name: 'Tra cứu trúng thưởng' }, { id: 'script_trungthuong', name: 'Check file trúng thưởng' }, { id: 'script_mttrathuong', name: 'Thống kê MT trúng thưởng' }, { id: 'script_mttrungthuong535', name: 'Check MT trúng thưởng game 535' }] },
  ]},
  { id: 'hmdt_hmbh', name: 'HMDT-HMBH', children: [{ id: 'checkhmdt', name: 'Xuất danh sách HMDT' }, { id: 'checkhmdtblock', name: 'Check block HMDT' }, { id: 'script_hmbh', name: 'HMBH' }, { id: 'checkpayreward', name: 'Check tăng HMBH' }] },
  { id: 'doisoat', name: 'Đối soát', children: [{ id: 'dsvnpay', name: 'Đối soát VNPAY' }, { id: 'script_dsmomo', name: 'Đối soát MOMO' }, { id: 'script_dsvtelpay', name: 'Đối soát ViettelPay' }, { id: 'script_dszalopay', name: 'Đối soát ZaloPay' }] },
  { id: 'jackpot', name: 'Kết quả Jackpot', children: [{ id: 'script_jackpot', name: 'Jackpot ước tính' }, { id: 'script_jackpotkq', name: 'Jackpot kết quả' }, { id: 'inforwinner', name: 'Thông tin khách hàng trúng Jackpot' }] },
  { id: 'thongke', name: 'Tra soát - Thống kê', children: [{ id: 'payment', name: 'Kênh thanh toán mua vé' }, { id: 'script_cycle', name: 'Thống kê cấu hình kỳ quay' }, { id: 'script_tamhoa', name: 'Thống kê tam hoa ngày T-1' }, { id: 'script_checkpdc_drc', name: 'Check hệ thống sau khi chuyển PDC-DRC' }, { id: 'checksms', name: 'Tra cứu SMS của khách hàng' }, { id: 'checkrole', name: 'Check phân quyền tài khoản web admin' }, { id: 'dsvnpay3site', name: 'Check trạng thái vé VNPAY' }] },
];

const getRole = (session: Session | null): Role => {
  const role = session?.user?.user_metadata?.role;
  return role === 'admin' || role === 'operator' || role === 'viewer' ? role : 'viewer';
};

const getAllowedCategories = (session: Session | null) => Array.isArray(session?.user?.user_metadata?.allowed_categories) ? session?.user?.user_metadata?.allowed_categories : [];
const getAllowedTasks = (session: Session | null) => Array.isArray(session?.user?.user_metadata?.allowed_tasks) ? session?.user?.user_metadata?.allowed_tasks : [];

import { AiChatPanel } from './components/chat/AiChatPanel';
import { AuthScreen } from './components/auth/AuthScreen';
import { DashboardStats } from './components/dashboard/DashboardStats';
import { DashboardChart } from './components/dashboard/DashboardChart';
import { LegacyIframe } from './components/legacy/LegacyIframe';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeCategoryName, setActiveCategoryName] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [bootstrapFullName, setBootstrapFullName] = useState('');
  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ role: string; text: string }>>([{ role: 'ai', text: 'Chào bạn! Tôi là Trợ lý AI phân tích Oracle SQL. Tôi đã sẵn sàng hỗ trợ bạn!' }]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiProviderLabel, setAiProviderLabel] = useState('Model mặc định: Gemini 2.5 Pro');
  const [aiProviderMode, setAiProviderMode] = useState<'auto' | 'gemini' | 'groq' | 'codex' | 'openrouter' | 'ollama'>('auto');
  const [dynamicMetrics, setDynamicMetrics] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSection, setSettingsSection] = useState<'users' | 'audit' | 'system'>('users');
  const [userSettingsSection, setUserSettingsSection] = useState<'none' | 'create' | 'list'>('none');
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'viewer' as Role, allowedCategories: [] as string[], allowedTasks: [] as string[] });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [resetPasswordByUserId, setResetPasswordByUserId] = useState<Record<string, string>>({});
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastLoggedViewRef = useRef<string>('');
  const lastSessionUserRef = useRef<string>('');
  const pendingTaskIdRef = useRef<string | null>(null);
  const iframeInitializedRef = useRef(false); // Iframe chỉ load 1 lần duy nhất

  const role = currentUser?.role || getRole(session);
  const allowedCategories = currentUser?.allowedCategories || getAllowedCategories(session);
  const allowedTasks = currentUser?.allowedTasks || getAllowedTasks(session);
  const canManageUsers = role === 'admin';
  const visibleMenus = useMemo(() => {
    if (role === 'admin') return LEGACY_MENUS;

    const filterTaskList = (tasks: LegacyTask[]) => tasks.filter(task => allowedTasks.includes(task.id));

    return LEGACY_MENUS.map(menu => {
      const mappedChildren = menu.children.map((child) => {
        if ('children' in child && child.children) {
          const filteredChildren = filterTaskList(child.children);
          return filteredChildren.length > 0 ? { ...child, children: filteredChildren } : null;
        }
        return allowedTasks.includes((child as LegacyTask).id) ? child : null;
      }).filter(Boolean) as Array<LegacyMenuGroup | LegacyTask>;

      const categoryAllowed = allowedCategories.includes(menu.name);
      if (categoryAllowed && mappedChildren.length === 0) {
        return menu;
      }

      if (mappedChildren.length > 0) {
        return { ...menu, children: mappedChildren };
      }

      return categoryAllowed ? menu : null;
    }).filter(Boolean) as LegacyMenu[];
  }, [role, allowedCategories, allowedTasks]);
  const currentMenu = visibleMenus.find(m => m.name === activeCategoryName);

  useEffect(() => {
    fetch(`${API_BASE}/admin/bootstrap-status`).then(r => r.json()).then(data => setHasUsers(Boolean(data.hasUsers))).catch(() => setHasUsers(true)).finally(() => setBootstrapLoading(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setAuthLoading(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);

      if (!nextSession) {
        setCurrentUser(null);
        setActiveTab('dashboard');
        setActiveCategoryName('');
        setActiveTaskId(null);
        lastLoggedViewRef.current = '';
        lastSessionUserRef.current = '';
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!session) return;
      try {
        const res = await fetch(`${API_BASE}/admin/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể tải quyền hiện tại.');
        setCurrentUser(data.user);
      } catch {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email || '',
          role: getRole(session),
          allowedCategories: getAllowedCategories(session),
          allowedTasks: getAllowedTasks(session),
          source: 'metadata',
        });
      }
    };

    void loadCurrentUser();
  }, [session]);

  useEffect(() => {
    if (activeTab === 'dashboard' && session) {
      fetch(`${API_BASE}/ai/metrics`).then(r => r.json()).then(setDynamicMetrics).catch(err => console.error('Lỗi lấy metrics', err));
    }
  }, [activeTab, session]);

  const logInteraction = async (actionType: string, payload: Record<string, unknown> = {}) => {
    if (!session?.access_token) return;

    try {
      await fetch(`${API_BASE}/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          actionType,
          method: 'CLIENT',
          payload,
        }),
      });
    } catch {
      // Không block trải nghiệm người dùng nếu ghi log lỗi.
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    if (lastSessionUserRef.current === session.user.id) return;

    lastSessionUserRef.current = session.user.id;
    void logInteraction('LOGIN_SUCCESS', {
      email: session.user.email || '',
    });
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const viewKey = [activeTab, activeCategoryName || '-', activeTaskId || '-'].join('|');
    if (lastLoggedViewRef.current === viewKey) return;
    lastLoggedViewRef.current = viewKey;

    void logInteraction('VIEW_CHANGE', {
      activeTab,
      activeCategoryName,
      activeTaskId,
    });
  }, [activeTab, activeCategoryName, activeTaskId, session]);

  const loadAdminUsers = async () => {
    if (!session) return;
    setAdminLoading(true);
    setSettingsError('');
    try {
      const res = await fetch(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tải user.');
      setAdminUsers(data.users || []);
    } catch (error: any) {
      setSettingsError(error.message || 'Không thể tải user.');
    } finally {
      setAdminLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    if (!session) return;
    try {
      const res = await fetch(`${API_BASE}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tải audit log.');
      setAuditLogs(data.logs || []);
    } catch {
      setAuditLogs([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings' && canManageUsers && session) {
      void loadAdminUsers();
      void loadAuditLogs();
    }
  }, [activeTab, canManageUsers, session]);

  const handleLogin = async () => {
    setAuthError(''); setAuthMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) return setAuthError(error.message);
    setLoginPassword(''); setAuthMessage('Đăng nhập thành công.');
  };

  const handleGithubLogin = async () => {
    setAuthError('');
    setAuthMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleBootstrapAdmin = async () => {
    setAuthError(''); setAuthMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/bootstrap-admin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: bootstrapFullName, email: bootstrapEmail, password: bootstrapPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tạo admin đầu tiên.');
      setHasUsers(true); setAuthMessage('Đã tạo admin đầu tiên. Bạn hãy đăng nhập bằng tài khoản vừa tạo.'); setLoginEmail(bootstrapEmail); setBootstrapPassword('');
    } catch (error: any) {
      setAuthError(error.message || 'Không thể tạo admin đầu tiên.');
    }
  };

  const handleLogout = async () => {
    await logInteraction('LOGOUT', {
      email: session?.user?.email || '',
    });
    await supabase.auth.signOut();
  };
  const handleNavigateLegacy = (categoryName: string) => {
    setActiveTab('legacy');
    setActiveCategoryName(categoryName);
    setActiveTaskId(null);
    setIframeReady(false);
    pendingTaskIdRef.current = null;
    void logInteraction('OPEN_CATEGORY', { categoryName });
  };
  const handleRunTask = (taskId: string) => {
    setActiveTaskId(taskId);
    void logInteraction('OPEN_TASK', {
      categoryName: activeCategoryName,
      taskId,
    });
    pendingTaskIdRef.current = taskId;
    setIframeReady(false);
    // Nếu iframe đã load rồi → gửi message ngay, không cần chờ
    if (iframeInitializedRef.current && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'RUN_TASK', taskId }, '*');
      setTimeout(() => setIframeReady(true), 200);
    }
    // Nếu chưa load → onLoad sẽ xử lý
  };

  const handleSendMessage = async () => {
    if (!msg.trim()) return;
    const message = msg;
    setChatLog(prev => [...prev, { role: 'user', text: message }]); setMsg(''); setLoading(true);
    void logInteraction('AI_CHAT_MESSAGE', { messageLength: message.length });
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, provider: aiProviderMode }) });
      const data = await res.json();
      if (data.provider && data.model) {
        const providerName = data.provider === 'gemini' ? 'Gemini' : data.provider === 'codex' ? 'Codex' : data.provider === 'openrouter' ? 'OpenRouter' : data.provider === 'ollama' ? '🦙 Ollama (Local)' : 'Groq';
        setAiProviderLabel(`Đang dùng ${providerName}: ${data.model}`);
      }
      setChatLog(prev => [...prev, { role: 'ai', text: data.reply || 'Lỗi phản hồi' }]);
    } catch {
      setChatLog(prev => [...prev, { role: 'ai', text: 'Lỗi kết nối AI Server' }]);
    }
    setLoading(false);
  };

  const toggleCategoryPermission = (categoryName: string) => setNewUser(prev => ({ ...prev, allowedCategories: prev.allowedCategories.includes(categoryName) ? prev.allowedCategories.filter(item => item !== categoryName) : [...prev.allowedCategories, categoryName] }));
  const toggleTaskPermission = (taskId: string) => setNewUser(prev => ({ ...prev, allowedTasks: prev.allowedTasks.includes(taskId) ? prev.allowedTasks.filter(item => item !== taskId) : [...prev.allowedTasks, taskId] }));
  const handleRoleChange = (nextRole: Role) => setNewUser(prev => ({ ...prev, role: nextRole, allowedCategories: nextRole === 'admin' ? [] : prev.allowedCategories, allowedTasks: nextRole === 'admin' ? [] : prev.allowedTasks }));

  const startEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setNewUser({
      fullName: user.fullName || '',
      email: user.email,
      password: '',
      role: user.role,
      allowedCategories: user.allowedCategories || [],
      allowedTasks: user.allowedTasks || [],
    });
    setSettingsMessage('');
    setSettingsError('');
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setNewUser({ fullName: '', email: '', password: '', role: 'viewer', allowedCategories: [], allowedTasks: [] });
  };

  const handleCreateUser = async () => {
    if (!session) return;
    setSettingsError(''); setSettingsMessage('');
    try {
      const url = editingUserId ? `${API_BASE}/admin/users/${editingUserId}` : `${API_BASE}/admin/users`;
      const method = editingUserId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ...newUser, allowedCategories: newUser.role === 'admin' ? [] : newUser.allowedCategories, allowedTasks: newUser.role === 'admin' ? [] : newUser.allowedTasks }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể lưu user.');
      setSettingsMessage(editingUserId ? `Đã cập nhật user ${data.user?.email || newUser.email}` : `Đã tạo user ${data.user?.email || newUser.email}`);
      resetUserForm();
      await loadAdminUsers();
      await loadAuditLogs();
    } catch (error: any) {
      setSettingsError(error.message || 'Không thể lưu user.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!session) return;
    setSettingsError('');
    setSettingsMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể xóa user.');
      setSettingsMessage('Đã xóa user.');
      if (editingUserId === userId) resetUserForm();
      await loadAdminUsers();
      await loadAuditLogs();
    } catch (error: any) {
      setSettingsError(error.message || 'Không thể xóa user.');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!session) return;
    const password = resetPasswordByUserId[userId];
    if (!password) {
      setSettingsError('Nhập mật khẩu mới trước khi reset.');
      return;
    }
    setSettingsError('');
    setSettingsMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể reset mật khẩu.');
      setSettingsMessage(`Đã reset mật khẩu cho ${data.user?.email || 'user'}.`);
      setResetPasswordByUserId(prev => ({ ...prev, [userId]: '' }));
      await loadAuditLogs();
    } catch (error: any) {
      setSettingsError(error.message || 'Không thể reset mật khẩu.');
    }
  };

  const handleSyncCatalog = async () => {
    if (!session) return;
    setSettingsError('');
    setSettingsMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/sync-catalog`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể đồng bộ catalog.');
      setSettingsMessage(data.synced ? 'Đã đồng bộ catalog menu/task vào bảng Supabase.' : 'Schema bảng chưa sẵn sàng, đang dùng metadata fallback.');
      await loadAuditLogs();
    } catch (error: any) {
      setSettingsError(error.message || 'Không thể đồng bộ catalog.');
    }
  };

  if (bootstrapLoading || authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Card className="w-full max-w-md shadow-xl border-white/60"><CardHeader><CardTitle>Đang tải hệ thống</CardTitle><CardDescription>Kiểm tra trạng thái đăng nhập và cấu hình Supabase...</CardDescription></CardHeader></Card></div>;

  if (!session) return (
    <AuthScreen 
      hasUsers={hasUsers}
      handleBootstrapAdmin={handleBootstrapAdmin}
      handleLogin={handleLogin}
      handleGithubLogin={handleGithubLogin}
      bootstrapState={{ fullName: bootstrapFullName, setFullName: setBootstrapFullName, email: bootstrapEmail, setEmail: setBootstrapEmail, password: bootstrapPassword, setPassword: setBootstrapPassword }}
      loginState={{ email: loginEmail, setEmail: setLoginEmail, password: loginPassword, setPassword: setLoginPassword }}
      authError={authError}
      authMessage={authMessage}
    />
  );

  return (
    <div className="flex min-h-screen w-full bg-slate-100">
      <Sidebar activeTab={activeTab} activeCategoryName={activeCategoryName} setActiveTab={setActiveTab} onNavigateLegacy={handleNavigateLegacy} legacyMenus={visibleMenus.map(menu => ({ id: menu.id, name: menu.name }))} canManageUsers={canManageUsers} onLogout={handleLogout} />
      <div className="flex flex-col flex-1 h-screen overflow-y-auto bg-slate-100">
        <Header userEmail={session.user.email} userRole={role} />
        <main className="flex-1 p-6">
          {activeTab === 'dashboard' && <>
            <DashboardStats dynamicMetrics={dynamicMetrics} role={role} visibleMenusCount={visibleMenus.length} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6 mb-6">
              <DashboardChart dynamicMetrics={dynamicMetrics} />
              <div className="col-span-3"><AiChatPanel chatLog={chatLog} msg={msg} loading={loading} setMsg={setMsg} onSend={handleSendMessage} providerLabel={aiProviderLabel} providerMode={aiProviderMode} setProviderMode={(value) => setAiProviderMode(value as 'auto' | 'gemini' | 'groq' | 'codex' | 'openrouter' | 'ollama')} /></div>
            </div>
          </>}

          {activeTab === 'ai_chat' && <AiChatPanel chatLog={chatLog} msg={msg} loading={loading} setMsg={setMsg} onSend={handleSendMessage} providerLabel={aiProviderLabel} providerMode={aiProviderMode} setProviderMode={(value) => setAiProviderMode(value as 'auto' | 'gemini' | 'groq' | 'codex' | 'openrouter' | 'ollama')} fullPage />}

          {activeTab === 'settings' && canManageUsers && <div className="mb-8 grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
              <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-white/60 rounded-2xl xl:sticky xl:top-24 h-fit"><CardHeader><CardTitle className="text-lg text-slate-800">Nhóm cài đặt</CardTitle><CardDescription>Chọn khu vực bạn muốn thao tác.</CardDescription></CardHeader><CardContent className="space-y-2"><button onClick={() => { setSettingsSection('users'); setUserSettingsSection('none'); }} className={`w-full rounded-xl border px-4 py-3 text-left transition ${settingsSection === 'users' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><p className="font-semibold">User</p><p className="text-xs text-slate-500">Tạo, sửa, xóa và phân quyền</p></button><button onClick={() => setSettingsSection('audit')} className={`w-full rounded-xl border px-4 py-3 text-left transition ${settingsSection === 'audit' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><p className="font-semibold">Audit log</p><p className="text-xs text-slate-500">Xem lịch sử quản trị</p></button><button onClick={() => setSettingsSection('system')} className={`w-full rounded-xl border px-4 py-3 text-left transition ${settingsSection === 'system' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><p className="font-semibold">Hệ thống</p><p className="text-xs text-slate-500">Đồng bộ catalog và trạng thái quyền</p></button></CardContent></Card>
              <div className="space-y-6">
                {settingsSection === 'users' && <div className="space-y-6">
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-white/60 rounded-2xl"><CardHeader><CardDescription className="text-xs font-semibold tracking-wider text-blue-600 uppercase">Cài đặt chung / User</CardDescription><CardTitle className="text-2xl text-slate-800">Quản lý user</CardTitle><CardDescription>Chọn tác vụ con để bắt đầu thao tác với user trên hệ thống.</CardDescription></CardHeader><CardContent className="space-y-4">{settingsError && <p className="text-sm text-rose-600">{settingsError}</p>}{settingsMessage && <p className="text-sm text-emerald-600">{settingsMessage}</p>}<div className="grid gap-4 md:grid-cols-2"><button onClick={() => setUserSettingsSection('create')} className={`rounded-2xl border px-5 py-5 text-left transition ${userSettingsSection === 'create' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><p className="font-semibold text-slate-800">Tạo user</p><p className="mt-1 text-sm text-slate-500">Tạo mới user và gán role, menu, task.</p></button><button onClick={() => setUserSettingsSection('list')} className={`rounded-2xl border px-5 py-5 text-left transition ${userSettingsSection === 'list' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><p className="font-semibold text-slate-800">Danh sách user</p><p className="mt-1 text-sm text-slate-500">Xem user hiện có, sửa quyền, xóa và reset password.</p></button></div></CardContent></Card>
                  {userSettingsSection === 'none' && <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-dashed border-slate-300 rounded-2xl"><CardContent className="py-12"><div className="mx-auto max-w-xl text-center"><p className="text-lg font-semibold text-slate-800">Chưa chọn tác vụ</p><p className="mt-2 text-sm text-slate-500">Nhấn `Tạo user` hoặc `Danh sách user` ở phía trên để mở đúng khu vực làm việc.</p></div></CardContent></Card>}
                  {userSettingsSection === 'create' && <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-white/60 rounded-2xl"><CardHeader><CardDescription className="text-xs font-semibold tracking-wider text-blue-600 uppercase">Cài đặt chung / User / Tạo user</CardDescription><CardTitle className="text-2xl text-slate-800">{editingUserId ? 'Chỉnh sửa user' : 'Tạo và phân quyền user đăng nhập'}</CardTitle><CardDescription>Tạo tài khoản web, gán role, menu và task chi tiết cho từng người dùng.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium text-slate-700">Họ tên</label><Input value={newUser.fullName} onChange={e => setNewUser(prev => ({ ...prev, fullName: e.target.value }))} placeholder="VD: Nguyen Van B" /></div><div className="space-y-2"><label className="text-sm font-medium text-slate-700">Email</label><Input value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} placeholder="user@company.com" disabled={Boolean(editingUserId)} /></div></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium text-slate-700">{editingUserId ? 'Mật khẩu mới (nếu muốn đổi)' : 'Mật khẩu'}</label><Input type="password" value={newUser.password} onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))} placeholder="Tối thiểu 6 ký tự" /></div><div className="space-y-2"><label className="text-sm font-medium text-slate-700">Role</label><select value={newUser.role} onChange={e => handleRoleChange(e.target.value as Role)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="viewer">viewer</option><option value="operator">operator</option><option value="admin">admin</option></select></div></div><div className="space-y-3"><label className="text-sm font-medium text-slate-700">Quyền menu</label><div className="grid gap-3 md:grid-cols-2">{LEGACY_MENUS.map(menu => <label key={menu.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${newUser.role === 'admin' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white border-slate-200 cursor-pointer'}`}><input type="checkbox" checked={newUser.role === 'admin' || newUser.allowedCategories.includes(menu.name)} disabled={newUser.role === 'admin'} onChange={() => toggleCategoryPermission(menu.name)} className="mt-1" /><span><strong className="block text-slate-800">{menu.name}</strong><span className="text-slate-500">Cho phép thấy nhóm menu này.</span></span></label>)}</div></div><div className="space-y-3"><label className="text-sm font-medium text-slate-700">Quyền task chi tiết</label><div className="grid gap-4">{LEGACY_MENUS.map(menu => <div key={`${menu.id}-tasks`} className="rounded-xl border border-slate-200 p-4"><p className="mb-3 font-semibold text-slate-800">{menu.name}</p><div className="grid gap-3 md:grid-cols-2">{menu.children.map((item, index) => ('children' in item && item.children ? item.children.map(task => <label key={task.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${newUser.role === 'admin' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white border-slate-200 cursor-pointer'}`}><input type="checkbox" checked={newUser.role === 'admin' || newUser.allowedTasks.includes(task.id)} disabled={newUser.role === 'admin'} onChange={() => toggleTaskPermission(task.id)} className="mt-1" /><span><strong className="block text-slate-800">{task.name}</strong><span className="text-slate-500">{item.name}</span></span></label>) : <label key={`${(item as any).id}-${index}`} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${newUser.role === 'admin' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white border-slate-200 cursor-pointer'}`}><input type="checkbox" checked={newUser.role === 'admin' || newUser.allowedTasks.includes((item as LegacyTask).id)} disabled={newUser.role === 'admin'} onChange={() => toggleTaskPermission((item as LegacyTask).id)} className="mt-1" /><span><strong className="block text-slate-800">{(item as LegacyTask).name}</strong><span className="text-slate-500">Task độc lập</span></span></label>))}</div></div>)}</div></div><div className="flex flex-wrap gap-3"><Button onClick={handleCreateUser}>{editingUserId ? 'Lưu thay đổi' : 'Tạo user'}</Button></div></CardContent></Card>}
                  {userSettingsSection === 'list' && <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-white/60 rounded-2xl"><CardHeader><CardDescription className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Cài đặt chung / User / Danh sách user</CardDescription><CardTitle className="text-xl text-slate-800">Danh sách user hiện có</CardTitle><CardDescription>Admin có toàn quyền. Các role khác chỉ thấy menu/task được cấp.</CardDescription></CardHeader><CardContent className="space-y-4">{adminLoading && <p className="text-sm text-slate-500">Đang tải danh sách user...</p>}{!adminLoading && adminUsers.length === 0 && <p className="text-sm text-slate-500">Chưa có user nào ngoài tài khoản hiện tại.</p>}<div className="space-y-4">{adminUsers.map(user => <div key={user.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-800">{user.fullName || user.email}</p><p className="text-sm text-slate-500">{user.email}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{user.role}</span></div><div className="mt-3 space-y-2 text-sm text-slate-600"><p>{user.role === 'admin' ? 'Toàn quyền tất cả menu và task' : user.allowedCategories.length > 0 ? `Menu: ${user.allowedCategories.join(', ')}` : 'Menu: chưa cấp'}</p><p>{user.role === 'admin' ? 'Task: toàn bộ' : user.allowedTasks.length > 0 ? `Task: ${user.allowedTasks.join(', ')}` : 'Task: chưa cấp'}</p></div><div className="mt-4 space-y-3"><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => { startEditUser(user); setUserSettingsSection('create'); }}>Sửa</Button><Button size="sm" variant="outline" onClick={() => handleDeleteUser(user.id)}>Xóa</Button></div><div className="flex gap-2"><Input type="password" value={resetPasswordByUserId[user.id] || ''} onChange={e => setResetPasswordByUserId(prev => ({ ...prev, [user.id]: e.target.value }))} placeholder="Mật khẩu mới để reset" /><Button size="sm" variant="outline" onClick={() => handleResetPassword(user.id)}>Reset password</Button></div></div></div>)}</div></CardContent></Card>}
                </div>}
                {settingsSection === 'audit' && <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-white/60 rounded-2xl"><CardHeader><CardDescription className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Cài đặt chung / Audit log</CardDescription><CardTitle className="text-2xl text-slate-800">Nhật ký quản trị</CardTitle><CardDescription>Theo dõi các thao tác tạo user, sửa quyền, reset mật khẩu, xóa user và đồng bộ catalog.</CardDescription></CardHeader><CardContent><div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">{auditLogs.length === 0 ? <p className="text-sm text-slate-500">Chưa có audit log hoặc bảng chưa được tạo.</p> : auditLogs.map(log => <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-800">{log.action_type}</p><p className="text-slate-500">{log.actor_email || 'system'} {log.target_email ? `-> ${log.target_email}` : ''}</p></div><p className="shrink-0 text-xs text-slate-400">{new Date(log.created_at).toLocaleString('vi-VN')}</p></div></div>)}</div></CardContent></Card>}
                {settingsSection === 'system' && <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-white/60 rounded-2xl"><CardHeader><CardDescription className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Cài đặt chung / Hệ thống</CardDescription><CardTitle className="text-2xl text-slate-800">Đồng bộ và trạng thái hệ thống</CardTitle><CardDescription>Kiểm tra nguồn quyền hiện tại và đồng bộ catalog menu/task sang schema chuẩn trên Supabase.</CardDescription></CardHeader><CardContent className="space-y-4">{currentUser?.source === 'metadata' && <p className="text-sm text-amber-600">Hệ thống đang đọc quyền từ metadata fallback. Hãy chạy file schema SQL rồi nhấn Đồng bộ catalog để chuyển sang bảng chuẩn.</p>}{settingsError && <p className="text-sm text-rose-600">{settingsError}</p>}{settingsMessage && <p className="text-sm text-emerald-600">{settingsMessage}</p>}<div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">Nguồn dữ liệu quyền</p><p className="mt-1 text-sm text-slate-500">{currentUser?.source === 'metadata' ? 'Đang dùng metadata fallback từ auth.users' : 'Đang dùng bảng quyền chuẩn trên Supabase'}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">Catalog menu/task</p><p className="mt-1 text-sm text-slate-500">Dùng để map quyền chi tiết theo menu và task trong ứng dụng.</p></div></div><div className="flex flex-wrap gap-3"><Button onClick={handleSyncCatalog}>Đồng bộ catalog</Button><Button variant="outline" onClick={() => void loadAuditLogs()}>Làm mới audit log</Button><Button variant="outline" onClick={() => void loadAdminUsers()}>Làm mới user</Button>{editingUserId && <Button variant="outline" onClick={resetUserForm}>Hủy chỉnh sửa</Button>}</div></CardContent></Card>}
              </div>
            </div>}

          {activeTab === 'legacy' && !activeTaskId && currentMenu && <Card className="bg-white border border-slate-200 shadow-sm rounded-xl w-full min-h-[85vh] mb-8 pb-8"><CardHeader className="pb-4 border-b border-slate-100"><CardDescription className="text-xs font-bold text-blue-600 tracking-widest uppercase">DANH MỤC CHỨC NĂNG</CardDescription><CardTitle className="text-2xl text-slate-800">{activeCategoryName}</CardTitle></CardHeader><CardContent className="space-y-8 pt-6">{currentMenu.children.some(c => (c as LegacyMenuGroup).children) ? currentMenu.children.map((group, idx) => <div key={idx}><h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-3 border-b border-slate-100 pb-2">{group.name}</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">{(group as LegacyMenuGroup).children?.map((task: LegacyTask) => <button key={task.id} onClick={() => handleRunTask(task.id)} className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all w-full text-sm font-semibold text-slate-700">{task.name}</button>)}</div></div>) : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">{currentMenu.children.map((task: any) => <button key={task.id} onClick={() => handleRunTask(task.id)} className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all w-full text-sm font-semibold text-slate-700">{task.name}</button>)}</div>}</CardContent></Card>}

          <LegacyIframe 
            activeTab={activeTab}
            activeTaskId={activeTaskId}
            activeCategoryName={activeCategoryName}
            iframeReady={iframeReady}
            iframeRef={iframeRef}
            onBack={() => { setActiveTaskId(null); setIframeReady(false); pendingTaskIdRef.current = null; }}
            onLoad={() => {
              iframeInitializedRef.current = true;
              const taskId = pendingTaskIdRef.current;
              if (taskId && iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage({ type: 'RUN_TASK', taskId }, '*');
                setTimeout(() => setIframeReady(true), 300);
              }
            }}
          />


        </main>
      </div>
    </div>
  );
}
