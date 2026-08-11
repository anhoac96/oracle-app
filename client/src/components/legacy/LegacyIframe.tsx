import { ChevronLeft, LayoutGrid } from 'lucide-react';
import type { RefObject } from 'react';

export function LegacyIframe({
  activeTab,
  activeTaskId,
  activeCategoryName,
  iframeReady,
  iframeRef,
  onBack,
  onLoad
}: {
  activeTab: string;
  activeTaskId: string | null;
  activeCategoryName: string;
  iframeReady: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onBack: () => void;
  onLoad: () => void;
}) {
  return (
    <div
      className="w-full h-[calc(100vh-6rem)] mb-6 flex flex-col rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white"
      style={{ display: activeTab === 'legacy' && activeTaskId ? 'flex' : 'none' }}
    >
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Bảng điều khiển
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LayoutGrid className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{activeCategoryName}</span>
        </div>
      </div>
      <div className="flex-1 relative bg-white">
        {!iframeReady && (
          <div className="absolute inset-0 z-10 bg-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Đang tải...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="http://localhost:5000/"
          className="absolute inset-0 w-full h-full border-none outline-none"
          title="Legacy Form Tool"
          onLoad={onLoad}
        />
      </div>
    </div>
  );
}
