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
    <div className="border-t border-green-500/30 bg-black/95 font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-green-500/70">Trading:</span>
            <span className="text-green-400 font-semibold">
              {selectedMarket || 'None selected'}
            </span>
          </div>
          {lastUpdateTime && (
            <div className="flex items-center gap-2">
              <span className="text-green-500/70">Last order:</span>
              <span className="text-green-300 font-mono">
                {new Date(lastUpdateTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-green-500/70">WebSocket:</span>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-green-500/70">Time:</span>
            <span className="text-green-300 font-mono tabular-nums">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}