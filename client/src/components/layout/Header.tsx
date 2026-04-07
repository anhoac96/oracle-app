import { useEffect, useState } from 'react';
import { Search, Bell, User, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface HeaderProps {
  userEmail?: string;
  userRole?: string;
}

export function Header({ userEmail, userRole }: HeaderProps) {
  const [dbStatus, setDbStatus] = useState<string>('Kiểm tra DB...');

  useEffect(() => {
    const checkDb = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        setDbStatus('Đã kết nối Supabase');
      } catch {
        setDbStatus('Local Mode');
      }
    };
    checkDb();
  }, []);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-6">
      <div className="flex flex-1 items-center gap-4">
        <form className="flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="Tìm kiếm giao dịch, khách hàng..."
              className="h-9 pl-8 sm:w-[300px] bg-white/70"
            />
          </div>
        </form>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline-flex text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full items-center gap-1 border border-green-200">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          {dbStatus}
        </span>
        {userRole && (
          <span className="hidden sm:inline-flex text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full items-center gap-1 border border-blue-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            {userRole}
          </span>
        )}
        <button title="Thông báo" className="rounded-full bg-white/80 p-2 text-slate-500 hover:text-slate-900 border border-slate-200">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 border border-slate-200 text-slate-600">
          <User className="h-4 w-4" />
          <span className="max-w-[220px] truncate text-sm">{userEmail || 'Chưa đăng nhập'}</span>
        </div>
      </div>
    </header>
  );
}
