import type React from 'react';
import { Home, Users, Settings, Database, MessageSquare, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LegacyMenuItem {
  id: string;
  name: string;
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab: string;
  activeCategoryName: string;
  setActiveTab: (tab: string) => void;
  onNavigateLegacy: (categoryName: string) => void;
  legacyMenus: LegacyMenuItem[];
  canManageUsers: boolean;
  onLogout: () => void;
}

export function Sidebar({
  className,
  activeTab,
  activeCategoryName,
  setActiveTab,
  onNavigateLegacy,
  legacyMenus,
  canManageUsers,
  onLogout,
}: SidebarProps) {
  return (
    <div className={cn('border-r bg-white w-64 h-screen flex flex-col hidden md:flex shadow-sm', className)}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-2xl font-extrabold tracking-tight text-blue-600">
            AI-CRM
          </h2>
        </div>

        {/* Main nav */}
        <div className="px-3 py-3 space-y-0.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium', activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100')}
          >
            <Home className="h-4 w-4 shrink-0" />
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium', 'text-slate-700 hover:bg-slate-100')}
          >
            <Users className="h-4 w-4 shrink-0" />
            Khách hàng
          </button>
          <button
            onClick={() => setActiveTab('ai_chat')}
            className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium', activeTab === 'ai_chat' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100')}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            Chat AI
          </button>
          {canManageUsers && (
            <button
              onClick={() => setActiveTab('settings')}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium', activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100')}
            >
              <Settings className="h-4 w-4 shrink-0" />
              Cài đặt chung
            </button>
          )}
        </div>

        {/* Oracle Legacy section */}
        <div className="px-3 py-2 flex-1 overflow-y-auto">
          <p className="mb-1.5 px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            ORACLE LEGACY (DATA)
          </p>
          <div className="space-y-0.5">
            {legacyMenus.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigateLegacy(item.name)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left font-medium transition-colors',
                  activeTab === 'legacy' && activeCategoryName === item.name
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                <Database className="h-4 w-4 shrink-0" />
                <span className="leading-5 break-words">{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-slate-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
