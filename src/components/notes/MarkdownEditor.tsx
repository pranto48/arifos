import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Eye, Edit3, Columns } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

type ViewMode = 'edit' | 'preview' | 'split';

export function MarkdownEditor({ value, onChange, placeholder = 'Write your note in Markdown...', minHeight = '300px' }: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  const renderPreview = () => (
    <ScrollArea className={`w-full rounded-md border border-border bg-muted/20 p-4`} style={{ minHeight }}>
      {value ? (
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground
          prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground
          prose-strong:text-foreground prose-a:text-primary prose-code:text-primary
          prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-muted prose-pre:border prose-pre:border-border
          prose-blockquote:border-primary prose-blockquote:text-muted-foreground">
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Nothing to preview</p>
      )}
    </ScrollArea>
  );

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-md p-0.5 w-fit">
        <Button
          type="button"
          variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => setViewMode('edit')}
        >
          <Edit3 className="h-3 w-3" /> Edit
        </Button>
        <Button
          type="button"
          variant={viewMode === 'split' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs gap-1 hidden md:flex"
          onClick={() => setViewMode('split')}
        >
          <Columns className="h-3 w-3" /> Split
        </Button>
        <Button
          type="button"
          variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => setViewMode('preview')}
        >
          <Eye className="h-3 w-3" /> Preview
        </Button>
      </div>

      {/* Editor content */}
      {viewMode === 'edit' && (
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-muted/50 font-mono text-sm"
          style={{ minHeight }}
        />
      )}

      {viewMode === 'preview' && renderPreview()}

      {viewMode === 'split' && (
        <ResizablePanelGroup direction="horizontal" className="rounded-lg border border-border" style={{ minHeight }}>
          <ResizablePanel defaultSize={50} minSize={30}>
            <Textarea
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="h-full border-0 rounded-none bg-muted/50 font-mono text-sm resize-none focus-visible:ring-0"
              style={{ minHeight }}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <ScrollArea className="h-full p-4" style={{ minHeight }}>
              {value ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground
                  prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground
                  prose-strong:text-foreground prose-a:text-primary prose-code:text-primary
                  prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-pre:bg-muted prose-pre:border prose-pre:border-border
                  prose-blockquote:border-primary prose-blockquote:text-muted-foreground">
                  <ReactMarkdown>{value}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Preview will appear here</p>
              )}
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
