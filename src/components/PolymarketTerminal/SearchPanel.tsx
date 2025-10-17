'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchPanelProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export function SearchPanel({ onSearch, isSearching }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSearchQuery = useRef<string>('');

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Immediate search on form submit, but only if query changed
    if (query !== lastSearchQuery.current) {
      lastSearchQuery.current = query;
      onSearch(query);
    }
  };

  // Add real-time search with proper debouncing and duplicate prevention
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only trigger search if query is different from last search
      if (query !== lastSearchQuery.current) {
        lastSearchQuery.current = query;
        onSearch(query);
      }
    }, 500); // 500ms debounce to reduce API calls

    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    lastSearchQuery.current = '';
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="border border-green-500/30 bg-black/90 font-mono">
      <div className="border-b border-green-500/30 px-3 py-1 bg-green-950/20">
        <div className="text-green-400 font-bold text-sm leading-tight">
          Search (Type to search)
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
            className="w-full bg-black border border-green-500/40 text-green-400 px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 placeholder:text-green-600/40 pr-16"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="text-green-500/60 hover:text-green-400 text-xs px-1"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="text-green-500/80 hover:text-green-400 text-xs px-1"
            >
              Search
            </button>
          </div>
        </form>
        {isSearching && (
          <div className="mt-1 text-green-500/70 text-xs animate-pulse">
            Searching markets...
          </div>
        )}
        {!isSearching && query && (
          <div className="mt-1 text-green-500/50 text-xs">
            Searching for: "{query}"
          </div>
        )}
      </div>
    </div>
  );
}