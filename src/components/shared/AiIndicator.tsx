import { Sparkles, Loader2, Zap, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AiIndicatorProps {
  variant?: 'badge' | 'dot' | 'inline';
  loading?: boolean;
  provider?: 'free' | 'openai' | 'openrouter' | 'custom' | string;
  remaining?: number | null;
  unavailable?: boolean;
  className?: string;
}

export function AiIndicator({ variant = 'badge', loading, provider, remaining, unavailable, className }: AiIndicatorProps) {
  const isFree = !provider || provider === 'free';
  const label = unavailable ? 'AI Offline' : isFree ? 'AI Free' : provider === 'openrouter' ? 'AI Llama' : 'AI Pro';

  if (variant === 'dot') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            'inline-flex items-center gap-1 text-xs',
            unavailable ? 'text-muted-foreground' : loading ? 'text-muted-foreground animate-pulse' : 'text-primary',
            className
          )}>
            {unavailable ? <WifiOff className="h-3 w-3" /> : loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{unavailable ? 'AI unavailable in self-hosted mode' : label}{remaining !== null && remaining !== undefined ? ` · ${remaining} calls left today` : ''}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        unavailable ? 'text-muted-foreground' : loading ? 'text-muted-foreground' : isFree ? 'text-primary' : 'text-accent-foreground',
        className
      )}>
        {unavailable ? (
          <WifiOff className="h-3 w-3" />
        ) : loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isFree ? (
          <Sparkles className="h-3 w-3" />
        ) : (
          <Zap className="h-3 w-3" />
        )}
        {unavailable ? 'AI Offline' : loading ? 'Analyzing...' : label}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-xs font-medium',
        loading && 'animate-pulse',
        unavailable
          ? 'border-muted bg-muted/50 text-muted-foreground'
          : isFree
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-accent/30 bg-accent/10 text-accent-foreground',
        className
      )}
    >
      {unavailable ? (
        <WifiOff className="h-3 w-3" />
      ) : loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isFree ? (
        <Sparkles className="h-3 w-3" />
      ) : (
        <Zap className="h-3 w-3" />
      )}
      {unavailable ? 'AI Offline' : loading ? 'Analyzing...' : label}
      {remaining !== null && remaining !== undefined && !loading && !unavailable && (
        <span className="opacity-60">({remaining})</span>
      )}
    </Badge>
  );
}
