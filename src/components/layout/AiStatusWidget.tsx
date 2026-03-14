import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, WifiOff, ChevronRight } from "lucide-react";
import { useAiAssist } from "@/hooks/useAiAssist";
import { useLanguage } from "@/contexts/LanguageContext";
import { AiIndicator } from "@/components/shared/AiIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiStatusWidgetProps {
  collapsed?: boolean;
}

const FREE_DAILY_LIMIT = 10;

export function AiStatusWidget({ collapsed }: AiStatusWidgetProps) {
  const navigate = useNavigate();
  const { loading, config, getRemainingCalls, isAvailable, isConfigured } =
    useAiAssist();
  useLanguage();

  const remaining = getRemainingCalls();
  const isFree = !config || config.provider === "free";
  const isLowQuota = isFree && remaining !== null && remaining <= 2;

  const tooltipText = !isAvailable
    ? "AI Offline"
    : isConfigured
      ? "AI Pro"
      : remaining !== null
        ? `AI Hub · ${remaining} calls left`
        : "AI Hub";

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate("/ai-hub")}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-sidebar-accent/50",
              !isAvailable && "opacity-50",
            )}
            aria-label="AI Hub"
          >
            {loading ? (
              <Sparkles className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : !isAvailable ? (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Sparkles
                className={cn(
                  "h-4 w-4 text-primary",
                  isLowQuota && "animate-pulse",
                )}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
      {/* Top row: icon + label + badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-sidebar-foreground">
            AI Assistant
          </span>
        </div>
        <AiIndicator
          variant="badge"
          loading={loading}
          provider={config?.provider}
          remaining={remaining}
          unavailable={!isAvailable}
        />
      </div>

      {/* Progress row (free tier) or unavailable message */}
      {isAvailable && isFree ? (
        <div className="mb-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {remaining ?? FREE_DAILY_LIMIT} / {FREE_DAILY_LIMIT} calls left
              today
            </span>
            {isLowQuota && (
              <span className="text-xs text-destructive font-medium">Low</span>
            )}
          </div>
          <div className="h-1 rounded-full bg-primary/20 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isLowQuota ? "bg-destructive/70" : "bg-primary",
              )}
              style={{
                width: `${((remaining ?? FREE_DAILY_LIMIT) / FREE_DAILY_LIMIT) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : isAvailable && isConfigured ? (
        <div className="mb-2 flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-accent-foreground" />
          <span className="text-xs text-muted-foreground">
            Unlimited via custom provider
          </span>
        </div>
      ) : !isAvailable ? (
        <p className="text-xs text-muted-foreground mb-2">
          Not available in Docker mode
        </p>
      ) : null}

      {/* Open AI Hub button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/ai-hub")}
        className="w-full h-7 text-xs text-primary hover:bg-primary/10 hover:text-primary px-2 justify-between"
      >
        <span>Open AI Hub</span>
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
