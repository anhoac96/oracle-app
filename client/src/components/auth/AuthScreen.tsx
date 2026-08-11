import { ShieldPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export function AuthScreen({ 
  hasUsers, 
  handleBootstrapAdmin, 
  handleLogin, 
  handleGithubLogin,
  bootstrapState,
  loginState,
  authError,
  authMessage
}: any) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="grid gap-6 w-full max-w-5xl lg:grid-cols-2">
        {!hasUsers && (
          <Card className="shadow-xl border-white/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldPlus className="w-5 h-5 text-blue-600" />
                Khởi tạo admin đầu tiên
              </CardTitle>
              <CardDescription>Hệ thống chưa có tài khoản nào. Tạo admin đầu tiên để quản lý user và phân quyền menu.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleBootstrapAdmin(); }}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Họ tên</label>
                  <Input value={bootstrapState.fullName} onChange={e => bootstrapState.setFullName(e.target.value)} placeholder="VD: Nguyen Van A" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <Input value={bootstrapState.email} onChange={e => bootstrapState.setEmail(e.target.value)} placeholder="admin@company.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
                  <Input type="password" value={bootstrapState.password} onChange={e => bootstrapState.setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
                </div>
                <Button className="w-full" type="submit">Tạo admin đầu tiên</Button>
              </form>
            </CardContent>
          </Card>
        )}
        
        <Card className="shadow-xl border-white/60">
          <CardHeader>
            <CardTitle>Đăng nhập hệ thống</CardTitle>
            <CardDescription>Đăng nhập bằng tài khoản Supabase Auth để vào web và xem đúng menu theo role.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleLogin(); }}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input value={loginState.email} onChange={e => loginState.setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
                <Input type="password" value={loginState.password} onChange={e => loginState.setPassword(e.target.value)} placeholder="Nhập mật khẩu" />
              </div>
              {authError && <p className="text-sm text-rose-600">{authError}</p>}
              {authMessage && <p className="text-sm text-emerald-600">{authMessage}</p>}
              <div className="flex flex-col gap-3">
                <Button className="w-full" type="submit">Đăng nhập</Button>
                <Button variant="outline" className="w-full" type="button" onClick={handleGithubLogin}>Đăng nhập với GitHub</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
