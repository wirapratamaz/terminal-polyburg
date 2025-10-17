'use client';

interface InfoBarProps {
  messages: string[];
}

export function InfoBar({ messages }: InfoBarProps) {
  return (
    <div className="flex flex-col h-full border border-green-500/30 bg-black/95 font-mono overflow-hidden">
      {/* Trading Header */}
      <div className="border-b border-green-500/30 px-2 py-0.5 bg-green-950/20">
        <div className="text-green-400 font-bold text-[9px] leading-tight">
          Trading Bitcoin Up or Down — October 15, 4PM ET — Down
        </div>
      </div>
      
      {/* Trading Details Section */}
      <div className="border-b border-green-500/30 px-2 py-1 bg-black/50">
        <div className="grid grid-cols-4 gap-3 text-[8px] leading-tight">
          <div>
            <span className="text-green-500/60">Token:</span>
            <span className="text-green-400 ml-1 font-mono">453280...c5547</span>
          </div>
          <div>
            <span className="text-green-500/60">Price:</span>
            <span className="text-green-400 ml-1 font-mono tabular-nums">0.09</span>
          </div>
          <div>
            <span className="text-green-500/60">Size:</span>
            <span className="text-green-400 ml-1 font-mono tabular-nums">10</span>
          </div>
          <div>
            <span className="text-green-500/60">Side:</span>
            <span className="text-green-400 ml-1">BUY</span>
          </div>
        </div>
        <div className="mt-1 text-[8px] text-green-400/70 leading-tight">
          Submit (Enter) Space: toggle side Tab: Switch focus
        </div>
      </div>

      {/* Order Submission Messages */}
      <div className="border-b border-green-500/30 px-2 py-1 bg-black/50">
        <div className="text-[8px] text-green-400 font-mono leading-tight">
          Order submitted: 0x5de510754066172990b65561e61e63ba520bc45c @ 0.0900 x 10.00
        </div>
        <div className="text-[8px] text-green-400/70 font-mono leading-tight">
          Last order: 0x5de5...c45c
        </div>
      </div>

      {/* Open Orders Section */}
      <div className="border-b border-green-500/30 px-2 py-0.5 bg-green-950/20">
        <div className="text-green-400 font-bold text-[9px] leading-tight">
          Open Orders — Bitcoin Up or Down — October 15, 4PM ET
        </div>
        <div className="text-green-500/60 text-[8px] leading-tight mt-0.5">
          &gt; BUY Up 0.00/10.00 @ 0.0900
        </div>
      </div>

      {/* Activity Messages */}
      <div className="flex-1 px-2 py-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/30">
        {messages.length === 0 ? (
          <div className="text-green-500/50 text-[8px] leading-tight">
            No recent activity
          </div>
        ) : (
          <div>
            {messages.slice(-6).map((msg, idx) => (
              <div key={idx} className="text-green-400/80 text-[8px] font-mono leading-tight">
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Profile Bar */}
      <div className="border-t border-green-500/30 px-2 py-0.5 bg-black/50">
        <div className="flex items-center justify-between text-[8px]">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-green-500/60">Profile (USDC.e)</span>
            </div>
            <div>
              <span className="text-green-500/60">Cash:</span>
              <span className="text-green-400 ml-1 font-mono tabular-nums">755.00</span>
            </div>
            <div>
              <span className="text-green-500/60">Portfolio:</span>
              <span className="text-green-400 ml-1 font-mono tabular-nums">2731.25</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}