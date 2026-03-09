import { Sparkles, Loader2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AiIndicatorProps {
  variant?: 'badge' | 'dot' | 'inline';
  loading?: boolean;
  provider?: 'free' | 'openai' | 'openrouter' | 'custom' | string;
  remaining?: number | null;
  className?: string;
}

export function AiIndicator({ variant = 'badge', loading, provider, remaining, className }: AiIndicatorProps) {
  const isFree = !provider || provider === 'free';
  const label = isFree ? 'AI Free' : 'AI Pro';

  if (variant === 'dot') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            'inline-flex items-center gap-1 text-xs',
            loading ? 'text-muted-foreground animate-pulse' : 'text-primary',
            className
          )}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}{remaining !== null && remaining !== undefined ? ` · ${remaining} calls left today` : ''}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        loading ? 'text-muted-foreground' : isFree ? 'text-primary' : 'text-accent-foreground',
        className
      )}>
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isFree ? (
          <Sparkles className="h-3 w-3" />
        ) : (
          <Zap className="h-3 w-3" />
        )}
        {loading ? 'Analyzing...' : label}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-xs font-medium',
        loading && 'animate-pulse',
        isFree
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-accent/30 bg-accent/10 text-accent-foreground',
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isFree ? (
        <Sparkles className="h-3 w-3" />
      ) : (
        <Zap className="h-3 w-3" />
      )}
      {loading ? 'Analyzing...' : label}
      {remaining !== null && remaining !== undefined && !loading && (
        <span className="opacity-60">({remaining})</span>
      )}
    </Badge>
  );
}
