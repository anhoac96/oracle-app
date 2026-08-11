import { useEffect, useRef } from 'react';
import { Activity, Send } from 'lucide-react';

const renderMarkdown = (text: string) => {
  return text.split('\n').map((line, idx) => (
    <span key={idx} className="block min-h-[1em]">
      {line.split(/(\*\*.*?\*\*)/g).map((chunk, i) => {
        if (chunk.startsWith('**') && chunk.endsWith('**')) {
          return <strong key={i} className="font-bold">{chunk.slice(2, -2)}</strong>;
        }
        return <span key={i}>{chunk}</span>;
      })}
    </span>
  ));
};

export function AiChatPanel({ chatLog, msg, loading, setMsg, onSend, providerLabel, providerMode, setProviderMode, fullPage = false }: { chatLog: Array<{ role: string; text: string }>; msg: string; loading: boolean; setMsg: (value: string) => void; onSend: () => void; providerLabel: string; providerMode: string; setProviderMode: (value: string) => void; fullPage?: boolean }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, loading]);

  return (
    <div className={`flex flex-col bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden w-full ${fullPage ? 'h-[calc(100vh-9rem)]' : 'h-[430px]'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">Trợ lý AI Oracle SQL</p>
          <p className="text-xs text-blue-500 font-medium italic">{providerLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={providerMode}
            onChange={(e) => setProviderMode(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
          >
            <option value="auto">Tự động</option>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
            <option value="codex">Codex</option>
            <option value="openrouter">OpenRouter</option>
            <option value="ollama">🦙 Ollama (Local)</option>
          </select>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 bg-slate-50/60">
        {chatLog.map((c, i) => (
          c.role === 'user' ? (
            /* User message */
            <div key={i} className="flex justify-end gap-2">
              <div className="flex flex-col items-end gap-1 max-w-[78%]">
                <div className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm leading-relaxed">
                  {renderMarkdown(c.text)}
                </div>
                <span className="text-[10px] text-slate-400">{timeStr}</span>
              </div>
            </div>
          ) : (
            /* AI message */
            <div key={i} className="flex justify-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col gap-1 max-w-[78%]">
                <div className="bg-white text-slate-700 text-sm px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100 leading-relaxed">
                  {renderMarkdown(c.text)}
                </div>
                <span className="text-[10px] text-slate-400 ml-1">{timeStr}</span>
              </div>
            </div>
          )
        ))}
        {loading && (
          <div className="flex justify-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white text-slate-400 text-sm px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce bounce-delay-0" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce bounce-delay-150" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce bounce-delay-300" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-2">
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={Math.min(msg.split('\n').length || 1, 10)}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none px-1 py-1 min-h-[24px] max-h-[250px] overflow-y-auto"
            placeholder="Nhập tin nhắn (Shift + Enter để xuống dòng)..."
          />
          <button
            title="Gửi"
            onClick={onSend}
            disabled={loading}
            className="w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
