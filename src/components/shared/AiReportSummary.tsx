import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAiAssist } from '@/hooks/useAiAssist';
import { AiIndicator } from './AiIndicator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AiReportSummaryProps {
  title: string;
  headers: string[];
  rows: string[][];
  summaryCards?: { label: string; value: string | number }[];
}

export function AiReportSummary({ title, headers, rows, summaryCards }: AiReportSummaryProps) {
  const { callAi, loading, config, isAvailable } = useAiAssist();
  const [summary, setSummary] = useState<string | null>(null);

  const handleGenerate = async () => {
    const dataPreview = rows.slice(0, 20).map(row =>
      headers.map((h, i) => `${h}: ${row[i]}`).join(', ')
    ).join('\n');

    const summaryContext = summaryCards
      ? '\nSummary: ' + summaryCards.map(c => `${c.label}: ${c.value}`).join(', ')
      : '';

    const result = await callAi('report_summary', {
      title,
      data: `${dataPreview}${summaryContext}\nTotal rows: ${rows.length}`,
    });

    if (result?.content) {
      // Clean markdown artifacts from AI response
      const raw = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      const cleaned = raw
        .replace(/```[a-z]*\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/gm, '')
        .trim();
      setSummary(cleaned);
    }
  };

  if (!isAvailable) {
    return (
      <div className="flex items-center gap-2">
        <AiIndicator variant="inline" unavailable />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={loading}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loading ? 'Generating...' : 'AI Summary'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Generate AI-powered insights from this report</TooltipContent>
        </Tooltip>
        {(loading || summary) && (
          <AiIndicator
            variant="inline"
            loading={loading}
            provider={config?.provider}
          />
        )}
      </div>

      {summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm whitespace-pre-line leading-relaxed">{summary}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
