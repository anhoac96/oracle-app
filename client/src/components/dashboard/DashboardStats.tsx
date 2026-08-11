import { CreditCard, DollarSign, Users, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function DashboardStats({ dynamicMetrics, role, visibleMenusCount }: { dynamicMetrics: any; role: string; visibleMenusCount: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">{dynamicMetrics?.metrics?.[0]?.title || 'Tổng thao tác ghi nhận'}</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-slate-800">{dynamicMetrics?.metrics?.[0]?.value || '0'}</div>
          <p className="text-xs text-slate-500 mt-1">Realtime qua Supabase + backend</p>
        </CardContent>
      </Card>
      
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">{dynamicMetrics?.metrics?.[1]?.title || 'Tương tác phổ biến'}</CardTitle>
          <Users className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-slate-800">{dynamicMetrics?.metrics?.[1]?.value || 'N/A'}</div>
          <p className="text-xs text-slate-500 mt-1">Loại thao tác nổi bật gần đây</p>
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Menu được cấp</CardTitle>
          <CreditCard className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-slate-800">{role === 'admin' ? 'Toàn bộ' : visibleMenusCount}</div>
          <p className="text-xs text-slate-500 mt-1">Theo role và quyền user hiện tại</p>
        </CardContent>
      </Card>

      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Role đăng nhập</CardTitle>
          <Activity className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-emerald-600">{role}</div>
          <p className="text-xs text-slate-500 mt-1">Phân quyền đọc từ Supabase Auth metadata</p>
        </CardContent>
      </Card>
    </div>
  );
}
