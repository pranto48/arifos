import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, CheckSquare, Target, Lightbulb, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  type: 'task' | 'note' | 'goal' | 'project' | 'transaction';
  title: string;
  subtitle?: string;
}

const typeIcons = {
  task: CheckSquare,
  note: FileText,
  goal: Target,
  project: Lightbulb,
  transaction: Wallet,
};

const typeColors = {
  task: 'text-blue-400',
  note: 'text-green-400',
  goal: 'text-yellow-400',
  project: 'text-purple-400',
  transaction: 'text-orange-400',
};

const typeRoutes: Record<string, string> = {
  task: '/tasks',
  note: '/notes',
  goal: '/goals',
  project: '/projects',
  transaction: '/budget',
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Keyboard shortcut: "/" to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real search across database tables
  useEffect(() => {
    if (query.length < 2 || !user) {
      setResults([]);
      return;
    }

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const searchQuery = `%${query.toLowerCase()}%`;
      const allResults: SearchResult[] = [];

      try {
        // Search tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, status, due_date')
          .eq('user_id', user.id)
          .ilike('title', searchQuery)
          .limit(5);

        tasks?.forEach(t => {
          allResults.push({
            id: t.id,
            type: 'task',
            title: t.title,
            subtitle: t.status === 'completed' ? 'Completed' : t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString()}` : undefined,
          });
        });

        // Search notes
        const { data: notes } = await supabase
          .from('notes')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .ilike('title', searchQuery)
          .limit(5);

        notes?.forEach(n => {
          allResults.push({
            id: n.id,
            type: 'note',
            title: n.title,
            subtitle: `Updated ${new Date(n.updated_at).toLocaleDateString()}`,
          });
        });

        // Search goals
        const { data: goals } = await supabase
          .from('goals')
          .select('id, title, status, current_amount, target_amount')
          .eq('user_id', user.id)
          .ilike('title', searchQuery)
          .limit(5);

        goals?.forEach(g => {
          const progress = g.target_amount ? Math.round(((g.current_amount || 0) / g.target_amount) * 100) : 0;
          allResults.push({
            id: g.id,
            type: 'goal',
            title: g.title,
            subtitle: g.target_amount ? `${progress}% complete` : g.status,
          });
        });

        // Search projects
        const { data: projects } = await supabase
          .from('projects')
          .select('id, title, status')
          .eq('user_id', user.id)
          .ilike('title', searchQuery)
          .limit(5);

        projects?.forEach(p => {
          allResults.push({
            id: p.id,
            type: 'project',
            title: p.title,
            subtitle: p.status,
          });
        });

        setResults(allResults);
      } catch (error) {
        console.error('Search error:', error);
      }
      
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, user]);

  const handleResultClick = (result: SearchResult) => {
    navigate(typeRoutes[result.type]);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative flex-1 max-w-md">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-text',
          isOpen 
            ? 'border-primary bg-muted' 
            : 'border-border bg-muted/50 hover:bg-muted'
        )}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        {isOpen ? (
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything..."
            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            Search... <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-50">/</kbd>
          </span>
        )}
        {isOpen && query && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              setIsOpen(false);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && (results.length > 0 || isSearching) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="py-2">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">Searching...</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">No results found</div>
              ) : (
                results.map((result) => {
                  const Icon = typeIcons[result.type];
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted text-left transition-colors"
                      onClick={() => handleResultClick(result)}
                    >
                      <Icon className={cn('h-4 w-4', typeColors[result.type])} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{result.type}</span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
