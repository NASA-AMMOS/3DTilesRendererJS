import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchItem {
  type: 'class' | 'property' | 'method' | 'example';
  name: string;
  parent?: string;
  description?: string;
  url: string;
}

let searchIndex: SearchItem[] | null = null;

async function buildSearchIndex(): Promise<SearchItem[]> {
  if (searchIndex) return searchIndex;

  const items: SearchItem[] = [];
  const base = import.meta.env.BASE_URL;

  try {
    const [apiRes, exRes] = await Promise.all([
      fetch(`${base}api.json`),
      fetch(`${base}examples.json`),
    ]);

    if (apiRes.ok) {
      const api = await apiRes.json();
      for (const cls of api.classes) {
        items.push({
          type: 'class',
          name: cls.name,
          description: cls.description || cls.category || '',
          url: `/api/${cls.name}`,
        });
        for (const prop of cls.properties || []) {
          items.push({
            type: 'property',
            name: prop.name,
            parent: cls.name,
            description: prop.description || '',
            url: `/api/${cls.name}#prop-${prop.name}`,
          });
        }
        for (const method of cls.methods || []) {
          items.push({
            type: 'method',
            name: `${method.name}()`,
            parent: cls.name,
            description: method.description || '',
            url: `/api/${cls.name}#method-${method.name}`,
          });
        }
      }
    }

    if (exRes.ok) {
      const ex = await exRes.json();
      for (const example of ex.examples) {
        items.push({
          type: 'example',
          name: example.title,
          description: example.description || '',
          url: `/examples/${example.id}`,
        });
      }
    }
  } catch {
    // silently fail
  }

  searchIndex = items;
  return items;
}

const TYPE_LABELS: Record<string, string> = {
  class: 'Class',
  property: 'Prop',
  method: 'Method',
  example: 'Example',
};

const TYPE_COLORS: Record<string, string> = {
  class: 'bg-blue-500/20 text-blue-400',
  property: 'bg-green-500/20 text-green-400',
  method: 'bg-purple-500/20 text-purple-400',
  example: 'bg-amber-500/20 text-amber-400',
};

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      buildSearchIndex();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    const q = query.toLowerCase();
    const index = searchIndex || [];
    const matched = index.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(q);
      const parentMatch = item.parent?.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q);
      return nameMatch || parentMatch || descMatch;
    });

    // Sort: exact name start > name contains > description match
    matched.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const aName = a.name.toLowerCase().includes(q) ? 0 : 1;
      const bName = b.name.toLowerCase().includes(q) ? 0 : 1;
      return aName - bName;
    });

    setResults(matched.slice(0, 30));
    setActiveIndex(0);
  }, [query]);

  const goTo = useCallback((item: SearchItem) => {
    navigate(item.url);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      goTo(results[activeIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, activeIndex, goTo, onClose]);

  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <svg className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search classes, methods, properties, examples..."
            className="flex-1 bg-transparent text-sm outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
          />
          <kbd className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {query && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
              No results for &quot;{query}&quot;
            </div>
          )}
          {results.map((item, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={`${item.url}-${i}`}
                onClick={() => goTo(item)}
                style={{ transition: 'none' }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm border-l-2 ${
                  isActive
                    ? 'bg-blue-500/15 text-[var(--color-text)] border-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] border-transparent'
                }`}
              >
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[item.type]}`}>
                  {TYPE_LABELS[item.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[var(--color-text)]">{item.name}</span>
                  {item.parent && (
                    <span className="text-xs text-[var(--color-text-secondary)] ml-2">
                      in {item.parent}
                    </span>
                  )}
                </div>
                <kbd
                  className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-1 py-0.5 rounded"
                  style={{ visibility: isActive ? 'visible' : 'hidden' }}
                >
                  Enter
                </kbd>
              </button>
            );
          })}
          {!query && (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
              Type to search API classes, methods, properties, and examples
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
