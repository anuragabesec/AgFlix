import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = 'Search titles, genres, cast...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debouncing logic
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 500); // 500ms debounce interval

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleSearch = () => {
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (query === '') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative flex items-center h-10 select-none">
      <div className={`flex items-center rounded-full bg-white/5 border border-white/10 transition-all duration-300 ${
        isOpen ? 'w-48 sm:w-64 px-3.5 py-1.5' : 'w-10 h-10 justify-center hover:bg-white/10 cursor-pointer'
      }`}
      onClick={toggleSearch}
      >
        <Search className={`w-4 h-4 text-brand-textMuted hover:text-white transition-colors ${
          isOpen ? 'mr-2' : ''
        }`} 
        />
        
        {isOpen && (
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()} // prevent input click closing/toggling
            className="w-full bg-transparent text-xs font-semibold outline-none text-white placeholder-brand-textMuted/60"
          />
        )}

        {isOpen && query && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-0.5 rounded-full hover:bg-white/10 text-brand-textMuted hover:text-white transition-colors ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
