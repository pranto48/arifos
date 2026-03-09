import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AiIndicator } from '@/components/shared/AiIndicator';
import { useAiAssist } from '@/hooks/useAiAssist';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScanLine, Upload, FileText, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

export function DocumentOcrScanner() {
  const { language } = useLanguage();
  const { callAi, loading, config, getRemainingCalls, isAvailable } = useAiAssist();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum 10MB', variant: 'destructive' });
      return;
    }

    setSelectedFile(file);
    setResult(null);

    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleScan = async () => {
    if (!selectedFile && !manualText.trim()) return;

    let context: any = {};

    if (selectedFile && selectedFile.type.startsWith('image/')) {
      // Convert to base64 for vision model
      const buffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      context = {
        imageBase64: btoa(binary),
        mimeType: selectedFile.type,
      };
    } else if (manualText.trim()) {
      context = { documentText: manualText.trim() };
    } else {
      // Read text file
      const text = await selectedFile!.text();
      context = { documentText: text };
    }

    const data = await callAi('ocr_document', context);
    if (data?.content) {
      setResult(typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2));
    }
  };

  const clearAll = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setManualText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'ডকুমেন্ট OCR স্ক্যানার' : 'Document OCR Scanner'}
          </CardTitle>
          <AiIndicator provider={config?.provider} remaining={getRemainingCalls()} loading={loading} unavailable={!isAvailable} />
        </div>
        <p className="text-sm text-muted-foreground">
          {language === 'bn' ? 'রিসিপ্ট, চালান, চুক্তি স্ক্যান করুন' : 'Scan receipts, invoices, contracts to extract data'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File upload */}
        <div className="space-y-2">
          <Label>{language === 'bn' ? 'ছবি/ডকুমেন্ট আপলোড' : 'Upload Image/Document'}</Label>
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-md" />
            ) : selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm">{selectedFile.name}</span>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {language === 'bn' ? 'ক্লিক করুন বা ড্র্যাগ করুন' : 'Click or drag to upload'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'bn' ? 'ছবি, PDF, টেক্সট ফাইল (সর্বোচ্চ 10MB)' : 'Images, PDF, text files (max 10MB)'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Or paste text */}
        {!selectedFile && (
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'অথবা টেক্সট পেস্ট করুন' : 'Or paste document text'}</Label>
            <Textarea
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              placeholder={language === 'bn' ? 'ডকুমেন্টের টেক্সট পেস্ট করুন...' : 'Paste document text here...'}
              className="resize-none h-24"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleScan}
            disabled={loading || (!selectedFile && !manualText.trim()) || !isAvailable}
            className="flex-1"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanLine className="h-4 w-4 mr-2" />}
            {language === 'bn' ? 'স্ক্যান করুন' : 'Scan Document'}
          </Button>
          {(selectedFile || manualText || result) && (
            <Button variant="ghost" size="icon" onClick={clearAll}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'এক্সট্রাক্ট করা তথ্য' : 'Extracted Information'}</Label>
            <ScrollArea className="h-[300px]">
              <div className="prose prose-sm dark:prose-invert max-w-none p-3 bg-muted/30 rounded-lg border border-border">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
