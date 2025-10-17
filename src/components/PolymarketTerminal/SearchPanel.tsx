'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchPanelProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export function SearchPanel({ onSearch, isSearching }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="border border-green-500/30 bg-black/90 font-mono">
      <div className="border-b border-green-500/30 px-3 py-1 bg-green-950/20">
        <div className="text-green-400 font-bold text-[11px] leading-tight">
          Search (Enter, Up/Down, Right)
        </div>
      </div>
      <div className="px-3 py-2">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="bitcoin up or down"
            className="w-full bg-black border border-green-500/40 text-green-400 px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 placeholder:text-green-600/40"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-green-500/60 hover:text-green-400 text-[9px]"
            >
              Clear
            </button>
          )}
        </form>
        {isSearching && (
          <div className="mt-1 text-green-500/70 text-[9px] animate-pulse">
            Searching markets...
          </div>
        )}
      </div>
    </div>
  );
}