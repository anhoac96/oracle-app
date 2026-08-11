import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function DashboardChart({ dynamicMetrics }: { dynamicMetrics: any }) {
  return (
    <Card className="col-span-4 bg-white border border-slate-200 shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Biểu đồ theo dõi Oracle log</CardTitle>
        <CardDescription>Bắt thao tác Legacy Iframe và hiển thị qua backend mới.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] flex gap-4 items-end justify-center bg-slate-50 rounded-lg p-6 mx-4 mb-4">
        {dynamicMetrics?.chartData && dynamicMetrics.chartData.length > 0 ? (
          dynamicMetrics.chartData.map((slice: any, i: number) => (
            <div key={i} className="flex flex-col items-center gap-2 group w-16">
              <div 
                className="w-full bg-blue-500 rounded-t-xl hover:bg-blue-600 transition-all cursor-pointer relative shadow-lg" 
                style={{ height: `${Math.max((slice.value / Math.max(dynamicMetrics?.chartData?.[0]?.value || 1, 1)) * 200, 20)}px` }}
              >
                <div className="absolute -top-8 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity pointer-events-none">
                  {slice.name}: {slice.value} lần
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 text-center uppercase tracking-tighter truncate w-full" title={slice.name}>
                {String(slice.name).substring(0, 8)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-slate-400 self-center">Chưa có log thao tác hệ thống Legacy</p>
        )}
      </CardContent>
    </Card>
  );
}
