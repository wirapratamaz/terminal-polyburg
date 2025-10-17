'use client';

interface InfoBarProps {
  messages: string[];
}

export function InfoBar({ messages }: InfoBarProps) {
  return (
    <div className="border border-green-500/30 bg-black/90 font-mono overflow-hidden">
      <div className="border-b border-green-500/30 p-2 bg-green-950/20">
        <div className="text-green-400 font-bold text-sm">Open Orders / Activity</div>
      </div>
      <div className="p-3 h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/30">
        {messages.length === 0 ? (
          <div className="text-green-500/50 text-xs">
            No recent activity. Monitoring order book updates...
          </div>
        ) : (
          <div className="space-y-1">
            {messages.slice(-10).map((msg, idx) => (
              <div key={idx} className="text-green-400/80 text-xs font-mono">
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}