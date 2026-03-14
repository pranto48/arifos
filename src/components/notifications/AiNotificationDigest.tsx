import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAiAssist } from "@/hooks/useAiAssist";
import { useAppNotifications } from "@/hooks/useAppNotifications";
import { AiIndicator } from "@/components/shared/AiIndicator";

export function AiNotificationDigest() {
  const { notifications } = useAppNotifications();
  const { callAi, loading, config, getRemainingCalls, isAvailable } =
    useAiAssist();
  const [digest, setDigest] = useState<string | null>(null);

  const handleGenerateDigest = async () => {
    if (notifications.length === 0) return;

    const notifText = notifications
      .slice(0, 30)
      .map(
        (n) =>
          `[${n.type}] ${n.title}${n.message ? ": " + n.message : ""} (${n.is_read ? "read" : "unread"})`,
      )
      .join("\n");

    const result = await callAi("notification_digest", {
      notifications: notifText,
    });

    if (result?.content) {
      setDigest(result.content);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Digest
          <AiIndicator
            variant="dot"
            loading={loading}
            provider={config?.provider}
            remaining={getRemainingCalls()}
            unavailable={!isAvailable}
          />
        </CardTitle>
        {isAvailable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleGenerateDigest}
            disabled={loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        )}
      </CardHeader>
      {!isAvailable ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            AI features are not available in self-hosted mode
          </p>
        </CardContent>
      ) : digest ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
            {digest}
          </p>
        </CardContent>
      ) : (
        <CardContent className="pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateDigest}
            disabled={loading}
            className="w-full text-xs gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {loading ? "Generating..." : "Generate Digest"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
