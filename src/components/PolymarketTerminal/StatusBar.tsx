'use client';

import { useEffect, useState } from 'react';

interface StatusBarProps {
  isConnected: boolean;
  selectedMarket: string | null;
  lastUpdateTime: number | null;
}

export function StatusBar({ isConnected, selectedMarket, lastUpdateTime }: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="border-t border-green-500/30 bg-black/95 font-mono text-[9px]">
      <div className="flex items-center justify-between px-3 py-1">
        {/* Left side - Trading info with actual values */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-green-500/70">Token:</span>
            <span className="text-green-400 font-mono">453280...c5547</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500/70">Price:</span>
            <span className="text-green-300 font-mono tabular-nums">0.09</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500/70">Size:</span>
            <span className="text-green-300 font-mono tabular-nums">10</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-500/70">Side:</span>
            <span className="text-green-300">BUY</span>
          </div>
        </div>

        {/* Right side - Profile info with actual values */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
              {isConnected ? 'LIVE' : 'DISC'}
            </span>
          </div>
          <div className="text-green-300 font-mono tabular-nums">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
    </div>
  );
}